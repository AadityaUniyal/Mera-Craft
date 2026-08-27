import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { idempotency } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized: Please log in to save game state" }, { status: 401 });
    }

    // 1. Idempotency Check
    const idempotencyKey = req.headers.get("x-idempotency-key");
    if (idempotencyKey) {
      const cached = idempotency.get(idempotencyKey);
      if (cached) {
        return NextResponse.json(cached.data, {
          status: cached.statusCode,
          headers: { "x-idempotency-hit": "true" },
        });
      }
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.gameId) {
      return NextResponse.json({ error: "Missing gameId parameter" }, { status: 400 });
    }

    const { gameId, playerPos, inventory, experienceGained, playTimeSec, clientVersion } = body;

    const existingProfile = await prisma.gameProfile.findUnique({
      where: { gameId },
    });

    if (!existingProfile) {
      return NextResponse.json({ error: "Game Profile not found" }, { status: 404 });
    }

    // IDOR protection: Verify profile ownership
    if (existingProfile.userId !== auth.user.id && auth.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: You do not own this game profile" }, { status: 403 });
    }

    // 2. Optimistic Concurrency Control
    if (clientVersion !== undefined && typeof clientVersion === "number") {
      if (existingProfile.version !== clientVersion) {
        return NextResponse.json(
          {
            error: "State conflict: The game profile was modified concurrently by another session.",
            serverVersion: existingProfile.version,
            clientVersion,
          },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.gameProfile.update({
      where: { gameId },
      data: {
        playerX: playerPos?.[0] !== undefined ? Number(playerPos[0]) : existingProfile.playerX,
        playerY: playerPos?.[1] !== undefined ? Number(playerPos[1]) : existingProfile.playerY,
        playerZ: playerPos?.[2] !== undefined ? Number(playerPos[2]) : existingProfile.playerZ,
        inventoryJson: inventory || existingProfile.inventoryJson,
        version: { increment: 1 },
        experiencePts: { increment: typeof experienceGained === "number" ? Math.max(0, experienceGained) : 0 },
        totalPlayTimeSec: { increment: typeof playTimeSec === "number" ? Math.max(0, playTimeSec) : 0 },
      },
    });

    const responseData = {
      success: true,
      message: "Game progress safely persisted to Neon PostgreSQL",
      gameProfile: updated,
    };

    if (idempotencyKey) {
      idempotency.set(idempotencyKey, 200, responseData);
    }

    return NextResponse.json(responseData);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to persist game state" }, { status: 500 });
  }
}
