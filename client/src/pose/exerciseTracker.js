import { MotionStateMachine, FSM_STAGES, getPerformanceTier } from '../utils/motionStateMachine.js';
import { AngleSmoother } from './smoothing.js';

/**
 * ExerciseTracker: Wraps the strict MotionStateMachine with angle smoothing,
 * mandatory landmark visibility gating, horizontal posture validation,
 * and posture alert forwarding.
 */
export class ExerciseTracker {
  constructor(onRepReported, exerciseId = 'push-up', onPostureAlert = null) {
    this.onRepReported = onRepReported;
    this.onPostureAlert = onPostureAlert;
    this.exerciseId = (exerciseId || 'push-up').toLowerCase();

    this.fsm = new MotionStateMachine(
      this.exerciseId,
      (repData) => {
        this.liveCue = '✓ Rep counted! Great work.';
        if (this.onRepReported) {
          this.onRepReported(repData);
        }
      },
      (alertData) => {
        if (this.onPostureAlert) {
          this.onPostureAlert(alertData);
        }
      }
    );

    this.smoother = new AngleSmoother(3);
    this.activeAngle = 180;
    this.secondaryAngle = 180;
    this.coreAngle = 180;
    this.liveCue = 'Get into position to begin.';
    this.isFormValid = true;
    this.consecutiveOutOfFrame = 0;
  }

  setExercise(exerciseId) {
    this.exerciseId = (exerciseId || 'push-up').toLowerCase();
    this.fsm.setProfile(this.exerciseId);
    this.reset();
  }

  reset() {
    this.smoother.reset();
    this.fsm.reset();
    this.consecutiveOutOfFrame = 0;
    this.liveCue = 'Get into position to begin.';
    this.isFormValid = true;
    this.activeAngle = 180;
    this.secondaryAngle = 180;
    this.coreAngle = 180;
  }

  resetSetAccuracy() {
    this.fsm.resetSetAccuracy();
  }

  processFrame(angles, _landmarks) {
    const isPushup = this.exerciseId === 'push-up';

    // 1. Mandatory Landmark Visibility Gate for Push-Ups (Task 1)
    if (isPushup && angles && !angles.pushupVisibilityPass) {
      this.fsm.update({
        pushupVisibilityPass: false,
        isPushup: true,
      });

      this.liveCue =
        '⚠️ Full body not detected. Step back until your shoulders, arms, and hips are clearly visible in plank position.';
      this.isFormValid = false;

      return {
        stage: FSM_STAGES.NOT_IN_POSITION,
        liveCue: this.liveCue,
        isFormValid: false,
        activeAngle: '--',
        secondaryAngle: '--',
        coreAngle: '--',
        activeAngleLabel: 'Elbow',
        secondaryAngleLabel: 'Hip',
        anglesDisabled: true,
        visibilityWarning: true,
        notInPositionWarning: false,
        isPlankValid: false,
        postureLabel: 'Not Detected',
        torsoTiltDeg: angles.torsoTiltDeg,
      };
    }

    // 2. Horizontal Push-Up Posture Validation (Body Orientation Check - Task 2)
    if (isPushup && angles && !angles.isHorizontalPlank) {
      this.fsm.update({
        pushupVisibilityPass: true,
        isHorizontalPlank: false,
        isPushup: true,
      });

      this.liveCue = 'Get into a plank on the floor to start push-ups.';
      this.isFormValid = false;

      return {
        stage: FSM_STAGES.NOT_IN_POSITION,
        liveCue: this.liveCue,
        isFormValid: false,
        activeAngle: '--',
        secondaryAngle: '--',
        coreAngle: '--',
        activeAngleLabel: 'Elbow',
        secondaryAngleLabel: 'Hip',
        anglesDisabled: true,
        visibilityWarning: false,
        notInPositionWarning: true,
        isPlankValid: false,
        postureLabel: 'Upright',
        torsoTiltDeg: angles.torsoTiltDeg,
      };
    }

    // 3. Out of Frame check
    if (!angles || !angles.inFrame) {
      this.consecutiveOutOfFrame += 1;
      if (this.consecutiveOutOfFrame > 10) {
        this.liveCue = 'Step back so your full body is visible.';
        this.isFormValid = false;
      }
      return {
        stage: this.fsm.currentStage,
        liveCue: this.liveCue,
        isFormValid: this.isFormValid,
        activeAngle: '--',
        secondaryAngle: '--',
        coreAngle: '--',
        activeAngleLabel: angles?.activeAngleLabel || 'Angle',
        secondaryAngleLabel: angles?.secondaryAngleLabel || 'Hip',
        anglesDisabled: true,
        visibilityWarning: false,
        notInPositionWarning: false,
        isPlankValid: false,
        postureLabel: 'Out of Frame',
        torsoTiltDeg: angles?.torsoTiltDeg,
      };
    }

    this.consecutiveOutOfFrame = 0;
    this.isFormValid = true;

    // Smooth angles
    const angle = this.smoother.smooth('active', angles.activeAngle);
    const secAngle = this.smoother.smooth('secondary', angles.secondaryAngle);
    const coreAngle = this.smoother.smooth('core', angles.coreAngle || 180);

    this.activeAngle = angle;
    this.secondaryAngle = secAngle;
    this.coreAngle = coreAngle;

    // Advance strict motion tracking state machine (Task 3)
    const fsmResult = this.fsm.update({
      primaryAngle: angle,
      coreAngle: coreAngle,
      inFrame: true,
      pushupVisibilityPass: true,
      isHorizontalPlank: true,
      isPushup: isPushup,
    });

    const perfFeedback = getPerformanceTier(fsmResult.runningAccuracy);

    // Provide contextual live cues based on current stage
    switch (fsmResult.stage) {
      case FSM_STAGES.NOT_IN_POSITION:
        this.liveCue = isPushup
          ? 'Get into a plank on the floor to start push-ups.'
          : 'Get into position to begin.';
        this.isFormValid = false;
        break;
      case FSM_STAGES.STANDBY:
        this.liveCue = isPushup
          ? 'Hold stable plank position to begin (lock arms & keep core straight)...'
          : 'Ready in starting position.';
        break;
      case FSM_STAGES.IDLE:
        if (fsmResult.completedRepsCount > 0) {
          this.liveCue = isPushup
            ? `In starting plank. ${perfFeedback}`
            : `In starting position. ${perfFeedback}`;
        } else {
          this.liveCue = isPushup
            ? 'In starting plank. Lower your chest to begin push-up!'
            : 'In starting position. Begin your rep!';
        }
        break;
      case FSM_STAGES.DESCENDING:
        this.liveCue = 'Lowering down... reach 90° depth';
        break;
      case FSM_STAGES.BOTTOM_REACHED:
        this.liveCue = '🔥 Good depth! Now press all the way up.';
        break;
      case FSM_STAGES.ASCENDING:
        this.liveCue = 'Pushing up... lock out your arms!';
        break;
      case FSM_STAGES.REP_COMPLETED:
        this.liveCue = `✓ Rep completed! ${perfFeedback}`;
        break;
      default:
        break;
    }

    return {
      stage: fsmResult.stage,
      liveCue: this.liveCue,
      isFormValid: this.isFormValid,
      activeAngle: angle,
      secondaryAngle: secAngle,
      coreAngle: coreAngle,
      activeAngleLabel: angles.activeAngleLabel,
      secondaryAngleLabel: angles.secondaryAngleLabel,
      anglesDisabled: false,
      visibilityWarning: false,
      notInPositionWarning: false,
      isPlankValid: true,
      postureLabel: 'Plank',
      torsoTiltDeg: angles.torsoTiltDeg,
      runningAccuracy: fsmResult.runningAccuracy,
      repScore: fsmResult.repScore,
      completedRepsCount: fsmResult.completedRepsCount,
    };
  }
}

export const PushupTracker = ExerciseTracker;
