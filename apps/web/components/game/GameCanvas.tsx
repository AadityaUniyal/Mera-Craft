"use client";

import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { generateWorld, WorldGenResult } from "@/lib/game/world-generator";
import { PlayerController, PlayerState, createDefaultPlayer } from "@/lib/game/player-controller";
import { AIEntityManager, AIEntityState, createAIEntity } from "@/lib/game/ai-entity";
import { soundFx } from "@/lib/audio-synthesizer";

interface GameCanvasProps {
  worldSeed: number;
  worldType: string;
  displayName: string;
  onPlayerUpdate: (player: PlayerState) => void;
  onAIEntitiesUpdate: (entities: AIEntityState[]) => void;
  onModelStatusUpdate: (status: string) => void;
  onPauseRequest: () => void;
  isPaused: boolean;
  activeVoiceCommand?: { text: string; actionType: string; timestamp: number } | null;
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
  activeVoiceCommand,
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
  const armMeshRef = useRef<THREE.Group | null>(null);
  const isSwingingRef = useRef<boolean>(false);
  const swingProgressRef = useRef<number>(0);
  const placedBlocksGroupRef = useRef<THREE.Group | null>(null);

  // Handle live incoming voice command to AI NPCs
  useEffect(() => {
    if (activeVoiceCommand && aiManagerRef.current && playerRef.current) {
      aiManagerRef.current.dispatchVoiceCommand(
        activeVoiceCommand.actionType,
        playerRef.current.position
      );
    }
  }, [activeVoiceCommand]);

  const buildWorldMesh = useCallback((scene: THREE.Scene, world: WorldGenResult) => {
    const blockPositions: Record<string, [number, number, number][]> = {};

    for (let x = 0; x < world.size; x++) {
      for (let z = 0; z < world.size; z++) {
        for (let y = 0; y < world.blocks[x][z].length; y++) {
          const type = world.blocks[x][z][y];
          if (type === "air") continue;
          if (!blockPositions[type]) blockPositions[type] = [];
          blockPositions[type].push([x + 0.5, y, z + 0.5]);
        }
      }
    }

    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    for (const [type, positions] of Object.entries(blockPositions)) {
      const color = BLOCK_COLORS[type] || 0x888888;
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: type === "water" ? 0.1 : 0.8,
        metalness: type === "diamond_ore" ? 0.8 : 0.1,
        transparent: type === "water",
        opacity: type === "water" ? 0.6 : 1.0,
      });

      const instancedMesh = new THREE.InstancedMesh(boxGeo, mat, positions.length);
      instancedMesh.receiveShadow = true;
      instancedMesh.castShadow = type !== "water";

      const dummy = new THREE.Object3D();
      positions.forEach((pos, idx) => {
        dummy.position.set(pos[0], pos[1], pos[2]);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(idx, dummy.matrix);
      });
      instancedMesh.instanceMatrix.needsUpdate = true;
      scene.add(instancedMesh);
    }

    const placedGroup = new THREE.Group();
    placedGroup.name = "placed_blocks";
    scene.add(placedGroup);
    placedBlocksGroupRef.current = placedGroup;
  }, []);

  const createNPCMesh = useCallback((entity: AIEntityState) => {
    const group = new THREE.Group();
    group.name = `npc_${entity.id}`;

    let bodyColor = 0x2563eb;
    if (entity.role === "guardian") bodyColor = 0xd97706;
    else if (entity.role === "builder") bodyColor = 0x059669;
    else if (entity.role === "creeper") bodyColor = 0x16a34a;

    // Head
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const headMat = new THREE.MeshStandardMaterial({ color: entity.role === "creeper" ? 0x15803d : 0xfbbf24 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.1;
    head.castShadow = true;
    group.add(head);

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.35);
    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    // Arms & Tool
    if (entity.role !== "creeper") {
      const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
      const armMat = new THREE.MeshStandardMaterial({ color: bodyColor });
      const rightArm = new THREE.Mesh(armGeo, armMat);
      rightArm.position.set(0.42, 0.5, 0);
      group.add(rightArm);

      const leftArm = new THREE.Mesh(armGeo, armMat);
      leftArm.position.set(-0.42, 0.5, 0);
      group.add(leftArm);

      // Tool in hand
      const toolGeo = new THREE.BoxGeometry(0.08, 0.6, 0.08);
      const toolMat = new THREE.MeshStandardMaterial({ color: entity.role === "guardian" ? 0x00e5ff : 0xd97706 });
      const tool = new THREE.Mesh(toolGeo, toolMat);
      tool.position.set(0.42, 0.2, 0.2);
      tool.rotation.x = Math.PI / 3;
      group.add(tool);
    }

    // Nameplate Canvas
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = entity.role === "creeper" ? "#ef4444" : "#10b981";
      ctx.font = "bold 24px monospace";
      ctx.textAlign = "center";
      ctx.fillText(entity.name, 128, 28);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "16px monospace";
      ctx.fillText(entity.role.toUpperCase(), 128, 50);
    }

    const labelTexture = new THREE.CanvasTexture(canvas);
    const labelGeo = new THREE.PlaneGeometry(1.8, 0.45);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTexture, transparent: true });
    const label = new THREE.Mesh(labelGeo, labelMat);
    label.position.y = 1.6;
    group.add(label);

    return group;
  }, []);

  // Initialize scene
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.FogExp2(0x87ceeb, 0.012);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 500);
    cameraRef.current = camera;

    // 1st Person Arm / Tool
    const armGroup = new THREE.Group();
    const armGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(0.35, -0.3, -0.6);
    arm.rotation.set(-0.3, -0.2, 0.1);
    armGroup.add(arm);

    const swordGeo = new THREE.BoxGeometry(0.06, 0.8, 0.12);
    const swordMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.8, roughness: 0.2 });
    const sword = new THREE.Mesh(swordGeo, swordMat);
    sword.position.set(0.35, 0.1, -0.8);
    sword.rotation.set(Math.PI / 4, 0, 0);
    armGroup.add(sword);

    camera.add(armGroup);
    scene.add(camera);
    armMeshRef.current = armGroup;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5dd, 1.4);
    sunLight.position.set(50, 80, 50);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // Generate World
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

    // Block Interaction (Left-click Mine, Right-click Place)
    const handleMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== container) return;

      isSwingingRef.current = true;
      swingProgressRef.current = 0;

      if (e.button === 0) {
        // Left Click: Mine block
        soundFx.playMineBlock(0);
        if (playerRef.current) {
          playerRef.current.inventory[0].count = (playerRef.current.inventory[0].count || 0) + 1;
        }
      } else if (e.button === 2) {
        // Right Click: Place block
        e.preventDefault();
        soundFx.playPlaceBlock(0.1);
        if (placedBlocksGroupRef.current && playerRef.current && cameraRef.current) {
          const placeX = Math.floor(playerRef.current.position[0] + Math.sin(playerRef.current.yaw) * 2.5) + 0.5;
          const placeZ = Math.floor(playerRef.current.position[2] + Math.cos(playerRef.current.yaw) * 2.5) + 0.5;
          const placeY = Math.max(0, Math.floor(playerRef.current.position[1] - 0.5));

          const blockGeo = new THREE.BoxGeometry(1, 1, 1);
          const blockMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.8 });
          const newBlock = new THREE.Mesh(blockGeo, blockMat);
          newBlock.position.set(placeX, placeY, placeZ);
          placedBlocksGroupRef.current.add(newBlock);
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("contextmenu", handleContextMenu);

    // AI Manager
    const aiManager = new AIEntityManager(world.size, world.heightMap);
    aiManagerRef.current = aiManager;

    // Spawn Living Entities
    const livingEntities = [
      createAIEntity("Steve (Scout)", "explorer", world.playerSpawn.x + 3, world.playerSpawn.z + 2),
      createAIEntity("Alex (Guardian)", "guardian", world.playerSpawn.x - 3, world.playerSpawn.z - 2),
      createAIEntity("Builder Voxel", "builder", world.playerSpawn.x + 4, world.playerSpawn.z - 4),
      createAIEntity("Hostile Creeper", "creeper", world.playerSpawn.x + 12, world.playerSpawn.z + 12),
    ];

    for (const ent of livingEntities) {
      aiManager.addEntity(ent);
      const mesh = createNPCMesh(ent);
      mesh.position.set(ent.position[0], ent.position[1], ent.position[2]);
      scene.add(mesh);
      npcMeshesRef.current.set(ent.id, mesh);
    }

    onModelStatusUpdate("REAL_MODEL");

    // Render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (!isPaused && playerRef.current && controllerRef.current && cameraRef.current) {
        const updated = controllerRef.current.update(playerRef.current);
        playerRef.current = updated;

        cameraRef.current.position.set(updated.position[0], updated.position[1], updated.position[2]);
        cameraRef.current.rotation.order = "YXZ";
        cameraRef.current.rotation.y = updated.yaw;
        cameraRef.current.rotation.x = updated.pitch;

        // Tool swing animation
        if (armMeshRef.current && isSwingingRef.current) {
          swingProgressRef.current += 0.15;
          armMeshRef.current.rotation.x = Math.sin(swingProgressRef.current * Math.PI) * 0.6;
          if (swingProgressRef.current >= 1.0) {
            isSwingingRef.current = false;
            armMeshRef.current.rotation.x = 0;
          }
        }

        onPlayerUpdate(updated);
      }

      // Billboard labels to camera
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

    // AI tick loop (Runs living NPC state machine)
    tickIntervalRef.current = window.setInterval(() => {
      if (isPaused || !aiManagerRef.current || !playerRef.current) return;

      aiManagerRef.current.tick(playerRef.current.position);
      const entities = aiManagerRef.current.getEntities();

      for (const ent of entities) {
        const mesh = npcMeshesRef.current.get(ent.id);
        if (mesh) {
          mesh.position.set(ent.position[0], ent.position[1], ent.position[2]);
          mesh.rotation.y = ent.yaw;
        }
      }

      onAIEntitiesUpdate([...entities]);
    }, 150);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      clearInterval(tickIntervalRef.current);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("contextmenu", handleContextMenu);
      if (cleanupRef.current) cleanupRef.current();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [worldSeed, worldType, displayName]);

  return <div ref={mountRef} className="w-full h-full cursor-crosshair" />;
}
