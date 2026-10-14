import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LockerState, CameraWaypoint } from './types';

interface CameraControllerProps {
  lockerState: LockerState;
  reducedMotion?: boolean;
}

const WAYPOINTS: Record<LockerState, CameraWaypoint> = {
  'checking-session': {
    position: [0, 1.7, 4.2],
    target: [0, 1.4, 0],
    fov: 45,
  },
  'login-close-up': {
    position: [-0.65, 1.45, 1.3],
    target: [-0.55, 1.4, 0],
    fov: 42,
  },
  'camera-pullback': {
    position: [0, 1.7, 4.2],
    target: [0, 1.35, 0],
    fov: 46,
  },
  'authenticating': {
    position: [0, 1.7, 4.2],
    target: [0, 1.35, 0],
    fov: 46,
  },
  'authentication-failed': {
    position: [0, 1.7, 4.2],
    target: [0, 1.35, 0],
    fov: 46,
  },
  'camera-return': {
    position: [-0.65, 1.45, 1.3],
    target: [-0.55, 1.4, 0],
    fov: 42,
  },
  'authentication-success': {
    position: [-0.15, 1.65, 3.8],
    target: [0, 1.35, 0],
    fov: 45,
  },
  'unlocking': {
    position: [-0.1, 1.6, 3.6],
    target: [0.1, 1.35, 0],
    fov: 45,
  },
  'door-opening': {
    position: [0.25, 1.55, 2.9],
    target: [0.1, 1.35, -0.6],
    fov: 47,
  },
  'entering-room': {
    position: [0, 1.5, -0.8],
    target: [0, 1.45, -3.8],
    fov: 50,
  },
  'dashboard-transition': {
    position: [0, 1.5, -2.6],
    target: [0, 1.5, -5.2],
    fov: 52,
  },
  'dashboard-ready': {
    position: [0, 1.5, -2.6],
    target: [0, 1.5, -5.2],
    fov: 52,
  },
};

export const CameraController: React.FC<CameraControllerProps> = ({ lockerState, reducedMotion = false }) => {
  const currentLookAt = useRef(new THREE.Vector3(0, 1.4, 0));
  const targetLookAt = useRef(new THREE.Vector3(0, 1.4, 0));
  const targetPos = useRef(new THREE.Vector3(0, 1.7, 4.2));

  useFrame((state, delta) => {
    const wp = WAYPOINTS[lockerState] || WAYPOINTS['login-close-up'];
    targetPos.current.set(wp.position[0], wp.position[1], wp.position[2]);
    targetLookAt.current.set(wp.target[0], wp.target[1], wp.target[2]);

    const speed = reducedMotion ? 8 : (
      lockerState === 'camera-pullback' ? 2.6 :
      lockerState === 'camera-return' ? 2.8 :
      lockerState === 'entering-room' ? 2.2 :
      lockerState === 'door-opening' ? 2.0 :
      3.0
    );

    const lerpFactor = Math.min(1, delta * speed);

    state.camera.position.lerp(targetPos.current, lerpFactor);
    currentLookAt.current.lerp(targetLookAt.current, lerpFactor);
    state.camera.lookAt(currentLookAt.current);

    if (state.camera instanceof THREE.PerspectiveCamera && wp.fov) {
      state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, wp.fov, lerpFactor);
      state.camera.updateProjectionMatrix();
    }
  });

  return null;
};
