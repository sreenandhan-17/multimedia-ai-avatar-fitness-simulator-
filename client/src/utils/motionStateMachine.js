/**
 * Strict Motion-State Tracking Finite State Machine (FSM)
 *
 * Implements strict posture validation, horizontal body orientation gates,
 * dynamic biomechanics-based Form Accuracy calculation engine,
 * and a 5-stage lock cycle:
 * STANDBY / IDLE -> DESCENDING -> BOTTOM_REACHED -> ASCENDING -> REP_COMPLETED
 */

export const FSM_STAGES = {
  NOT_IN_POSITION: 'NOT_IN_POSITION',
  STANDBY: 'STANDBY',
  IDLE: 'IDLE',
  DESCENDING: 'DESCENDING',
  BOTTOM_REACHED: 'BOTTOM_REACHED',
  ASCENDING: 'ASCENDING',
  REP_COMPLETED: 'REP_COMPLETED',

  // Aliases for backward compatibility
  STAGE_UP: 'IDLE',
  STAGE_DOWN_IN_PROGRESS: 'DESCENDING',
  STAGE_BOTTOM_REACHED: 'BOTTOM_REACHED',
  STAGE_REP_COMPLETE: 'REP_COMPLETED',
};

export const FSM_EXERCISE_PROFILES = {
  'push-up': {
    id: 'push-up',
    name: 'Push-up',
    upAngle: 160,          // Complete lockout (>= 160°)
    descentAngle: 135,     // Descent initiation threshold (< 135°)
    depthAngle: 90,        // Target depth threshold (<= 90°)
    depthTargetMax: 95,    // Depth quality threshold: penalty if > 95°
    minCoreAngle: 150,     // Core must remain > 150° at bottom
    ascendingAngle: 140,   // Pushing back up past 140°
    minPlankCore: 155,     // Stable plank standby core > 155°
    minPlankElbow: 150,    // Stable plank standby elbow > 150°
    plankHoldDurationMs: 1000, // Must hold plank for >= 1.0s before IDLE
    minDurationMs: 1000,   // 1.0-second debouncing time-gate
    primaryJoint: 'elbow',
  },
  'bicep-curl': {
    id: 'bicep-curl',
    name: 'Bicep curl',
    upAngle: 150,
    descentAngle: 120,
    depthAngle: 65,
    depthTargetMax: 75,
    minCoreAngle: 140,
    ascendingAngle: 95,
    minPlankCore: 0,
    minPlankElbow: 0,
    plankHoldDurationMs: 300,
    minDurationMs: 1000,
    primaryJoint: 'elbow',
  },
  'squat': {
    id: 'squat',
    name: 'Squat',
    upAngle: 160,
    descentAngle: 140,
    depthAngle: 90,
    depthTargetMax: 100,   // Depth quality threshold: penalty if > 100°
    minCoreAngle: 130,
    ascendingAngle: 130,
    minPlankCore: 0,
    minPlankElbow: 0,
    plankHoldDurationMs: 300,
    minDurationMs: 1000,
    primaryJoint: 'knee',
  },
  'default': {
    id: 'default',
    name: 'Exercise',
    upAngle: 160,
    descentAngle: 135,
    depthAngle: 90,
    depthTargetMax: 95,
    minCoreAngle: 150,
    ascendingAngle: 140,
    minPlankCore: 155,
    minPlankElbow: 150,
    plankHoldDurationMs: 1000,
    minDurationMs: 1000,
    primaryJoint: 'elbow',
  },
};

/**
 * Returns performance guidance tier text based on accuracy percentage
 */
export function getPerformanceTier(accuracy) {
  if (accuracy >= 95) {
    return 'Flawless form! Keep it up!';
  } else if (accuracy >= 75) {
    return 'Good effort, focus on depth and keeping core tight.';
  } else {
    return 'Form slipping. Check your alignment.';
  }
}

export class MotionStateMachine {
  constructor(exerciseId = 'push-up', onRepCompleted = null, onPostureAlert = null) {
    this.setProfile(exerciseId);
    this.onRepCompleted = onRepCompleted;
    this.onPostureAlert = onPostureAlert;

    this.currentStage = FSM_STAGES.STANDBY;
    this.previousStage = FSM_STAGES.STANDBY;

    this.minAngleReached = 180;
    this.maxAngleReached = 0;
    this.repStartTime = 0;
    this.lastRepTime = 0;
    this.plankStartTime = null;

    this.repsCounted = 0;

    // Dynamic Repetition Accuracy Scoring state
    this.currentRepScore = 100;
    this.repScores = [];
    this.runningAccuracy = 100; // Initialize display accuracy at 100%
    this.repPenalties = {
      coreDescent: false,
      coreAscent: false,
      depthQuality: false,
      lockoutCompletion: false,
    };

    this.lastAlertTime = {
      coreSag: 0,
      partialDepth: 0,
      incompleteExtension: 0,
    };
  }

  setProfile(exerciseId) {
    const key = (exerciseId || '').toLowerCase();
    this.exerciseId = key;
    if (key.includes('squat') || key.includes('lunge')) {
      this.profile = FSM_EXERCISE_PROFILES['squat'];
    } else if (key.includes('curl')) {
      this.profile = FSM_EXERCISE_PROFILES['bicep-curl'];
    } else {
      this.profile = FSM_EXERCISE_PROFILES['push-up'];
    }
  }

  resetSetAccuracy() {
    this.repScores = [];
    this.runningAccuracy = 100;
    this.currentRepScore = 100;
    this.repPenalties = {
      coreDescent: false,
      coreAscent: false,
      depthQuality: false,
      lockoutCompletion: false,
    };
  }

  reset() {
    this.currentStage = FSM_STAGES.STANDBY;
    this.previousStage = FSM_STAGES.STANDBY;
    this.minAngleReached = 180;
    this.maxAngleReached = 0;
    this.repStartTime = 0;
    this.lastRepTime = 0;
    this.plankStartTime = null;
    this.resetSetAccuracy();
  }

  getRunningAccuracy() {
    if (this.repScores.length === 0) return 100;
    const sum = this.repScores.reduce((acc, score) => acc + score, 0);
    return Math.round(sum / this.repScores.length);
  }

  triggerAlert(type, alertData) {
    const now = performance.now();
    // Throttle alert to at most once every 2.5 seconds
    if (now - (this.lastAlertTime[type] || 0) > 2500) {
      this.lastAlertTime[type] = now;
      if (this.onPostureAlert) {
        this.onPostureAlert(alertData);
      }
    }
  }

  /**
   * Process a single video frame of calculated joint angles.
   *
   * @param {Object} params
   * @param {number} params.primaryAngle Active joint angle (e.g. elbow for push-up)
   * @param {number} params.coreAngle Shoulder-Hip-Ankle alignment angle
   * @param {boolean} params.inFrame Whether user is generally in frame
   * @param {boolean} params.pushupVisibilityPass Mandatory visibility gate passed
   * @param {boolean} params.isHorizontalPlank Body orientation within +/- 35° of horizontal
   * @param {boolean} params.isPushup Whether active exercise is push-up
   * @returns {Object} FSM state info
   */
  update({
    primaryAngle = 180,
    coreAngle = 180,
    inFrame = true,
    pushupVisibilityPass = true,
    isHorizontalPlank = true,
    isPushup = true,
  }) {
    const now = performance.now();

    // =========================================================================
    // Task 1: Mandatory Landmark Visibility Gate
    // =========================================================================
    if (isPushup && !pushupVisibilityPass) {
      // Freeze rep counting FSM immediately
      this.currentStage = FSM_STAGES.NOT_IN_POSITION;
      this.plankStartTime = null;
      return {
        stage: FSM_STAGES.NOT_IN_POSITION,
        isFrozen: true,
        reason: 'VISIBILITY_FAILED',
        minAngle: this.minAngleReached,
        isRepComplete: false,
        repScore: this.currentRepScore,
        runningAccuracy: this.runningAccuracy,
        completedRepsCount: this.repScores.length,
      };
    }

    // =========================================================================
    // Task 2: Horizontal Push-Up Posture Validation (Body Orientation Check)
    // =========================================================================
    if (isPushup && !isHorizontalPlank) {
      // Flag state as NOT_IN_POSITION, suspend rep increments
      this.currentStage = FSM_STAGES.NOT_IN_POSITION;
      this.plankStartTime = null;
      return {
        stage: FSM_STAGES.NOT_IN_POSITION,
        isFrozen: true,
        reason: 'NOT_HORIZONTAL',
        minAngle: this.minAngleReached,
        isRepComplete: false,
        repScore: this.currentRepScore,
        runningAccuracy: this.runningAccuracy,
        completedRepsCount: this.repScores.length,
      };
    }

    if (!inFrame) {
      this.currentStage = FSM_STAGES.STANDBY;
      this.plankStartTime = null;
      return {
        stage: this.currentStage,
        isFrozen: true,
        reason: 'OUT_OF_FRAME',
        minAngle: this.minAngleReached,
        isRepComplete: false,
        repScore: this.currentRepScore,
        runningAccuracy: this.runningAccuracy,
        completedRepsCount: this.repScores.length,
      };
    }

    const {
      upAngle,
      descentAngle,
      depthAngle,
      depthTargetMax,
      minCoreAngle,
      ascendingAngle,
      minPlankCore,
      minPlankElbow,
      plankHoldDurationMs,
      minDurationMs,
    } = this.profile;

    let repIncremented = false;

    // =========================================================================
    // Task 4: Form Alert Suppression
    // Only evaluate core alignment when actively in valid horizontal plank movement
    // =========================================================================
    const isActivelyWorkingPlank =
      isPushup &&
      pushupVisibilityPass &&
      isHorizontalPlank &&
      (this.currentStage === FSM_STAGES.IDLE ||
        this.currentStage === FSM_STAGES.DESCENDING ||
        this.currentStage === FSM_STAGES.BOTTOM_REACHED ||
        this.currentStage === FSM_STAGES.ASCENDING);

    const isCoreSagging = coreAngle < 155;
    const isCorePiking = coreAngle > 200;

    if (isActivelyWorkingPlank) {
      if (isCoreSagging) {
        this.triggerAlert('coreSag', {
          id: 'core-sag',
          icon: '🛡️',
          part: 'Core & Hips',
          title: 'Form Alert',
          message: "Don't sag your hips! Keep your core tight.",
        });
      } else if (isCorePiking) {
        this.triggerAlert('coreSag', {
          id: 'core-pike',
          icon: '📐',
          part: 'Spine & Hips',
          title: 'Form Alert',
          message: "Don't pike your hips! Maintain a flat neutral spine.",
        });
      }
    }

    // =========================================================================
    // Task 3: Strict Push-Up Repetition State Lock (FSM)
    // =========================================================================
    switch (this.currentStage) {
      // 1. NOT_IN_POSITION or STANDBY: Waiting for stable plank position
      case FSM_STAGES.NOT_IN_POSITION:
      case FSM_STAGES.STANDBY: {
        const isStablePlankCondition =
          coreAngle > minPlankCore && primaryAngle > minPlankElbow;

        if (isStablePlankCondition) {
          if (this.plankStartTime === null) {
            this.plankStartTime = now;
          } else if (now - this.plankStartTime >= plankHoldDurationMs) {
            // Held stable plank position for at least 1.0s -> Enter IDLE
            this.currentStage = FSM_STAGES.IDLE;
            this.previousStage = FSM_STAGES.STANDBY;
            this.minAngleReached = primaryAngle;
            this.maxAngleReached = primaryAngle;
            this.currentRepScore = 100;
          }
        } else {
          // Plank position broken; restart stability timer
          this.plankStartTime = null;
          this.currentStage = FSM_STAGES.STANDBY;
        }
        break;
      }

      // 2. IDLE: Ready in lockout plank, waiting for descent initiation (< 135°)
      case FSM_STAGES.IDLE: {
        this.minAngleReached = primaryAngle;
        this.maxAngleReached = Math.max(this.maxAngleReached, primaryAngle);

        // Elbow angle starts dropping below 135° -> DESCENDING
        if (primaryAngle < descentAngle) {
          this.currentStage = FSM_STAGES.DESCENDING;
          this.previousStage = FSM_STAGES.IDLE;
          this.repStartTime = now;
          this.minAngleReached = primaryAngle;

          // Task 1: Initialize repScore = 100 at start of descent
          this.currentRepScore = 100;
          this.repPenalties = {
            coreDescent: false,
            coreAscent: false,
            depthQuality: false,
            lockoutCompletion: false,
          };

          if (isActivelyWorkingPlank && (isCoreSagging || isCorePiking)) {
            this.repPenalties.coreDescent = true;
            this.currentRepScore -= 15;
          }
        }
        break;
      }

      // 3. DESCENDING: Lowering chest towards floor
      case FSM_STAGES.DESCENDING: {
        if (primaryAngle < this.minAngleReached) {
          this.minAngleReached = primaryAngle;
        }

        // Secondary form penalty check during descent (-15%)
        if (isActivelyWorkingPlank && (isCoreSagging || isCorePiking) && !this.repPenalties.coreDescent) {
          this.repPenalties.coreDescent = true;
          this.currentRepScore -= 15;
        }

        // Elbow reaches <= 90° WHILE core angle remains > 150° (flawless depth)
        if (primaryAngle <= depthAngle) {
          if (coreAngle > minCoreAngle) {
            this.currentStage = FSM_STAGES.BOTTOM_REACHED;
            this.previousStage = FSM_STAGES.DESCENDING;
          }
        } else if (primaryAngle <= (depthTargetMax || 95)) {
          // Reached acceptable bottom depth (91° - 95°), but penalize depth quality (-25%)
          if (!this.repPenalties.depthQuality) {
            this.repPenalties.depthQuality = true;
            this.currentRepScore -= 25;
          }
          this.currentStage = FSM_STAGES.BOTTOM_REACHED;
          this.previousStage = FSM_STAGES.DESCENDING;
        } else if (primaryAngle > this.minAngleReached + 16 && primaryAngle > 115) {
          // Reversing direction before reaching target depth
          this.triggerAlert('partialDepth', {
            id: 'partial-depth',
            icon: '📉',
            part: 'Chest Depth',
            title: 'Partial Depth',
            message: 'Push-up too shallow! Lower your chest further.',
          });

          // Task 1: Check Depth Quality
          if (!this.repPenalties.depthQuality) {
            this.repPenalties.depthQuality = true;
            this.currentRepScore -= 25;
          }

          // If user returns back to top without depth, abort back to IDLE
          if (primaryAngle >= upAngle - 10) {
            this.currentStage = FSM_STAGES.IDLE;
            this.previousStage = FSM_STAGES.DESCENDING;
            this.minAngleReached = 180;
          }
        }
        break;
      }

      // 4. BOTTOM_REACHED: Valid depth achieved, pushing back up past 140°
      case FSM_STAGES.BOTTOM_REACHED: {
        if (primaryAngle < this.minAngleReached) {
          this.minAngleReached = primaryAngle;
        }

        // Secondary form penalty check during bottom/ascent (-15%)
        if (isActivelyWorkingPlank && (isCoreSagging || isCorePiking) && !this.repPenalties.coreAscent) {
          this.repPenalties.coreAscent = true;
          this.currentRepScore -= 15;
        }

        // Elbow angle pushes back up past 140° -> ASCENDING
        if (primaryAngle >= ascendingAngle) {
          // Depth Quality evaluation at bottom turnaround
          if (!this.repPenalties.depthQuality && this.minAngleReached > (depthTargetMax || 95)) {
            this.repPenalties.depthQuality = true;
            this.currentRepScore -= 25;
          }

          this.currentStage = FSM_STAGES.ASCENDING;
          this.previousStage = FSM_STAGES.BOTTOM_REACHED;
        }
        break;
      }

      // 5. ASCENDING: Driving upward towards full lockout (>= 160°)
      case FSM_STAGES.ASCENDING: {
        // Secondary form penalty check during ascent (-15%)
        if (isActivelyWorkingPlank && (isCoreSagging || isCorePiking) && !this.repPenalties.coreAscent) {
          this.repPenalties.coreAscent = true;
          this.currentRepScore -= 15;
        }
        // Elbow angle fully locks out at >= 160°
        if (primaryAngle >= upAngle) {
          const repDuration = now - this.repStartTime;

          // Discard any rep that completes in under 1.0 second
          if (repDuration >= minDurationMs) {
            // Task 1: Clamp final score for completed rep between 40% and 100%
            const clampedRepScore = Math.max(40, Math.min(100, Math.round(this.currentRepScore)));

            // Task 2: Cumulative Accuracy Aggregation
            this.repScores.push(clampedRepScore);
            this.runningAccuracy = this.getRunningAccuracy();

            this.repsCounted += 1;
            repIncremented = true;
            this.lastRepTime = now;

            if (this.onRepCompleted) {
              this.onRepCompleted({
                correct: clampedRepScore >= 70,
                duration: repDuration / 1000,
                minAngle: this.minAngleReached,
                repScore: clampedRepScore,
                runningAccuracy: this.runningAccuracy,
                penalties: { ...this.repPenalties },
              });
            }
          } else {
            console.warn(
              `[FSM] Discarded false/rapid rep (${Math.round(repDuration)}ms < ${minDurationMs}ms)`
            );
          }

          // Return to IDLE in starting plank position
          this.currentStage = FSM_STAGES.IDLE;
          this.previousStage = FSM_STAGES.REP_COMPLETED;
          this.minAngleReached = 180;
          this.maxAngleReached = 0;
          this.currentRepScore = 100;
          this.repPenalties = {
            coreDescent: false,
            coreAscent: false,
            depthQuality: false,
            lockoutCompletion: false,
          };
          this.plankStartTime = now;
        } else if (primaryAngle < ascendingAngle - 12) {
          // Re-dipping without locking out (Task 1: Lockout Completion penalty -15%)
          if (!this.repPenalties.lockoutCompletion) {
            this.repPenalties.lockoutCompletion = true;
            this.currentRepScore -= 15;
          }

          this.triggerAlert('incompleteExtension', {
            id: 'incomplete-ext',
            icon: '📐',
            part: 'Arms Lockout',
            title: 'Incomplete Extension',
            message: 'Lock out arms at top of rep.',
          });
        }
        break;
      }

      // 6. REP_COMPLETED: Fallback/Direct state handling
      case FSM_STAGES.REP_COMPLETED: {
        const repDuration = now - this.repStartTime;

        if (repDuration >= minDurationMs) {
          const clampedRepScore = Math.max(40, Math.min(100, Math.round(this.currentRepScore)));
          this.repScores.push(clampedRepScore);
          this.runningAccuracy = this.getRunningAccuracy();

          this.repsCounted += 1;
          repIncremented = true;
          this.lastRepTime = now;

          if (this.onRepCompleted) {
            this.onRepCompleted({
              correct: clampedRepScore >= 70,
              duration: repDuration / 1000,
              minAngle: this.minAngleReached,
              repScore: clampedRepScore,
              runningAccuracy: this.runningAccuracy,
              penalties: { ...this.repPenalties },
            });
          }
        }

        this.currentStage = FSM_STAGES.IDLE;
        this.previousStage = FSM_STAGES.REP_COMPLETED;
        this.minAngleReached = 180;
        this.maxAngleReached = 0;
        this.currentRepScore = 100;
        this.repPenalties = {
          coreDescent: false,
          coreAscent: false,
          depthQuality: false,
          lockoutCompletion: false,
        };
        this.plankStartTime = now;
        break;
      }

      default:
        this.currentStage = FSM_STAGES.STANDBY;
        break;
    }

    return {
      stage: this.currentStage,
      minAngle: this.minAngleReached,
      isRepComplete: repIncremented,
      isFrozen: false,
      repScore: this.currentRepScore,
      runningAccuracy: this.runningAccuracy,
      completedRepsCount: this.repScores.length,
    };
  }
}
