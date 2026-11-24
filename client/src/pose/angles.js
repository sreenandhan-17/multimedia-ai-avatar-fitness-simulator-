import { POSE_LANDMARKS } from './landmarks.js';

/**
 * Calculates the angle between three points A -> B -> C (vertex at joint B).
 * Returns angle in degrees [0..180].
 */
export function calculateAngle(a, b, c) {
  if (!a || !b || !c) return 180;

  const abX = a.x - b.x;
  const abY = a.y - b.y;
  const cbX = c.x - b.x;
  const cbY = c.y - b.y;

  const dot = abX * cbX + abY * cbY;
  const magAB = Math.sqrt(abX * abX + abY * abY);
  const magCB = Math.sqrt(cbX * cbX + cbY * cbY);

  if (magAB * magCB === 0) return 180;

  let cosine = dot / (magAB * magCB);
  // Clamp to [-1, 1] to prevent NaN
  cosine = Math.max(-1, Math.min(1, cosine));

  return Math.round((Math.acos(cosine) * 180) / Math.PI);
}

/**
 * Extracts joint angles relevant to the active exercise and computes
 * biomechanical secondary alignment (e.g. Core: Shoulder-Hip-Ankle).
 */
export function extractPoseAngles(landmarks, exerciseId = 'push-up') {
  if (!landmarks || landmarks.length < 33) {
    return {
      activeAngle: 180,
      activeAngleLabel: 'Angle',
      secondaryAngle: 180,
      secondaryAngleLabel: 'Hip',
      coreAngle: 180,
      activeSide: 'left',
      confidence: 0,
      inFrame: false,
      essentialDetected: false,
    };
  }

  // Key Body Landmarks (indices >= 11, face 0-10 excluded)
  const ls = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];  // 11
  const rs = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]; // 12
  const le = landmarks[POSE_LANDMARKS.LEFT_ELBOW];     // 13
  const re = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];    // 14
  const lw = landmarks[POSE_LANDMARKS.LEFT_WRIST];     // 15
  const rw = landmarks[POSE_LANDMARKS.RIGHT_WRIST];    // 16
  const lh = landmarks[POSE_LANDMARKS.LEFT_HIP];       // 23
  const rh = landmarks[POSE_LANDMARKS.RIGHT_HIP];      // 24
  const lk = landmarks[POSE_LANDMARKS.LEFT_KNEE];      // 25
  const rk = landmarks[POSE_LANDMARKS.RIGHT_KNEE];     // 26
  const la = landmarks[POSE_LANDMARKS.LEFT_ANKLE];     // 27
  const ra = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];    // 28

  const leftShoulderVis = ls?.visibility ?? 0;
  const rightShoulderVis = rs?.visibility ?? 0;
  const leftElbowVis = le?.visibility ?? 0;
  const rightElbowVis = re?.visibility ?? 0;
  const leftWristVis = lw?.visibility ?? 0;
  const rightWristVis = rw?.visibility ?? 0;
  const leftHipVis = lh?.visibility ?? 0;
  const rightHipVis = rh?.visibility ?? 0;

  // Task 1: Mandatory Landmark Visibility Gate for Push-Up tracking:
  // - Shoulder (11 or 12): >= 0.65
  // - Elbow (13 or 14): >= 0.65
  // - Wrist (15 or 16): >= 0.65
  // - Hip (23 or 24): >= 0.60
  const hasShoulder = leftShoulderVis >= 0.65 || rightShoulderVis >= 0.65;
  const hasElbow = leftElbowVis >= 0.65 || rightElbowVis >= 0.65;
  const hasWrist = leftWristVis >= 0.65 || rightWristVis >= 0.65;
  const hasHip = leftHipVis >= 0.60 || rightHipVis >= 0.60;
  const pushupVisibilityPass = hasShoulder && hasElbow && hasWrist && hasHip;

  // General in-frame check
  const shoulderVisible = leftShoulderVis > 0.25 || rightShoulderVis > 0.25;
  const hipVisible = leftHipVis > 0.2 || rightHipVis > 0.2;
  const armVisible = leftElbowVis > 0.25 || rightElbowVis > 0.25;
  const inFrame = shoulderVisible && (hipVisible || armVisible);

  // Presence greeting check (shoulders [11, 12] and hips [23, 24] >= 0.70)
  const essentialDetected =
    ((leftShoulderVis >= 0.7 || rightShoulderVis >= 0.7) &&
     (leftHipVis >= 0.7 || rightHipVis >= 0.7));

  // Task 2: Horizontal Push-Up Posture Validation (Body Orientation Check):
  // Check the torso angle relative to horizontal floor:
  // The vector between Shoulder (11/12) and Hip (23/24) must have tilt angle within +/- 35° of horizontal.
  let shoulderX, shoulderY, hipX, hipY;
  if (leftShoulderVis >= 0.35 && rightShoulderVis >= 0.35 && ls && rs) {
    shoulderX = (ls.x + rs.x) / 2;
    shoulderY = (ls.y + rs.y) / 2;
  } else if (leftShoulderVis >= rightShoulderVis) {
    shoulderX = ls?.x ?? 0.5;
    shoulderY = ls?.y ?? 0.5;
  } else {
    shoulderX = rs?.x ?? 0.5;
    shoulderY = rs?.y ?? 0.5;
  }

  if (leftHipVis >= 0.35 && rightHipVis >= 0.35 && lh && rh) {
    hipX = (lh.x + rh.x) / 2;
    hipY = (lh.y + rh.y) / 2;
  } else if (leftHipVis >= rightHipVis) {
    hipX = lh?.x ?? 0.5;
    hipY = lh?.y ?? 0.5;
  } else {
    hipX = rh?.x ?? 0.5;
    hipY = rh?.y ?? 0.5;
  }

  const deltaX = hipX - shoulderX;
  const deltaY = hipY - shoulderY;
  const torsoTiltDeg = Math.round(
    Math.atan2(Math.abs(deltaY), Math.abs(deltaX) + 1e-6) * (180 / Math.PI)
  );
  // Within +/- 35° of horizontal
  const isHorizontalPlank = torsoTiltDeg <= 35;

  // Normalize exercise ID
  const ex = (exerciseId || '').toLowerCase();
  const isSquatOrLegs = ex.includes('squat') || ex.includes('lunge');
  const isBicepCurl = ex.includes('curl');

  // Compute angles for both sides
  const leftElbow = calculateAngle(ls, le, lw);
  const rightElbow = calculateAngle(rs, re, rw);
  const leftKnee = calculateAngle(lh, lk, la);
  const rightKnee = calculateAngle(rh, rk, ra);
  const leftHip = calculateAngle(ls, lh, lk);
  const rightHip = calculateAngle(rs, rh, rk);

  // Core Alignment: Shoulder - Hip - Ankle (ideal is 165° - 180° straight line)
  const leftCore = (la && (la.visibility ?? 0) > 0.2)
    ? calculateAngle(ls, lh, la)
    : calculateAngle(ls, lh, lk);
  const rightCore = (ra && (ra.visibility ?? 0) > 0.2)
    ? calculateAngle(rs, rh, ra)
    : calculateAngle(rs, rh, rk);

  let activeAngle = 180;
  let activeAngleLabel = 'Elbow';
  let secondaryAngle = 180;
  let secondaryAngleLabel = 'Hip';
  let coreAngle = 180;
  let activeSide = 'left';

  if (isSquatOrLegs) {
    // Squat: Track Knee (Hip-Knee-Ankle)
    const leftLegVis = (leftHipVis + (lk?.visibility ?? 0) + (la?.visibility ?? 0)) / 3;
    const rightLegVis = (rightHipVis + (rk?.visibility ?? 0) + (ra?.visibility ?? 0)) / 3;

    if (leftLegVis > 0.2 && rightLegVis > 0.2) {
      if (leftKnee <= rightKnee) {
        activeAngle = leftKnee;
        secondaryAngle = leftHip;
        coreAngle = leftCore;
        activeSide = 'left';
      } else {
        activeAngle = rightKnee;
        secondaryAngle = rightHip;
        coreAngle = rightCore;
        activeSide = 'right';
      }
    } else if (leftLegVis >= rightLegVis) {
      activeAngle = leftKnee;
      secondaryAngle = leftHip;
      coreAngle = leftCore;
      activeSide = 'left';
    } else {
      activeAngle = rightKnee;
      secondaryAngle = rightHip;
      coreAngle = rightCore;
      activeSide = 'right';
    }

    activeAngleLabel = 'Knee';
    secondaryAngleLabel = 'Hip';
  } else {
    // Push-up / Bicep Curl / Upper body: Track Elbow (Shoulder-Elbow-Wrist)
    const leftArmConfidence = (leftShoulderVis + leftElbowVis + leftWristVis + leftHipVis) / 4;
    const rightArmConfidence = (rightShoulderVis + rightElbowVis + rightWristVis + rightHipVis) / 4;
    const leftSideComplete = leftShoulderVis >= 0.65 && leftElbowVis >= 0.65 && leftWristVis >= 0.65 && leftHipVis >= 0.60;
    const rightSideComplete = rightShoulderVis >= 0.65 && rightElbowVis >= 0.65 && rightWristVis >= 0.65 && rightHipVis >= 0.60;

    if (leftSideComplete && !rightSideComplete) {
      activeSide = 'left';
      activeAngle = leftElbow;
      secondaryAngle = leftHip;
      coreAngle = leftCore;
    } else if (rightSideComplete && !leftSideComplete) {
      activeSide = 'right';
      activeAngle = rightElbow;
      secondaryAngle = rightHip;
      coreAngle = rightCore;
    } else if (leftArmConfidence >= rightArmConfidence) {
      activeSide = 'left';
      activeAngle = leftElbow;
      secondaryAngle = leftHip;
      coreAngle = leftCore;
    } else {
      activeSide = 'right';
      activeAngle = rightElbow;
      secondaryAngle = rightHip;
      coreAngle = rightCore;
    }

    activeAngleLabel = 'Elbow';
    secondaryAngleLabel = isBicepCurl ? 'Torso' : 'Hip';
  }

  return {
    activeAngle,
    activeAngleLabel,
    secondaryAngle,
    secondaryAngleLabel,
    coreAngle,
    activeSide,
    confidence: Math.max(leftShoulderVis, rightShoulderVis),
    inFrame,
    essentialDetected,
    // Task 1: Mandatory Landmark Visibility Gate
    pushupVisibilityPass,
    hasShoulder,
    hasElbow,
    hasWrist,
    hasHip,
    // Task 2: Horizontal Push-Up Posture Validation
    torsoTiltDeg,
    isHorizontalPlank,
    isPlankPosition: pushupVisibilityPass && isHorizontalPlank,
    // Raw angles for calculations
    leftElbow,
    rightElbow,
    leftKnee,
    rightKnee,
    leftHip,
    rightHip,
    leftCore,
    rightCore,
  };
}
