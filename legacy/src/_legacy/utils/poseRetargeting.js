import * as THREE from 'three';
import { POSE_LANDMARKS } from './poseGeometry';

/**
 * Common standard humanoid bone name variations across Mixamo, Ready Player Me, and Three.js rigs
 */
export const SKELETON_BONE_MAPPING = {
  hips: ['mixamorigHips', 'Hips', 'pelvis', 'root'],
  spine: ['mixamorigSpine', 'mixamorigSpine1', 'Spine', 'Spine1', 'spine'],
  chest: ['mixamorigSpine2', 'Spine2', 'chest', 'upper_chest'],
  neck: ['mixamorigNeck', 'Neck', 'neck'],
  head: ['mixamorigHead', 'Head', 'head'],

  leftArm: ['mixamorigLeftArm', 'LeftArm', 'left_arm', 'shoulder_l'],
  leftForeArm: ['mixamorigLeftForeArm', 'LeftForeArm', 'left_forearm', 'elbow_l'],
  leftHand: ['mixamorigLeftHand', 'LeftHand', 'left_hand', 'wrist_l'],

  rightArm: ['mixamorigRightArm', 'RightArm', 'right_arm', 'shoulder_r'],
  rightForeArm: ['mixamorigRightForeArm', 'RightForeArm', 'right_forearm', 'elbow_r'],
  rightHand: ['mixamorigRightHand', 'RightHand', 'right_hand', 'wrist_r'],

  leftUpLeg: ['mixamorigLeftUpLeg', 'LeftUpLeg', 'left_upleg', 'thigh_l'],
  leftLeg: ['mixamorigLeftLeg', 'LeftLeg', 'left_leg', 'knee_l'],
  leftFoot: ['mixamorigLeftFoot', 'LeftFoot', 'left_foot', 'ankle_l'],

  rightUpLeg: ['mixamorigRightUpLeg', 'RightUpLeg', 'right_upleg', 'thigh_r'],
  rightLeg: ['mixamorigRightLeg', 'RightLeg', 'right_leg', 'knee_r'],
  rightFoot: ['mixamorigRightFoot', 'RightFoot', 'right_foot', 'ankle_r'],
};

/**
 * Finds a bone by alias list in a Three.js skeleton or bone dictionary
 */
export function findBone(boneContainer, aliases) {
  if (!boneContainer) return null;

  // If boneContainer is a Map or plain object with direct keys
  for (const alias of aliases) {
    if (boneContainer[alias]) return boneContainer[alias];
  }

  // If boneContainer has a find / traverse method (e.g. Three.js Object3D / Skeleton)
  if (boneContainer.bones && Array.isArray(boneContainer.bones)) {
    for (const alias of aliases) {
      const found = boneContainer.bones.find((b) => b.name === alias);
      if (found) return found;
    }
  }

  if (boneContainer.getObjectByName) {
    for (const alias of aliases) {
      const found = boneContainer.getObjectByName(alias);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Converts a MediaPipe landmark to a Three.js Vector3 in world orientation space
 * (Inverts Y axis to match 3D coordinate system where +Y is up)
 */
function toVector3(landmark) {
  if (!landmark) return new THREE.Vector3(0, 0, 0);
  return new THREE.Vector3(landmark.x - 0.5, -(landmark.y - 0.5), -(landmark.z || 0));
}

// Temporary calculation objects to avoid per-frame GC allocations
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _restDown = new THREE.Vector3(0, -1, 0);
const _restLeft = new THREE.Vector3(-1, 0, 0);
const _restRight = new THREE.Vector3(1, 0, 0);
const _restUp = new THREE.Vector3(0, 1, 0);

/**
 * Real-Time Pose Retargeting Engine
 * Maps 3D MediaPipe landmarks to the avatar's skeletal bone hierarchy
 * and applies continuous Quaternion SLERP smoothing.
 *
 * @param {Array} landmarks - 33 MediaPipe pose landmarks
 * @param {Object} skeleton - Skeleton object, bone map, or root 3D Object
 * @param {Object} options - Retargeting options (smoothing alpha, hip translation scale)
 */
export function retargetPoseToSkeleton(landmarks, skeleton, options = {}) {
  if (!landmarks || landmarks.length < 33 || !skeleton) return;

  const alpha = options.smoothingAlpha ?? 0.25; // SLERP dampening factor (0.1 = heavy smooth, 0.4 = snappy)
  const isMirrored = options.isMirrored ?? true;

  // Extract key 3D landmark points
  const p = isMirrored
    ? {
        // Swap left and right for mirror selfie camera view
        ls: toVector3(landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]),
        rs: toVector3(landmarks[POSE_LANDMARKS.LEFT_SHOULDER]),
        le: toVector3(landmarks[POSE_LANDMARKS.RIGHT_ELBOW]),
        re: toVector3(landmarks[POSE_LANDMARKS.LEFT_ELBOW]),
        lw: toVector3(landmarks[POSE_LANDMARKS.RIGHT_WRIST]),
        rw: toVector3(landmarks[POSE_LANDMARKS.LEFT_WRIST]),
        lh: toVector3(landmarks[POSE_LANDMARKS.RIGHT_HIP]),
        rh: toVector3(landmarks[POSE_LANDMARKS.LEFT_HIP]),
        lk: toVector3(landmarks[POSE_LANDMARKS.RIGHT_KNEE]),
        rk: toVector3(landmarks[POSE_LANDMARKS.LEFT_KNEE]),
        la: toVector3(landmarks[POSE_LANDMARKS.RIGHT_ANKLE]),
        ra: toVector3(landmarks[POSE_LANDMARKS.LEFT_ANKLE]),
        nose: toVector3(landmarks[POSE_LANDMARKS.NOSE]),
      }
    : {
        ls: toVector3(landmarks[POSE_LANDMARKS.LEFT_SHOULDER]),
        rs: toVector3(landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]),
        le: toVector3(landmarks[POSE_LANDMARKS.LEFT_ELBOW]),
        re: toVector3(landmarks[POSE_LANDMARKS.RIGHT_ELBOW]),
        lw: toVector3(landmarks[POSE_LANDMARKS.LEFT_WRIST]),
        rw: toVector3(landmarks[POSE_LANDMARKS.RIGHT_WRIST]),
        lh: toVector3(landmarks[POSE_LANDMARKS.LEFT_HIP]),
        rh: toVector3(landmarks[POSE_LANDMARKS.RIGHT_HIP]),
        lk: toVector3(landmarks[POSE_LANDMARKS.LEFT_KNEE]),
        rk: toVector3(landmarks[POSE_LANDMARKS.RIGHT_KNEE]),
        la: toVector3(landmarks[POSE_LANDMARKS.LEFT_ANKLE]),
        ra: toVector3(landmarks[POSE_LANDMARKS.RIGHT_ANKLE]),
        nose: toVector3(landmarks[POSE_LANDMARKS.NOSE]),
      };

  // 1. LEFT UPPER ARM (Shoulder -> Elbow)
  const leftArmBone = findBone(skeleton, SKELETON_BONE_MAPPING.leftArm);
  if (leftArmBone) {
    _dir.subVectors(p.le, p.ls).normalize();
    // Rest orientation for T-pose left arm is pointing left (-X)
    _targetQuat.setFromUnitVectors(_restLeft, _dir);
    leftArmBone.quaternion.slerp(_targetQuat, alpha);
  }

  // 2. LEFT FOREARM (Elbow -> Wrist)
  const leftForeArmBone = findBone(skeleton, SKELETON_BONE_MAPPING.leftForeArm);
  if (leftForeArmBone) {
    _dir.subVectors(p.lw, p.le).normalize();
    _targetQuat.setFromUnitVectors(_restLeft, _dir);
    leftForeArmBone.quaternion.slerp(_targetQuat, alpha);
  }

  // 3. RIGHT UPPER ARM (Shoulder -> Elbow)
  const rightArmBone = findBone(skeleton, SKELETON_BONE_MAPPING.rightArm);
  if (rightArmBone) {
    _dir.subVectors(p.re, p.rs).normalize();
    // Rest orientation for T-pose right arm is pointing right (+X)
    _targetQuat.setFromUnitVectors(_restRight, _dir);
    rightArmBone.quaternion.slerp(_targetQuat, alpha);
  }

  // 4. RIGHT FOREARM (Elbow -> Wrist)
  const rightForeArmBone = findBone(skeleton, SKELETON_BONE_MAPPING.rightForeArm);
  if (rightForeArmBone) {
    _dir.subVectors(p.rw, p.re).normalize();
    _targetQuat.setFromUnitVectors(_restRight, _dir);
    rightForeArmBone.quaternion.slerp(_targetQuat, alpha);
  }

  // 5. LEFT THIGH / UP LEG (Hip -> Knee)
  const leftUpLegBone = findBone(skeleton, SKELETON_BONE_MAPPING.leftUpLeg);
  if (leftUpLegBone) {
    _dir.subVectors(p.lk, p.lh).normalize();
    // Rest orientation for legs is pointing downwards (-Y)
    _targetQuat.setFromUnitVectors(_restDown, _dir);
    leftUpLegBone.quaternion.slerp(_targetQuat, alpha);
  }

  // 6. LEFT SHIN / LEG (Knee -> Ankle)
  const leftLegBone = findBone(skeleton, SKELETON_BONE_MAPPING.leftLeg);
  if (leftLegBone) {
    _dir.subVectors(p.la, p.lk).normalize();
    _targetQuat.setFromUnitVectors(_restDown, _dir);
    leftLegBone.quaternion.slerp(_targetQuat, alpha);
  }

  // 7. RIGHT THIGH / UP LEG (Hip -> Knee)
  const rightUpLegBone = findBone(skeleton, SKELETON_BONE_MAPPING.rightUpLeg);
  if (rightUpLegBone) {
    _dir.subVectors(p.rk, p.rh).normalize();
    _targetQuat.setFromUnitVectors(_restDown, _dir);
    rightUpLegBone.quaternion.slerp(_targetQuat, alpha);
  }

  // 8. RIGHT SHIN / LEG (Knee -> Ankle)
  const rightLegBone = findBone(skeleton, SKELETON_BONE_MAPPING.rightLeg);
  if (rightLegBone) {
    _dir.subVectors(p.ra, p.rk).normalize();
    _targetQuat.setFromUnitVectors(_restDown, _dir);
    rightLegBone.quaternion.slerp(_targetQuat, alpha);
  }

  // 9. SPINE & TORSO (Mid-Hip -> Mid-Shoulder)
  const spineBone = findBone(skeleton, SKELETON_BONE_MAPPING.spine);
  if (spineBone) {
    const midHip = _v1.addVectors(p.lh, p.rh).multiplyScalar(0.5);
    const midShoulder = _v2.addVectors(p.ls, p.rs).multiplyScalar(0.5);
    _dir.subVectors(midShoulder, midHip).normalize();
    _targetQuat.setFromUnitVectors(_restUp, _dir);
    spineBone.quaternion.slerp(_targetQuat, alpha * 0.7);
  }

  // 10. HIPS TRANSLATION (Vertical Squat / Lunge Dip)
  const hipsBone = findBone(skeleton, SKELETON_BONE_MAPPING.hips);
  if (hipsBone) {
    // Calculate leg compression (standing height vs squatted height)
    const legSpanLeft = p.lh.distanceTo(p.lk) + p.lk.distanceTo(p.la);
    const directDistLeft = p.lh.distanceTo(p.la);
    const compression = Math.max(0, legSpanLeft - directDistLeft);

    const targetY = -(compression * 1.5);
    hipsBone.position.y = THREE.MathUtils.lerp(hipsBone.position.y, targetY, alpha);
  }
}
