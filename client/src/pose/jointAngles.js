// Generic joint-angle lookup, shared by every exercise's tracking rule.
// A "joint name" here is a body part ("hip", "knee", "shoulder"...), not a side.
// The left/right side is picked automatically: whichever side has better visibility.

import { POSE_LANDMARKS } from './landmarks';
import { calculateAngle } from './angles';

// Maps a joint name to its left and right landmark index.
const JOINT_LANDMARKS = {
  shoulder: { left: POSE_LANDMARKS.LEFT_SHOULDER, right: POSE_LANDMARKS.RIGHT_SHOULDER },
  elbow: { left: POSE_LANDMARKS.LEFT_ELBOW, right: POSE_LANDMARKS.RIGHT_ELBOW },
  wrist: { left: POSE_LANDMARKS.LEFT_WRIST, right: POSE_LANDMARKS.RIGHT_WRIST },
  hip: { left: POSE_LANDMARKS.LEFT_HIP, right: POSE_LANDMARKS.RIGHT_HIP },
  knee: { left: POSE_LANDMARKS.LEFT_KNEE, right: POSE_LANDMARKS.RIGHT_KNEE },
  ankle: { left: POSE_LANDMARKS.LEFT_ANKLE, right: POSE_LANDMARKS.RIGHT_ANKLE },
};

// A landmark below this visibility is treated as "not clearly visible".
// Placeholder until a trainer confirms real values (see CLAUDE.md).
export const VISIBILITY_THRESHOLD = 0.55;

function getVisibility(landmarks, index) {
  const point = landmarks[index];
  return point ? (point.visibility ?? 0) : 0;
}

// Returns the landmark index for one joint name on one side ("left" or "right").
// Throws during development if the joint name is misspelled in exercises.json.
function landmarkIndexFor(jointName, side) {
  const entry = JOINT_LANDMARKS[jointName];
  if (!entry) {
    throw new Error(`Unknown joint name in a tracking rule: "${jointName}"`);
  }
  return entry[side];
}

// Average visibility of every landmark a tracking rule's joint list needs, on one side.
export function sideVisibility(landmarks, jointNames, side) {
  let total = 0;
  for (let i = 0; i < jointNames.length; i++) {
    const index = landmarkIndexFor(jointNames[i], side);
    total += getVisibility(landmarks, index);
  }
  return total / jointNames.length;
}

// Picks left or right for a 3-joint chain (for example ["hip", "knee", "ankle"]),
// whichever side is more visible right now. The exercise never has to say which
// side to use; the camera picks it frame by frame.
export function pickBetterSide(landmarks, jointNames) {
  const leftVisibility = sideVisibility(landmarks, jointNames, 'left');
  const rightVisibility = sideVisibility(landmarks, jointNames, 'right');
  return leftVisibility >= rightVisibility ? 'left' : 'right';
}

// Computes the angle at the middle joint of a 3-joint chain, on the given side.
// Returns null if any of the three landmarks is missing.
export function angleForChain(landmarks, jointNames, side) {
  if (jointNames.length !== 3) {
    throw new Error('A tracking rule\'s "joints" list must have exactly 3 names');
  }
  const a = landmarks[landmarkIndexFor(jointNames[0], side)];
  const b = landmarks[landmarkIndexFor(jointNames[1], side)];
  const c = landmarks[landmarkIndexFor(jointNames[2], side)];
  if (!a || !b || !c) {
    return null;
  }
  return calculateAngle(a, b, c);
}

// Midpoint of a joint's left and right landmark. Falls back to whichever side
// is actually visible if the joint is only tracked on one side right now.
export function jointMidpoint(landmarks, jointName) {
  const entry = JOINT_LANDMARKS[jointName];
  const left = landmarks[entry.left];
  const right = landmarks[entry.right];
  const leftVisible = left && (left.visibility ?? 0) > 0.3;
  const rightVisible = right && (right.visibility ?? 0) > 0.3;

  if (leftVisible && rightVisible) {
    return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  }
  if (leftVisible) {
    return { x: left.x, y: left.y };
  }
  if (rightVisible) {
    return { x: right.x, y: right.y };
  }
  return null;
}

// Angle of the line between two joints' midpoints, measured from horizontal
// (0 = flat/horizontal, 90 = upright/vertical).
export function tiltFromHorizontalDeg(landmarks, jointNameA, jointNameB) {
  const pointA = jointMidpoint(landmarks, jointNameA);
  const pointB = jointMidpoint(landmarks, jointNameB);
  if (!pointA || !pointB) {
    return null;
  }
  const deltaX = pointB.x - pointA.x;
  const deltaY = pointB.y - pointA.y;
  return Math.round(Math.atan2(Math.abs(deltaY), Math.abs(deltaX) + 1e-6) * (180 / Math.PI));
}

// How far the line between two joints has drifted from a reference axis.
// 0 = perfectly aligned to the axis, up to 90 = fully the other way.
// Used for any "stay flat" (axis: "horizontal") or "stay upright" (axis: "vertical") check.
export function tiltDeviationDeg(landmarks, jointNameA, jointNameB, axis) {
  const tilt = tiltFromHorizontalDeg(landmarks, jointNameA, jointNameB);
  if (tilt === null) {
    return null;
  }
  return axis === 'vertical' ? 90 - tilt : tilt;
}

// The single landmark (not a midpoint) for one joint on one side.
// Used for a position check like "wrist above shoulder" (shoulder press lockout).
export function landmarkFor(landmarks, jointName, side) {
  return landmarks[landmarkIndexFor(jointName, side)];
}

// True when joint A is higher up the frame than joint B (smaller y = higher,
// since image y grows downward), with a small margin so a level pair doesn't flicker.
export function isAbove(landmarks, jointNameA, jointNameB, side) {
  const a = landmarkFor(landmarks, jointNameA, side);
  const b = landmarkFor(landmarks, jointNameB, side);
  if (!a || !b) {
    return null;
  }
  const MARGIN = 0.02;
  return a.y < b.y - MARGIN;
}

// Every landmark a tracking rule needs: the main joint chain, each extra check's
// chain, and the two posture-check joints if present. Used for the visibility gate.
export function jointsUsedByRule(rule) {
  const names = new Set(rule.joints);
  const extraChecks = rule.extraChecks || [];
  for (let i = 0; i < extraChecks.length; i++) {
    const checkJoints = extraChecks[i].joints;
    for (let j = 0; j < checkJoints.length; j++) {
      names.add(checkJoints[j]);
    }
  }
  if (rule.postureCheck) {
    names.add(rule.postureCheck.a);
    names.add(rule.postureCheck.b);
  }
  const positionChecks = rule.positionChecks || [];
  for (let i = 0; i < positionChecks.length; i++) {
    names.add(positionChecks[i].a);
    names.add(positionChecks[i].b);
  }
  return Array.from(names);
}
