/**
 * MINDCRAFT — Procedural World Generator
 * Generates voxel world data with biomes: Forest, River, Plains, Mountain, Village, Cave
 */

export interface VoxelBlock {
  type: BlockType;
  height: number;
}

export type BlockType =
  | "air" | "grass" | "dirt" | "stone" | "wood" | "leaves"
  | "water" | "sand" | "iron_ore" | "diamond_ore" | "cobblestone"
  | "planks" | "log" | "crafting_table" | "chest" | "torch"
  | "bedrock" | "gravel" | "snow" | "ice";

export type BiomeType = "forest" | "river" | "plains" | "mountain" | "village" | "cave";

export interface ResourceSpawn {
  x: number;
  z: number;
  type: "wood" | "stone" | "iron" | "diamond";
  collected: boolean;
}

export interface NPCSpawn {
  x: number;
  z: number;
  name: string;
  role: "explorer" | "gatherer";
}

export interface WorldGenResult {
  size: number;
  heightMap: number[][];
  biomeMap: BiomeType[][];
  blocks: BlockType[][][]; // [x][z][y] - layers
  resources: ResourceSpawn[];
  npcSpawns: NPCSpawn[];
  playerSpawn: { x: number; z: number };
  villageCenter: { x: number; z: number } | null;
}

// Seeded pseudo-random number generator
function createRNG(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Simple 2D noise for terrain
function noise2D(x: number, z: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + z * 78.233 + seed * 43758.5453) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, z: number, seed: number, scale: number): number {
  const sx = x / scale;
  const sz = z / scale;
  const x0 = Math.floor(sx);
  const z0 = Math.floor(sz);
  const fx = sx - x0;
  const fz = sz - z0;
  const smoothFx = fx * fx * (3 - 2 * fx);
  const smoothFz = fz * fz * (3 - 2 * fz);

  const n00 = noise2D(x0, z0, seed);
  const n10 = noise2D(x0 + 1, z0, seed);
  const n01 = noise2D(x0, z0 + 1, seed);
  const n11 = noise2D(x0 + 1, z0 + 1, seed);

  const nx0 = n00 + smoothFx * (n10 - n00);
  const nx1 = n01 + smoothFx * (n11 - n01);
  return nx0 + smoothFz * (nx1 - nx0);
}

function fractalNoise(x: number, z: number, seed: number, octaves: number = 3): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, z * frequency, seed + i * 100, 8) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

const NPC_NAMES = [
  "NOVA-017", "ATLAS-023", "SAGE-041", "ECHO-008", "IRIS-015",
  "BOLT-033", "LUNA-009", "ZEPH-027", "ARIA-012", "FLUX-005",
];

export function generateWorld(seed: number, worldType: string, size: number = 64): WorldGenResult {
  const rng = createRNG(seed);
  const halfSize = size / 2;

  // Initialize
  const heightMap: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const biomeMap: BiomeType[][] = Array.from({ length: size }, () => Array(size).fill("plains" as BiomeType));
  const maxHeight = 12;
  const blocks: BlockType[][][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => Array(maxHeight).fill("air" as BlockType))
  );
  const resources: ResourceSpawn[] = [];
  const npcSpawns: NPCSpawn[] = [];
  let villageCenter: { x: number; z: number } | null = null;

  // Generate biome map
  const riverStartZ = Math.floor(size * 0.35 + rng() * size * 0.3);
  const riverWidth = 3 + Math.floor(rng() * 3);
  const villageCX = Math.floor(size * 0.6 + rng() * size * 0.2);
  const villageCZ = Math.floor(size * 0.6 + rng() * size * 0.2);
  const villageRadius = 6;
  villageCenter = { x: villageCX, z: villageCZ };

  for (let x = 0; x < size; x++) {
    const riverOffset = Math.sin(x * 0.15 + seed) * 3;
    for (let z = 0; z < size; z++) {
      const distToVillage = Math.hypot(x - villageCX, z - villageCZ);
      const riverCenter = riverStartZ + riverOffset;

      if (Math.abs(z - riverCenter) < riverWidth / 2) {
        biomeMap[x][z] = "river";
      } else if (distToVillage < villageRadius) {
        biomeMap[x][z] = "village";
      } else {
        const noiseVal = fractalNoise(x, z, seed);
        if (noiseVal > 0.65) {
          biomeMap[x][z] = "mountain";
        } else if (noiseVal > 0.35) {
          biomeMap[x][z] = "forest";
        } else {
          biomeMap[x][z] = "plains";
        }
      }
    }
  }

  // Generate height map and blocks
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      const biome = biomeMap[x][z];
      let height = 1;

      switch (biome) {
        case "river":
          height = 0;
          break;
        case "mountain":
          height = 2 + Math.floor(fractalNoise(x, z, seed + 50) * 5);
          break;
        case "forest":
          height = 1 + Math.floor(fractalNoise(x, z, seed + 30) * 2);
          break;
        case "village":
          height = 1;
          break;
        case "plains":
          height = 1;
          break;
        default:
          height = 1;
      }

      heightMap[x][z] = height;

      // Fill blocks
      for (let y = 0; y < maxHeight; y++) {
        if (biome === "river") {
          if (y === 0) blocks[x][z][y] = "water";
          else blocks[x][z][y] = "air";
        } else if (y < height - 1) {
          blocks[x][z][y] = biome === "mountain" ? "stone" : "dirt";
        } else if (y === height - 1) {
          blocks[x][z][y] = biome === "mountain" ? "stone" : "grass";
        } else {
          blocks[x][z][y] = "air";
        }
      }

      // Trees in forest
      if (biome === "forest" && rng() < 0.12) {
        const treeHeight = 3 + Math.floor(rng() * 2);
        for (let ty = height; ty < Math.min(height + treeHeight, maxHeight); ty++) {
          blocks[x][z][ty] = "log";
        }
        // Leaves around top
        const leafY = Math.min(height + treeHeight - 1, maxHeight - 1);
        if (leafY < maxHeight) blocks[x][z][leafY] = "leaves";

        resources.push({ x, z, type: "wood", collected: false });
      }

      // Iron ore in mountains
      if (biome === "mountain" && rng() < 0.06) {
        if (height > 2) blocks[x][z][height - 2] = "iron_ore";
        resources.push({ x, z, type: "iron", collected: false });
      }

      // Diamond in deep areas
      if (biome === "mountain" && rng() < 0.015) {
        blocks[x][z][0] = "diamond_ore";
        resources.push({ x, z, type: "diamond", collected: false });
      }

      // Stone resources in plains
      if (biome === "plains" && rng() < 0.04) {
        blocks[x][z][height] = "cobblestone";
        resources.push({ x, z, type: "stone", collected: false });
      }

      // Village structures
      if (biome === "village") {
        const distToCenter = Math.hypot(x - villageCX, z - villageCZ);
        if (distToCenter < 2) {
          blocks[x][z][height] = "crafting_table";
        } else if (distToCenter < 4 && rng() < 0.3) {
          blocks[x][z][height] = "planks";
          if (rng() < 0.4) blocks[x][z][height + 1] = "planks";
        }
      }
    }
  }

  // Place NPC spawns
  const npcCount = worldType === "training_showcase" ? 5 : worldType === "riverland" ? 4 : 3;
  let nameIdx = 0;
  for (let i = 0; i < npcCount && nameIdx < NPC_NAMES.length; i++) {
    let nx: number, nz: number;
    let attempts = 0;
    do {
      nx = Math.floor(rng() * (size - 4)) + 2;
      nz = Math.floor(rng() * (size - 4)) + 2;
      attempts++;
    } while (biomeMap[nx][nz] === "river" && attempts < 50);

    npcSpawns.push({
      x: nx + 0.5,
      z: nz + 0.5,
      name: NPC_NAMES[nameIdx],
      role: i % 2 === 0 ? "explorer" : "gatherer",
    });
    nameIdx++;
  }

  // Player spawn - near village or center
  const playerSpawn = villageCenter
    ? { x: villageCX - 3, z: villageCZ - 3 }
    : { x: Math.floor(size / 4), z: Math.floor(size / 4) };

  return {
    size,
    heightMap,
    biomeMap,
    blocks,
    resources,
    npcSpawns,
    playerSpawn,
    villageCenter,
  };
}
