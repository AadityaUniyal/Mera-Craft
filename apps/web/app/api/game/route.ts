import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/game?gameId=GAME-7842-MC
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    const gameId = searchParams.get("gameId");

    if (!gameId && !auth) {
      return NextResponse.json({ error: "Unauthorized: Please log in" }, { status: 401 });
    }

    const whereClause: any = {};
    if (gameId) {
      whereClause.gameId = gameId;
      if (auth && auth.role !== "ADMIN") {
        whereClause.userId = auth.user.id;
      }
    } else if (auth) {
      whereClause.userId = auth.user.id;
    }

    const profile = await prisma.gameProfile.findFirst({
      where: whereClause,
      include: {
        user: { select: { id: true, email: true, role: true } },
        characterStates: { include: { character: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!profile) {
      return NextResponse.json({ error: "Game Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      gameProfile: {
        id: profile.id,
        gameId: profile.gameId,
        worldSeed: profile.worldSeed,
        level: profile.level,
        experiencePts: profile.experiencePts,
        totalPlayTimeSec: profile.totalPlayTimeSec,
        playerPos: [profile.playerX, profile.playerY, profile.playerZ],
        inventory: profile.inventoryJson,
        characterStates: profile.characterStates,
      },
    });
  } catch (err: any) {
    console.error("[-] Error in /api/game:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/game (Create new persistent Game ID)
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized: Login required to create a game profile" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const seed = typeof body.seed === "number" ? body.seed : Math.floor(Math.random() * 100000);
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newGameId = `GAME-${randomSuffix}-MC`;

    const created = await prisma.gameProfile.create({
      data: {
        gameId: newGameId,
        userId: auth.user.id,
        worldSeed: seed,
        level: 1,
        experiencePts: 0,
        playerX: 4.0,
        playerY: 0.0,
        playerZ: 4.0,
        inventoryJson: { wood: 0, stone: 0, iron: 0, diamond: 0, cobble: 16 },
      },
    });

    return NextResponse.json({
      success: true,
      gameProfile: created,
    });
  } catch (err: any) {
    console.error("[-] Error creating game profile:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
