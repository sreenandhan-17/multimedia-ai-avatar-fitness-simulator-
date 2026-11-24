import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Grid } from '@react-three/drei';

/**
 * Phase 1: Placeholder humanoid avatar built from simple primitives.
 * No morphology, no pose tracking yet — just a figure standing in a scene.
 */
function PlaceholderAvatar() {
  return (
    <group position={[0, 0, 0]}>
      {/* Head */}
      <mesh position={[0, 1.7, 0]} castShadow>
        <sphereGeometry args={[0.12, 32, 32]} />
        <meshStandardMaterial color="#c99274" />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[0.38, 0.5, 0.2]} />
        <meshStandardMaterial color="#1a1f2c" />
      </mesh>

      {/* Left Arm */}
      <mesh position={[-0.28, 1.35, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.5, 8, 16]} />
        <meshStandardMaterial color="#c99274" />
      </mesh>

      {/* Right Arm */}
      <mesh position={[0.28, 1.35, 0]} castShadow>
        <capsuleGeometry args={[0.06, 0.5, 8, 16]} />
        <meshStandardMaterial color="#c99274" />
      </mesh>

      {/* Left Leg */}
      <mesh position={[-0.11, 0.6, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.7, 8, 16]} />
        <meshStandardMaterial color="#1a1f2c" />
      </mesh>

      {/* Right Leg */}
      <mesh position={[0.11, 0.6, 0]} castShadow>
        <capsuleGeometry args={[0.08, 0.7, 8, 16]} />
        <meshStandardMaterial color="#1a1f2c" />
      </mesh>
    </group>
  );
}

export default function AvatarScene() {
  return (
    <div className="canvas-wrapper">
      <Canvas
        shadows
        camera={{ position: [0, 1.4, 3.5], fov: 45, near: 0.1, far: 100 }}
      >
        <color attach="background" args={['#090b10']} />

        <ambientLight intensity={0.6} />
        <directionalLight
          position={[4, 6, 4]}
          intensity={1.4}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />

        <Grid
          position={[0, 0, 0]}
          args={[10, 10]}
          cellColor="#1b2333"
          sectionColor="#00f2fe"
          fadeDistance={12}
        />
        <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={8} blur={2} />

        <PlaceholderAvatar />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1.5}
          maxDistance={8}
          target={[0, 1.1, 0]}
        />
      </Canvas>
    </div>
  );
}
