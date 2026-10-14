import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LockerState } from './types';

interface PersonSilhouetteProps {
  lockerState: LockerState;
  reducedMotion?: boolean;
}

export const PersonSilhouette: React.FC<PersonSilhouetteProps> = ({ lockerState, reducedMotion = false }) => {
  const groupRef = useRef<THREE.Group>(null);
  const currentZ = useRef(1.8);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    let targetZ = 1.8;
    const isEntering = ['entering-room', 'dashboard-transition', 'dashboard-ready'].includes(lockerState);
    if (isEntering) {
      targetZ = -1.5;
    }

    const moveSpeed = reducedMotion ? 10 : 1.6;
    currentZ.current = THREE.MathUtils.lerp(currentZ.current, targetZ, Math.min(1, delta * moveSpeed));

    if (groupRef.current) {
      groupRef.current.position.z = currentZ.current;
    }

    // Walking leg cycle when walking
    if (isEntering && Math.abs(currentZ.current - targetZ) > 0.05) {
      const walkTime = Date.now() * 0.007;
      if (leftLegRef.current) {
        leftLegRef.current.rotation.x = Math.sin(walkTime) * 0.35;
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.x = -Math.sin(walkTime) * 0.35;
      }
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 1.8]}>
      {/* Head */}
      <mesh position={[0, 1.74, 0]} castShadow>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshStandardMaterial color="#090d16" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Torso / Logistics Jacket */}
      <mesh position={[0, 1.35, 0]} castShadow>
        <boxGeometry args={[0.38, 0.58, 0.22]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Shoulder pads / Vest */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <boxGeometry args={[0.44, 0.16, 0.24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.5} />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.24, 1.28, 0]} castShadow>
        <boxGeometry args={[0.09, 0.46, 0.12]} />
        <meshStandardMaterial color="#0b1120" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0.24, 1.28, 0]} castShadow>
        <boxGeometry args={[0.09, 0.46, 0.12]} />
        <meshStandardMaterial color="#0b1120" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Waist / Belt */}
      <mesh position={[0, 1.02, 0]}>
        <boxGeometry args={[0.34, 0.08, 0.2]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Left Leg */}
      <group ref={leftLegRef} position={[-0.1, 0.98, 0]}>
        <mesh position={[0, -0.44, 0]} castShadow>
          <boxGeometry args={[0.13, 0.88, 0.15]} />
          <meshStandardMaterial color="#090d16" roughness={0.7} metalness={0.3} />
        </mesh>
        {/* Boot */}
        <mesh position={[0, -0.88, 0.03]} castShadow>
          <boxGeometry args={[0.14, 0.12, 0.22]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLegRef} position={[0.1, 0.98, 0]}>
        <mesh position={[0, -0.44, 0]} castShadow>
          <boxGeometry args={[0.13, 0.88, 0.15]} />
          <meshStandardMaterial color="#090d16" roughness={0.7} metalness={0.3} />
        </mesh>
        {/* Boot */}
        <mesh position={[0, -0.88, 0.03]} castShadow>
          <boxGeometry args={[0.14, 0.12, 0.22]} />
          <meshStandardMaterial color="#1e293b" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
};
