// Public interface CameraPanel.jsx talks to. All the actual rep-counting logic
// lives in genericTracker.js; this file just loads an exercise's "tracking" rule
// from exercises.json and hands frames to a GenericTracker built from that rule.

import exercisesData from '../data/exercises.json';
import { GenericTracker } from './genericTracker';

// Short label for the angle pills in CameraPanel, derived from the joint being
// tracked so every exercise gets a sensible one without extra JSON fields.
function labelForJoint(jointName) {
  if (!jointName) return 'Angle';
  return jointName.charAt(0).toUpperCase() + jointName.slice(1);
}

function findRule(exerciseId) {
  const exercise = exercisesData.exercises.find((item) => item.id === exerciseId);
  if (!exercise || !exercise.tracking) {
    return null;
  }
  // The vertex of the main joint chain (for example "elbow" in
  // ["shoulder", "elbow", "wrist"]) is what the angle pill is labelled after.
  const rule = { ...exercise.tracking };
  rule.activeJointLabel = labelForJoint(rule.joints[1]);
  rule.secondaryJointLabel = rule.extraChecks && rule.extraChecks[0] ? 'Core' : '';
  return rule;
}

// A tracker for an exercise with no "tracking" rule yet (the other 9, until
// issue #22 adds theirs). Keeps the camera usable without counting reps.
const NO_RULE_OUTPUT = {
  stage: 'NOT_IN_POSITION',
  liveCue: 'Live form checking is not set up for this exercise yet.',
  isFormValid: true,
  activeAngle: '--',
  secondaryAngle: '--',
  coreAngle: '--',
  activeAngleLabel: 'Angle',
  secondaryAngleLabel: '',
  anglesDisabled: true,
  visibilityWarning: false,
  notInPositionWarning: false,
  isPlankValid: false,
  postureLabel: '',
  torsoTiltDeg: 0,
  runningAccuracy: 100,
  repScore: 100,
  completedRepsCount: 0,
};

export class ExerciseTracker {
  constructor(onRepReported, exerciseId = 'push-up', onPostureAlert = null) {
    this.onRepReported = onRepReported;
    this.onPostureAlert = onPostureAlert;
    this.setExercise(exerciseId);
  }

  setExercise(exerciseId) {
    this.exerciseId = (exerciseId || 'push-up').toLowerCase();
    this.rule = findRule(this.exerciseId);
    this.tracker = this.rule ? new GenericTracker(this.rule) : null;
  }

  reset() {
    if (this.tracker) {
      this.tracker.reset();
    }
  }

  resetSetAccuracy() {
    if (this.tracker) {
      this.tracker.resetSetAccuracy();
    }
  }

  // `angles` (from the old per-exercise angles.js) is accepted for CameraPanel's
  // existing call signature but not needed by the generic tracker, which reads
  // straight from raw landmarks for every joint it needs.
  processFrame(angles, landmarks) {
    if (!this.tracker) {
      return NO_RULE_OUTPUT;
    }
    if (!landmarks || landmarks.length < 33) {
      return this.tracker.buildOutput({
        liveCue: 'Reposition yourself. Keep your whole body in frame.',
        isFormValid: false,
        anglesDisabled: true,
        visibilityWarning: true,
      });
    }
    return this.tracker.processFrame(landmarks, this.onRepReported, this.onPostureAlert);
  }
}
