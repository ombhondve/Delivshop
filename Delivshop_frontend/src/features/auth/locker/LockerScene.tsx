import React from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraController } from './CameraController';
import { VaultLocker } from './VaultLocker';
import { PersonSilhouette } from './PersonSilhouette';
import { ControlRoomInterior } from './ControlRoomInterior';
import { LockerState } from './types';

interface LockerSceneProps {
  lockerState: LockerState;
  reducedMotion?: boolean;
  onContextLost?: () => void;
}

export const LockerScene: React.FC<LockerSceneProps> = ({
  lockerState,
  reducedMotion = false,
  onContextLost,
}) => {
  return (
    <div className="locker-3d-canvas-wrapper" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
      <Canvas
        shadows
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
          powerPreference: 'high-performance',
        }}
        camera={{
          position: [-0.65, 1.45, 1.3],
          fov: 42,
          near: 0.1,
          far: 50,
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            if (onContextLost) onContextLost();
          });
        }}
      >
        {/* Cinematic Scene Lighting */}
        <ambientLight color="#0f172a" intensity={0.7} />

        {/* Directional Key Light */}
        <directionalLight
          position={[-3, 4, 4]}
          color="#f8fafc"
          intensity={1.4}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0001}
        />

        {/* Cool Blue Rim / Atmospheric Light */}
        <directionalLight
          position={[3.5, 3, 2]}
          color="#38bdf8"
          intensity={0.8}
        />

        {/* Subtle Warm Fill */}
        <pointLight
          position={[0, 2.5, 2.5]}
          color="#fef08a"
          intensity={0.3}
          distance={6}
        />

        {/* Scene Components */}
        <CameraController lockerState={lockerState} reducedMotion={reducedMotion} />
        <VaultLocker lockerState={lockerState} reducedMotion={reducedMotion} />
        <PersonSilhouette lockerState={lockerState} reducedMotion={reducedMotion} />
        <ControlRoomInterior />
      </Canvas>
    </div>
  );
};
