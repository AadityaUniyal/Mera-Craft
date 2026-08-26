"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { generateWorld, WorldGenResult, BlockType, BiomeType } from "@/lib/game/world-generator";
import { PlayerController, PlayerState, createDefaultPlayer } from "@/lib/game/player-controller";
import { AIEntityManager, AIEntityState, createAIEntity } from "@/lib/game/ai-entity";

interface GameCanvasProps {
  worldSeed: number;
  worldType: string;
  displayName: string;
  onPlayerUpdate: (player: PlayerState) => void;
  onAIEntitiesUpdate: (entities: AIEntityState[]) => void;
  onModelStatusUpdate: (status: string) => void;
  onPauseRequest: () => void;
  isPaused: boolean;
}

const BLOCK_COLORS: Record<string, number> = {
  grass: 0x4caf50,
  dirt: 0x795548,
  stone: 0x9e9e9e,
  wood: 0x8d6e63,
  leaves: 0x2e7d32,
  water: 0x1565c0,
  sand: 0xfdd835,
  iron_ore: 0xb0bec5,
  diamond_ore: 0x00e5ff,
  cobblestone: 0x757575,
  planks: 0xa1887f,
  log: 0x5d4037,
  crafting_table: 0xff8f00,
  chest: 0x6d4c41,
  torch: 0xffca28,
  bedrock: 0x212121,
  gravel: 0x616161,
  snow: 0xeceff1,
  ice: 0x81d4fa,
  air: 0x000000,
};

export default function GameCanvas({
  worldSeed,
  worldType,
  displayName,
  onPlayerUpdate,
  onAIEntitiesUpdate,
  onModelStatusUpdate,
  onPauseRequest,
  isPaused,
}: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controllerRef = useRef<PlayerController | null>(null);
  const playerRef = useRef<PlayerState | null>(null);
  const worldRef = useRef<WorldGenResult | null>(null);
  const aiManagerRef = useRef<AIEntityManager | null>(null);
  const npcMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const cleanupRef = useRef<(() => void) | null>(null);
  const animFrameRef = useRef<number>(0);
  const tickIntervalRef = useRef<number>(0);

  const buildWorldMesh = useCallback((scene: THREE.Scene, world: WorldGenResult) => {
    const worldGroup = new THREE.Group();
    worldGroup.name = "world";

    // Use instanced meshes for performance
    const blockGeo = new THREE.BoxGeometry(1, 1, 1);
    const blockCounts: Record<string, number> = {};
    const blockPositions: Record<string, [number, number, number][]> = {};

    for (let x = 0; x < world.size; x++) {
      for (let z = 0; z < world.size; z++) {
        for (let y = 0; y < world.blocks[x][z].length; y++) {
          const type = world.blocks[x][z][y];
          if (type === "air") continue;
          if (!blockCounts[type]) {
            blockCounts[type] = 0;
            blockPositions[type] = [];
          }
          blockCounts[type]++;
          blockPositions[type].push([x + 0.5, y, z + 0.5]);
        }
      }
    }

    for (const [type, positions] of Object.entries(blockPositions)) {
      const color = BLOCK_COLORS[type] || 0x888888;
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: type === "water" ? 0.1 : type === "diamond_ore" ? 0.2 : 0.8,
        metalness: type === "iron_ore" ? 0.6 : type === "diamond_ore" ? 0.8 : 0,
        transparent: type === "water",
        opacity: type === "water" ? 0.6 : 1,
      });

      if (type === "diamond_ore" || type === "torch" || type === "crafting_table") {
        mat.emissive = new THREE.Color(color);
        mat.emissiveIntensity = 0.5;
      }

      const instancedMesh = new THREE.InstancedMesh(blockGeo, mat, positions.length);
      const matrix = new THREE.Matrix4();

      positions.forEach(([px, py, pz], i) => {
        matrix.setPosition(px, py, pz);
        instancedMesh.setMatrixAt(i, matrix);
      });

      instancedMesh.instanceMatrix.needsUpdate = true;
      instancedMesh.receiveShadow = true;
      instancedMesh.castShadow = true;
      worldGroup.add(instancedMesh);
    }

    scene.add(worldGroup);
  }, []);

  const createNPCMesh = useCallback((entity: AIEntityState): THREE.Group => {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.7, 0.35);
    const bodyColor = entity.role === "explorer" ? 0x1565c0 : 0x2e7d32;
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.45;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffcc80, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.0;
    group.add(head);

    // Name label (floating above)
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 24px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(entity.name, 128, 28);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "16px Inter, sans-serif";
    ctx.fillText(entity.role.charAt(0).toUpperCase() + entity.role.slice(1), 128, 50);

    const labelTexture = new THREE.CanvasTexture(canvas);
    const labelGeo = new THREE.PlaneGeometry(2, 0.5);
    const labelMat = new THREE.MeshBasicMaterial({
      map: labelTexture,
      transparent: true,
      depthWrite: false,
    });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.y = 1.6;
    group.add(label);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.4, 0.25);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.6 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.12, 0.05, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.12, 0.05, 0);
    group.add(leftLeg, rightLeg);

    return group;
  }, []);

  // Initialize scene
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.015);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 500);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const hemLight = new THREE.HemisphereLight(0x87ceeb, 0x4caf50, 0.4);
    scene.add(hemLight);

    const sunLight = new THREE.DirectionalLight(0xfff5dd, 1.5);
    sunLight.position.set(50, 80, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    scene.add(sunLight);

    // Generate world
    const world = generateWorld(worldSeed, worldType, 64);
    worldRef.current = world;
    buildWorldMesh(scene, world);

    // Player
    const player = createDefaultPlayer(displayName, world.playerSpawn.x, world.playerSpawn.z);
    playerRef.current = player;

    const controller = new PlayerController(world.size, world.heightMap);
    controllerRef.current = controller;
    const cleanupControls = controller.bindEvents(container);
    cleanupRef.current = cleanupControls;

    // AI Manager
    const aiManager = new AIEntityManager(world.size, world.heightMap);
    aiManagerRef.current = aiManager;

    // Spawn NPCs
    for (const npcSpawn of world.npcSpawns) {
      const entity = createAIEntity(npcSpawn.name, npcSpawn.role, npcSpawn.x, npcSpawn.z);
      aiManager.addEntity(entity);

      const mesh = createNPCMesh(entity);
      mesh.position.set(npcSpawn.x, world.heightMap[Math.floor(npcSpawn.x)]?.[Math.floor(npcSpawn.z)] ?? 1, npcSpawn.z);
      scene.add(mesh);
      npcMeshesRef.current.set(entity.id, mesh);
    }

    // Try to load model
    aiManager.loadModel("/models/explorer_v2.onnx").then((loaded) => {
      onModelStatusUpdate(loaded ? "REAL_MODEL" : "DEVELOPMENT_MODE");
    });

    // Escape key handler
    const handleEscape = (e: KeyboardEvent) => {
      if (e.code === "Escape") {
        onPauseRequest();
      }
    };
    document.addEventListener("keydown", handleEscape);

    // Render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (!isPaused && playerRef.current && controllerRef.current && cameraRef.current) {
        // Update player
        const updated = controllerRef.current.update(playerRef.current);
        playerRef.current = updated;

        // First-person camera
        cameraRef.current.position.set(
          updated.position[0],
          updated.position[1],
          updated.position[2]
        );
        cameraRef.current.rotation.order = "YXZ";
        cameraRef.current.rotation.y = updated.yaw;
        cameraRef.current.rotation.x = updated.pitch;

        onPlayerUpdate(updated);
      }

      // Update NPC label billboarding
      if (cameraRef.current) {
        npcMeshesRef.current.forEach((mesh) => {
          const label = mesh.children.find((c) => c instanceof THREE.Mesh && (c as THREE.Mesh).material instanceof THREE.MeshBasicMaterial);
          if (label && cameraRef.current) {
            label.lookAt(cameraRef.current.position);
          }
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    // AI tick loop
    tickIntervalRef.current = window.setInterval(async () => {
      if (isPaused || !aiManagerRef.current) return;

      await aiManagerRef.current.tick();
      const entities = aiManagerRef.current.getEntities();

      // Update NPC mesh positions
      for (const entity of entities) {
        const mesh = npcMeshesRef.current.get(entity.id);
        if (mesh) {
          mesh.position.set(entity.position[0], entity.position[1], entity.position[2]);
          mesh.rotation.y = entity.yaw;
        }
      }

      onAIEntitiesUpdate(entities);
    }, 200);

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearInterval(tickIntervalRef.current);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("keydown", handleEscape);
      if (cleanupRef.current) cleanupRef.current();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [worldSeed, worldType, displayName]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mountRef} className="w-full h-full" />;
}
