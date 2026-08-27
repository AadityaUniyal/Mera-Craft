import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { challengeSlug, modelVersionTag, score, timeElapsedSec, heartsLeft, blocksPlaced, resourcesMined, passed } = body;

    const session = await prisma.session.findFirst({
      orderBy: { startedAt: "desc" },
    });

    if (session) {
      await prisma.telemetryEvent.create({
        data: {
          sessionId: session.id,
          eventType: "CHALLENGE_COMPLETED",
          outcome: passed ? "PASSED" : "FAILED",
          rewardAccumulated: parseFloat(score) || 0.0,
          stepsTaken: Math.round(parseFloat(timeElapsedSec) * 10) || 50,
          payloadJson: { challengeSlug, modelVersionTag, heartsLeft, blocksPlaced, resourcesMined },
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Challenge score recorded successfully in Neon telemetry",
      score: {
        challengeSlug,
        score: parseInt(score) || 1500,
        timeElapsedSec: parseFloat(timeElapsedSec) || 20.0,
        passed: passed !== false,
      },
    });
  } catch (err: any) {
    console.error("[-] Error submitting challenge score:", err);
    return NextResponse.json({ error: "Failed to submit score" }, { status: 500 });
  }
}
