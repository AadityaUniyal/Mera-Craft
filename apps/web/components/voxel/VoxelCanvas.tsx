"use client";

import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { BrowserInferenceEngine, InferenceResult, ACTION_NAMES } from "@/lib/ai/browser-inference";
import { TrajectoryStep } from "./ReplayViewer";
import { soundSynth } from "@/lib/audio/sound-synth";

export type InteractionMode = "relocate_target" | "place_obstacle" | "place_lava" | "spawn_creeper" | "teleport_agent" | "orbit_camera";
export type CameraPOVMode = "orbit" | "first_person" | "top_down" | "follow";

interface VoxelCanvasProps {
  seed: number;
  curriculumLevel: number;
  isPlaying: boolean;
  speed: number;
  modelVersion: string;
  stepTrigger: number;
  interactionMode?: InteractionMode;
  cameraMode?: CameraPOVMode;
  movingTargetMode?: boolean;
  soundEnabled?: boolean;
  onTelemetryUpdate: (data: {
    action: number;
    probabilities: number[];
    reward: number;
    cumulativeReward: number;
    stepCount: number;
    inventory: number;
    inventoryWood: number;
    inventoryIron: number;
    inventoryDiamond: number;
    totalDelivered: number;
    stamina: number;
    health: number;
    latencyMs: number;
    confidence: number;
    status: "running" | "goal_reached" | "collision" | "lava_hazard" | "mob_defeat" | "idle";
    agentYaw: number;
    targetAngle: number;
    targetDistance: number;
    observation: number[];
    trajectory: TrajectoryStep[];
  }) => void;
}

export default function VoxelCanvas({
  seed,
  curriculumLevel,
  isPlaying,
  speed,
  modelVersion,
  stepTrigger,
  interactionMode = "relocate_target",
  cameraMode = "orbit",
  movingTargetMode = false,
  soundEnabled = true,
  onTelemetryUpdate,
}: VoxelCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const agentMeshRef = useRef<THREE.Group | null>(null);
  const targetMeshRef = useRef<THREE.Mesh | null>(null);
  const baseHubMeshRef = useRef<THREE.Mesh | null>(null);
  const creeperMeshRef = useRef<THREE.Group | null>(null);
  const blocksGroupRef = useRef<THREE.Group | null>(null);
  const rayLinesGroupRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Pre-allocated laser ray objects to avoid garbage collection stutter
  const laserRaysRef = useRef<{ line: THREE.Line; dot: THREE.Mesh; lineMat: THREE.LineBasicMaterial; dotMat: THREE.MeshBasicMaterial }[]>([]);

  // Simulation State with realistic physics & voxel collision
  const simState = useRef({
    gridSize: 16,
    agentPos: [2.5, 0.0, 2.5] as [number, number, number],
    agentPrevPos: [2.5, 0.0, 2.5] as [number, number, number],
    agentYaw: 0.0,
    targetPos: [12.5, 0.0, 12.5] as [number, number, number],
    baseHubPos: [2.5, 0.0, 2.5] as [number, number, number],
    creeperPos: [13.5, 0.0, 13.5] as [number, number, number],
    creeperActive: false,
    grid: [] as number[][], // 0: air, 1: grass, 2: dirt, 3: stone, 4: wood, 5: iron, 6: diamond, 7: bedrock, 8: lava, 9: water, 10: base_hub, 11: cobble_bridge
    resources: [] as { x: number; y: number; z: number; collected: boolean; type: number }[],
    inventoryWood: 0,
    inventoryIron: 0,
    inventoryDiamond: 0,
    inventoryBridgeBlocks: 12,
    placedBlocksCount: 0,
    totalDelivered: 0,
    stamina: 1.0,
    health: 1.0,
    cumulativeReward: 0.0,
    stepCount: 0,
    maxSteps: 300,
    prevDistance: 0.0,
    status: "running" as "running" | "goal_reached" | "collision" | "lava_hazard" | "mob_defeat" | "idle",
    trajectory: [] as TrajectoryStep[],
    dayNightPhase: 0.0,
  });

  const engineRef = useRef<BrowserInferenceEngine>(new BrowserInferenceEngine());

  const pseudoRandom = useCallback((s: number) => {
    let t = s % 2147483647;
    if (t <= 0) t += 2147483646;
    return () => {
      t = (t * 16807) % 2147483647;
      return (t - 1) / 2147483646;
    };
  }, []);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c101c);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(16, 22, 26);
    camera.lookAt(8, 0, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5dd, 1.4);
    dirLight.position.set(24, 35, 24);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    sunLightRef.current = dirLight;

    const blocksGroup = new THREE.Group();
    scene.add(blocksGroup);
    blocksGroupRef.current = blocksGroup;

    const rayGroup = new THREE.Group();
    scene.add(rayGroup);
    rayLinesGroupRef.current = rayGroup;

    // Pre-allocate 8 Laser LiDAR Ray lines & dots in pool
    laserRaysRef.current = [];
    for (let i = 0; i < 8; i++) {
      const positions = new Float32Array([0, 0, 0, 0, 0, 0]);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const lineMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2, transparent: true, opacity: 0.85 });
      const line = new THREE.Line(geom, lineMat);
      rayGroup.add(line);

      const dotGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const dotMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      rayGroup.add(dot);

      laserRaysRef.current.push({ line, dot, lineMat, dotMat });
    }

    // 1. Steve Voxel Avatar
    const agentGroup = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    agentGroup.add(body);

    const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.14;
    agentGroup.add(head);

    const legGeo = new THREE.BoxGeometry(0.24, 0.5, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.15, 0.1, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.15, 0.1, 0);
    agentGroup.add(leftLeg, rightLeg);

    scene.add(agentGroup);
    agentMeshRef.current = agentGroup;

    // 2. Creeper Hostile Mob Mesh
    const creeperGroup = new THREE.Group();
    const cBodyGeo = new THREE.BoxGeometry(0.5, 0.9, 0.4);
    const cBodyMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });
    const cBody = new THREE.Mesh(cBodyGeo, cBodyMat);
    cBody.position.y = 0.5;
    creeperGroup.add(cBody);

    const cHeadGeo = new THREE.BoxGeometry(0.52, 0.52, 0.52);
    const cHeadMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.4 });
    const cHead = new THREE.Mesh(cHeadGeo, cHeadMat);
    cHead.position.y = 1.2;
    creeperGroup.add(cHead);
    creeperGroup.visible = false;
    scene.add(creeperGroup);
    creeperMeshRef.current = creeperGroup;

    // 3. Target Diamond Mesh
    const targetGeo = new THREE.OctahedronGeometry(0.45, 0);
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9,
    });
    const targetMesh = new THREE.Mesh(targetGeo, targetMat);
    scene.add(targetMesh);
    targetMeshRef.current = targetMesh;

    // 4. Base Hub (Crafting Table & Delivery Depot)
    const baseGeo = new THREE.BoxGeometry(1.4, 0.3, 1.4);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.5,
      roughness: 0.5,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    scene.add(baseMesh);
    baseHubMeshRef.current = baseMesh;

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (targetMeshRef.current) {
        targetMeshRef.current.rotation.y += 0.03;
        targetMeshRef.current.position.y = 0.6 + Math.sin(Date.now() * 0.005) * 0.15;
      }

      // Camera Follow / Orbit Handling
      if (cameraRef.current && agentMeshRef.current) {
        if (cameraMode === "follow") {
          const s = simState.current;
          cameraRef.current.position.set(
            s.agentPos[0] - Math.sin(s.agentYaw) * 6,
            s.agentPos[1] + 4,
            s.agentPos[2] - Math.cos(s.agentYaw) * 6
          );
          cameraRef.current.lookAt(s.agentPos[0], s.agentPos[1] + 1, s.agentPos[2]);
        } else if (cameraMode === "first_person") {
          const s = simState.current;
          cameraRef.current.position.set(s.agentPos[0], s.agentPos[1] + 1.2, s.agentPos[2]);
          cameraRef.current.lookAt(
            s.agentPos[0] + Math.sin(s.agentYaw) * 8,
            s.agentPos[1] + 1.0,
            s.agentPos[2] + Math.cos(s.agentYaw) * 8
          );
        } else if (cameraMode === "top_down") {
          cameraRef.current.position.set(8, 28, 8);
          cameraRef.current.lookAt(8, 0, 8);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (rendererRef.current && rendererRef.current.domElement && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [cameraMode]);

  // Load Model
  useEffect(() => {
    const uri = modelVersion.startsWith("/") ? modelVersion : `/models/${modelVersion}.onnx`;
    engineRef.current.loadModel(uri);
  }, [modelVersion]);

  // Shared voxel materials to prevent GPU state swaps
  const voxelMaterials = useRef({
    grass: new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x5c391f, roughness: 0.8 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.4 }),
    diamond: new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x0284c7, emissiveIntensity: 0.8 }),
    bedrock: new THREE.MeshStandardMaterial({ color: 0x1e2330, roughness: 0.9 }),
    lava: new THREE.MeshStandardMaterial({ color: 0xff3d00, emissive: 0xff1744, emissiveIntensity: 0.8 }),
    water: new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.7 }),
    base: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }),
    cobble: new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.6 }),
  });

  // Generate 3D Voxel World
  const generateWorld = useCallback(() => {
    const s = simState.current;
    s.gridSize = 16;
    s.status = "running";
    s.stepCount = 0;
    s.cumulativeReward = 0.0;
    s.inventoryWood = 0;
    s.inventoryIron = 0;
    s.inventoryDiamond = 0;
    s.inventoryBridgeBlocks = 16;
    s.placedBlocksCount = 0;
    s.totalDelivered = 0;
    s.stamina = 1.0;
    s.health = 1.0;
    s.trajectory = [];

    const rng = pseudoRandom(seed + curriculumLevel * 100);

    if (blocksGroupRef.current) {
      while (blocksGroupRef.current.children.length > 0) {
        blocksGroupRef.current.remove(blocksGroupRef.current.children[0]);
      }
    }

    s.grid = Array.from({ length: s.gridSize }, () => Array(s.gridSize).fill(1));
    s.resources = [];

    // Perimeter Bedrock
    for (let x = 0; x < s.gridSize; x++) {
      for (let z = 0; z < s.gridSize; z++) {
        if (x === 0 || x === s.gridSize - 1 || z === 0 || z === s.gridSize - 1) {
          s.grid[x][z] = 7;
        }
      }
    }

    s.baseHubPos = [2.5, 0.0, 2.5];
    s.grid[2][2] = 10;

    if (curriculumLevel === 0) {
      s.agentPos = [2.5, 0.0, 2.5];
      s.targetPos = [12.5, 0.0, 12.5];
      s.creeperActive = false;
      s.grid[6][6] = 3;
      s.grid[6][7] = 3;
      s.grid[7][6] = 3;
      s.grid[10][10] = 3;
      s.grid[10][11] = 3;
    } else if (curriculumLevel === 1) {
      s.agentPos = [3.5, 0.0, 8.0];
      s.targetPos = [12.5, 0.0, 8.0];
      s.creeperActive = false;
      for (let x = 6; x <= 9; x++) {
        for (let z = 2; z <= 13; z++) {
          s.grid[x][z] = 8;
        }
      }
    } else if (curriculumLevel === 2) {
      s.agentPos = [2.5, 0.0, 8.0];
      s.targetPos = [13.5, 0.0, 8.0];
      s.creeperActive = false;
      for (let x = 6; x <= 8; x++) {
        for (let z = 1; z <= 14; z++) {
          s.grid[x][z] = 9;
        }
      }
      s.grid[13][8] = 6;
    } else if (curriculumLevel === 3) {
      s.agentPos = [3.0, 0.0, 3.0];
      s.targetPos = [12.0, 0.0, 12.0];
      s.creeperActive = true;
      s.creeperPos = [11.0, 0.0, 11.0];
    } else {
      s.agentPos = [2.5, 0.0, 2.5];
      s.targetPos = [12.5, 0.0, 12.5];
      s.creeperActive = true;
      s.creeperPos = [9.0, 0.0, 9.0];
      s.grid[5][5] = 4;
      s.grid[5][6] = 4;
      s.grid[8][8] = 5;
      s.grid[12][12] = 6;
      for (let x = 7; x <= 8; x++) {
        for (let z = 2; z <= 6; z++) {
          s.grid[x][z] = 8;
        }
      }
    }

    if (targetMeshRef.current) {
      targetMeshRef.current.position.set(s.targetPos[0], 0.6, s.targetPos[2]);
    }
    if (baseHubMeshRef.current) {
      baseHubMeshRef.current.position.set(s.baseHubPos[0], 0.15, s.baseHubPos[2]);
    }
    if (creeperMeshRef.current) {
      creeperMeshRef.current.position.set(s.creeperPos[0], 0.0, s.creeperPos[2]);
      creeperMeshRef.current.visible = s.creeperActive;
    }
    if (agentMeshRef.current) {
      agentMeshRef.current.position.set(s.agentPos[0], s.agentPos[1], s.agentPos[2]);
      agentMeshRef.current.rotation.y = s.agentYaw;
    }

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const mats = voxelMaterials.current;

    for (let x = 0; x < s.gridSize; x++) {
      for (let z = 0; z < s.gridSize; z++) {
        const type = s.grid[x][z];
        if (type === 0) continue;

        let mat = mats.grass;
        if (type === 2) mat = mats.dirt;
        else if (type === 3) mat = mats.stone;
        else if (type === 4) mat = mats.wood;
        else if (type === 5) mat = mats.iron;
        else if (type === 6) mat = mats.diamond;
        else if (type === 7) mat = mats.bedrock;
        else if (type === 8) mat = mats.lava;
        else if (type === 9) mat = mats.water;
        else if (type === 10) mat = mats.base;
        else if (type === 11) mat = mats.cobble;

        const voxel = new THREE.Mesh(boxGeo, mat);
        voxel.position.set(x + 0.5, -0.5, z + 0.5);
        voxel.receiveShadow = true;
        blocksGroupRef.current?.add(voxel);

        if (type === 3 || (type === 7 && (x === 0 || x === s.gridSize - 1 || z === 0 || z === s.gridSize - 1))) {
          const wallVoxel = new THREE.Mesh(boxGeo, mat);
          wallVoxel.position.set(x + 0.5, 0.5, z + 0.5);
          wallVoxel.castShadow = true;
          wallVoxel.receiveShadow = true;
          blocksGroupRef.current?.add(wallVoxel);
        }
      }
    }
  }, [seed, curriculumLevel, pseudoRandom]);

  useEffect(() => {
    generateWorld();
  }, [generateWorld]);

  // High-performance zero-allocation LiDAR Laser Ray update
  const updateLiDARLaserRays = useCallback((observation: Float32Array) => {
    if (laserRaysRef.current.length === 0) return;

    const s = simState.current;
    const rayAngles = [0.0, 0.785, 1.571, 2.356, 3.1415, 3.927, 4.712, 5.498];
    const originX = s.agentPos[0];
    const originY = s.agentPos[1] + 1.0;
    const originZ = s.agentPos[2];

    for (let i = 0; i < 8; i++) {
      const ray = laserRaysRef.current[i];
      if (!ray) continue;

      const angle = (s.agentYaw + rayAngles[i]) % (2 * Math.PI);
      const hitDistNormalized = observation[i];
      const actualDist = Math.max(0.4, hitDistNormalized * 7.0);

      const hitX = s.agentPos[0] + Math.sin(angle) * actualDist;
      const hitY = s.agentPos[1] + 0.8;
      const hitZ = s.agentPos[2] + Math.cos(angle) * actualDist;

      // Update line points in place
      const posAttr = ray.line.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      arr[0] = originX;
      arr[1] = originY;
      arr[2] = originZ;
      arr[3] = hitX;
      arr[4] = hitY;
      arr[5] = hitZ;
      posAttr.needsUpdate = true;

      // Update dot position
      ray.dot.position.set(hitX, hitY, hitZ);

      // Color coding
      let rayColor = 0x10b981;
      if (observation[8 + i] > 0.5) rayColor = 0xfbbf24;
      else if (observation[16 + (i % 4)] > 0.5) rayColor = 0xf97316;
      else if (hitDistNormalized < 0.35) rayColor = 0xef4444;
      else if (s.creeperActive && observation[20] > 0.3) rayColor = 0xa855f7;

      ray.lineMat.color.setHex(rayColor);
      ray.dotMat.color.setHex(rayColor);
    }
  }, []);

  // Heavy Simulation Physics & Neural Step
  const stepSimulation = useCallback(async () => {
    const s = simState.current;
    if (s.status !== "running") return;

    s.stepCount++;
    s.agentPrevPos = [...s.agentPos];

    const obs = new Float32Array(42);
    const rayAngles = [0.0, 0.785, 1.571, 2.356, 3.1415, 3.927, 4.712, 5.498];
    const maxRayDist = 7.0;

    // 1. 8-directional LiDAR Obstacle & Target Rays
    for (let i = 0; i < 8; i++) {
      const rayAngle = (s.agentYaw + rayAngles[i]) % (2 * Math.PI);
      const rdx = Math.sin(rayAngle);
      const rdz = Math.cos(rayAngle);
      let distHit = maxRayDist;
      let targetHit = 0.0;

      for (let stepD = 0.3; stepD <= maxRayDist; stepD += 0.3) {
        const tx = s.agentPos[0] + rdx * stepD;
        const tz = s.agentPos[2] + rdz * stepD;
        const gx = Math.floor(tx);
        const gz = Math.floor(tz);

        if (gx < 0 || gx >= s.gridSize || gz < 0 || gz >= s.gridSize) {
          distHit = stepD;
          break;
        }
        const cell = s.grid[gx][gz];
        if (cell === 3 || cell === 7) {
          distHit = stepD;
          break;
        }
        if (Math.hypot(tx - s.targetPos[0], tz - s.targetPos[2]) < 0.8) {
          targetHit = 1.0;
        }
      }
      obs[i] = distHit / maxRayDist;
      obs[8 + i] = targetHit;
    }

    // 2. 4-directional Lava & Water Hazard Sensors
    const cardAngles = [0.0, 1.571, 3.1415, 4.712];
    for (let j = 0; j < 4; j++) {
      const hAngle = (s.agentYaw + cardAngles[j]) % (2 * Math.PI);
      const hx = Math.floor(s.agentPos[0] + Math.sin(hAngle) * 1.5);
      const hz = Math.floor(s.agentPos[2] + Math.cos(hAngle) * 1.5);
      if (hx >= 0 && hx < s.gridSize && hz >= 0 && hz < s.gridSize) {
        if (s.grid[hx][hz] === 8 || s.grid[hx][hz] === 9) {
          obs[16 + j] = 1.0;
        }
      }
    }

    // 3. Creeper Threat Proximity Vectors
    if (s.creeperActive) {
      const toCreeperX = s.creeperPos[0] - s.agentPos[0];
      const toCreeperZ = s.creeperPos[2] - s.agentPos[2];
      const cDist = Math.hypot(toCreeperX, toCreeperZ);
      if (cDist < 7.0) {
        obs[20] = 1.0 - (cDist / 7.0);
      }
    }

    // 4. Target & Base Hub Vectors
    const normScale = s.gridSize * 1.414;
    const relTargetX = s.targetPos[0] - s.agentPos[0];
    const relTargetZ = s.targetPos[2] - s.agentPos[2];
    const distToTarget = Math.hypot(relTargetX, relTargetZ);
    obs[24] = Math.max(-1.0, Math.min(1.0, relTargetX / normScale));
    obs[25] = Math.max(-1.0, Math.min(1.0, relTargetZ / normScale));
    obs[26] = Math.max(0.0, Math.min(1.0, distToTarget / normScale));

    const targetAngle = Math.atan2(relTargetX, relTargetZ);
    const angleDiff = ((targetAngle - s.agentYaw + Math.PI) % (2 * Math.PI)) - Math.PI;
    obs[27] = angleDiff / Math.PI;

    obs[30] = Math.sin(s.agentYaw);
    obs[31] = Math.cos(s.agentYaw);
    obs[32] = Math.min(1.0, s.inventoryWood / 3.0);
    obs[33] = 0.0;
    obs[34] = Math.min(1.0, s.inventoryIron / 3.0);
    obs[35] = Math.min(1.0, s.inventoryDiamond / 3.0);
    obs[36] = Math.min(1.0, s.inventoryBridgeBlocks / 16.0);
    obs[39] = s.health;
    obs[40] = s.stamina;
    obs[41] = s.dayNightPhase;

    updateLiDARLaserRays(obs);

    const result: InferenceResult = await engineRef.current.predict(obs);
    const action = result.action;

    let stepReward = -0.01;
    const walkSpeed = 0.40;
    const sprintSpeed = 0.72;

    const isSneaking = (action === 6);
    const isSprinting = (action === 1);

    let moveDist = 0;
    if (action === 0) moveDist = walkSpeed;
    else if (action === 1) moveDist = sprintSpeed;
    else if (action === 2) moveDist = -walkSpeed * 0.6;
    else if (action === 6) moveDist = walkSpeed * 0.4;

    if (moveDist !== 0) {
      const nextX = s.agentPos[0] + Math.sin(s.agentYaw) * moveDist;
      const nextZ = s.agentPos[2] + Math.cos(s.agentYaw) * moveDist;
      const nextGx = Math.floor(nextX);
      const nextGz = Math.floor(nextZ);

      if (nextGx >= 0 && nextGx < s.gridSize && nextGz >= 0 && nextGz < s.gridSize) {
        const nextCell = s.grid[nextGx][nextGz];

        if (nextCell === 8 || nextCell === 9) {
          if (isSneaking) {
            stepReward -= 0.1;
          } else {
            stepReward -= 20.0;
            s.health = 0.0;
            s.status = "lava_hazard";
            if (soundEnabled) soundSynth.playHurtGrunt();
          }
        } else if (nextCell === 3 || nextCell === 7) {
          stepReward -= 0.15;
          if (soundEnabled) soundSynth.playBlockBreak();
        } else {
          s.agentPos[0] = nextX;
          s.agentPos[2] = nextZ;
          const prevDist = Math.hypot(s.targetPos[0] - s.agentPrevPos[0], s.targetPos[2] - s.agentPrevPos[2]);
          const newDist = Math.hypot(s.targetPos[0] - nextX, s.targetPos[2] - nextZ);
          stepReward += (prevDist - newDist) * 3.5;
        }
      }
    } else if (action === 3) {
      s.agentYaw = (s.agentYaw - 0.35 + 2 * Math.PI) % (2 * Math.PI);
    } else if (action === 4) {
      s.agentYaw = (s.agentYaw + 0.35) % (2 * Math.PI);
    } else if (action === 5) {
      const jumpDist = 1.1;
      const landingX = s.agentPos[0] + Math.sin(s.agentYaw) * jumpDist;
      const landingZ = s.agentPos[2] + Math.cos(s.agentYaw) * jumpDist;
      const lgx = Math.floor(landingX);
      const lgz = Math.floor(landingZ);

      if (lgx >= 0 && lgx < s.gridSize && lgz >= 0 && lgz < s.gridSize) {
        const landCell = s.grid[lgx][lgz];
        if (landCell !== 8 && landCell !== 9 && landCell !== 3 && landCell !== 7) {
          s.agentPos[0] = landingX;
          s.agentPos[2] = landingZ;
          stepReward += 1.5;
          if (soundEnabled) soundSynth.playFootstep();
        }
      }
    } else if (action === 7) {
      const frontGx = Math.floor(s.agentPos[0] + Math.sin(s.agentYaw) * 1.2);
      const frontGz = Math.floor(s.agentPos[2] + Math.cos(s.agentYaw) * 1.2);
      if (frontGx >= 0 && frontGx < s.gridSize && frontGz >= 0 && frontGz < s.gridSize) {
        const block = s.grid[frontGx][frontGz];
        if (block === 4) {
          s.inventoryWood += 1;
          s.grid[frontGx][frontGz] = 1;
          stepReward += 8.0;
          if (soundEnabled) soundSynth.playBlockBreak();
          generateWorld();
        } else if (block === 5) {
          s.inventoryIron += 1;
          s.grid[frontGx][frontGz] = 1;
          stepReward += 12.0;
          if (soundEnabled) soundSynth.playBlockBreak();
          generateWorld();
        } else if (block === 6) {
          s.inventoryDiamond += 1;
          s.grid[frontGx][frontGz] = 1;
          stepReward += 30.0;
          if (soundEnabled) soundSynth.playDiamondChime();
          generateWorld();
        }
      }
    } else if (action === 8) {
      const frontGx = Math.floor(s.agentPos[0] + Math.sin(s.agentYaw) * 1.2);
      const frontGz = Math.floor(s.agentPos[2] + Math.cos(s.agentYaw) * 1.2);
      if (frontGx >= 0 && frontGx < s.gridSize && frontGz >= 0 && frontGz < s.gridSize) {
        const cell = s.grid[frontGx][frontGz];
        if ((cell === 8 || cell === 9 || cell === 0) && s.inventoryBridgeBlocks > 0) {
          s.grid[frontGx][frontGz] = 11;
          s.inventoryBridgeBlocks--;
          s.placedBlocksCount++;
          stepReward += 6.0;
          if (soundEnabled) soundSynth.playBlockPlace();
          generateWorld();
        }
      }
    } else if (action === 9) {
      const distToBase = Math.hypot(s.agentPos[0] - s.baseHubPos[0], s.agentPos[2] - s.baseHubPos[2]);
      if (distToBase < 2.0 && s.inventoryDiamond > 0) {
        s.totalDelivered += s.inventoryDiamond;
        stepReward += s.inventoryDiamond * 40.0;
        s.inventoryDiamond = 0;
        s.status = "goal_reached";
        if (soundEnabled) soundSynth.playLevelUp();
      }
    }

    if (distToTarget < 1.2 && s.status === "running") {
      s.status = "goal_reached";
      stepReward += 25.0;
      s.inventoryDiamond += 1;
      if (soundEnabled) soundSynth.playDiamondChime();
    }

    if (s.creeperActive) {
      const toAgentX = s.agentPos[0] - s.creeperPos[0];
      const toAgentZ = s.agentPos[2] - s.creeperPos[2];
      const cDist = Math.hypot(toAgentX, toAgentZ);
      if (cDist > 0.2) {
        s.creeperPos[0] += (toAgentX / cDist) * 0.28;
        s.creeperPos[2] += (toAgentZ / cDist) * 0.28;
      }
      if (creeperMeshRef.current) {
        creeperMeshRef.current.position.set(s.creeperPos[0], 0.0, s.creeperPos[2]);
        creeperMeshRef.current.visible = true;
      }
      if (cDist < 1.3) {
        s.health -= 0.35;
        if (soundEnabled) soundSynth.playCreeperHiss();
        if (s.health <= 0) {
          s.status = "mob_defeat";
          stepReward -= 20.0;
          if (soundEnabled) soundSynth.playHurtGrunt();
        }
      }
    }

    s.cumulativeReward += stepReward;

    if (agentMeshRef.current) {
      agentMeshRef.current.position.set(s.agentPos[0], s.agentPos[1], s.agentPos[2]);
      agentMeshRef.current.rotation.y = s.agentYaw;
    }

    onTelemetryUpdate({
      action,
      probabilities: result.probabilities,
      reward: stepReward,
      cumulativeReward: s.cumulativeReward,
      stepCount: s.stepCount,
      inventory: s.inventoryDiamond + s.inventoryIron + s.inventoryWood,
      inventoryWood: s.inventoryWood,
      inventoryIron: s.inventoryIron,
      inventoryDiamond: s.inventoryDiamond,
      totalDelivered: s.totalDelivered,
      stamina: s.stamina,
      health: s.health,
      latencyMs: result.latencyMs,
      confidence: result.confidence,
      status: s.status,
      agentYaw: s.agentYaw,
      targetAngle,
      targetDistance: distToTarget,
      observation: Array.from(obs),
      trajectory: s.trajectory,
    });
  }, [soundEnabled, curriculumLevel, updateLiDARLaserRays, onTelemetryUpdate, generateWorld]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(stepSimulation, Math.max(16, 120 / speed));
    return () => clearInterval(interval);
  }, [isPlaying, speed, stepSimulation]);

  // God-Mode Click Handler: Three.js Raycaster for interactive world editing
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    // Raycast against a virtual ground plane at y = 0
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5);
    const hitPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, hitPoint);

    if (!hitPoint) return;

    const gx = Math.floor(hitPoint.x);
    const gz = Math.floor(hitPoint.z);
    const s = simState.current;

    if (gx < 1 || gx >= s.gridSize - 1 || gz < 1 || gz >= s.gridSize - 1) return;

    switch (interactionMode) {
      case "relocate_target":
        if (s.grid[gx][gz] !== 3 && s.grid[gx][gz] !== 7 && s.grid[gx][gz] !== 8) {
          s.targetPos = [gx + 0.5, 0.0, gz + 0.5];
          if (targetMeshRef.current) {
            targetMeshRef.current.position.set(gx + 0.5, 0.6, gz + 0.5);
          }
          if (soundEnabled) soundSynth.playDiamondChime();
        }
        break;

      case "place_obstacle":
        if (s.grid[gx][gz] === 1 || s.grid[gx][gz] === 0) {
          s.grid[gx][gz] = 3; // stone obstacle
          if (soundEnabled) soundSynth.playBlockPlace();
          generateWorld();
        }
        break;

      case "place_lava":
        if (s.grid[gx][gz] === 1 || s.grid[gx][gz] === 0) {
          s.grid[gx][gz] = 8; // lava hazard
          if (soundEnabled) soundSynth.playBlockPlace();
          generateWorld();
        }
        break;

      case "spawn_creeper":
        s.creeperActive = true;
        s.creeperPos = [gx + 0.5, 0.0, gz + 0.5];
        if (creeperMeshRef.current) {
          creeperMeshRef.current.position.set(gx + 0.5, 0.0, gz + 0.5);
          creeperMeshRef.current.visible = true;
        }
        if (soundEnabled) soundSynth.playCreeperHiss();
        break;

      case "teleport_agent":
        if (s.grid[gx][gz] !== 3 && s.grid[gx][gz] !== 7 && s.grid[gx][gz] !== 8) {
          s.agentPos = [gx + 0.5, 0.0, gz + 0.5];
          if (agentMeshRef.current) {
            agentMeshRef.current.position.set(gx + 0.5, 0.0, gz + 0.5);
          }
          if (soundEnabled) soundSynth.playFootstep();
        }
        break;
    }
  }, [interactionMode, soundEnabled, generateWorld]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full cursor-crosshair"
      onClick={handleCanvasClick}
    />
  );
}
