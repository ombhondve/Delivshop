import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { VaultTelemetry } from './types';

interface IndustrialVaultSceneProps {
  currentTime: number;
  isPlaying?: boolean;
  isLooping?: boolean;
  showGuides?: boolean;
  reducedMotion?: boolean;
  onTelemetryUpdate?: (telemetry: VaultTelemetry) => void;
  onAnimationComplete?: () => void;
  onContextLost?: () => void;
}

export const IndustrialVaultScene: React.FC<IndustrialVaultSceneProps> = ({
  currentTime,
  isPlaying = false,
  isLooping = false,
  showGuides = false,
  reducedMotion = false,
  onTelemetryUpdate,
  onAnimationComplete,
  onContextLost,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // References to dynamic kinematic groups
  const kinematicRefs = useRef<{
    handwheelGroup: THREE.Group | null;
    camDiscGroup: THREE.Group | null;
    hingePivotGroup: THREE.Group | null;
    lockingBars: THREE.Group[];
    engineeringGuidesGroup: THREE.Group | null;
  }>({
    handwheelGroup: null,
    camDiscGroup: null,
    hingePivotGroup: null,
    lockingBars: [],
    engineeringGuidesGroup: null,
  });

  const animTimeRef = useRef(currentTime);
  const isPlayingRef = useRef(isPlaying);
  const isLoopingRef = useRef(isLooping);
  const showGuidesRef = useRef(showGuides);
  const reducedMotionRef = useRef(reducedMotion);
  const onTelemetryRef = useRef(onTelemetryUpdate);
  const onCompleteRef = useRef(onAnimationComplete);

  useEffect(() => {
    animTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    showGuidesRef.current = showGuides;
    if (kinematicRefs.current.engineeringGuidesGroup) {
      kinematicRefs.current.engineeringGuidesGroup.visible = showGuides;
    }
  }, [showGuides]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    onTelemetryRef.current = onTelemetryUpdate;
  }, [onTelemetryUpdate]);

  useEffect(() => {
    onCompleteRef.current = onAnimationComplete;
  }, [onAnimationComplete]);

  // Main Three.js Scene Setup & Kinematics Engine
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const disposables = {
      geometries: new Set<THREE.BufferGeometry>(),
      materials: new Set<THREE.Material>(),
      textures: new Set<THREE.Texture>(),
    };

    const registerGeometry = <T extends THREE.BufferGeometry>(g: T): T => {
      disposables.geometries.add(g);
      return g;
    };
    const registerMaterial = <T extends THREE.Material>(m: T): T => {
      disposables.materials.add(m);
      return m;
    };
    const registerTexture = <T extends THREE.Texture>(t: T): T => {
      disposables.textures.add(t);
      return t;
    };

    // ========================================================================
    // 1. PROCEDURAL PBR TEXTURE GENERATORS
    // ========================================================================
    function createBrushedSteelTexture(isRadial = false): THREE.CanvasTexture {
      const size = 1024;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      if (!ctx) return new THREE.CanvasTexture(c);

      ctx.fillStyle = '#78828c';
      ctx.fillRect(0, 0, size, size);

      if (isRadial) {
        const cx = size / 2;
        const cy = size / 2;
        for (let r = 8; r < size * 0.72; r += 1.2) {
          const lum = 112 + Math.sin(r * 0.35) * 8 + (Math.random() - 0.5) * 22;
          ctx.strokeStyle = `rgba(${lum}, ${lum + 3}, ${lum + 7}, 0.28)`;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        for (let i = 0; i < 4500; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const len = 30 + Math.random() * 140;
          const v = Math.random() > 0.5 ? 165 : 70;
          ctx.strokeStyle = `rgba(${v}, ${v + 4}, ${v + 8}, 0.055)`;
          ctx.lineWidth = 0.8 + Math.random() * 1.2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + len, y + (Math.random() - 0.5) * 1.5);
          ctx.stroke();
        }
      } else {
        for (let i = 0; i < 9000; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const len = 45 + Math.random() * 180;
          const v = 90 + Math.floor(Math.random() * 65);
          ctx.strokeStyle = `rgba(${v}, ${v + 4}, ${v + 9}, 0.14)`;
          ctx.lineWidth = 0.7 + Math.random() * 1.4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + len, y + (Math.random() - 0.5) * 1.2);
          ctx.stroke();
        }
      }

      for (let s = 0; s < 85; s++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const angle = (Math.random() - 0.5) * 0.5;
        const len = 12 + Math.random() * 45;
        ctx.strokeStyle = 'rgba(195, 205, 215, 0.12)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = 4;
      return registerTexture(tex);
    }

    function createConcreteTexture(): THREE.CanvasTexture {
      const size = 1024;
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      if (!ctx) return new THREE.CanvasTexture(c);

      ctx.fillStyle = '#1b2129';
      ctx.fillRect(0, 0, size, size);

      for (let i = 0; i < 20000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 0.6 + Math.random() * 2.8;
        const delta = (Math.random() - 0.5) * 26;
        const base = 29 + delta;
        ctx.fillStyle = `rgba(${base}, ${base + 4}, ${base + 10}, 0.18)`;
        ctx.fillRect(x, y, r, r);
      }

      ctx.strokeStyle = 'rgba(10, 13, 18, 0.55)';
      ctx.lineWidth = 2.5;
      for (let y = 256; y < size; y += 256) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }
      for (let x = 512; x < size; x += 512) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }

      for (let y = 128; y < size; y += 256) {
        for (let x = 128; x < size; x += 256) {
          ctx.fillStyle = 'rgba(8, 10, 14, 0.7)';
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(3, 2);
      tex.anisotropy = 4;
      return registerTexture(tex);
    }

    // ========================================================================
    // 2. SCENE, ARCHITECTURAL CAMERA, RENDERER
    // ========================================================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070c14);
    scene.fog = new THREE.FogExp2(0x070c14, 0.042);

    const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 40);
    camera.position.set(0.0, 0.02, 6.45);
    camera.lookAt(0.0, 0.0, 0.0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // PMREMGenerator Environment Map for realistic metallic reflections
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x0b1017);

    const stripGeo = registerGeometry(new THREE.PlaneGeometry(6, 0.6));
    const stripMat1 = registerMaterial(new THREE.MeshBasicMaterial({ color: 0xd8e6f5, side: THREE.DoubleSide }));
    const strip1 = new THREE.Mesh(stripGeo, stripMat1);
    strip1.position.set(1.2, 4.0, 3.0);
    strip1.rotation.x = Math.PI / 2;
    envScene.add(strip1);

    const stripMat2 = registerMaterial(new THREE.MeshBasicMaterial({ color: 0x6b85a3, side: THREE.DoubleSide }));
    const strip2 = new THREE.Mesh(stripGeo, stripMat2);
    strip2.position.set(-2.5, 3.5, 4.0);
    strip2.rotation.x = Math.PI / 2;
    envScene.add(strip2);

    const wallBounce = new THREE.Mesh(
      registerGeometry(new THREE.BoxGeometry(14, 8, 14)),
      registerMaterial(new THREE.MeshBasicMaterial({ color: 0x161e29, side: THREE.BackSide }))
    );
    envScene.add(wallBounce);

    const envRenderTarget = pmremGenerator.fromScene(envScene, 0.04);
    scene.environment = envRenderTarget.texture;

    // ========================================================================
    // 3. PBR MATERIALS
    // ========================================================================
    const radialSteelTex = createBrushedSteelTexture(true);
    const linearSteelTex = createBrushedSteelTexture(false);
    const concreteTex = createConcreteTexture();

    const matBrushedSteel = registerMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x8f9aa6,
        map: radialSteelTex,
        roughnessMap: radialSteelTex,
        metalness: 0.87,
        roughness: 0.31,
        envMapIntensity: 1.25,
      })
    );

    const matStructuralSteel = registerMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x6d7785,
        map: linearSteelTex,
        roughnessMap: linearSteelTex,
        metalness: 0.84,
        roughness: 0.36,
        envMapIntensity: 1.15,
      })
    );

    const matDarkFrameSteel = registerMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x2b333d,
        map: linearSteelTex,
        roughnessMap: linearSteelTex,
        metalness: 0.78,
        roughness: 0.44,
        envMapIntensity: 0.95,
      })
    );

    const matHardenedPinSteel = registerMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xc8d2dc,
        map: linearSteelTex,
        metalness: 0.94,
        roughness: 0.19,
        envMapIntensity: 1.45,
      })
    );

    const matBronzeBearing = registerMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x8c6d46,
        metalness: 0.82,
        roughness: 0.32,
      })
    );

    const matGunmetal = registerMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x1e242d,
        metalness: 0.8,
        roughness: 0.42,
      })
    );

    const matConcreteWall = registerMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x262e38,
        map: concreteTex,
        roughnessMap: concreteTex,
        metalness: 0.05,
        roughness: 0.88,
      })
    );

    const matConcreteFloor = registerMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x1b2129,
        map: concreteTex,
        roughnessMap: concreteTex,
        metalness: 0.08,
        roughness: 0.78,
      })
    );

    // ========================================================================
    // 4. ENVIRONMENT & REINFORCED ARCHITECTURE
    // ========================================================================
    const VAULT_X = 0.78;
    const VAULT_Y = 0.05;
    const VAULT_Z = 0.0;
    const OPENING_RADIUS = 1.42;

    const facilityGroup = new THREE.Group();
    scene.add(facilityGroup);

    // Wall with 3D Circular Cutout
    const wallShape = new THREE.Shape();
    wallShape.moveTo(-9, -5);
    wallShape.lineTo(9, -5);
    wallShape.lineTo(9, 5);
    wallShape.lineTo(-9, 5);
    wallShape.lineTo(-9, -5);

    const circularHole = new THREE.Path();
    circularHole.absarc(VAULT_X, VAULT_Y, OPENING_RADIUS + 0.16, 0, Math.PI * 2, true);
    wallShape.holes.push(circularHole);

    const wallGeo = registerGeometry(
      new THREE.ExtrudeGeometry(wallShape, {
        depth: 0.85,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.015,
        bevelThickness: 0.015,
      })
    );
    wallGeo.translate(0, 0, -0.87);
    const concreteWall = new THREE.Mesh(wallGeo, matConcreteWall);
    concreteWall.receiveShadow = true;
    concreteWall.castShadow = true;
    facilityGroup.add(concreteWall);

    // Floor
    const FLOOR_Y = -1.68;
    const floorGeo = registerGeometry(new THREE.PlaneGeometry(18, 12));
    const concreteFloor = new THREE.Mesh(floorGeo, matConcreteFloor);
    concreteFloor.rotation.x = -Math.PI / 2;
    concreteFloor.position.set(0, FLOOR_Y, 2.5);
    concreteFloor.receiveShadow = true;
    facilityGroup.add(concreteFloor);

    // Threshold plate
    const thresholdPlate = new THREE.Mesh(
      registerGeometry(new THREE.BoxGeometry(4.2, 0.016, 1.35)),
      matDarkFrameSteel
    );
    thresholdPlate.position.set(VAULT_X, FLOOR_Y + 0.008, 0.45);
    thresholdPlate.receiveShadow = true;
    facilityGroup.add(thresholdPlate);

    // Structural steel columns
    const frameBoltGeo = registerGeometry(new THREE.CylinderGeometry(0.018, 0.018, 0.035, 6));
    frameBoltGeo.rotateX(Math.PI / 2);
    const frameWasherGeo = registerGeometry(new THREE.CylinderGeometry(0.028, 0.028, 0.008, 16));
    frameWasherGeo.rotateX(Math.PI / 2);

    function createStructuralColumn(xPos: number) {
      const colGroup = new THREE.Group();
      const plate = new THREE.Mesh(registerGeometry(new THREE.BoxGeometry(0.28, 4.6, 0.06)), matDarkFrameSteel);
      plate.position.set(xPos, 0.3, -0.01);
      plate.castShadow = true;
      plate.receiveShadow = true;
      colGroup.add(plate);

      for (const side of [-0.11, 0.11]) {
        const flange = new THREE.Mesh(registerGeometry(new THREE.BoxGeometry(0.03, 4.6, 0.11)), matGunmetal);
        flange.position.set(xPos + side, 0.3, 0.01);
        flange.castShadow = true;
        flange.receiveShadow = true;
        colGroup.add(flange);
      }
      return colGroup;
    }

    facilityGroup.add(createStructuralColumn(-3.65));
    facilityGroup.add(createStructuralColumn(-1.45));
    facilityGroup.add(createStructuralColumn(3.05));

    // Overhead beam
    const headerBeam = new THREE.Mesh(registerGeometry(new THREE.BoxGeometry(12, 0.32, 0.18)), matDarkFrameSteel);
    headerBeam.position.set(0, 1.92, 0.06);
    headerBeam.castShadow = true;
    headerBeam.receiveShadow = true;
    facilityGroup.add(headerBeam);

    // Deep vault interior
    const interiorGroup = new THREE.Group();
    interiorGroup.position.set(VAULT_X, VAULT_Y, -0.85);
    facilityGroup.add(interiorGroup);

    const tunnelGeo = registerGeometry(
      new THREE.CylinderGeometry(OPENING_RADIUS + 0.02, OPENING_RADIUS + 0.02, 2.8, 48, 1, true)
    );
    tunnelGeo.rotateX(Math.PI / 2);
    const tunnelMesh = new THREE.Mesh(tunnelGeo, matDarkFrameSteel);
    tunnelMesh.position.z = -0.6;
    tunnelMesh.receiveShadow = true;
    interiorGroup.add(tunnelMesh);

    const backWall = new THREE.Mesh(registerGeometry(new THREE.PlaneGeometry(4, 4)), matGunmetal);
    backWall.position.z = -1.95;
    backWall.receiveShadow = true;
    interiorGroup.add(backWall);

    for (const zOff of [-0.4, -0.9, -1.4]) {
      const ribRing = new THREE.Mesh(
        registerGeometry(new THREE.TorusGeometry(OPENING_RADIUS - 0.02, 0.035, 12, 48)),
        matGunmetal
      );
      ribRing.position.z = zOff;
      interiorGroup.add(ribRing);
    }

    // Modular security lockers inside chamber on right
    for (let row = -2; row <= 2; row++) {
      for (let depth = 0; depth < 3; depth++) {
        const locker = new THREE.Mesh(
          registerGeometry(new THREE.BoxGeometry(0.45, 0.28, 0.38)),
          matStructuralSteel
        );
        locker.position.set(0.65, row * 0.32, -0.55 - depth * 0.42);
        locker.castShadow = true;
        locker.receiveShadow = true;
        interiorGroup.add(locker);
      }
    }

    // ========================================================================
    // 5. STATIONARY FRAME & RECEIVERS
    // ========================================================================
    const fixedFrameGroup = new THREE.Group();
    fixedFrameGroup.position.set(VAULT_X, VAULT_Y, VAULT_Z);
    facilityGroup.add(fixedFrameGroup);

    function createMachinedRing(
      innerR: number,
      outerR: number,
      depth: number,
      bevel = 0.012,
      mat = matDarkFrameSteel,
      segments = 64
    ) {
      const shape = new THREE.Shape();
      shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
      const hole = new THREE.Path();
      hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
      shape.holes.push(hole);

      const geo = registerGeometry(
        new THREE.ExtrudeGeometry(shape, {
          depth,
          bevelEnabled: bevel > 0,
          bevelSegments: 2,
          steps: 1,
          bevelSize: bevel,
          bevelThickness: bevel,
          curveSegments: segments,
        })
      );
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    const outerFrameFlange = createMachinedRing(
      OPENING_RADIUS - 0.02,
      OPENING_RADIUS + 0.28,
      0.14,
      0.01,
      matDarkFrameSteel
    );
    outerFrameFlange.position.z = -0.03;
    fixedFrameGroup.add(outerFrameFlange);

    const innerJambRing = createMachinedRing(
      OPENING_RADIUS - 0.11,
      OPENING_RADIUS + 0.01,
      0.28,
      0.008,
      matGunmetal
    );
    innerJambRing.position.z = -0.22;
    fixedFrameGroup.add(innerJambRing);

    // 36 Perimeter Anchor Bolts
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      if (angle > Math.PI * 0.78 && angle < Math.PI * 1.22) continue; // Skip hinge area

      const r = OPENING_RADIUS + 0.15;
      const bx = Math.cos(angle) * r;
      const by = Math.sin(angle) * r;

      const washer = new THREE.Mesh(frameWasherGeo, matStructuralSteel);
      washer.position.set(bx, by, 0.122);
      fixedFrameGroup.add(washer);

      const bolt = new THREE.Mesh(frameBoltGeo, matGunmetal);
      bolt.position.set(bx, by, 0.135);
      bolt.castShadow = true;
      fixedFrameGroup.add(bolt);
    }

    // 8 Stationary Locking Bar Receivers
    const BOLT_ANGLES: number[] = [];
    for (let k = 0; k < 8; k++) {
      BOLT_ANGLES.push(((2 * k + 1) * 22.5 * Math.PI) / 180);
    }

    BOLT_ANGLES.forEach((angle) => {
      const receiverGroup = new THREE.Group();
      receiverGroup.rotation.z = angle;

      const rHousing = new THREE.Mesh(
        registerGeometry(new THREE.BoxGeometry(0.16, 0.15, 0.22)),
        matDarkFrameSteel
      );
      rHousing.position.set(OPENING_RADIUS + 0.07, 0, 0.18);
      rHousing.castShadow = true;
      rHousing.receiveShadow = true;
      receiverGroup.add(rHousing);

      const boreSocket = new THREE.Mesh(
        registerGeometry(new THREE.CylinderGeometry(0.044, 0.044, 0.17, 18)),
        matGunmetal
      );
      boreSocket.rotation.z = Math.PI / 2;
      boreSocket.position.set(OPENING_RADIUS + 0.06, 0, 0.19);
      receiverGroup.add(boreSocket);

      fixedFrameGroup.add(receiverGroup);
    });

    // ========================================================================
    // 6. LEFT-SIDE HINGE ASSEMBLY (STATIONARY & MOVING)
    // ========================================================================
    const HINGE_LOCAL_X = -(OPENING_RADIUS + 0.22); // -1.64m left of vault center
    const HINGE_LOCAL_Z = 0.34; // +0.34m forward of wall plane for true clearance

    // Stationary Hinge Structure
    const stationaryHingeBase = new THREE.Group();
    fixedFrameGroup.add(stationaryHingeBase);

    const basePlate = new THREE.Mesh(
      registerGeometry(new THREE.BoxGeometry(0.36, 2.08, 0.22)),
      matDarkFrameSteel
    );
    basePlate.position.set(HINGE_LOCAL_X - 0.06, 0, 0.07);
    basePlate.castShadow = true;
    basePlate.receiveShadow = true;
    stationaryHingeBase.add(basePlate);

    for (let by = -0.92; by <= 0.92; by += 0.23) {
      for (const bx of [-0.18, 0.04]) {
        const hBolt = new THREE.Mesh(frameBoltGeo, matStructuralSteel);
        hBolt.position.set(HINGE_LOCAL_X + bx, by, 0.19);
        stationaryHingeBase.add(hBolt);
      }
    }

    // 4 Stationary Hinge Knuckles along vertical axis
    const fixedKnuckleY = [-0.82, -0.3, 0.3, 0.82];
    fixedKnuckleY.forEach((ky) => {
      const bridge = new THREE.Mesh(
        registerGeometry(new THREE.BoxGeometry(0.24, 0.18, 0.28)),
        matDarkFrameSteel
      );
      bridge.position.set(HINGE_LOCAL_X - 0.02, ky, 0.2);
      bridge.castShadow = true;
      bridge.receiveShadow = true;
      stationaryHingeBase.add(bridge);

      const knuckle = new THREE.Mesh(
        registerGeometry(new THREE.CylinderGeometry(0.095, 0.095, 0.19, 24)),
        matStructuralSteel
      );
      knuckle.position.set(HINGE_LOCAL_X, ky, HINGE_LOCAL_Z);
      knuckle.castShadow = true;
      knuckle.receiveShadow = true;
      stationaryHingeBase.add(knuckle);

      const bearing = new THREE.Mesh(
        registerGeometry(new THREE.CylinderGeometry(0.098, 0.098, 0.014, 24)),
        matBronzeBearing
      );
      bearing.position.set(HINGE_LOCAL_X, ky + (ky > 0 ? -0.102 : 0.102), HINGE_LOCAL_Z);
      stationaryHingeBase.add(bearing);
    });

    // Continuous Vertical Steel Hinge Pin
    const hingePin = new THREE.Mesh(
      registerGeometry(new THREE.CylinderGeometry(0.056, 0.056, 2.02, 28)),
      matHardenedPinSteel
    );
    hingePin.position.set(HINGE_LOCAL_X, 0, HINGE_LOCAL_Z);
    hingePin.castShadow = true;
    hingePin.receiveShadow = true;
    stationaryHingeBase.add(hingePin);

    for (const capY of [-1.02, 1.02]) {
      const pinCap = new THREE.Mesh(
        registerGeometry(new THREE.CylinderGeometry(0.078, 0.078, 0.045, 20)),
        matGunmetal
      );
      pinCap.position.set(HINGE_LOCAL_X, capY, HINGE_LOCAL_Z);
      pinCap.castShadow = true;
      stationaryHingeBase.add(pinCap);
    }

    // ========================================================================
    // 7. MOVING DOOR ASSEMBLY — RIGID PARENT AT VERTICAL HINGE PIN AXIS
    // ========================================================================
    const hingePivotGroup = new THREE.Group();
    hingePivotGroup.position.set(HINGE_LOCAL_X, 0, HINGE_LOCAL_Z);
    fixedFrameGroup.add(hingePivotGroup);
    kinematicRefs.current.hingePivotGroup = hingePivotGroup;

    const DOOR_OFFSET_X = -HINGE_LOCAL_X; // +1.64m to center of door slab
    const DOOR_OFFSET_Z = -HINGE_LOCAL_Z; // -0.34m

    // 3 Interleaved Moving Knuckles along local X=0, Z=0 in hingePivotGroup
    const movingKnuckleY = [-0.56, 0.0, 0.56];
    movingKnuckleY.forEach((ky) => {
      const mKnuckle = new THREE.Mesh(
        registerGeometry(new THREE.CylinderGeometry(0.096, 0.096, 0.28, 24)),
        matBrushedSteel
      );
      mKnuckle.position.set(0, ky, 0);
      mKnuckle.castShadow = true;
      mKnuckle.receiveShadow = true;
      hingePivotGroup.add(mKnuckle);

      for (const cy of [-0.11, 0.11]) {
        const collar = new THREE.Mesh(
          registerGeometry(new THREE.CylinderGeometry(0.106, 0.106, 0.025, 24)),
          matGunmetal
        );
        collar.position.set(0, ky + cy, 0);
        hingePivotGroup.add(collar);
      }
    });

    // Heavy Forged Gooseneck Hinge Straps connecting knuckles to door slab face
    [-0.56, 0.56].forEach((strapY) => {
      const strapGroup = new THREE.Group();
      strapGroup.position.y = strapY;

      const neckLug = new THREE.Mesh(
        registerGeometry(new THREE.BoxGeometry(0.38, 0.19, 0.14)),
        matStructuralSteel
      );
      neckLug.position.set(0.17, 0, -0.02);
      neckLug.castShadow = true;
      neckLug.receiveShadow = true;
      strapGroup.add(neckLug);

      const mainStrap = new THREE.Mesh(
        registerGeometry(new THREE.BoxGeometry(1.18, 0.18, 0.09)),
        matStructuralSteel
      );
      mainStrap.position.set(0.88, 0, -0.045);
      mainStrap.castShadow = true;
      mainStrap.receiveShadow = true;
      strapGroup.add(mainStrap);

      const pocket = new THREE.Mesh(
        registerGeometry(new THREE.BoxGeometry(0.86, 0.09, 0.02)),
        matGunmetal
      );
      pocket.position.set(0.92, 0, 0.0);
      strapGroup.add(pocket);

      for (let bx = 0.45; bx <= 1.35; bx += 0.22) {
        for (const by of [-0.055, 0.055]) {
          const sBolt = new THREE.Mesh(frameBoltGeo, matHardenedPinSteel);
          sBolt.position.set(bx, by, 0.01);
          strapGroup.add(sBolt);
        }
      }

      hingePivotGroup.add(strapGroup);
    });

    const centerHingeLug = new THREE.Mesh(
      registerGeometry(new THREE.BoxGeometry(0.58, 0.21, 0.12)),
      matStructuralSteel
    );
    centerHingeLug.position.set(0.28, 0, -0.03);
    centerHingeLug.castShadow = true;
    centerHingeLug.receiveShadow = true;
    hingePivotGroup.add(centerHingeLug);

    // ========================================================================
    // 8. CIRCULAR DOOR SLAB & LOCKING ASSEMBLY
    // ========================================================================
    const doorAssemblyGroup = new THREE.Group();
    doorAssemblyGroup.position.set(DOOR_OFFSET_X, 0, DOOR_OFFSET_Z);
    hingePivotGroup.add(doorAssemblyGroup);

    const DOOR_RADIUS = OPENING_RADIUS - 0.015;

    // Rear stepped plug slab
    const rearPlugSlab = new THREE.Mesh(
      registerGeometry(new THREE.CylinderGeometry(DOOR_RADIUS - 0.05, DOOR_RADIUS - 0.07, 0.18, 64)),
      matDarkFrameSteel
    );
    rearPlugSlab.rotation.x = Math.PI / 2;
    rearPlugSlab.position.z = 0.02;
    rearPlugSlab.castShadow = true;
    rearPlugSlab.receiveShadow = true;
    doorAssemblyGroup.add(rearPlugSlab);

    // Main front armor slab
    const mainDoorSlab = new THREE.Mesh(
      registerGeometry(new THREE.CylinderGeometry(DOOR_RADIUS, DOOR_RADIUS + 0.01, 0.2, 64)),
      matBrushedSteel
    );
    mainDoorSlab.rotation.x = Math.PI / 2;
    mainDoorSlab.position.z = 0.19;
    mainDoorSlab.castShadow = true;
    mainDoorSlab.receiveShadow = true;
    doorAssemblyGroup.add(mainDoorSlab);

    // Outer machined rim
    const outerDoorRim = createMachinedRing(
      DOOR_RADIUS - 0.11,
      DOOR_RADIUS + 0.015,
      0.045,
      0.01,
      matStructuralSteel,
      64
    );
    outerDoorRim.position.z = 0.275;
    doorAssemblyGroup.add(outerDoorRim);

    // Inner armor boss ring
    const innerArmorRing = createMachinedRing(0.32, 0.5, 0.035, 0.008, matStructuralSteel, 48);
    innerArmorRing.position.z = 0.285;
    doorAssemblyGroup.add(innerArmorRing);

    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r = DOOR_RADIUS - 0.05;
      const bolt = new THREE.Mesh(frameBoltGeo, matGunmetal);
      bolt.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.32);
      doorAssemblyGroup.add(bolt);
    }

    // 8 Radial Locking Bars
    const lockingBars: THREE.Group[] = [];
    const BOLT_MAX_EXTENSION = 0.16;

    BOLT_ANGLES.forEach((angle) => {
      const channelGroup = new THREE.Group();
      channelGroup.rotation.z = angle;
      doorAssemblyGroup.add(channelGroup);

      for (const gPos of [0.68, 1.18]) {
        const guideBridge = new THREE.Mesh(
          registerGeometry(new THREE.BoxGeometry(0.14, 0.14, 0.095)),
          matDarkFrameSteel
        );
        guideBridge.position.set(gPos, 0, 0.325);
        guideBridge.castShadow = true;
        guideBridge.receiveShadow = true;
        channelGroup.add(guideBridge);

        const flange = new THREE.Mesh(
          registerGeometry(new THREE.BoxGeometry(0.16, 0.22, 0.02)),
          matStructuralSteel
        );
        flange.position.set(gPos, 0, 0.295);
        channelGroup.add(flange);

        for (const fy of [-0.085, 0.085]) {
          const fBolt = new THREE.Mesh(frameBoltGeo, matGunmetal);
          fBolt.position.set(gPos, fy, 0.305);
          channelGroup.add(fBolt);
        }
      }

      const boltWrapper = new THREE.Group();
      boltWrapper.position.x = BOLT_MAX_EXTENSION;
      channelGroup.add(boltWrapper);

      const barMesh = new THREE.Mesh(
        registerGeometry(new THREE.CylinderGeometry(0.038, 0.038, 0.96, 20)),
        matHardenedPinSteel
      );
      barMesh.rotation.z = Math.PI / 2;
      barMesh.position.set(0.95, 0, 0.33);
      barMesh.castShadow = true;
      barMesh.receiveShadow = true;
      boltWrapper.add(barMesh);

      const boltTip = new THREE.Mesh(
        registerGeometry(new THREE.CylinderGeometry(0.032, 0.038, 0.04, 20)),
        matStructuralSteel
      );
      boltTip.rotation.z = -Math.PI / 2;
      boltTip.position.set(1.44, 0, 0.33);
      boltWrapper.add(boltTip);

      const clevis = new THREE.Mesh(
        registerGeometry(new THREE.BoxGeometry(0.09, 0.095, 0.095)),
        matGunmetal
      );
      clevis.position.set(0.48, 0, 0.33);
      clevis.castShadow = true;
      boltWrapper.add(clevis);

      lockingBars.push(boltWrapper);
    });

    kinematicRefs.current.lockingBars = lockingBars;

    // Gearbox and Cam Disc
    const centralGearbox = new THREE.Mesh(
      registerGeometry(new THREE.CylinderGeometry(0.34, 0.38, 0.11, 40)),
      matDarkFrameSteel
    );
    centralGearbox.rotation.x = Math.PI / 2;
    centralGearbox.position.z = 0.33;
    centralGearbox.castShadow = true;
    centralGearbox.receiveShadow = true;
    doorAssemblyGroup.add(centralGearbox);

    const camDiscGroup = new THREE.Group();
    camDiscGroup.position.z = 0.385;
    doorAssemblyGroup.add(camDiscGroup);
    kinematicRefs.current.camDiscGroup = camDiscGroup;

    const camDisc = new THREE.Mesh(
      registerGeometry(new THREE.CylinderGeometry(0.26, 0.26, 0.035, 32)),
      matStructuralSteel
    );
    camDisc.rotation.x = Math.PI / 2;
    camDisc.castShadow = true;
    camDiscGroup.add(camDisc);

    // Handwheel
    const handwheelGroup = new THREE.Group();
    handwheelGroup.position.z = 0.48;
    doorAssemblyGroup.add(handwheelGroup);
    kinematicRefs.current.handwheelGroup = handwheelGroup;

    const wheelShaft = new THREE.Mesh(
      registerGeometry(new THREE.CylinderGeometry(0.055, 0.055, 0.18, 24)),
      matHardenedPinSteel
    );
    wheelShaft.rotation.x = Math.PI / 2;
    wheelShaft.position.z = -0.05;
    wheelShaft.castShadow = true;
    handwheelGroup.add(wheelShaft);

    const wheelHub = new THREE.Mesh(
      registerGeometry(new THREE.CylinderGeometry(0.115, 0.125, 0.075, 28)),
      matGunmetal
    );
    wheelHub.rotation.x = Math.PI / 2;
    wheelHub.castShadow = true;
    handwheelGroup.add(wheelHub);

    const WHEEL_RADIUS = 0.46;
    const wheelRim = new THREE.Mesh(
      registerGeometry(new THREE.TorusGeometry(WHEEL_RADIUS, 0.028, 18, 54)),
      matHardenedPinSteel
    );
    wheelRim.castShadow = true;
    wheelRim.receiveShadow = true;
    handwheelGroup.add(wheelRim);

    for (let s = 0; s < 6; s++) {
      const sAngle = (s / 6) * Math.PI * 2;
      const spokeGroup = new THREE.Group();
      spokeGroup.rotation.z = sAngle;

      const spoke = new THREE.Mesh(
        registerGeometry(new THREE.CylinderGeometry(0.016, 0.024, WHEEL_RADIUS - 0.1, 14)),
        matStructuralSteel
      );
      spoke.position.y = (WHEEL_RADIUS + 0.08) / 2;
      spoke.castShadow = true;
      spokeGroup.add(spoke);

      if (s % 2 === 0) {
        const handle = new THREE.Mesh(
          registerGeometry(new THREE.CylinderGeometry(0.02, 0.018, 0.09, 14)),
          matGunmetal
        );
        handle.rotation.x = Math.PI / 2;
        handle.position.set(0, WHEEL_RADIUS, 0.048);
        handle.castShadow = true;
        spokeGroup.add(handle);
      }

      handwheelGroup.add(spokeGroup);
    }

    // ========================================================================
    // 9. ENGINEERING AXIS & SWING VISUALIZER
    // ========================================================================
    const engineeringGuidesGroup = new THREE.Group();
    engineeringGuidesGroup.visible = showGuidesRef.current;
    fixedFrameGroup.add(engineeringGuidesGroup);
    kinematicRefs.current.engineeringGuidesGroup = engineeringGuidesGroup;

    const axisLineMat = registerMaterial(new THREE.LineBasicMaterial({ color: 0x38bdf8 }));
    const axisPoints = [
      new THREE.Vector3(HINGE_LOCAL_X, -1.65, HINGE_LOCAL_Z),
      new THREE.Vector3(HINGE_LOCAL_X, 1.65, HINGE_LOCAL_Z),
    ];
    const axisLine = new THREE.Line(
      registerGeometry(new THREE.BufferGeometry().setFromPoints(axisPoints)),
      axisLineMat
    );
    engineeringGuidesGroup.add(axisLine);

    const arcPoints: THREE.Vector3[] = [];
    const outerEdgeRadiusFromHinge = DOOR_OFFSET_X + DOOR_RADIUS;
    for (let deg = 0; deg <= 26; deg += 1) {
      const rad = (deg * Math.PI) / 180;
      const ax = HINGE_LOCAL_X + Math.cos(rad) * outerEdgeRadiusFromHinge;
      const az = HINGE_LOCAL_Z + Math.sin(rad) * outerEdgeRadiusFromHinge;
      arcPoints.push(new THREE.Vector3(ax, FLOOR_Y - VAULT_Y + 0.02, az));
    }
    const arcLine = new THREE.Line(
      registerGeometry(new THREE.BufferGeometry().setFromPoints(arcPoints)),
      registerMaterial(new THREE.LineBasicMaterial({ color: 0x38bdf8 }))
    );
    engineeringGuidesGroup.add(arcLine);

    // ========================================================================
    // 10. INDUSTRIAL LIGHTING SYSTEM
    // ========================================================================
    const ambientLight = new THREE.AmbientLight(0x1b2636, 1.35);
    scene.add(ambientLight);

    const keySpot = new THREE.SpotLight(0xdbe8f5, 26.0);
    keySpot.position.set(1.65, 3.85, 3.65);
    keySpot.target.position.set(VAULT_X, -0.15, 0.0);
    keySpot.angle = Math.PI / 3.1;
    keySpot.penumbra = 0.65;
    keySpot.decay = 1.6;
    keySpot.distance = 16;
    keySpot.castShadow = true;
    keySpot.shadow.mapSize.width = 1024;
    keySpot.shadow.mapSize.height = 1024;
    keySpot.shadow.bias = -0.00035;
    scene.add(keySpot);
    scene.add(keySpot.target);

    const hingeInspectionLight = new THREE.SpotLight(0x9bb8d6, 14.5);
    hingeInspectionLight.position.set(-1.35, 1.45, 3.4);
    hingeInspectionLight.target.position.set(VAULT_X + HINGE_LOCAL_X, 0.0, HINGE_LOCAL_Z);
    hingeInspectionLight.angle = Math.PI / 5.5;
    hingeInspectionLight.penumbra = 0.75;
    hingeInspectionLight.decay = 1.6;
    hingeInspectionLight.distance = 10;
    hingeInspectionLight.castShadow = true;
    hingeInspectionLight.shadow.mapSize.width = 512;
    hingeInspectionLight.shadow.mapSize.height = 512;
    hingeInspectionLight.shadow.bias = -0.0004;
    scene.add(hingeInspectionLight);
    scene.add(hingeInspectionLight.target);

    const interiorVaultLight = new THREE.PointLight(0x7fa2c7, 3.8, 4.5, 1.8);
    interiorVaultLight.position.set(VAULT_X + 0.25, 0.85, -1.05);
    scene.add(interiorVaultLight);

    const edgeGrazingLight = new THREE.DirectionalLight(0x6b84a1, 1.4);
    edgeGrazingLight.position.set(4.5, 0.8, 2.2);
    scene.add(edgeGrazingLight);

    // ========================================================================
    // 11. KINEMATICS EVALUATION (10-SECOND SEQUENCE)
    // ========================================================================
    // Opening angle: 25.0° (within 20°–26° natural clearance range)
    const MAX_DOOR_ANGLE_DEG = 25.0;
    const MAX_DOOR_ANGLE_RAD = (MAX_DOOR_ANGLE_DEG * Math.PI) / 180;
    const MAX_WHEEL_ANGLE_DEG = 120.0;
    const MAX_WHEEL_ANGLE_RAD = (MAX_WHEEL_ANGLE_DEG * Math.PI) / 180;

    function quinticEaseInOut(t: number): number {
      t = Math.max(0, Math.min(1, t));
      return t * t * t * (t * (t * 6 - 15) + 10);
    }

    function quinticDerivative(t: number): number {
      t = Math.max(0, Math.min(1, t));
      return 30 * t * t * (t - 1) * (t - 1);
    }

    function applyKinematics(t: number) {
      t = Math.max(0.0, Math.min(10.0, t));

      let wheelProgress = 0.0;
      let boltRetractProgress = 0.0;
      let doorSwingProgress = 0.0;
      let angularVelDegPerSec = 0.0;
      let phaseLabel = '';

      if (t < 1.5) {
        // 0.0–1.5s: Phase A — Locked & Stationary
        wheelProgress = 0.0;
        boltRetractProgress = 0.0;
        doorSwingProgress = 0.0;
        phaseLabel = 'PHASE A: INITIAL LOCKED STATE (0.0–1.5s)';
      } else if (t < 3.0) {
        // 1.5–3.0s: Phase B & C — Handwheel Rotation & Bolt Retraction
        const u = (t - 1.5) / 1.5;
        wheelProgress = quinticEaseInOut(u);
        const boltU = Math.max(0, Math.min(1, (t - 1.58) / 1.38));
        boltRetractProgress = quinticEaseInOut(boltU);
        doorSwingProgress = 0.0;
        phaseLabel = 'PHASE B & C: HANDWHEEL & RADIAL BOLTS (1.5–3.0s)';
      } else if (t < 3.5) {
        // 3.0–3.5s: Phase D — Unlock Confirmation Pause
        wheelProgress = 1.0;
        boltRetractProgress = 1.0;
        doorSwingProgress = 0.0;
        phaseLabel = 'PHASE D: UNLOCK CONFIRMATION PAUSE (3.0–3.5s)';
      } else if (t < 9.0) {
        // 3.5–7.5s: Phase E — Controlled Hinge Opening; 7.5–9.0s: Deceleration & Stop
        wheelProgress = 1.0;
        boltRetractProgress = 1.0;
        const swingDuration = 5.5;
        const u = (t - 3.5) / swingDuration;
        doorSwingProgress = quinticEaseInOut(u);
        angularVelDegPerSec = (quinticDerivative(u) * MAX_DOOR_ANGLE_DEG) / swingDuration;

        if (t < 7.5) {
          phaseLabel = 'PHASE E: CONTROLLED LEFT-HINGE OPENING (3.5–7.5s)';
        } else {
          phaseLabel = 'CONTROLLED DECELERATION & STOP (7.5–9.0s)';
        }
      } else {
        // 9.0–10.0s: Final Hold on Partially Open Door
        wheelProgress = 1.0;
        boltRetractProgress = 1.0;
        doorSwingProgress = 1.0;
        angularVelDegPerSec = 0.0;
        phaseLabel = 'FINAL HOLD: OPEN POSITION (9.0–10.0s)';
      }

      // Rotate Handwheel and Cam around center
      if (kinematicRefs.current.handwheelGroup) {
        kinematicRefs.current.handwheelGroup.rotation.z = -wheelProgress * MAX_WHEEL_ANGLE_RAD;
      }
      if (kinematicRefs.current.camDiscGroup) {
        kinematicRefs.current.camDiscGroup.rotation.z = -wheelProgress * (MAX_WHEEL_ANGLE_RAD * 0.35);
      }

      // Retract Radial Locking Bars along their local axes
      const currentBoltExt = BOLT_MAX_EXTENSION * (1.0 - boltRetractProgress);
      for (let i = 0; i < kinematicRefs.current.lockingBars.length; i++) {
        kinematicRefs.current.lockingBars[i].position.x = currentBoltExt;
      }

      // Rotate Door Assembly strictly around the fixed LEFT Hinge Axis
      if (kinematicRefs.current.hingePivotGroup) {
        kinematicRefs.current.hingePivotGroup.rotation.y = -doorSwingProgress * MAX_DOOR_ANGLE_RAD;
      }

      // Telemetry callback
      if (onTelemetryRef.current) {
        onTelemetryRef.current({
          currentTime: t,
          phaseLabel,
          wheelDeg: wheelProgress * MAX_WHEEL_ANGLE_DEG,
          boltRetractMm: boltRetractProgress * 160.0,
          doorAngleDeg: doorSwingProgress * MAX_DOOR_ANGLE_DEG,
          angularVelDegPerSec,
          boltRetractPercent: (1.0 - boltRetractProgress) * 100,
          isUnlocked: boltRetractProgress >= 0.999,
          isDoorOpen: doorSwingProgress > 0.05,
        });
      }
    }

    // ========================================================================
    // 12. RESIZE HANDLER & ANIMATION LOOP
    // ========================================================================
    function handleResize() {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const width = rect.width || window.innerWidth;
      const height = rect.height || window.innerHeight;
      const aspect = width / height;

      camera.aspect = aspect;
      if (width < 768) {
        camera.position.set(0.0, 0.0, 7.8);
        camera.fov = 38;
      } else if (aspect < 1.35) {
        camera.position.set(0.2, 0.02, 7.1);
        camera.fov = 36;
      } else {
        camera.position.set(0.0, 0.02, 6.45);
        camera.fov = 34;
      }
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    // Context lost handler
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      if (onContextLost) onContextLost();
    });

    let animationFrameId: number;
    let lastTime = performance.now();

    function renderLoop(now: number) {
      animationFrameId = requestAnimationFrame(renderLoop);
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (isPlayingRef.current) {
        animTimeRef.current += dt;
        if (animTimeRef.current >= 10.0) {
          if (isLoopingRef.current) {
            animTimeRef.current = 0.0;
          } else {
            animTimeRef.current = 10.0;
            isPlayingRef.current = false;
            if (onCompleteRef.current) {
              onCompleteRef.current();
            }
          }
        }
      }

      applyKinematics(animTimeRef.current);
      renderer.render(scene, camera);
    }

    applyKinematics(animTimeRef.current);
    animationFrameId = requestAnimationFrame(renderLoop);

    // Cleanup resources on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

      disposables.geometries.forEach((g) => g.dispose());
      disposables.materials.forEach((m) => m.dispose());
      disposables.textures.forEach((t) => t.dispose());
      envRenderTarget.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="industrial-vault-viewport"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      {/* Subtle cinematic vignette from the original design */}
      <div
        className="cinema-grade-overlay"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse at 58% 50%, rgba(0, 0, 0, 0) 48%, rgba(4, 7, 12, 0.42) 85%, rgba(2, 4, 8, 0.78) 100%)',
          zIndex: 2,
        }}
      />
    </div>
  );
};
