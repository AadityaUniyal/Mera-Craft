/**
 * MINDCRAFT — AI Entity System
 * Autonomous NPC entities that run ONNX inference to make decisions.
 */

import { BrowserInferenceEngine, InferenceResult, ACTION_NAMES } from "../ai/browser-inference";

export interface AIEntityState {
  id: string;
  name: string;
  role: "explorer" | "gatherer";
  position: [number, number, number];
  yaw: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  inventory: { wood: number; stone: number; iron: number; diamond: number };
  currentGoal: string;
  modelVersion: string;
  isModelReal: boolean;
  lastAction: number;
  lastActionName: string;
  lastConfidence: number;
  stepCount: number;
  totalReward: number;
}

const ROLE_GOALS: Record<string, string[]> = {
  explorer: ["Explore unknown territory", "Scout the perimeter", "Map resource locations", "Find safe paths"],
  gatherer: ["Collect wood resources", "Gather stone blocks", "Mine iron ore", "Return resources to village"],
};

export function createAIEntity(
  name: string,
  role: "explorer" | "gatherer",
  spawnX: number,
  spawnZ: number,
  modelVersion: string = "explorer_v2"
): AIEntityState {
  const goals = ROLE_GOALS[role] || ROLE_GOALS.explorer;
  return {
    id: `ai_${name}_${Date.now()}`,
    name,
    role,
    position: [spawnX, 0, spawnZ],
    yaw: Math.random() * Math.PI * 2,
    health: 100,
    maxHealth: 100,
    energy: 100,
    maxEnergy: 100,
    inventory: { wood: 0, stone: 0, iron: 0, diamond: 0 },
    currentGoal: goals[Math.floor(Math.random() * goals.length)],
    modelVersion,
    isModelReal: false,
    lastAction: 0,
    lastActionName: "Idle",
    lastConfidence: 0,
    stepCount: 0,
    totalReward: 0,
  };
}

export class AIEntityManager {
  private engine: BrowserInferenceEngine;
  private entities: AIEntityState[] = [];
  private worldSize: number;
  private heightMap: number[][];

  constructor(worldSize: number, heightMap: number[][]) {
    this.engine = new BrowserInferenceEngine();
    this.worldSize = worldSize;
    this.heightMap = heightMap;
  }

  async loadModel(modelUri: string): Promise<boolean> {
    return this.engine.loadModel(modelUri);
  }

  addEntity(entity: AIEntityState) {
    this.entities.push(entity);
  }

  getEntities(): AIEntityState[] {
    return this.entities;
  }

  getEntity(id: string): AIEntityState | undefined {
    return this.entities.find((e) => e.id === id);
  }

  getNearestEntity(x: number, z: number, maxDist: number = 5): AIEntityState | null {
    let nearest: AIEntityState | null = null;
    let nearestDist = maxDist;
    for (const e of this.entities) {
      const dist = Math.hypot(e.position[0] - x, e.position[2] - z);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = e;
      }
    }
    return nearest;
  }

  async tick(): Promise<void> {
    for (const entity of this.entities) {
      if (entity.health <= 0 || entity.energy <= 0) continue;

      // Build observation vector (24-dim compact for the entity)
      const obs = new Float32Array(24);

      // Ray-like obstacles in 8 directions
      for (let i = 0; i < 8; i++) {
        const angle = entity.yaw + (i * Math.PI) / 4;
        const checkDist = 3;
        const cx = entity.position[0] + Math.sin(angle) * checkDist;
        const cz = entity.position[2] + Math.cos(angle) * checkDist;
        const gx = Math.floor(Math.max(0, Math.min(this.worldSize - 1, cx)));
        const gz = Math.floor(Math.max(0, Math.min(this.worldSize - 1, cz)));
        const h = this.heightMap[gx]?.[gz] ?? 1;
        obs[i] = Math.min(1, h / 5); // normalized obstacle height
      }

      // Self state
      obs[8] = entity.health / entity.maxHealth;
      obs[9] = entity.energy / entity.maxEnergy;
      obs[10] = entity.position[0] / this.worldSize;
      obs[11] = entity.position[2] / this.worldSize;
      obs[12] = Math.sin(entity.yaw);
      obs[13] = Math.cos(entity.yaw);

      // Inventory
      obs[14] = Math.min(1, entity.inventory.wood / 10);
      obs[15] = Math.min(1, entity.inventory.stone / 10);
      obs[16] = Math.min(1, entity.inventory.iron / 5);
      obs[17] = Math.min(1, entity.inventory.diamond / 3);

      // Random goal-direction (simple wandering target)
      const wanderX = (this.worldSize / 2 + Math.sin(entity.stepCount * 0.05) * 20) / this.worldSize;
      const wanderZ = (this.worldSize / 2 + Math.cos(entity.stepCount * 0.07) * 20) / this.worldSize;
      obs[18] = wanderX - obs[10]; // relative target
      obs[19] = wanderZ - obs[11];

      // Run inference
      const result: InferenceResult = await this.engine.predict(obs);
      entity.lastAction = result.action;
      entity.lastActionName = result.actionName;
      entity.lastConfidence = result.confidence;
      entity.isModelReal = result.isRealInference !== false;
      entity.stepCount++;

      // Execute action
      const moveSpeed = 0.25;
      const action = result.action;

      if (action === 0) {
        // Walk forward
        entity.position[0] += Math.sin(entity.yaw) * moveSpeed;
        entity.position[2] += Math.cos(entity.yaw) * moveSpeed;
      } else if (action === 1) {
        // Sprint forward
        entity.position[0] += Math.sin(entity.yaw) * moveSpeed * 1.5;
        entity.position[2] += Math.cos(entity.yaw) * moveSpeed * 1.5;
        entity.energy = Math.max(0, entity.energy - 0.3);
      } else if (action === 2) {
        // Backward
        entity.position[0] -= Math.sin(entity.yaw) * moveSpeed * 0.5;
        entity.position[2] -= Math.cos(entity.yaw) * moveSpeed * 0.5;
      } else if (action === 3) {
        // Turn left
        entity.yaw -= 0.4;
      } else if (action === 4) {
        // Turn right
        entity.yaw += 0.4;
      } else if (action === 5) {
        // Jump (just visual)
        entity.position[1] = 0.5;
        setTimeout(() => { entity.position[1] = 0; }, 200);
      } else if (action === 7) {
        // Mine/Gather
        if (entity.role === "gatherer") {
          entity.inventory.wood += 1;
          entity.totalReward += 1;
        }
      }

      // Boundary clamp
      entity.position[0] = Math.max(1, Math.min(this.worldSize - 1, entity.position[0]));
      entity.position[2] = Math.max(1, Math.min(this.worldSize - 1, entity.position[2]));

      // Slow energy drain
      entity.energy = Math.max(0, entity.energy - 0.02);

      // Height adjustment
      const gx = Math.floor(Math.max(0, Math.min(this.worldSize - 1, entity.position[0])));
      const gz = Math.floor(Math.max(0, Math.min(this.worldSize - 1, entity.position[2])));
      entity.position[1] = (this.heightMap[gx]?.[gz] ?? 1);
    }
  }
}
