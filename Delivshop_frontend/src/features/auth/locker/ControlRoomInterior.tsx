import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const ControlRoomInterior: React.FC = () => {
  const serverLedsRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (serverLedsRef.current) {
      // Subtle ambient shimmer for server indicator lights
      serverLedsRef.current.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          const t = Date.now() * 0.003 + index * 1.5;
          child.material.emissiveIntensity = 0.5 + Math.sin(t) * 0.4;
        }
      });
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Interior Floor (Control Room) */}
      <mesh position={[0, -0.01, -5.5]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial
          color="#0b111e"
          roughness={0.7}
          metalness={0.5}
        />
      </mesh>

      {/* Exterior Floor (In front of locker) */}
      <mesh position={[0, -0.01, 3.5]} receiveShadow>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial
          color="#070c16"
          roughness={0.8}
          metalness={0.4}
        />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, 3.6, -2]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 16]} />
        <meshStandardMaterial color="#0b1120" roughness={0.9} />
      </mesh>

      {/* Side Walls */}
      {/* Left Wall */}
      <mesh position={[-4.5, 1.8, -3.5]} receiveShadow>
        <boxGeometry args={[0.3, 3.6, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Right Wall */}
      <mesh position={[4.5, 1.8, -3.5]} receiveShadow>
        <boxGeometry args={[0.3, 3.6, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Structural Steel Beams across ceiling */}
      {[-1.5, -3.5, -5.5, -7.5].map((z, idx) => (
        <group key={`beam-${idx}`} position={[0, 3.3, z]}>
          <mesh>
            <boxGeometry args={[9, 0.25, 0.2]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.3} />
          </mesh>
          {/* Overhead industrial light strip */}
          <mesh position={[0, -0.11, 0]}>
            <boxGeometry args={[4, 0.04, 0.08]} />
            <meshStandardMaterial color="#60a5fa" emissive="#38bdf8" emissiveIntensity={0.8} />
          </mesh>
          <pointLight position={[0, -0.2, 0]} color="#38bdf8" distance={6} intensity={0.4} />
        </group>
      ))}

      {/* Back Operations Wall at z = -7.5 */}
      <mesh position={[0, 1.8, -7.5]} receiveShadow>
        <boxGeometry args={[9, 3.6, 0.3]} />
        <meshStandardMaterial color="#0b111e" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Main Center Control Screen - Logistics Telemetry */}
      <group position={[0, 2.0, -7.3]}>
        {/* Frame */}
        <mesh>
          <boxGeometry args={[4.2, 2.2, 0.08]} />
          <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Screen Display Face */}
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[4.0, 2.0]} />
          <meshStandardMaterial
            color="#0369a1"
            emissive="#0284c7"
            emissiveIntensity={0.85}
            roughness={0.2}
          />
        </mesh>
        {/* Glow light casting into the room from the screen */}
        <pointLight position={[0, 0, 0.6]} color="#38bdf8" distance={8} intensity={2.0} />
      </group>

      {/* Left Data Screen */}
      <group position={[-2.8, 2.0, -7.2]} rotation={[0, 0.15, 0]}>
        <mesh>
          <boxGeometry args={[1.3, 1.8, 0.06]} />
          <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[1.2, 1.7]} />
          <meshStandardMaterial
            color="#047857"
            emissive="#059669"
            emissiveIntensity={0.7}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* Right Data Screen */}
      <group position={[2.8, 2.0, -7.2]} rotation={[0, -0.15, 0]}>
        <mesh>
          <boxGeometry args={[1.3, 1.8, 0.06]} />
          <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[1.2, 1.7]} />
          <meshStandardMaterial
            color="#4338ca"
            emissive="#4f46e5"
            emissiveIntensity={0.7}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* Server Racks along Left and Right Sides */}
      <group ref={serverLedsRef}>
        {/* Left Server Stack */}
        <mesh position={[-3.8, 1.4, -3.5]} castShadow>
          <boxGeometry args={[0.9, 2.8, 3.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Left Server LED Blinker Nodes */}
        {[-4.5, -3.5, -2.5].map((z, i) =>
          [0.8, 1.4, 2.0, 2.4].map((y, j) => (
            <mesh key={`l-led-${i}-${j}`} position={[-3.34, y, z]}>
              <boxGeometry args={[0.02, 0.03, 0.15]} />
              <meshStandardMaterial
                color={j % 2 === 0 ? '#10b981' : '#06b6d4'}
                emissive={j % 2 === 0 ? '#10b981' : '#06b6d4'}
                emissiveIntensity={0.8}
              />
            </mesh>
          ))
        )}

        {/* Right Server Stack */}
        <mesh position={[3.8, 1.4, -3.5]} castShadow>
          <boxGeometry args={[0.9, 2.8, 3.2]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.7} />
        </mesh>
        {/* Right Server LED Blinker Nodes */}
        {[-4.5, -3.5, -2.5].map((z, i) =>
          [0.8, 1.4, 2.0, 2.4].map((y, j) => (
            <mesh key={`r-led-${i}-${j}`} position={[3.34, y, z]}>
              <boxGeometry args={[0.02, 0.03, 0.15]} />
              <meshStandardMaterial
                color={j % 3 === 0 ? '#f59e0b' : '#38bdf8'}
                emissive={j % 3 === 0 ? '#f59e0b' : '#38bdf8'}
                emissiveIntensity={0.8}
              />
            </mesh>
          ))
        )}
      </group>
    </group>
  );
};
