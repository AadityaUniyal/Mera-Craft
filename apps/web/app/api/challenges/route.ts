import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CHALLENGES = [
  {
    id: "c-parkour-gap",
    slug: "parkour-chasm",
    title: "1. Precision Parkour Gap (2-Block Leap)",
    description: "Navigate 2-block gap leaps over void chasms across isolated stone pillars without falling.",
    challengeType: "PARKOUR",
    difficulty: "Medium",
    parTimeSeconds: 15,
    targetScore: 1200,
    character: "Explorer",
    scores: [
      { id: "s1", agentName: "Explorer v2 (AI Agent)", score: 1350, timeElapsedSec: 8.4, heartsLeft: 10, blocksPlaced: 0, passed: true },
      { id: "s2", agentName: "Steve Navigator (Player)", score: 1100, timeElapsedSec: 12.2, heartsLeft: 9, blocksPlaced: 0, passed: true },
    ],
  },
  {
    id: "c-lava-bridging",
    slug: "lava-lake-bridging",
    title: "2. Lava Lake Bridging & Safe Sneak",
    description: "Safely cross a molten lava lake using sneak edge protection and placing cobblestone bridge blocks.",
    challengeType: "LAVA_BRIDGING",
    difficulty: "Hard",
    parTimeSeconds: 25,
    targetScore: 1600,
    character: "Builder",
    scores: [
      { id: "s3", agentName: "Builder v1 (AI Agent)", score: 1720, timeElapsedSec: 18.2, heartsLeft: 10, blocksPlaced: 4, passed: true },
    ],
  },
  {
    id: "c-night-creeper",
    slug: "night-creeper-survival",
    title: "3. Night Survival & Creeper Evasion",
    description: "Survive pitch black night while an aggressive Creeper mob tracks your position. Sprint to evade and eliminate.",
    challengeType: "NIGHT_SURVIVAL",
    difficulty: "Expert",
    parTimeSeconds: 30,
    targetScore: 2000,
    character: "Guardian",
    scores: [
      { id: "s4", agentName: "Guardian v1 (AI Agent)", score: 2150, timeElapsedSec: 22.5, heartsLeft: 8.5, blocksPlaced: 1, passed: true },
    ],
  },
  {
    id: "c-speedrun-economy",
    slug: "speedrun-economy-loop",
    title: "4. Full Speedrun Economy Loop",
    description: "Harvest Oak Wood -> Craft Pickaxe -> Mine Iron & Diamond -> Return safely to Base Hub.",
    challengeType: "SPEEDRUN_ECONOMY",
    difficulty: "Hard",
    parTimeSeconds: 45,
    targetScore: 2500,
    character: "Survivor",
    scores: [
      { id: "s5", agentName: "Master v6 (AI Agent)", score: 2780, timeElapsedSec: 36.4, heartsLeft: 10, blocksPlaced: 2, passed: true },
    ],
  },
  {
    id: "c-mountain-climb",
    slug: "mountain-pillar-climb",
    title: "5. Cliff Pillar Mountain Ascend",
    description: "Jump and place blocks beneath feet to scale a 3-block mountain cliff and retrieve the peak Diamond.",
    challengeType: "PILLAR_MOUNTAIN",
    difficulty: "Medium",
    parTimeSeconds: 20,
    targetScore: 1400,
    character: "Explorer",
    scores: [
      { id: "s6", agentName: "Explorer v2 (AI Agent)", score: 1490, timeElapsedSec: 14.1, heartsLeft: 10, blocksPlaced: 3, passed: true },
    ],
  },
];

export async function GET() {
  return NextResponse.json({
    success: true,
    challenges: CHALLENGES,
  });
}
