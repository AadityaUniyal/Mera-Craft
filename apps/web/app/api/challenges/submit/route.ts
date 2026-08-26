import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    const body = await req.json();
    const { challengeSlug, modelVersionTag, score, timeElapsedSec, heartsLeft, blocksPlaced, resourcesMined, passed } = body;

    if (!challengeSlug) {
      return NextResponse.json({ error: "challengeSlug is required" }, { status: 400 });
    }

    try {
      let challenge = await prisma.challenge.findUnique({
        where: { slug: challengeSlug },
      });

      if (!challenge) {
        challenge = await prisma.challenge.create({
          data: {
            slug: challengeSlug,
            title: challengeSlug.replace("-", " ").toUpperCase(),
            description: "Procedural survival arena challenge",
            challengeType: "PARKOUR_CHASM",
            difficulty: "Hard",
          },
        });
      }

      let modelVersionId: string | undefined = undefined;
      if (modelVersionTag) {
        const mv = await prisma.modelVersion.findFirst({
          where: { versionTag: modelVersionTag },
        });
        if (mv) modelVersionId = mv.id;
      }

      const newScore = await prisma.challengeScore.create({
        data: {
          challengeId: challenge.id,
          userId: auth?.user?.id || undefined,
          modelVersionId: modelVersionId,
          agentName: modelVersionTag ? `Agent (${modelVersionTag})` : (auth?.user?.profile?.displayName || "Player"),
          score: parseInt(score) || 0,
          timeElapsedSec: parseFloat(timeElapsedSec) || 0.0,
          heartsLeft: parseFloat(heartsLeft) || 10.0,
          blocksPlaced: parseInt(blocksPlaced) || 0,
          resourcesMined: parseInt(resourcesMined) || 0,
          passed: passed !== false,
        },
      });

      return NextResponse.json({
        success: true,
        score: newScore,
      });
    } catch (dbErr) {
      console.warn("Neon DB challenge submit fallback:", dbErr);
      return NextResponse.json({
        success: true,
        score: {
          id: `score-${Date.now()}`,
          challengeSlug,
          score: parseInt(score) || 0,
          timeElapsedSec: parseFloat(timeElapsedSec) || 0.0,
          passed: true,
        },
      });
    }
  } catch (error: any) {
    console.error("Failed to submit challenge score:", error);
    return NextResponse.json(
      { error: "Invalid challenge score submission" },
      { status: 400 }
    );
  }
}
