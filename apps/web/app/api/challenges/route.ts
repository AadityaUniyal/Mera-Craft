import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DEFAULT_CHALLENGES = [
  {
    slug: "parkour-chasm",
    title: "1. Precision Parkour Gap",
    description: "Navigate 2-block gap leaps over void chasms. Requires sprint acceleration and timing jump momentum.",
    challengeType: "PARKOUR_CHASM" as const,
    difficulty: "Medium",
    parTimeSeconds: 15,
    targetScore: 45,
  },
  {
    slug: "lava-bridging",
    title: "2. Lava Lake Bridging",
    description: "Safely cross a boiling lava lake using crouch edge protection and placing cobblestone bridge blocks.",
    challengeType: "LAVA_BRIDGING" as const,
    difficulty: "Hard",
    parTimeSeconds: 25,
    targetScore: 60,
  },
  {
    slug: "water-river",
    title: "3. Water River Diamond Island",
    description: "Cross rapid water rivers without drowning to extract isolated diamond ore veins.",
    challengeType: "PARKOUR_CHASM" as const,
    difficulty: "Medium",
    parTimeSeconds: 20,
    targetScore: 50,
  },
  {
    slug: "night-creeper",
    title: "4. Night Creeper Survival",
    description: "Survive the pitch black night while an aggressive Creeper tracks your position in real-time.",
    challengeType: "NIGHT_SURVIVAL" as const,
    difficulty: "Extreme",
    parTimeSeconds: 30,
    targetScore: 80,
  },
  {
    slug: "speedrun-economy",
    title: "5. Diamond Speedrun Economy",
    description: "Complete full Minecraft progression: harvest oak wood, craft tools, mine iron, extract diamond, and deliver to depot.",
    challengeType: "SPEEDRUN_ECONOMY" as const,
    difficulty: "Expert",
    parTimeSeconds: 40,
    targetScore: 100,
  },
];

export async function GET() {
  try {
    let challenges = await prisma.challenge.findMany({
      include: {
        scores: {
          orderBy: { score: "desc" },
          take: 5,
          include: {
            user: { select: { email: true, profile: { select: { displayName: true } } } },
            modelVersion: { select: { versionTag: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Auto-bootstrap default challenges into Neon DB if empty
    if (challenges.length === 0) {
      try {
        for (const c of DEFAULT_CHALLENGES) {
          await prisma.challenge.create({
            data: c,
          });
        }
        challenges = await prisma.challenge.findMany({
          include: {
            scores: {
              orderBy: { score: "desc" },
              take: 5,
              include: {
                user: { select: { email: true, profile: { select: { displayName: true } } } },
                modelVersion: { select: { versionTag: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        });
      } catch (seedErr) {
        console.warn("Neon challenges auto-seed skipped:", seedErr);
      }
    }

    return NextResponse.json({
      success: true,
      count: challenges.length,
      challenges: challenges.length > 0 ? challenges : DEFAULT_CHALLENGES.map((d, i) => ({
        id: `default-${i}`,
        ...d,
        scores: [],
        createdAt: new Date().toISOString(),
      })),
    });
  } catch (error: any) {
    console.warn("Failed to query challenges from Neon, using default fallback:", error);
    return NextResponse.json({
      success: true,
      count: DEFAULT_CHALLENGES.length,
      challenges: DEFAULT_CHALLENGES.map((d, i) => ({
        id: `default-${i}`,
        ...d,
        scores: [],
        createdAt: new Date().toISOString(),
      })),
    });
  }
}
