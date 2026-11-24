import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { retargetPoseToSkeleton } from '../utils/poseRetargeting';

/**
 * Realistic Human Athletic Physique Avatar with Standard Bone Hierarchy
 * Supports both real-time Quaternion SLERP retargeting (Mirror Mode) and
 * reference exercise animation loops (Demo Mode).
 */
function RealisticHumanAvatar({
  muscleMass = 72,
  bodyFat = 13,
  heightScale = 1.0,
  activePose = 'athletic',
  landmarks = null,
  liveAngles = null,
  trackingMode = 'demo', // 'demo' vs 'mirror'
  selectedExercise = 'squats',
}) {
  const rootRef = useRef();
  const hipsRef = useRef();
  const chestRef = useRef();
  const headRef = useRef();

  const leftUpperArmRef = useRef();
  const rightUpperArmRef = useRef();
  const leftForearmRef = useRef();
  const rightForearmRef = useRef();

  const leftThighRef = useRef();
  const rightThighRef = useRef();
  const leftCalfRef = useRef();
  const rightCalfRef = useRef();

  // Morph targets (smooth lerping)
  const currentMuscle = useRef(muscleMass);
  const currentFat = useRef(bodyFat);
  const currentHeight = useRef(heightScale);

  const muscleFactor = 0.85 + (muscleMass / 100) * 0.5;
  const fatFactor = 0.88 + (bodyFat / 100) * 0.35;

  // Build standard bone container mapping to procedural rig joints
  const skeletonMap = useMemo(() => {
    return {
      mixamorigHips: hipsRef.current,
      mixamorigSpine: chestRef.current,
      mixamorigHead: headRef.current,
      mixamorigLeftArm: leftUpperArmRef.current,
      mixamorigLeftForeArm: leftForearmRef.current,
      mixamorigRightArm: rightUpperArmRef.current,
      mixamorigRightForeArm: rightForearmRef.current,
      mixamorigLeftUpLeg: leftThighRef.current,
      mixamorigLeftLeg: leftCalfRef.current,
      mixamorigRightUpLeg: rightThighRef.current,
      mixamorigRightLeg: rightCalfRef.current,
    };
  }, []);

  // Realistic Human Physically Based Materials
  const materials = useMemo(() => {
    const skin = new THREE.MeshStandardMaterial({
      color: '#c99274',
      roughness: 0.58,
      metalness: 0.04,
      emissive: '#3d1c14',
      emissiveIntensity: 0.08,
    });

    const apparel = new THREE.MeshStandardMaterial({
      color: '#1a1f2c',
      roughness: 0.45,
      metalness: 0.15,
    });

    const apparelTrim = new THREE.MeshStandardMaterial({
      color: '#00f2fe',
      emissive: '#00f2fe',
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });

    const footwear = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.35,
      metalness: 0.25,
    });

    const shoeSole = new THREE.MeshStandardMaterial({
      color: '#10b981',
      emissive: '#10b981',
      emissiveIntensity: 0.5,
    });

    return { skin, apparel, apparelTrim, footwear, shoeSole };
  }, []);

  // Animation & Retargeting Loop
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // 1. Smoothly interpolate morphology for realistic feel
    currentMuscle.current = THREE.MathUtils.lerp(currentMuscle.current, muscleFactor, delta * 6);
    currentFat.current = THREE.MathUtils.lerp(currentFat.current, fatFactor, delta * 6);
    currentHeight.current = THREE.MathUtils.lerp(currentHeight.current, heightScale, delta * 6);

    const m = currentMuscle.current;
    const f = currentFat.current;

    // 2. Realistic breathing (subtle ribcage expansion)
    const breath = Math.sin(t * 1.8) * 0.015;
    if (chestRef.current) {
      chestRef.current.scale.set(m * (1 + breath), 1 + breath * 0.5, (m * 0.95 + (f - 1) * 0.2) * (1 + breath));
    }

    // Refresh dynamic bone references in skeleton map
    skeletonMap.mixamorigHips = hipsRef.current;
    skeletonMap.mixamorigSpine = chestRef.current;
    skeletonMap.mixamorigHead = headRef.current;
    skeletonMap.mixamorigLeftArm = leftUpperArmRef.current;
    skeletonMap.mixamorigLeftForeArm = leftForearmRef.current;
    skeletonMap.mixamorigRightArm = rightUpperArmRef.current;
    skeletonMap.mixamorigRightForeArm = rightForearmRef.current;
    skeletonMap.mixamorigLeftUpLeg = leftThighRef.current;
    skeletonMap.mixamorigLeftLeg = leftCalfRef.current;
    skeletonMap.mixamorigRightUpLeg = rightThighRef.current;
    skeletonMap.mixamorigRightLeg = rightCalfRef.current;

    // ================= MIRROR MODE: REAL-TIME POSE RETARGETING =================
    if (trackingMode === 'mirror' && landmarks && landmarks.length >= 33) {
      retargetPoseToSkeleton(landmarks, skeletonMap, {
        smoothingAlpha: 0.28,
        isMirrored: true,
      });
    }
    // ================= DEMO MODE: REFERENCE EXERCISE LOOP =================
    else {
      // Smooth sinusoidal exercise animation loop (2.4s cycle)
      const cycle = (Math.sin(t * 2.6) + 1) / 2; // 0..1

      if (selectedExercise === 'squats') {
        // Deep squat motion
        const kneeFlex = cycle * 1.4;
        if (leftThighRef.current) leftThighRef.current.rotation.set(-kneeFlex * 0.8, 0, 0.12);
        if (rightThighRef.current) rightThighRef.current.rotation.set(-kneeFlex * 0.8, 0, -0.12);
        if (leftCalfRef.current) leftCalfRef.current.rotation.set(kneeFlex, 0, 0);
        if (rightCalfRef.current) rightCalfRef.current.rotation.set(kneeFlex, 0, 0);
        if (hipsRef.current) hipsRef.current.position.y = -Math.sin(cycle * Math.PI * 0.5) * 0.38;

        // Counterbalance arms forward
        if (leftUpperArmRef.current) leftUpperArmRef.current.rotation.set(-0.2 - cycle * 1.1, 0, 0.15);
        if (rightUpperArmRef.current) rightUpperArmRef.current.rotation.set(-0.2 - cycle * 1.1, 0, -0.15);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.2, 0, 0);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.2, 0, 0);
      } else if (selectedExercise === 'bicepCurls') {
        // Alternating / simultaneous bicep curls
        if (hipsRef.current) hipsRef.current.position.y = 0;
        if (leftThighRef.current) leftThighRef.current.rotation.set(0, 0, 0.06);
        if (rightThighRef.current) rightThighRef.current.rotation.set(0, 0, -0.06);
        if (leftCalfRef.current) leftCalfRef.current.rotation.set(0, 0, 0);
        if (rightCalfRef.current) rightCalfRef.current.rotation.set(0, 0, 0);

        const curl = cycle * 2.1;
        if (leftUpperArmRef.current) leftUpperArmRef.current.rotation.set(0.1, 0, 0.2);
        if (rightUpperArmRef.current) rightUpperArmRef.current.rotation.set(0.1, 0, -0.2);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(-curl, 0, 0);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(-curl, 0, 0);
      } else if (selectedExercise === 'shoulderPress') {
        if (hipsRef.current) hipsRef.current.position.y = 0;
        const press = cycle * 1.8;
        if (leftUpperArmRef.current) leftUpperArmRef.current.rotation.set(0, 0, 1.2 + press * 0.3);
        if (rightUpperArmRef.current) rightUpperArmRef.current.rotation.set(0, 0, -1.2 - press * 0.3);
        if (leftForearmRef.current) leftForearmRef.current.rotation.set(press, 0, 0);
        if (rightForearmRef.current) rightForearmRef.current.rotation.set(press, 0, 0);
      } else {
        // Fallback to activePose preset
        if (hipsRef.current) hipsRef.current.position.y = activePose === 'squat' ? -0.32 : 0;
        if (activePose === 'athletic') {
          if (leftUpperArmRef.current) leftUpperArmRef.current.rotation.set(0.15, 0, 0.22);
          if (rightUpperArmRef.current) rightUpperArmRef.current.rotation.set(0.15, 0, -0.22);
          if (leftForearmRef.current) leftForearmRef.current.rotation.set(-0.35, 0, 0);
          if (rightForearmRef.current) rightForearmRef.current.rotation.set(-0.35, 0, 0);
          if (leftThighRef.current) leftThighRef.current.rotation.set(0, 0, 0.06);
          if (rightThighRef.current) rightThighRef.current.rotation.set(0, 0, -0.06);
        } else if (activePose === 'flex') {
          if (leftUpperArmRef.current) leftUpperArmRef.current.rotation.set(0, 0, 1.45);
          if (rightUpperArmRef.current) rightUpperArmRef.current.rotation.set(0, 0, -1.45);
          if (leftForearmRef.current) leftForearmRef.current.rotation.set(1.65, 0, 0.25);
          if (rightForearmRef.current) rightForearmRef.current.rotation.set(1.65, 0, -0.25);
        } else if (activePose === 'squat') {
          if (leftUpperArmRef.current) leftUpperArmRef.current.rotation.set(-1.15, 0, 0.12);
          if (rightUpperArmRef.current) rightUpperArmRef.current.rotation.set(-1.15, 0, -0.12);
          if (leftThighRef.current) leftThighRef.current.rotation.set(-0.65, 0, 0.16);
          if (rightThighRef.current) rightThighRef.current.rotation.set(-0.65, 0, -0.16);
          if (leftCalfRef.current) leftCalfRef.current.rotation.set(0.65, 0, 0);
          if (rightCalfRef.current) rightCalfRef.current.rotation.set(0.65, 0, 0);
        } else {
          // T-Pose
          if (leftUpperArmRef.current) leftUpperArmRef.current.rotation.set(0, 0, 1.57);
          if (rightUpperArmRef.current) rightUpperArmRef.current.rotation.set(0, 0, -1.57);
          if (leftForearmRef.current) leftForearmRef.current.rotation.set(0, 0, 0);
          if (rightForearmRef.current) rightForearmRef.current.rotation.set(0, 0, 0);
          if (leftThighRef.current) leftThighRef.current.rotation.set(0, 0, 0);
          if (rightThighRef.current) rightThighRef.current.rotation.set(0, 0, 0);
        }
      }
    }
  });

  return (
    <group ref={rootRef} scale={[1, heightScale, 1]}>
      {/* ================= HIPS / ROOT BONE ================= */}
      <group ref={hipsRef}>
        {/* ================= HEAD & NECK ================= */}
        <group ref={headRef} position={[0, 1.76, 0]}>
          <mesh castShadow material={materials.skin}>
            <sphereGeometry args={[0.12, 32, 32]} />
          </mesh>
          <mesh position={[0, -0.06, 0.04]} castShadow material={materials.skin}>
            <boxGeometry args={[0.13, 0.1, 0.12]} />
          </mesh>
          <mesh position={[0, 0.05, -0.02]} material={materials.apparel}>
            <sphereGeometry args={[0.125, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
          </mesh>
          <mesh position={[0, 0.015, 0.11]} material={materials.apparelTrim}>
            <boxGeometry args={[0.15, 0.03, 0.03]} />
          </mesh>
        </group>

        {/* Neck */}
        <mesh position={[0, 1.6, 0]} castShadow material={materials.skin}>
          <cylinderGeometry args={[0.065 * muscleFactor, 0.08 * muscleFactor, 0.14, 24]} />
        </mesh>

        {/* ================= TORSO & CHEST (SPINE BONE) ================= */}
        <group ref={chestRef} position={[0, 1.4, 0]}>
          <mesh castShadow material={materials.skin}>
            <boxGeometry args={[0.42 * muscleFactor, 0.26, 0.22]} />
          </mesh>
          <mesh position={[-0.11 * muscleFactor, 0.02, 0.1]} castShadow material={materials.skin}>
            <sphereGeometry args={[0.1 * muscleFactor, 24, 16]} />
          </mesh>
          <mesh position={[0.11 * muscleFactor, 0.02, 0.1]} castShadow material={materials.skin}>
            <sphereGeometry args={[0.1 * muscleFactor, 24, 16]} />
          </mesh>
          <mesh position={[-0.2 * muscleFactor, -0.02, -0.04]} rotation={[0, 0, 0.3]} material={materials.skin}>
            <boxGeometry args={[0.08 * muscleFactor, 0.22, 0.14]} />
          </mesh>
          <mesh position={[0.2 * muscleFactor, -0.02, -0.04]} rotation={[0, 0, -0.3]} material={materials.skin}>
            <boxGeometry args={[0.08 * muscleFactor, 0.22, 0.14]} />
          </mesh>
        </group>

        {/* Abdominals (Mid-Torso) */}
        <group position={[0, 1.16, 0]} scale={[muscleFactor * 0.88 + (fatFactor - 1) * 0.4, 1, fatFactor * 0.95]}>
          <mesh castShadow material={materials.skin}>
            <cylinderGeometry args={[0.17, 0.155, 0.24, 24]} />
          </mesh>
          {[-0.04, 0.04].map((x) =>
            [0.06, 0, -0.06].map((y, i) => (
              <mesh key={`${x}-${i}`} position={[x, y, 0.14]} material={materials.skin}>
                <boxGeometry args={[0.06, 0.05, 0.02]} />
              </mesh>
            ))
          )}
        </group>

        {/* Pelvis & Compression Shorts */}
        <group position={[0, 0.96, 0]} scale={[1 + (fatFactor - 1) * 0.3, 1, 1 + (fatFactor - 1) * 0.3]}>
          <mesh castShadow material={materials.apparel}>
            <cylinderGeometry args={[0.175 * muscleFactor, 0.19 * muscleFactor, 0.2, 24]} />
          </mesh>
          <mesh position={[0, 0.09, 0]} material={materials.apparelTrim}>
            <cylinderGeometry args={[0.18 * muscleFactor, 0.18 * muscleFactor, 0.02, 24]} />
          </mesh>
        </group>

        {/* ================= LEFT ARM HIERARCHY ================= */}
        <group position={[-0.26 * muscleFactor, 1.48, 0]}>
          <mesh castShadow material={materials.skin}>
            <sphereGeometry args={[0.095 * muscleFactor, 24, 24]} />
          </mesh>

          {/* Left Upper Arm Bone */}
          <group ref={leftUpperArmRef}>
            <mesh position={[0, -0.16, 0]} castShadow material={materials.skin}>
              <cylinderGeometry args={[0.065 * muscleFactor, 0.058 * muscleFactor, 0.24, 20]} />
            </mesh>
            <mesh position={[0, -0.14, 0.04 * muscleFactor]} material={materials.skin}>
              <sphereGeometry args={[0.045 * muscleFactor, 16, 16]} />
            </mesh>

            {/* Left Forearm Bone */}
            <group ref={leftForearmRef} position={[0, -0.28, 0]}>
              <mesh material={materials.skin}>
                <sphereGeometry args={[0.052, 16, 16]} />
              </mesh>
              <mesh position={[0, -0.14, 0]} castShadow material={materials.skin}>
                <cylinderGeometry args={[0.052 * muscleFactor, 0.04, 0.22, 20]} />
              </mesh>
              <mesh position={[0, -0.28, 0]} castShadow material={materials.skin}>
                <boxGeometry args={[0.05, 0.07, 0.03]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* ================= RIGHT ARM HIERARCHY ================= */}
        <group position={[0.26 * muscleFactor, 1.48, 0]}>
          <mesh castShadow material={materials.skin}>
            <sphereGeometry args={[0.095 * muscleFactor, 24, 24]} />
          </mesh>

          {/* Right Upper Arm Bone */}
          <group ref={rightUpperArmRef}>
            <mesh position={[0, -0.16, 0]} castShadow material={materials.skin}>
              <cylinderGeometry args={[0.065 * muscleFactor, 0.058 * muscleFactor, 0.24, 20]} />
            </mesh>
            <mesh position={[0, -0.14, 0.04 * muscleFactor]} material={materials.skin}>
              <sphereGeometry args={[0.045 * muscleFactor, 16, 16]} />
            </mesh>

            {/* Right Forearm Bone */}
            <group ref={rightForearmRef} position={[0, -0.28, 0]}>
              <mesh material={materials.skin}>
                <sphereGeometry args={[0.052, 16, 16]} />
              </mesh>
              <mesh position={[0, -0.14, 0]} castShadow material={materials.skin}>
                <cylinderGeometry args={[0.052 * muscleFactor, 0.04, 0.22, 20]} />
              </mesh>
              <mesh position={[0, -0.28, 0]} castShadow material={materials.skin}>
                <boxGeometry args={[0.05, 0.07, 0.03]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* ================= LEFT LEG HIERARCHY ================= */}
        <group position={[-0.12 * muscleFactor, 0.88, 0]}>
          {/* Left Thigh Bone */}
          <group ref={leftThighRef}>
            <mesh position={[0, -0.14, 0]} castShadow material={materials.apparel}>
              <cylinderGeometry args={[0.1 * muscleFactor, 0.088 * muscleFactor, 0.24, 24]} />
            </mesh>
            <mesh position={[0, -0.28, 0]} castShadow material={materials.skin}>
              <cylinderGeometry args={[0.088 * muscleFactor, 0.072 * muscleFactor, 0.16, 24]} />
            </mesh>
            <mesh position={[-0.04 * muscleFactor, -0.22, 0.03]} material={materials.skin}>
              <sphereGeometry args={[0.065 * muscleFactor, 16, 16]} />
            </mesh>

            {/* Left Calf Bone */}
            <group ref={leftCalfRef} position={[0, -0.38, 0]}>
              <mesh material={materials.skin}>
                <sphereGeometry args={[0.058 * muscleFactor, 16, 16]} />
              </mesh>
              <mesh position={[0, -0.24, 0]} castShadow material={materials.skin}>
                <cylinderGeometry args={[0.072 * muscleFactor, 0.046, 0.42, 24]} />
              </mesh>
              <mesh position={[0, -0.16, -0.03 * muscleFactor]} material={materials.skin}>
                <sphereGeometry args={[0.055 * muscleFactor, 16, 16]} />
              </mesh>
              <group position={[0, -0.48, 0.05]}>
                <mesh castShadow material={materials.footwear}>
                  <boxGeometry args={[0.09, 0.08, 0.23]} />
                </mesh>
                <mesh position={[0, -0.04, 0]} material={materials.shoeSole}>
                  <boxGeometry args={[0.095, 0.02, 0.24]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* ================= RIGHT LEG HIERARCHY ================= */}
        <group position={[0.12 * muscleFactor, 0.88, 0]}>
          {/* Right Thigh Bone */}
          <group ref={rightThighRef}>
            <mesh position={[0, -0.14, 0]} castShadow material={materials.apparel}>
              <cylinderGeometry args={[0.1 * muscleFactor, 0.088 * muscleFactor, 0.24, 24]} />
            </mesh>
            <mesh position={[0, -0.28, 0]} castShadow material={materials.skin}>
              <cylinderGeometry args={[0.088 * muscleFactor, 0.072 * muscleFactor, 0.16, 24]} />
            </mesh>
            <mesh position={[0.04 * muscleFactor, -0.22, 0.03]} material={materials.skin}>
              <sphereGeometry args={[0.065 * muscleFactor, 16, 16]} />
            </mesh>

            {/* Right Calf Bone */}
            <group ref={rightCalfRef} position={[0, -0.38, 0]}>
              <mesh material={materials.skin}>
                <sphereGeometry args={[0.058 * muscleFactor, 16, 16]} />
              </mesh>
              <mesh position={[0, -0.24, 0]} castShadow material={materials.skin}>
                <cylinderGeometry args={[0.072 * muscleFactor, 0.046, 0.42, 24]} />
              </mesh>
              <mesh position={[0, -0.16, -0.03 * muscleFactor]} material={materials.skin}>
                <sphereGeometry args={[0.055 * muscleFactor, 16, 16]} />
              </mesh>
              <group position={[0, -0.48, 0.05]}>
                <mesh castShadow material={materials.footwear}>
                  <boxGeometry args={[0.09, 0.08, 0.23]} />
                </mesh>
                <mesh position={[0, -0.04, 0]} material={materials.shoeSole}>
                  <boxGeometry args={[0.095, 0.02, 0.24]} />
                </mesh>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/**
 * Standard Humanoid GLB Avatar Rig Component
 */
function GLBAvatar({ url, heightScale, trackingMode, landmarks, ...props }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef();

  useFrame(() => {
    if (trackingMode === 'mirror' && landmarks && landmarks.length >= 33 && scene) {
      retargetPoseToSkeleton(landmarks, scene, {
        smoothingAlpha: 0.28,
        isMirrored: true,
      });
    }
  });

  return (
    <primitive
      ref={groupRef}
      object={scene}
      scale={[heightScale, heightScale, heightScale]}
      {...props}
    />
  );
}

/**
 * Avatar Component
 */
export default function Avatar({
  muscleMass = 72,
  bodyFat = 13,
  heightScale = 1.0,
  activePose = 'athletic',
  landmarks = null,
  liveAngles = null,
  trackingMode = 'demo',
  selectedExercise = 'squats',
  onModelStatusChange,
}) {
  const [useGlb, setUseGlb] = useState(false);

  useEffect(() => {
    fetch('/models/avatar.glb', { method: 'HEAD' })
      .then((res) => {
        if (res.ok && res.headers.get('content-type')?.includes('model')) {
          setUseGlb(true);
          onModelStatusChange?.('GLB Humanoid Rig Loaded');
        } else {
          setUseGlb(false);
          onModelStatusChange?.('Realistic Human Skeletal Rig');
        }
      })
      .catch(() => {
        setUseGlb(false);
        onModelStatusChange?.('Realistic Human Skeletal Rig');
      });
  }, [onModelStatusChange]);

  if (useGlb) {
    return (
      <React.Suspense
        fallback={
          <RealisticHumanAvatar
            muscleMass={muscleMass}
            bodyFat={bodyFat}
            heightScale={heightScale}
            activePose={activePose}
            landmarks={landmarks}
            liveAngles={liveAngles}
            trackingMode={trackingMode}
            selectedExercise={selectedExercise}
          />
        }
      >
        <GLBAvatar
          url="/models/avatar.glb"
          position={[0, 0, 0]}
          heightScale={heightScale}
          trackingMode={trackingMode}
          landmarks={landmarks}
        />
      </React.Suspense>
    );
  }

  return (
    <RealisticHumanAvatar
      muscleMass={muscleMass}
      bodyFat={bodyFat}
      heightScale={heightScale}
      activePose={activePose}
      landmarks={landmarks}
      liveAngles={liveAngles}
      trackingMode={trackingMode}
      selectedExercise={selectedExercise}
    />
  );
}
