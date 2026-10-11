import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import Avatar from './Avatar';

/**
 * 3D Loading Fallback
 */
function CanvasLoader() {
  return (
    <group position={[0, 1.2, 0]}>
      <mesh>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color="#00f2fe" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * High-End Gym Studio Floor & Reflective Ground
 */
function StudioGround() {
  return (
    <group position={[0, 0, 0]}>
      {/* Soft Contact Shadows beneath avatar feet */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.65}
        scale={8}
        blur={1.8}
        far={4}
        resolution={512}
        color="#000000"
      />

      {/* Modern Studio Grid */}
      <gridHelper
        args={[20, 40, '#00f2fe', '#1b2333']}
        position={[0, -0.005, 0]}
      />

      {/* Circular Studio Pedestal */}
      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 48]} />
        <meshStandardMaterial
          color="#0f172a"
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      {/* Pedestal Outer Ring */}
      <mesh position={[0, -0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.48, 1.52, 64]} />
        <meshBasicMaterial color="#00f2fe" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/**
 * Camera View Controller
 */
function CameraRig({ controlsRef, cameraPreset }) {
  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    switch (cameraPreset) {
      case 'front':
        controls.object.position.set(0, 1.4, 3.8);
        controls.target.set(0, 1.1, 0);
        break;
      case 'side':
        controls.object.position.set(3.8, 1.4, 0);
        controls.target.set(0, 1.1, 0);
        break;
      case 'closeup':
        controls.object.position.set(0, 1.55, 1.7);
        controls.target.set(0, 1.35, 0);
        break;
      case 'workout':
        controls.object.position.set(2.4, 1.6, 2.6);
        controls.target.set(0, 0.95, 0);
        break;
      default:
        controls.object.position.set(0, 1.4, 3.8);
        controls.target.set(0, 1.1, 0);
    }
    controls.update();
  }, [cameraPreset, controlsRef]);

  return null;
}

/**
 * AvatarCanvas Component
 */
export default function AvatarCanvas({
  muscleMass = 72,
  bodyFat = 13,
  heightScale = 1.0,
  activePose = 'athletic',
  cameraPreset = 'front',
  landmarks = null,
  liveAngles = null,
  trackingMode = 'demo',
  selectedExercise = 'squats',
  onModelStatusChange,
}) {
  const controlsRef = useRef();

  return (
    <div className="canvas-wrapper">
      <Canvas
        shadows
        camera={{
          position: [0, 1.4, 3.8],
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
      >
        <color attach="background" args={['#090b10']} />

        {/* Studio Lighting System */}
        <ambientLight intensity={0.75} color="#e2e8f0" />

        {/* Directional Key Light with soft shadows */}
        <directionalLight
          position={[4, 6, 4]}
          intensity={1.7}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-near={0.5}
          shadow-camera-far={20}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
          shadow-bias={-0.0001}
          color="#ffffff"
        />

        {/* Soft Fill Light */}
        <directionalLight
          position={[-4, 3, 2]}
          intensity={0.55}
          color="#cbd5e1"
        />

        {/* High-Tech Cyber Rim Light */}
        <pointLight
          position={[0, 3.2, -3.5]}
          intensity={3.5}
          distance={10}
          color="#00f2fe"
        />

        {/* Studio Pedestal Uplight */}
        <pointLight
          position={[0, 0.1, 1.2]}
          intensity={1.2}
          distance={4}
          color="#10b981"
        />

        {/* Ground */}
        <StudioGround />

        {/* 3D Realistic Avatar */}
        <Suspense fallback={<CanvasLoader />}>
          <Avatar
            muscleMass={muscleMass}
            bodyFat={bodyFat}
            heightScale={heightScale}
            activePose={activePose}
            landmarks={landmarks}
            liveAngles={liveAngles}
            trackingMode={trackingMode}
            selectedExercise={selectedExercise}
            onModelStatusChange={onModelStatusChange}
          />
        </Suspense>

        {/* Orbit Controls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={1.3}
          maxDistance={7.5}
          maxPolarAngle={Math.PI / 2 + 0.01}
          target={[0, 1.1, 0]}
        />

        <CameraRig controlsRef={controlsRef} cameraPreset={cameraPreset} />
      </Canvas>
    </div>
  );
}
