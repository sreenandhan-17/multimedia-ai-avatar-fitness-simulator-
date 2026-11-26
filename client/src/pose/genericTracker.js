// One rep-counting engine for every exercise, driven entirely by the exercise's
// "tracking" rule in client/src/data/exercises.json. No exercise-specific code here:
// if an exercise needs different numbers, change its JSON, not this file.
//
// A "reps" exercise goes IDLE -> DESCENDING -> BOTTOM_REACHED -> ASCENDING -> IDLE,
// counting one rep each full cycle. A "hold" exercise (for example plank) just
// counts seconds spent inside the target angle range.

import { AngleSmoother } from './smoothing';
import {
  angleForChain,
  isAbove,
  jointsUsedByRule,
  pickBetterSide,
  sideVisibility,
  tiltDeviationDeg,
  VISIBILITY_THRESHOLD,
} from './jointAngles';

export const TRACKER_STAGES = {
  NOT_IN_POSITION: 'NOT_IN_POSITION',
  IDLE: 'IDLE',
  DESCENDING: 'DESCENDING',
  BOTTOM_REACHED: 'BOTTOM_REACHED',
  ASCENDING: 'ASCENDING',
  HOLDING: 'HOLDING',
};

// A rep that completes faster than this is almost certainly a tracking glitch
// (a frame skip), not a real fast rep, so it is dropped rather than counted
// or flagged "Slow down". It is well under any exercise's minRepSeconds.
const NOISE_FLOOR_SECONDS = 0.4;

// One-time penalty against a rep's score, applied the first time a problem
// happens during that rep. The final score decides "correct" (>= 70).
const EXTRA_CHECK_PENALTY = 15;
const PARTIAL_DEPTH_PENALTY = 25;

function clampScore(score) {
  return Math.max(40, Math.min(100, Math.round(score)));
}

export class GenericTracker {
  constructor(rule) {
    this.setRule(rule);
    this.reset();
  }

  setRule(rule) {
    this.rule = rule;
    this.smoother = new AngleSmoother(3);
  }

  reset() {
    this.stage = TRACKER_STAGES.IDLE;
    this.repStartTime = 0;
    this.lastGoodSide = 'left';
    this.holdSeconds = 0;
    this.lastFrameTime = null;
    this.resetRepPenalties();
    this.repScores = [];
  }

  resetRepPenalties() {
    this.repScore = 100;
    this.penaltiesAppliedThisRep = {};
  }

  resetSetAccuracy() {
    this.repScores = [];
  }

  getRunningAccuracy() {
    if (this.repScores.length === 0) {
      return 100;
    }
    let sum = 0;
    for (let i = 0; i < this.repScores.length; i++) {
      sum += this.repScores[i];
    }
    return Math.round(sum / this.repScores.length);
  }

  // Applies a named penalty at most once per rep. Returns true the first time
  // (so the caller knows to show the cue), false on repeat triggers.
  applyPenaltyOnce(name, amount) {
    if (this.penaltiesAppliedThisRep[name]) {
      return false;
    }
    this.penaltiesAppliedThisRep[name] = true;
    this.repScore -= amount;
    return true;
  }

  // Main entry point: one video frame's landmarks in, the HUD state out.
  // `onRepReported` and `onPostureAlert` match ExerciseTracker's existing callbacks.
  processFrame(landmarks, onRepReported, onPostureAlert) {
    const rule = this.rule;
    const neededJoints = jointsUsedByRule(rule);
    const side = pickBetterSide(landmarks, rule.joints);
    this.lastGoodSide = side;

    const visibility = sideVisibility(landmarks, neededJoints, side);
    const inFrame = visibility >= VISIBILITY_THRESHOLD;

    const now = performance.now();
    const delta = this.lastFrameTime === null ? 0 : (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (!inFrame) {
      this.stage = TRACKER_STAGES.NOT_IN_POSITION;
      this.holdSeconds = 0;
      return this.buildOutput({
        liveCue: 'Reposition yourself. Keep your whole body in frame.',
        isFormValid: false,
        anglesDisabled: true,
        visibilityWarning: true,
      });
    }

    // Posture check: the line between two joints must stay close to a reference
    // axis. "horizontal" is a flat plank (push-up); "vertical" is an upright
    // torso or a vertical upper arm (lunge, overhead triceps extension).
    if (rule.postureCheck) {
      const axis = rule.postureCheck.axis || 'horizontal';
      const tilt = tiltDeviationDeg(landmarks, rule.postureCheck.a, rule.postureCheck.b, axis);
      const tiltOk = tilt !== null && tilt <= rule.postureCheck.maxTiltDeg;
      if (!tiltOk) {
        this.stage = TRACKER_STAGES.NOT_IN_POSITION;
        this.holdSeconds = 0;
        return this.buildOutput({
          liveCue: rule.postureCheck.cue,
          isFormValid: false,
          anglesDisabled: true,
          notInPositionWarning: true,
          torsoTiltDeg: tilt,
        });
      }
    }

    const rawAngle = angleForChain(landmarks, rule.joints, side);
    if (rawAngle === null) {
      // Landmarks moved out of view between the visibility check and here.
      return this.buildOutput({
        liveCue: 'Reposition yourself. Keep your whole body in frame.',
        isFormValid: false,
        anglesDisabled: true,
        visibilityWarning: true,
      });
    }
    const angle = this.smoother.smooth('primary', rawAngle);

    // Safety check: an extreme angle is a possible injury risk, independent of
    // whether a rep is in progress.
    const belowMin = rule.safetyMin !== undefined && angle < rule.safetyMin;
    const aboveMax = rule.safetyMax !== undefined && angle > rule.safetyMax;
    if (belowMin || aboveMax) {
      if (onPostureAlert) {
        onPostureAlert({
          id: 'safety-angle',
          icon: '🛑',
          part: rule.activeJointLabel || 'Joint',
          title: 'Stop: extreme angle',
          message: rule.cues.safety || 'That angle looks extreme. Ease off and reset your position.',
        });
      }
      return this.buildOutput({
        liveCue: rule.cues.safety || 'Extreme angle detected. Stop and reset your position.',
        isFormValid: false,
        activeAngle: angle,
      });
    }

    // The first extra check (if any) doubles as the "Core" display pill, since
    // it is usually a torso/core alignment check. Falls back to the main angle.
    let coreAngle = angle;
    if (rule.extraChecks && rule.extraChecks[0]) {
      const firstCheckAngle = angleForChain(landmarks, rule.extraChecks[0].joints, side);
      if (firstCheckAngle !== null) {
        coreAngle = firstCheckAngle;
      }
    }

    // Extra checks (for example: push-up's core must not sag or pike) run any
    // time the exercise is actively moving, not while simply standing in IDLE.
    const isActive = this.stage !== TRACKER_STAGES.IDLE || rule.mode === 'hold';
    if (isActive && rule.extraChecks) {
      for (let i = 0; i < rule.extraChecks.length; i++) {
        const check = rule.extraChecks[i];
        const checkAngle = angleForChain(landmarks, check.joints, side);
        if (checkAngle === null) continue;
        const outOfRange = checkAngle < check.min || checkAngle > check.max;
        if (outOfRange) {
          const isNewPenalty = this.applyPenaltyOnce(`extra-${i}`, EXTRA_CHECK_PENALTY);
          if (isNewPenalty && onPostureAlert) {
            onPostureAlert({
              id: `extra-check-${i}`,
              icon: '🛡️',
              part: 'Form',
              title: 'Form Alert',
              message: check.cue,
            });
          }
        }
      }
    }

    // Position checks (for example: shoulder press "wrists above shoulders" at
    // lockout) use the same one-time-per-rep penalty as extra checks.
    if (isActive && rule.positionChecks) {
      for (let i = 0; i < rule.positionChecks.length; i++) {
        const check = rule.positionChecks[i];
        const aboveResult = isAbove(landmarks, check.a, check.b, side);
        if (aboveResult === null) continue;
        const wanted = check.relation !== 'below';
        if (aboveResult !== wanted) {
          const isNewPenalty = this.applyPenaltyOnce(`position-${i}`, EXTRA_CHECK_PENALTY);
          if (isNewPenalty && onPostureAlert) {
            onPostureAlert({
              id: `position-check-${i}`,
              icon: '📐',
              part: 'Form',
              title: 'Form Alert',
              message: check.cue,
            });
          }
        }
      }
    }

    const result = rule.mode === 'hold'
      ? this.processHold(angle, delta, onRepReported)
      : this.processReps(angle, delta, onRepReported);
    result.coreAngle = coreAngle;
    return result;
  }

  processHold(angle, delta, onRepReported) {
    const rule = this.rule;
    const tooLow = angle < rule.targetAngle;
    const tooHigh = rule.targetAngleMax !== undefined && angle > rule.targetAngleMax;

    if (tooLow || tooHigh) {
      this.stage = TRACKER_STAGES.IDLE;
      // A hold exercise can be wrong in two different ways (for example plank:
      // hips sagging vs. hips piked), each with its own cue if the rule gives one.
      const cue = tooLow ? (rule.cues.tooLow || rule.cues.shallow) : (rule.cues.tooHigh || rule.cues.shallow);
      return this.buildOutput({
        liveCue: cue,
        isFormValid: false,
        activeAngle: angle,
      });
    }

    this.stage = TRACKER_STAGES.HOLDING;
    this.holdSeconds += delta;

    const minHoldSeconds = rule.minHoldSeconds || 1;
    if (this.holdSeconds >= minHoldSeconds) {
      const score = clampScore(this.repScore);
      if (onRepReported) {
        onRepReported({
          correct: score >= 70,
          duration: minHoldSeconds,
          repScore: score,
          runningAccuracy: this.recordRepScore(score),
        });
      }
      this.holdSeconds -= minHoldSeconds;
      this.resetRepPenalties();
    }

    return this.buildOutput({
      liveCue: rule.cues.good || 'Holding...',
      isFormValid: true,
      activeAngle: angle,
    });
  }

  // Most exercises start at a high angle and move to a low one (squat, bicep
  // curl, push-up, bent-over row, crunch, overhead triceps extension): set
  // "direction": "lower" (the default). A few start low and move high
  // (shoulder press, lateral raise, dumbbell chest press): set "direction": "raise".
  // Everything below is written in terms of these five comparisons so neither
  // direction needs its own copy of the state machine.
  directionCompare() {
    const raising = this.rule.direction === 'raise';
    return {
      // Has the angle moved far enough from the start to begin a rep?
      leftStart: (a) => (raising ? a > this.rule.descentAngle : a < this.rule.descentAngle),
      // Full credit depth/height reached?
      reachedTarget: (a) => (raising ? a >= this.rule.targetAngle : a <= this.rule.targetAngle),
      // Acceptable-but-penalized depth/height reached?
      reachedTargetMax: (a) => (raising ? a >= this.rule.targetAngleMax : a <= this.rule.targetAngleMax),
      // Far enough past the bottom/top to start the return trip?
      pastTurnaround: (a) => (raising ? a <= this.rule.ascentAngle : a >= this.rule.ascentAngle),
      // Back at the starting position, rep complete?
      backAtStart: (a) => (raising ? a <= this.rule.startAngle : a >= this.rule.startAngle),
      // The single most extreme angle reached this rep so far (min if lowering,
      // max if raising) is tracked the same way regardless of direction.
      moreExtreme: (a, extreme) => (raising ? Math.max(a, extreme) : Math.min(a, extreme)),
      // Reversed back toward the start without ever reaching a countable depth?
      reversedEarly: (a, extreme) =>
        raising ? a < extreme - 16 && a <= this.rule.descentAngle : a > extreme + 16 && a >= this.rule.descentAngle,
    };
  }

  processReps(angle, delta, onRepReported) {
    const rule = this.rule;
    const cmp = this.directionCompare();
    let liveCue = rule.cues.good || 'Good form.';
    let isFormValid = true;

    switch (this.stage) {
      case TRACKER_STAGES.NOT_IN_POSITION:
      case TRACKER_STAGES.HOLDING:
        this.stage = TRACKER_STAGES.IDLE;
        break;

      case TRACKER_STAGES.IDLE:
        if (cmp.leftStart(angle)) {
          this.stage = TRACKER_STAGES.DESCENDING;
          this.repStartTime = performance.now();
          this.extremeAngleThisRep = angle;
          this.resetRepPenalties();
        } else {
          liveCue = 'Ready in position.';
        }
        break;

      case TRACKER_STAGES.DESCENDING: {
        this.extremeAngleThisRep = cmp.moreExtreme(angle, this.extremeAngleThisRep);
        liveCue = rule.cues.descending || 'Moving...';

        if (cmp.reachedTarget(angle)) {
          this.stage = TRACKER_STAGES.BOTTOM_REACHED;
          liveCue = rule.cues.good || 'Good depth!';
        } else if (cmp.reachedTargetMax(angle)) {
          this.applyPenaltyOnce('partial-depth', PARTIAL_DEPTH_PENALTY);
          this.stage = TRACKER_STAGES.BOTTOM_REACHED;
          liveCue = rule.cues.partialDepth || 'Close, but go a little further next time.';
        } else if (cmp.reversedEarly(angle, this.extremeAngleThisRep)) {
          // Reversed back toward the start before reaching a countable depth.
          this.stage = TRACKER_STAGES.IDLE;
          isFormValid = false;
          liveCue = rule.cues.shallow || 'Not deep enough, try again.';
        }
        break;
      }

      case TRACKER_STAGES.BOTTOM_REACHED:
        liveCue = rule.cues.partialDepth || 'Now reverse the movement.';
        if (cmp.pastTurnaround(angle)) {
          this.stage = TRACKER_STAGES.ASCENDING;
        }
        break;

      case TRACKER_STAGES.ASCENDING: {
        liveCue = 'Returning to start...';
        if (cmp.backAtStart(angle)) {
          const seconds = (performance.now() - this.repStartTime) / 1000;
          this.completeRep(seconds, onRepReported);
          this.stage = TRACKER_STAGES.IDLE;
          liveCue = this.lastRepCue;
          isFormValid = this.lastRepValid;
        }
        break;
      }

      default:
        this.stage = TRACKER_STAGES.IDLE;
        break;
    }

    return this.buildOutput({ liveCue, isFormValid, activeAngle: angle });
  }

  completeRep(seconds, onRepReported) {
    if (seconds < NOISE_FLOOR_SECONDS) {
      // Too fast to be real; most likely a detection glitch. Do not count it,
      // and silently go back to IDLE without changing the running count.
      this.lastRepCue = this.rule.cues.good || 'Good form.';
      this.lastRepValid = true;
      return;
    }

    const score = clampScore(this.repScore);
    const minRepSeconds = this.rule.minRepSeconds ?? 2.5;
    const tooFast = seconds < minRepSeconds;

    if (onRepReported) {
      onRepReported({
        correct: score >= 70,
        duration: seconds,
        repScore: score,
        runningAccuracy: this.recordRepScore(score),
      });
    }

    this.lastRepValid = score >= 70;
    this.lastRepCue = tooFast
      ? 'Slow down. Aim for about 3 seconds per rep.'
      : this.rule.cues.good || 'Good rep!';
  }

  recordRepScore(score) {
    this.repScores.push(score);
    return this.getRunningAccuracy();
  }

  buildOutput(overrides) {
    const rule = this.rule;
    return {
      stage: this.stage,
      liveCue: 'Get into position to begin.',
      isFormValid: true,
      activeAngle: 180,
      secondaryAngle: 180,
      coreAngle: 180,
      activeAngleLabel: rule.activeJointLabel || 'Angle',
      secondaryAngleLabel: rule.secondaryJointLabel || '',
      anglesDisabled: false,
      visibilityWarning: false,
      notInPositionWarning: false,
      isPlankValid: !rule.postureCheck || !overrides.notInPositionWarning,
      postureLabel: rule.postureCheck ? (overrides.notInPositionWarning ? 'Upright' : 'Plank') : '',
      torsoTiltDeg: 0,
      runningAccuracy: this.getRunningAccuracy(),
      repScore: clampScore(this.repScore),
      completedRepsCount: this.repScores.length,
      ...overrides,
    };
  }
}
