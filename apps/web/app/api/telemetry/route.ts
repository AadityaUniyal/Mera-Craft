import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, modelVersion, eventType, outcome, rewardAccumulated, stepsTaken, payload } = body;

    if (!eventType) {
      return NextResponse.json({ error: "Missing eventType" }, { status: 400 });
    }

    try {
      // Resolve or create Session
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const newSession = await prisma.session.create({
          data: {
            goalsAttempted: eventType.includes("GOAL") ? 1 : 0,
            goalsCompleted: outcome === "GOAL_REACHED" ? 1 : 0,
          },
        });
        activeSessionId = newSession.id;
      } else {
        if (eventType === "GOAL_COMPLETED" || outcome === "GOAL_REACHED") {
          await prisma.session.update({
            where: { id: activeSessionId },
            data: {
              goalsCompleted: { increment: 1 },
            },
          }).catch(() => {});
        }
      }

      let modelVersionDbId: string | undefined = undefined;
      if (modelVersion) {
        const mv = await prisma.modelVersion.findFirst({
          where: { versionTag: modelVersion },
        });
        if (mv) modelVersionDbId = mv.id;
      }

      const telemetry = await prisma.telemetryEvent.create({
        data: {
          sessionId: activeSessionId,
          modelVersionId: modelVersionDbId,
          eventType: eventType,
          outcome: outcome || undefined,
          rewardAccumulated: rewardAccumulated !== undefined ? parseFloat(rewardAccumulated) : undefined,
          stepsTaken: stepsTaken !== undefined ? parseInt(stepsTaken) : undefined,
          payloadJson: payload || {},
        },
      });

      return NextResponse.json({
        success: true,
        id: telemetry.id,
        sessionId: activeSessionId,
      });
    } catch (dbErr) {
      console.warn("Neon telemetry DB sync fallback:", dbErr);
      return NextResponse.json({
        success: true,
        id: `offline-${Date.now()}`,
        sessionId: sessionId || `session-${Date.now()}`,
      });
    }
  } catch (error: any) {
    console.error("Telemetry payload error:", error);
    return NextResponse.json(
      { error: "Invalid telemetry payload" },
      { status: 400 }
    );
  }
}
