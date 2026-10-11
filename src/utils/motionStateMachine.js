/**
 * Motion-State Tracking Finite State Machine (FSM)
 * Automates repetition counting and biomechanical form analysis based on joint angles.
 */

export const FSM_STATE = {
  STATE_0_NEUTRAL: 0,      // Standing / Ready (e.g. Knee > 160°)
  STATE_1_IN_MOTION: 1,    // Descending / Flexing in-motion (e.g. Knee < 140°)
  STATE_2_TARGET_DEPTH: 2, // Target Depth Reached (e.g. Knee <= 90°)
};

export const FSM_STATE_LABELS = {
  [FSM_STATE.STATE_0_NEUTRAL]: 'State 0: Neutral / Standing',
  [FSM_STATE.STATE_1_IN_MOTION]: 'State 1: In-Motion',
  [FSM_STATE.STATE_2_TARGET_DEPTH]: 'State 2: Target Depth Reached',
};

/**
 * Exercise threshold profiles for FSM transitions
 */
export const FSM_EXERCISE_PROFILES = {
  squats: {
    id: 'squats',
    name: 'Bodyweight Squats',
    calPerRep: 0.32,
    getPrimaryAngle: (angles) => (angles.leftKnee + angles.rightKnee) / 2,
    getSymmetryDiff: (angles) => Math.abs(angles.leftKnee - angles.rightKnee),
    state0Threshold: 160,    // Knee > 160° is neutral standing
    state1Threshold: 140,    // Knee < 140° begins descent
    state2Threshold: 90,     // Knee <= 90° hits target squat depth
    idealDepth: 85,          // Benchmark for 100% depth score
    isLowerBetter: true,     // Lower angle = deeper squat
  },
  bicepCurls: {
    id: 'bicepCurls',
    name: 'Bicep Curls',
    calPerRep: 0.18,
    getPrimaryAngle: (angles) => (angles.leftElbow + angles.rightElbow) / 2,
    getSymmetryDiff: (angles) => Math.abs(angles.leftElbow - angles.rightElbow),
    state0Threshold: 150,    // Extended arm
    state1Threshold: 120,    // Beginning contraction
    state2Threshold: 55,     // Peak bicep squeeze
    idealDepth: 45,
    isLowerBetter: true,
  },
  shoulderPress: {
    id: 'shoulderPress',
    name: 'Overhead Press',
    calPerRep: 0.28,
    getPrimaryAngle: (angles) => (angles.leftElbow + angles.rightElbow) / 2,
    getSymmetryDiff: (angles) => Math.abs(angles.leftElbow - angles.rightElbow),
    state0Threshold: 85,     // Barbell/dumbbell at shoulder shelf
    state1Threshold: 115,    // Pressing upward
    state2Threshold: 165,    // Full overhead lockout
    idealDepth: 175,
    isLowerBetter: false,    // Higher angle = full lockout
  },
  lunges: {
    id: 'lunges',
    name: 'Forward Lunges',
    calPerRep: 0.35,
    getPrimaryAngle: (angles) => Math.min(angles.leftKnee, angles.rightKnee),
    getSymmetryDiff: () => 0,
    state0Threshold: 155,
    state1Threshold: 135,
    state2Threshold: 90,
    idealDepth: 85,
    isLowerBetter: true,
  },
  jumpingJacks: {
    id: 'jumpingJacks',
    name: 'Jumping Jacks',
    calPerRep: 0.22,
    getPrimaryAngle: (angles) => (angles.leftShoulder + angles.rightShoulder) / 2,
    getSymmetryDiff: (angles) => Math.abs(angles.leftShoulder - angles.rightShoulder),
    state0Threshold: 45,
    state1Threshold: 85,
    state2Threshold: 140,
    idealDepth: 155,
    isLowerBetter: false,
  },
  pushups: {
    id: 'pushups',
    name: 'Push-Ups',
    calPerRep: 0.38,
    getPrimaryAngle: (angles) => (angles.leftElbow + angles.rightElbow) / 2,
    getSymmetryDiff: (angles) => Math.abs(angles.leftElbow - angles.rightElbow),
    state0Threshold: 155,
    state1Threshold: 130,
    state2Threshold: 90,
    idealDepth: 85,
    isLowerBetter: true,
  },
};

export class MotionStateMachine {
  constructor(exerciseType = 'squats') {
    this.exerciseType = exerciseType;
    this.currentState = FSM_STATE.STATE_0_NEUTRAL;
    this.previousState = FSM_STATE.STATE_0_NEUTRAL;

    this.repCount = 0;
    this.caloriesBurned = 0;
    this.formAccuracy = 100; // 0..100%
    this.feedback = 'Stand in frame to begin';

    this.peakDepthRecorded = 180;
    this.symmetrySum = 0;
    this.sampleCount = 0;
    this.lastRepTimestamp = 0;
  }

  setExercise(type) {
    if (this.exerciseType !== type) {
      this.exerciseType = type;
      this.reset();
    }
  }

  reset() {
    this.currentState = FSM_STATE.STATE_0_NEUTRAL;
    this.previousState = FSM_STATE.STATE_0_NEUTRAL;
    this.repCount = 0;
    this.caloriesBurned = 0;
    this.formAccuracy = 100;
    this.peakDepthRecorded = this.getProfile().isLowerBetter ? 180 : 0;
    this.symmetrySum = 0;
    this.sampleCount = 0;
    this.feedback = `Ready for ${this.getProfile().name}`;
  }

  getProfile() {
    return FSM_EXERCISE_PROFILES[this.exerciseType] || FSM_EXERCISE_PROFILES.squats;
  }

  /**
   * Evaluates incoming joint angles and transitions FSM states
   * @param {Object} angles - Real-time joint angles
   * @returns {Object} Updated FSM status
   */
  update(angles) {
    if (!angles) return this.getState();

    const profile = this.getProfile();
    const primaryAngle = profile.getPrimaryAngle(angles);
    const symmetryDiff = profile.getSymmetryDiff(angles);
    const now = Date.now();

    // Accumulate symmetry data during movement
    if (this.currentState !== FSM_STATE.STATE_0_NEUTRAL) {
      this.symmetrySum += symmetryDiff;
      this.sampleCount += 1;

      if (profile.isLowerBetter) {
        if (primaryAngle < this.peakDepthRecorded) this.peakDepthRecorded = primaryAngle;
      } else {
        if (primaryAngle > this.peakDepthRecorded) this.peakDepthRecorded = primaryAngle;
      }
    }

    // ================= FSM STATE TRANSITIONS =================
    switch (this.currentState) {
      // ---------------- STATE 0: NEUTRAL / STANDING ----------------
      case FSM_STATE.STATE_0_NEUTRAL: {
        const hasBegunMotion = profile.isLowerBetter
          ? primaryAngle < profile.state1Threshold
          : primaryAngle > profile.state1Threshold;

        if (hasBegunMotion) {
          this.previousState = FSM_STATE.STATE_0_NEUTRAL;
          this.currentState = FSM_STATE.STATE_1_IN_MOTION;
          this.feedback = 'Descent started — maintain control';
          this.peakDepthRecorded = primaryAngle;
          this.symmetrySum = symmetryDiff;
          this.sampleCount = 1;
        } else {
          this.feedback = 'Ready in neutral position';
        }
        break;
      }

      // ---------------- STATE 1: IN-MOTION ----------------
      case FSM_STATE.STATE_1_IN_MOTION: {
        const reachedTargetDepth = profile.isLowerBetter
          ? primaryAngle <= profile.state2Threshold
          : primaryAngle >= profile.state2Threshold;

        const returnedToNeutralEarly = profile.isLowerBetter
          ? primaryAngle >= profile.state0Threshold
          : primaryAngle <= profile.state0Threshold;

        if (reachedTargetDepth) {
          this.previousState = FSM_STATE.STATE_1_IN_MOTION;
          this.currentState = FSM_STATE.STATE_2_TARGET_DEPTH;
          this.feedback = '🔥 Target depth reached! Drive up!';
        } else if (returnedToNeutralEarly) {
          // Returned before hitting target depth -> Incomplete rep
          this.previousState = FSM_STATE.STATE_1_IN_MOTION;
          this.currentState = FSM_STATE.STATE_0_NEUTRAL;
          this.feedback = '⚠️ Incomplete depth — lower further';
          this.formAccuracy = Math.max(50, Math.round(this.formAccuracy * 0.9));
        } else {
          this.feedback = profile.isLowerBetter ? 'Descending toward target' : 'Extending upward';
        }
        break;
      }

      // ---------------- STATE 2: TARGET DEPTH REACHED ----------------
      case FSM_STATE.STATE_2_TARGET_DEPTH: {
        const returnedToNeutral = profile.isLowerBetter
          ? primaryAngle >= profile.state0Threshold
          : primaryAngle <= profile.state0Threshold;

        if (returnedToNeutral) {
          // Valid repetition transition: State 2 -> State 0
          if (now - this.lastRepTimestamp > 650) {
            this.repCount += 1;
            this.caloriesBurned += profile.calPerRep;
            this.lastRepTimestamp = now;

            // Compute Form Accuracy Percentage:
            // 1. Depth Score (up to 70 pts)
            let depthAccuracy = 70;
            if (profile.isLowerBetter) {
              const depthDiff = Math.max(0, this.peakDepthRecorded - profile.idealDepth);
              depthAccuracy = Math.max(40, 70 - depthDiff * 1.5);
            } else {
              const depthDiff = Math.max(0, profile.idealDepth - this.peakDepthRecorded);
              depthAccuracy = Math.max(40, 70 - depthDiff * 1.5);
            }

            // 2. Symmetry Score (up to 30 pts)
            const avgSymmetryDiff = this.sampleCount > 0 ? this.symmetrySum / this.sampleCount : 0;
            const symmetryScore = Math.max(10, 30 - avgSymmetryDiff * 1.2);

            this.formAccuracy = Math.min(100, Math.round(depthAccuracy + symmetryScore));

            const ratingWord =
              this.formAccuracy >= 92
                ? '⭐ Elite Form'
                : this.formAccuracy >= 80
                ? '✓ Good Form'
                : '⚠️ Form Flaw';

            this.feedback = `Rep ${this.repCount} Complete! [${ratingWord}]`;
          }

          this.previousState = FSM_STATE.STATE_2_TARGET_DEPTH;
          this.currentState = FSM_STATE.STATE_0_NEUTRAL;
          this.peakDepthRecorded = profile.isLowerBetter ? 180 : 0;
          this.symmetrySum = 0;
          this.sampleCount = 0;
        } else {
          this.feedback = 'Hold & explode back to top!';
        }
        break;
      }

      default:
        this.currentState = FSM_STATE.STATE_0_NEUTRAL;
        break;
    }

    return this.getState();
  }

  getState() {
    return {
      exerciseType: this.exerciseType,
      currentState: this.currentState,
      stateLabel: FSM_STATE_LABELS[this.currentState],
      repCount: this.repCount,
      caloriesBurned: Math.round(this.caloriesBurned * 10) / 10,
      formAccuracy: this.formAccuracy,
      feedback: this.feedback,
    };
  }
}
