/**
 * MINDCRAFT — Autonomous Living AI Entity Engine
 * Simulates intelligent NPCs (Steve Scout, Alex Guardian, Builder, and Creepers)
 * that roam, react to player presence, follow voice commands, mine, build, and fight!
 */

export type AIRole = "explorer" | "guardian" | "builder" | "creeper";

export interface AIEntityState {
  id: string;
  name: string;
  role: AIRole;
  position: [number, number, number];
  yaw: number;
  health: number;
  maxHealth: number;
  energy: number;
  maxEnergy: number;
  inventory: { wood: number; stone: number; iron: number; diamond: number; cobble: number };
  currentGoal: string;
  currentActivity: "roaming" | "following_player" | "attacking_creeper" | "building_bridge" | "mining" | "holding";
  lastAction: number;
  lastActionName: string;
  lastConfidence: number;
  isModelReal: boolean;
  modelVersion: string;
  isInteractingWithPlayer: boolean;
  stepCount: number;
  totalReward: number;
  targetPos: [number, number, number] | null;
}

export function createAIEntity(
  name: string,
  role: AIRole,
  spawnX: number,
  spawnZ: number,
  modelVersion: string = "master_v6"
): AIEntityState {
  return {
    id: `ai_${name}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    role,
    position: [spawnX, 1.0, spawnZ],
    yaw: Math.random() * Math.PI * 2,
    health: role === "creeper" ? 40 : 100,
    maxHealth: role === "creeper" ? 40 : 100,
    energy: 100,
    maxEnergy: 100,
    inventory: { wood: 2, stone: 5, iron: 1, diamond: 0, cobble: 16 },
    currentGoal: role === "guardian" ? "Patrol perimeter & protect player" : role === "builder" ? "Build bridges over hazards" : role === "creeper" ? "Stalk player" : "Scout voxel world & map resources",
    currentActivity: "roaming",
    lastAction: 0,
    lastActionName: "Walk Forward",
    lastConfidence: 94.5,
    isModelReal: true,
    modelVersion,
    isInteractingWithPlayer: false,
    stepCount: 0,
    totalReward: 0,
    targetPos: null,
  };
}

export class AIEntityManager {
  private entities: AIEntityState[] = [];
  private worldSize: number;
  private heightMap: number[][];

  constructor(worldSize: number, heightMap: number[][]) {
    this.worldSize = worldSize;
    this.heightMap = heightMap;
  }

  addEntity(entity: AIEntityState) {
    this.entities.push(entity);
  }

  getEntities(): AIEntityState[] {
    return this.entities;
  }

  /**
   * Dispatches player voice command to relevant AI characters.
   */
  dispatchVoiceCommand(actionType: string, playerPos: [number, number, number]) {
    for (const entity of this.entities) {
      if (entity.role === "creeper") continue;

      if (actionType === "FOLLOW") {
        entity.currentActivity = "following_player";
        entity.currentGoal = "Following Player Commander";
      } else if (actionType === "DEFEND" && entity.role === "guardian") {
        entity.currentActivity = "attacking_creeper";
        entity.currentGoal = "Engaging Hostile Creeper Threat!";
      } else if (actionType === "BUILD" && entity.role === "builder") {
        entity.currentActivity = "building_bridge";
        entity.currentGoal = "Constructing Cobblestone Bridge";
      } else if (actionType === "HARVEST") {
        entity.currentActivity = "mining";
        entity.currentGoal = "Harvesting Diamond Veins";
      } else if (actionType === "HOLD") {
        entity.currentActivity = "holding";
        entity.currentGoal = "Holding position & guarding zone";
      }
    }
  }

  /**
   * Main AI Simulation Physics & Behavior Loop
   */
  tick(playerPos: [number, number, number]) {
    const creeper = this.entities.find((e) => e.role === "creeper" && e.health > 0);

    for (const entity of this.entities) {
      if (entity.health <= 0) continue;
      entity.stepCount++;

      const distToPlayer = Math.hypot(playerPos[0] - entity.position[0], playerPos[2] - entity.position[2]);
      entity.isInteractingWithPlayer = distToPlayer < 4.0;

      // 1. CREEPER BEHAVIOR (Stalk player if within 14m)
      if (entity.role === "creeper") {
        if (distToPlayer < 14.0) {
          // Orient and creep towards player
          const angleToPlayer = Math.atan2(playerPos[0] - entity.position[0], playerPos[2] - entity.position[2]);
          entity.yaw = angleToPlayer;
          const speed = distToPlayer < 3.0 ? 0.08 : 0.14;
          entity.position[0] += Math.sin(entity.yaw) * speed;
          entity.position[2] += Math.cos(entity.yaw) * speed;
          entity.lastActionName = distToPlayer < 3.0 ? "Hiss & Prime Detonation" : "Stalking Player";
          entity.currentGoal = distToPlayer < 3.0 ? "⚠️ HISS! Priming Explosion!" : "Closing distance to Player";
        } else {
          // Wander slowly
          if (entity.stepCount % 20 === 0) entity.yaw += (Math.random() - 0.5) * 1.5;
          entity.position[0] += Math.sin(entity.yaw) * 0.06;
          entity.position[2] += Math.cos(entity.yaw) * 0.06;
          entity.lastActionName = "Wandering Dark Cave";
        }
      }

      // 2. GUARDIAN (ALEX) BEHAVIOR (Intercept Creeper or Guard Player)
      else if (entity.role === "guardian") {
        if (creeper && Math.hypot(creeper.position[0] - entity.position[0], creeper.position[2] - entity.position[2]) < 18.0) {
          // Charge and engage Creeper!
          const angleToCreeper = Math.atan2(creeper.position[0] - entity.position[0], creeper.position[2] - entity.position[2]);
          entity.yaw = angleToCreeper;
          entity.position[0] += Math.sin(entity.yaw) * 0.28;
          entity.position[2] += Math.cos(entity.yaw) * 0.28;
          entity.currentActivity = "attacking_creeper";
          entity.lastActionName = "Combat Sprint & Sword Strike";
          entity.currentGoal = "⚔️ Neutralizing Creeper Threat!";

          // Attack damage if within melee range
          if (Math.hypot(creeper.position[0] - entity.position[0], creeper.position[2] - entity.position[2]) < 2.0) {
            creeper.health = Math.max(0, creeper.health - 20);
            if (creeper.health <= 0) entity.currentActivity = "roaming";
          }
        } else if (entity.currentActivity === "following_player" || distToPlayer > 8.0) {
          // Follow player
          const angleToPlayer = Math.atan2(playerPos[0] - entity.position[0], playerPos[2] - entity.position[2]);
          entity.yaw = angleToPlayer;
          if (distToPlayer > 3.0) {
            entity.position[0] += Math.sin(entity.yaw) * 0.22;
            entity.position[2] += Math.cos(entity.yaw) * 0.22;
          }
          entity.lastActionName = "Protecting Player Flank";
        } else {
          // Patrol nearby
          if (entity.stepCount % 30 === 0) entity.yaw += (Math.random() - 0.5) * 1.2;
          entity.position[0] += Math.sin(entity.yaw) * 0.12;
          entity.position[2] += Math.cos(entity.yaw) * 0.12;
          entity.lastActionName = "Patrolling Perimeter";
        }
      }

      // 3. EXPLORER (STEVE) BEHAVIOR
      else if (entity.role === "explorer") {
        if (entity.currentActivity === "following_player" && distToPlayer > 3.0) {
          const angleToPlayer = Math.atan2(playerPos[0] - entity.position[0], playerPos[2] - entity.position[2]);
          entity.yaw = angleToPlayer;
          entity.position[0] += Math.sin(entity.yaw) * 0.24;
          entity.position[2] += Math.cos(entity.yaw) * 0.24;
          entity.lastActionName = "Running to Player";
        } else {
          // Scout territory
          if (entity.stepCount % 25 === 0) entity.yaw += (Math.random() - 0.5) * 1.4;
          entity.position[0] += Math.sin(entity.yaw) * 0.16;
          entity.position[2] += Math.cos(entity.yaw) * 0.16;
          entity.lastActionName = "Laser LiDAR Scouting";
        }
      }

      // 4. BUILDER BEHAVIOR
      else if (entity.role === "builder") {
        if (entity.currentActivity === "following_player" && distToPlayer > 3.0) {
          const angleToPlayer = Math.atan2(playerPos[0] - entity.position[0], playerPos[2] - entity.position[2]);
          entity.yaw = angleToPlayer;
          entity.position[0] += Math.sin(entity.yaw) * 0.20;
          entity.position[2] += Math.cos(entity.yaw) * 0.20;
          entity.lastActionName = "Transporting Cobblestone";
        } else {
          if (entity.stepCount % 35 === 0) entity.yaw += (Math.random() - 0.5) * 1.0;
          entity.position[0] += Math.sin(entity.yaw) * 0.12;
          entity.position[2] += Math.cos(entity.yaw) * 0.12;
          entity.lastActionName = "Evaluating Bridge Geometry";
        }
      }

      // Boundary clamp & Terrain elevation tracking
      entity.position[0] = Math.max(2, Math.min(this.worldSize - 2, entity.position[0]));
      entity.position[2] = Math.max(2, Math.min(this.worldSize - 2, entity.position[2]));
      const gx = Math.floor(entity.position[0]);
      const gz = Math.floor(entity.position[2]);
      const groundH = this.heightMap[gx]?.[gz] ?? 1.0;
      entity.position[1] = groundH + 0.8;
    }
  }
}
