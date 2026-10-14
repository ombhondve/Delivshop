import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LockerState } from './types';

interface VaultLockerProps {
  lockerState: LockerState;
  reducedMotion?: boolean;
}

export const VaultLocker: React.FC<VaultLockerProps> = ({ lockerState, reducedMotion = false }) => {
  const doorHingeRef = useRef<THREE.Group>(null);
  const lockWheelRef = useRef<THREE.Mesh>(null);
  const boltTopRef = useRef<THREE.Mesh>(null);
  const boltBottomRef = useRef<THREE.Mesh>(null);
  const ledLightRef = useRef<THREE.PointLight>(null);

  // Animation values
  const currentAngle = useRef(0);
  const currentWheelRot = useRef(0);
  const currentBoltRetract = useRef(0);

  useFrame((_, delta) => {
    // 1. Door opening angle
    let targetAngle = 0;
    if (['door-opening', 'entering-room', 'dashboard-transition', 'dashboard-ready'].includes(lockerState)) {
      targetAngle = Math.PI * 0.55; // Open roughly 100 degrees
    }
    const angleSpeed = reducedMotion ? 10 : 1.4;
    currentAngle.current = THREE.MathUtils.lerp(currentAngle.current, targetAngle, Math.min(1, delta * angleSpeed));
    if (doorHingeRef.current) {
      doorHingeRef.current.rotation.y = -currentAngle.current;
    }

    // 2. Lock wheel rotation
    let targetWheelRot = 0;
    if (['unlocking', 'door-opening', 'entering-room', 'dashboard-transition', 'dashboard-ready'].includes(lockerState)) {
      targetWheelRot = Math.PI * 2;
    }
    const wheelSpeed = reducedMotion ? 12 : 3.5;
    currentWheelRot.current = THREE.MathUtils.lerp(currentWheelRot.current, targetWheelRot, Math.min(1, delta * wheelSpeed));
    if (lockWheelRef.current) {
      lockWheelRef.current.rotation.z = currentWheelRot.current;
    }

    // 3. Locking bolts retraction
    let targetBolt = 0;
    if (['unlocking', 'door-opening', 'entering-room', 'dashboard-transition', 'dashboard-ready'].includes(lockerState)) {
      targetBolt = 0.22; // Retracted inside the door
    }
    currentBoltRetract.current = THREE.MathUtils.lerp(currentBoltRetract.current, targetBolt, Math.min(1, delta * 3.0));
    if (boltTopRef.current) {
      boltTopRef.current.position.x = -1.02 + currentBoltRetract.current;
    }
    if (boltBottomRef.current) {
      boltBottomRef.current.position.x = -1.02 + currentBoltRetract.current;
    }

    // 4. LED color and pulsing
    if (ledLightRef.current) {
      if (lockerState === 'authenticating' || lockerState === 'camera-pullback') {
        // Pulse amber
        const intensity = 1.2 + Math.sin(Date.now() * 0.008) * 0.8;
        ledLightRef.current.intensity = intensity;
        ledLightRef.current.color.set('#f59e0b');
      } else if (lockerState === 'authentication-failed') {
        // Fast pulse red
        const intensity = 1.8 + Math.sin(Date.now() * 0.015) * 1.0;
        ledLightRef.current.intensity = intensity;
        ledLightRef.current.color.set('#ef4444');
      } else if (['authentication-success', 'unlocking', 'door-opening', 'entering-room'].includes(lockerState)) {
        // Steady emerald green
        ledLightRef.current.intensity = 2.2;
        ledLightRef.current.color.set('#10b981');
      } else {
        // Idle cyan
        ledLightRef.current.intensity = 1.0;
        ledLightRef.current.color.set('#00e5ff');
      }
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer Door Frame / Heavy Concrete & Steel Arch */}
      <group position={[0, 1.4, 0]}>
        {/* Top Header */}
        <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.2, 0.4, 0.45]} />
          <meshStandardMaterial color="#172033" roughness={0.65} metalness={0.6} />
        </mesh>
        {/* Left Pillar */}
        <mesh position={[-1.4, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 2.7, 0.45]} />
          <meshStandardMaterial color="#172033" roughness={0.65} metalness={0.6} />
        </mesh>
        {/* Right Pillar */}
        <mesh position={[1.4, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 2.7, 0.45]} />
          <meshStandardMaterial color="#172033" roughness={0.65} metalness={0.6} />
        </mesh>
        {/* Threshold Base */}
        <mesh position={[0, -1.38, 0]} receiveShadow>
          <boxGeometry args={[3.2, 0.15, 0.6]} />
          <meshStandardMaterial color="#0b111e" roughness={0.8} metalness={0.7} />
        </mesh>
        {/* Industrial hazard stripes on top beam */}
        <mesh position={[0, 1.42, 0.23]}>
          <planeGeometry args={[2.2, 0.08]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.4} emissive="#f59e0b" emissiveIntensity={0.15} />
        </mesh>
      </group>

      {/* Access Keypad / Terminal on Left Pillar */}
      <group position={[-1.25, 1.4, 0.24]}>
        {/* Panel Case */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.26, 0.45, 0.08]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.85} />
        </mesh>

        {/* Small Screen / Status Glass */}
        <mesh position={[0, 0.12, 0.045]}>
          <planeGeometry args={[0.2, 0.1]} />
          <meshStandardMaterial
            color={
              lockerState === 'authenticating' || lockerState === 'camera-pullback' ? '#f59e0b' :
              lockerState === 'authentication-failed' ? '#ef4444' :
              ['authentication-success', 'unlocking', 'door-opening', 'entering-room'].includes(lockerState) ? '#10b981' :
              '#00e5ff'
            }
            emissive={
              lockerState === 'authenticating' || lockerState === 'camera-pullback' ? '#f59e0b' :
              lockerState === 'authentication-failed' ? '#ef4444' :
              ['authentication-success', 'unlocking', 'door-opening', 'entering-room'].includes(lockerState) ? '#10b981' :
              '#00e5ff'
            }
            emissiveIntensity={0.6}
            roughness={0.2}
          />
        </mesh>

        {/* LED Point Light */}
        <pointLight
          ref={ledLightRef}
          position={[0, 0.12, 0.15]}
          distance={2.5}
          decay={2}
          intensity={1.0}
        />

        {/* Keypad Buttons Grid (stylized 3x4 dots) */}
        {[-0.05, 0, 0.05].map((x, colIdx) =>
          [-0.02, -0.07, -0.12, -0.17].map((y, rowIdx) => (
            <mesh key={`btn-${colIdx}-${rowIdx}`} position={[x, y, 0.042]}>
              <boxGeometry args={[0.035, 0.032, 0.01]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
            </mesh>
          ))
        )}
      </group>

      {/* Door Hinge Assembly (Hinged at x = 1.15) */}
      <group position={[1.15, 1.4, 0]} ref={doorHingeRef}>
        {/* The Door Leaf - offset by -1.15 so it fills the [-1.15, 1.15] doorway */}
        <group position={[-1.15, 0, 0]}>
          {/* Main Vault Door Body */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.26, 2.62, 0.22]} />
            <meshStandardMaterial
              color="#1e293b"
              roughness={0.32}
              metalness={0.88}
            />
          </mesh>

          {/* Door Rim Bevel Border */}
          <mesh position={[0, 0, 0.115]}>
            <boxGeometry args={[2.14, 2.5, 0.04]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.9} />
          </mesh>

          {/* Center Recessed Vault Plate */}
          <mesh position={[0, 0, 0.13]}>
            <boxGeometry args={[1.7, 2.05, 0.03]} />
            <meshStandardMaterial color="#1a2436" roughness={0.28} metalness={0.92} />
          </mesh>

          {/* Central Locking Wheel / Hub */}
          <group position={[0, 0, 0.16]}>
            <mesh ref={lockWheelRef} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.26, 0.26, 0.06, 32]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.95} />
            </mesh>
            {/* 3 Spokes for the Vault Wheel */}
            {[0, Math.PI / 3, (2 * Math.PI) / 3].map((angle, i) => (
              <mesh key={`spoke-${i}`} position={[0, 0, 0.04]} rotation={[0, 0, angle]}>
                <cylinderGeometry args={[0.025, 0.025, 0.75, 16]} />
                <meshStandardMaterial color="#cbd5e1" roughness={0.2} metalness={0.95} />
              </mesh>
            ))}
            {/* Center Cap */}
            <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.09, 0.09, 0.04, 24]} />
              <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.8} />
            </mesh>
          </group>

          {/* Left Locking Bolts (engage with the frame) */}
          <mesh ref={boltTopRef} position={[-1.02, 0.65, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.24, 16]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.15} metalness={0.95} />
          </mesh>
          <mesh ref={boltBottomRef} position={[-1.02, -0.65, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.24, 16]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.15} metalness={0.95} />
          </mesh>

          {/* Decorative Heavy Rivets along edges */}
          {[-0.92, -0.46, 0, 0.46, 0.92].map((x, i) => (
            <React.Fragment key={`rivet-top-${i}`}>
              <mesh position={[x, 1.15, 0.14]}>
                <sphereGeometry args={[0.022, 12, 12]} />
                <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.3} />
              </mesh>
              <mesh position={[x, -1.15, 0.14]}>
                <sphereGeometry args={[0.022, 12, 12]} />
                <meshStandardMaterial color="#64748b" metalness={0.9} roughness={0.3} />
              </mesh>
            </React.Fragment>
          ))}

          {/* Heavy Steel Hinges on Right Edge */}
          <mesh position={[1.13, 0.85, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.25, 20]} />
            <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.3} />
          </mesh>
          <mesh position={[1.13, -0.85, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.25, 20]} />
            <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
