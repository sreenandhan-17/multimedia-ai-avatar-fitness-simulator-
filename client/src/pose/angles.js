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
 * Generic, exercise-agnostic presence check used for the "body detected" greeting
 * in CameraPanel. Per-exercise angle tracking now lives in jointAngles.js and
 * genericTracker.js, driven by each exercise's "tracking" rule in exercises.json.
 */
export function extractPoseAngles(landmarks) {
  if (!landmarks || landmarks.length < 33) {
    return { inFrame: false, essentialDetected: false };
  }

  const ls = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rs = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const lh = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rh = landmarks[POSE_LANDMARKS.RIGHT_HIP];

  const leftShoulderVis = ls?.visibility ?? 0;
  const rightShoulderVis = rs?.visibility ?? 0;
  const leftHipVis = lh?.visibility ?? 0;
  const rightHipVis = rh?.visibility ?? 0;

  const shoulderVisible = leftShoulderVis > 0.25 || rightShoulderVis > 0.25;
  const hipVisible = leftHipVis > 0.2 || rightHipVis > 0.2;
  const inFrame = shoulderVisible && hipVisible;

  // Shoulders and hips both clearly visible for the "body detected" greeting.
  const essentialDetected =
    (leftShoulderVis >= 0.7 || rightShoulderVis >= 0.7) &&
    (leftHipVis >= 0.7 || rightHipVis >= 0.7);

  return { inFrame, essentialDetected };
}
