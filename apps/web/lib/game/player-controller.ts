/**
 * MINDCRAFT — Player Controller
 * First-person player movement with WASD, mouse look, jump, sprint.
 */

export interface PlayerState {
  position: [number, number, number];
  velocity: [number, number, number];
  yaw: number; // horizontal rotation (radians)
  pitch: number; // vertical rotation (radians) 
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  isSprinting: boolean;
  isJumping: boolean;
  isOnGround: boolean;
  inventory: InventorySlot[];
  selectedSlot: number;
  displayName: string;
}

export interface InventorySlot {
  type: string | null;
  count: number;
  label: string;
}

export function createDefaultPlayer(displayName: string, spawnX: number, spawnZ: number): PlayerState {
  return {
    position: [spawnX + 0.5, 2, spawnZ + 0.5],
    velocity: [0, 0, 0],
    yaw: 0,
    pitch: 0,
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    isSprinting: false,
    isJumping: false,
    isOnGround: true,
    displayName,
    selectedSlot: 0,
    inventory: [
      { type: null, count: 0, label: "" },
      { type: null, count: 0, label: "" },
      { type: null, count: 0, label: "" },
      { type: null, count: 0, label: "" },
      { type: null, count: 0, label: "" },
      { type: null, count: 0, label: "" },
      { type: null, count: 0, label: "" },
      { type: null, count: 0, label: "" },
      { type: null, count: 0, label: "" },
    ],
  };
}

export class PlayerController {
  private keys: Set<string> = new Set();
  private mouseDX: number = 0;
  private mouseDY: number = 0;
  private isPointerLocked: boolean = false;
  private sensitivity: number = 0.002;
  private moveSpeed: number = 0.12;
  private sprintMultiplier: number = 1.6;
  private jumpForce: number = 0.18;
  private gravity: number = 0.008;
  private worldSize: number;
  private heightMap: number[][];

  constructor(worldSize: number, heightMap: number[][]) {
    this.worldSize = worldSize;
    this.heightMap = heightMap;
  }

  bindEvents(canvas: HTMLElement) {
    const onKeyDown = (e: KeyboardEvent) => {
      this.keys.add(e.code);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (this.isPointerLocked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    };
    const onPointerLockChange = () => {
      this.isPointerLocked = document.pointerLockElement === canvas;
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLockChange);

    canvas.addEventListener("click", () => {
      if (!this.isPointerLocked) {
        canvas.requestPointerLock();
      }
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
    };
  }

  getIsPointerLocked(): boolean {
    return this.isPointerLocked;
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  update(player: PlayerState, dt: number = 1): PlayerState {
    const p = { ...player };

    // Mouse look
    p.yaw -= this.mouseDX * this.sensitivity;
    p.pitch -= this.mouseDY * this.sensitivity;
    p.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, p.pitch));
    this.mouseDX = 0;
    this.mouseDY = 0;

    // Sprint
    p.isSprinting = this.keys.has("ShiftLeft") && p.stamina > 5;
    const speed = p.isSprinting ? this.moveSpeed * this.sprintMultiplier : this.moveSpeed;

    if (p.isSprinting) {
      p.stamina = Math.max(0, p.stamina - 0.15 * dt);
    } else {
      p.stamina = Math.min(p.maxStamina, p.stamina + 0.05 * dt);
    }

    // Movement
    let dx = 0, dz = 0;
    if (this.keys.has("KeyW")) { dx += Math.sin(p.yaw); dz += Math.cos(p.yaw); }
    if (this.keys.has("KeyS")) { dx -= Math.sin(p.yaw); dz -= Math.cos(p.yaw); }
    if (this.keys.has("KeyA")) { dx += Math.cos(p.yaw); dz -= Math.sin(p.yaw); }
    if (this.keys.has("KeyD")) { dx -= Math.cos(p.yaw); dz += Math.sin(p.yaw); }

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      dx = (dx / len) * speed * dt;
      dz = (dz / len) * speed * dt;
    }

    // Apply horizontal movement with collision
    let newX = p.position[0] + dx;
    let newZ = p.position[2] + dz;

    // Boundary clamp
    newX = Math.max(0.5, Math.min(this.worldSize - 0.5, newX));
    newZ = Math.max(0.5, Math.min(this.worldSize - 0.5, newZ));

    // Simple height-based collision
    const gridX = Math.floor(newX);
    const gridZ = Math.floor(newZ);
    if (gridX >= 0 && gridX < this.worldSize && gridZ >= 0 && gridZ < this.worldSize) {
      const targetHeight = this.heightMap[gridX][gridZ];
      // Only allow if height difference is <= 1 (can step up 1 block)
      const currentHeight = this.heightMap[Math.floor(p.position[0])][Math.floor(p.position[2])];
      if (targetHeight - currentHeight <= 1) {
        p.position[0] = newX;
        p.position[2] = newZ;
      }
    }

    // Jump
    if (this.keys.has("Space") && p.isOnGround) {
      p.velocity[1] = this.jumpForce;
      p.isOnGround = false;
      p.isJumping = true;
    }

    // Gravity
    p.velocity[1] -= this.gravity * dt;
    p.position[1] += p.velocity[1] * dt;

    // Ground collision
    const gx = Math.floor(Math.max(0, Math.min(this.worldSize - 1, p.position[0])));
    const gz = Math.floor(Math.max(0, Math.min(this.worldSize - 1, p.position[2])));
    const groundY = (this.heightMap[gx]?.[gz] ?? 1) + 1.6; // Eye height

    if (p.position[1] <= groundY) {
      p.position[1] = groundY;
      p.velocity[1] = 0;
      p.isOnGround = true;
      p.isJumping = false;
    }

    return p;
  }
}
