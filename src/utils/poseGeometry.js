/**
 * Biomechanical Pose Geometry & Exercise Analytics Engine
 * Provides vector angle math and real-time exercise rep counting with form validation.
 */

// Landmark index mapping from MediaPipe Pose:
export const POSE_LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
};

/**
 * Calculates the angle between three landmarks A -> B -> C (vertex at B)
 * Returns degrees [0..180]
 */
export function calculateAngle(a, b, c) {
  if (!a || !b || !c) return 180;

  const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
  const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (c.z || 0) };

  const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y + ab.z * ab.z);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y + cb.z * cb.z);

  if (magAB * magCB === 0) return 180;

  let cosine = dot / (magAB * magCB);
  // Clamp to [-1, 1] to prevent NaN from floating point precision
  cosine = Math.min(1.0, Math.max(-1.0, cosine));

  return Math.round((Math.acos(cosine) * 180) / Math.PI);
}

/**
 * Extracts key biomechanical joint angles from landmark array
 */
export function extractJointAngles(landmarks) {
  if (!landmarks || landmarks.length < 33) {
    return {
      leftElbow: 165,
      rightElbow: 165,
      leftKnee: 175,
      rightKnee: 175,
      leftShoulder: 25,
      rightShoulder: 25,
      leftHip: 170,
      rightHip: 170,
      torsoInclination: 90,
    };
  }

  const ls = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const rs = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER];
  const le = landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const re = landmarks[POSE_LANDMARKS.RIGHT_ELBOW];
  const lw = landmarks[POSE_LANDMARKS.LEFT_WRIST];
  const rw = landmarks[POSE_LANDMARKS.RIGHT_WRIST];
  const lh = landmarks[POSE_LANDMARKS.LEFT_HIP];
  const rh = landmarks[POSE_LANDMARKS.RIGHT_HIP];
  const lk = landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const rk = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
  const la = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const ra = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

  const leftElbow = calculateAngle(ls, le, lw);
  const rightElbow = calculateAngle(rs, re, rw);
  const leftKnee = calculateAngle(lh, lk, la);
  const rightKnee = calculateAngle(rh, rk, ra);
  const leftShoulder = calculateAngle(lh, ls, le);
  const rightShoulder = calculateAngle(rh, rs, re);
  const leftHip = calculateAngle(ls, lh, lk);
  const rightHip = calculateAngle(rs, rh, rk);

  // Torso inclination relative to vertical
  const midShoulderY = (ls.y + rs.y) / 2;
  const midShoulderX = (ls.x + rs.x) / 2;
  const midHipY = (lh.y + rh.y) / 2;
  const midHipX = (lh.x + rh.x) / 2;
  const torsoAngle = Math.round(
    Math.abs(Math.atan2(midHipY - midShoulderY, midHipX - midShoulderX) * (180 / Math.PI))
  );

  return {
    leftElbow,
    rightElbow,
    leftKnee,
    rightKnee,
    leftShoulder,
    rightShoulder,
    leftHip,
    rightHip,
    torsoInclination: torsoAngle,
  };
}

/**
 * Exercise Definition Catalog with biomechanical form criteria
 */
export const EXERCISE_CATALOG = {
  squats: {
    id: 'squats',
    name: 'Bodyweight Squats',
    targetMuscles: 'Quadriceps, Glutes, Hamstrings',
    primaryAngle: 'Knee Flexion',
    calPerRep: 0.32,
    thresholds: {
      downAngle: 95,      // Deep squat depth
      upAngle: 160,       // Full extension at top
      minDepth: 85,       // Elite parallel depth
    },
  },
  bicepCurls: {
    id: 'bicepCurls',
    name: 'Bicep Curls',
    targetMuscles: 'Biceps Brachii, Brachialis',
    primaryAngle: 'Elbow Flexion',
    calPerRep: 0.18,
    thresholds: {
      contractedAngle: 50, // Peak squeeze
      extendedAngle: 150,  // Full stretch
    },
  },
  shoulderPress: {
    id: 'shoulderPress',
    name: 'Overhead Press',
    targetMuscles: 'Anterior Deltoids, Triceps',
    primaryAngle: 'Elbow & Shoulder Extension',
    calPerRep: 0.28,
    thresholds: {
      bottomAngle: 75,
      lockoutAngle: 165,
    },
  },
  lunges: {
    id: 'lunges',
    name: 'Forward Lunges',
    targetMuscles: 'Quadriceps, Glutes, Calves',
    primaryAngle: 'Front Knee Flexion',
    calPerRep: 0.35,
    thresholds: {
      lungeDepth: 90,
      standingAngle: 160,
    },
  },
  jumpingJacks: {
    id: 'jumpingJacks',
    name: 'Jumping Jacks',
    targetMuscles: 'Full Body Cardio, Calves',
    primaryAngle: 'Shoulder Abduction',
    calPerRep: 0.22,
    thresholds: {
      armsUp: 140,
      armsDown: 40,
    },
  },
  pushups: {
    id: 'pushups',
    name: 'Push-Ups',
    targetMuscles: 'Pectoralis Major, Triceps, Core',
    primaryAngle: 'Elbow Flexion & Core Planks',
    calPerRep: 0.38,
    thresholds: {
      bottomElbow: 90,
      topElbow: 160,
    },
  },
};

/**
 * Exercise State Machine Analyzer
 * Evaluates repetition completion and real-time form accuracy
 */
export class ExerciseAnalyzer {
  constructor(exerciseType = 'squats') {
    this.exerciseType = exerciseType;
    this.stage = 'UP'; // 'UP', 'DOWN', 'PEAK'
    this.repCount = 0;
    this.caloriesBurned = 0;
    this.formScore = 100;
    this.feedback = 'Ready to begin';
    this.lastRepTimestamp = 0;
  }

  setExercise(type) {
    if (this.exerciseType !== type) {
      this.exerciseType = type;
      this.stage = 'UP';
      this.feedback = `Ready for ${EXERCISE_CATALOG[type]?.name || type}`;
    }
  }

  reset() {
    this.stage = 'UP';
    this.repCount = 0;
    this.caloriesBurned = 0;
    this.formScore = 100;
    this.feedback = 'Ready to begin';
  }

  analyze(angles) {
    if (!angles) return this.getState();
    const config = EXERCISE_CATALOG[this.exerciseType] || EXERCISE_CATALOG.squats;
    const now = Date.now();

    switch (this.exerciseType) {
      case 'squats': {
        const avgKnee = (angles.leftKnee + angles.rightKnee) / 2;

        if (avgKnee < config.thresholds.downAngle) {
          if (this.stage === 'UP') {
            this.stage = 'DOWN';
            if (avgKnee < config.thresholds.minDepth) {
              this.feedback = '🔥 Excellent Depth!';
              this.formScore = Math.min(100, this.formScore + 2);
            } else {
              this.feedback = 'Good depth, push up!';
              this.formScore = Math.max(70, this.formScore - 1);
            }
          }
        } else if (avgKnee > config.thresholds.upAngle && this.stage === 'DOWN') {
          // Debounce reps (min 0.6s between reps)
          if (now - this.lastRepTimestamp > 600) {
            this.repCount += 1;
            this.caloriesBurned += config.calPerRep;
            this.lastRepTimestamp = now;
            this.feedback = `✓ Rep ${this.repCount} complete!`;
          }
          this.stage = 'UP';
        } else if (this.stage === 'UP' && avgKnee < 140 && avgKnee > config.thresholds.downAngle) {
          this.feedback = 'Squat lower to 90°';
        }
        break;
      }

      case 'bicepCurls': {
        const avgElbow = (angles.leftElbow + angles.rightElbow) / 2;

        if (avgElbow < config.thresholds.contractedAngle) {
          if (this.stage === 'DOWN' || this.stage === 'UP') {
            this.stage = 'PEAK';
            this.feedback = '💪 Squeeze at the top!';
          }
        } else if (avgElbow > config.thresholds.extendedAngle && this.stage === 'PEAK') {
          if (now - this.lastRepTimestamp > 600) {
            this.repCount += 1;
            this.caloriesBurned += config.calPerRep;
            this.lastRepTimestamp = now;
            this.feedback = `✓ Curl ${this.repCount} complete!`;
          }
          this.stage = 'DOWN';
        } else if (this.stage === 'DOWN' && avgElbow < 120 && avgElbow > config.thresholds.contractedAngle) {
          this.feedback = 'Curl all the way up';
        }
        break;
      }

      case 'shoulderPress': {
        const avgElbow = (angles.leftElbow + angles.rightElbow) / 2;
        const avgShoulder = (angles.leftShoulder + angles.rightShoulder) / 2;

        if (avgElbow > config.thresholds.lockoutAngle && avgShoulder > 120) {
          if (this.stage === 'DOWN') {
            this.stage = 'LOCKOUT';
            if (now - this.lastRepTimestamp > 600) {
              this.repCount += 1;
              this.caloriesBurned += config.calPerRep;
              this.lastRepTimestamp = now;
              this.feedback = `✓ Overhead Press ${this.repCount}!`;
            }
          }
        } else if (avgElbow < config.thresholds.bottomAngle) {
          this.stage = 'DOWN';
          this.feedback = 'Press explosively overhead!';
        }
        break;
      }

      case 'jumpingJacks': {
        const avgShoulder = (angles.leftShoulder + angles.rightShoulder) / 2;
        if (avgShoulder > config.thresholds.armsUp) {
          if (this.stage === 'DOWN') {
            this.stage = 'UP';
          }
        } else if (avgShoulder < config.thresholds.armsDown && this.stage === 'UP') {
          if (now - this.lastRepTimestamp > 400) {
            this.repCount += 1;
            this.caloriesBurned += config.calPerRep;
            this.lastRepTimestamp = now;
            this.feedback = `⚡ Jack ${this.repCount}!`;
          }
          this.stage = 'DOWN';
        }
        break;
      }

      case 'lunges': {
        const minKnee = Math.min(angles.leftKnee, angles.rightKnee);
        if (minKnee < config.thresholds.lungeDepth) {
          if (this.stage === 'UP') {
            this.stage = 'DOWN';
            this.feedback = 'Solid lunge depth!';
          }
        } else if (minKnee > config.thresholds.standingAngle && this.stage === 'DOWN') {
          if (now - this.lastRepTimestamp > 800) {
            this.repCount += 1;
            this.caloriesBurned += config.calPerRep;
            this.lastRepTimestamp = now;
            this.feedback = `✓ Lunge ${this.repCount} complete!`;
          }
          this.stage = 'UP';
        }
        break;
      }

      case 'pushups': {
        const avgElbow = (angles.leftElbow + angles.rightElbow) / 2;
        if (avgElbow < config.thresholds.bottomElbow) {
          if (this.stage === 'UP') {
            this.stage = 'DOWN';
            this.feedback = 'Good depth, push the floor away!';
          }
        } else if (avgElbow > config.thresholds.topElbow && this.stage === 'DOWN') {
          if (now - this.lastRepTimestamp > 600) {
            this.repCount += 1;
            this.caloriesBurned += config.calPerRep;
            this.lastRepTimestamp = now;
            this.feedback = `✓ Push-up ${this.repCount}!`;
          }
          this.stage = 'UP';
        }
        break;
      }

      default:
        break;
    }

    return this.getState();
  }

  getState() {
    return {
      exerciseType: this.exerciseType,
      repCount: this.repCount,
      caloriesBurned: Math.round(this.caloriesBurned * 10) / 10,
      formScore: Math.round(this.formScore),
      feedback: this.feedback,
      stage: this.stage,
    };
  }
}
