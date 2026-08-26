/**
 * MINDCRAFT — World Manager
 * Manages world creation, listing, saving, and loading via localStorage.
 */

export interface WorldData {
  id: string;
  name: string;
  type: "training_showcase" | "riverland" | "forest_outpost" | "challenge_world";
  seed: number;
  createdAt: string;
  lastPlayedAt: string;
  dayCount: number;
  aiPopulation: number;
  playerPos?: [number, number, number];
}

const STORAGE_KEY = "mindcraft_worlds";

function generateId(): string {
  return `world_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

export function getWorlds(): WorldData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWorlds(worlds: WorldData[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(worlds));
}

export function createWorld(name: string, type: WorldData["type"]): WorldData {
  const world: WorldData = {
    id: generateId(),
    name,
    type,
    seed: Math.floor(Math.random() * 999999) + 1,
    createdAt: new Date().toISOString(),
    lastPlayedAt: new Date().toISOString(),
    dayCount: 1,
    aiPopulation: type === "training_showcase" ? 5 : type === "riverland" ? 8 : type === "forest_outpost" ? 4 : 3,
  };

  const worlds = getWorlds();
  worlds.push(world);
  saveWorlds(worlds);
  return world;
}

export function getWorld(id: string): WorldData | null {
  const worlds = getWorlds();
  return worlds.find((w) => w.id === id) || null;
}

export function updateWorld(id: string, updates: Partial<WorldData>) {
  const worlds = getWorlds();
  const idx = worlds.findIndex((w) => w.id === id);
  if (idx >= 0) {
    worlds[idx] = { ...worlds[idx], ...updates, lastPlayedAt: new Date().toISOString() };
    saveWorlds(worlds);
  }
}

export function deleteWorld(id: string) {
  const worlds = getWorlds().filter((w) => w.id !== id);
  saveWorlds(worlds);
}

export function getWorldTypeLabel(type: WorldData["type"]): string {
  switch (type) {
    case "training_showcase": return "Training Showcase";
    case "riverland": return "Riverland";
    case "forest_outpost": return "Forest Outpost";
    case "challenge_world": return "Challenge World";
    default: return "Unknown";
  }
}

export function getWorldTypeDescription(type: WorldData["type"]): string {
  switch (type) {
    case "training_showcase": return "Watch trained AI entities demonstrate their capabilities in a controlled environment.";
    case "riverland": return "Rivers, forests, and resource-rich terrain. AI agents navigate water obstacles.";
    case "forest_outpost": return "Dense forest with a central outpost. AI entities gather wood and build.";
    case "challenge_world": return "Timed challenges and objectives. Test AI capabilities under pressure.";
    default: return "";
  }
}
