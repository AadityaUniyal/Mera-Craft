import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { idempotency } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

// POST /api/events/batch (Quality Filter Pipeline & Ingestion)
export async function POST(req: NextRequest) {
  try {
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
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { sessionId, events } = body;

    if (!sessionId || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "Invalid telemetry batch payload" }, { status: 400 });
    }

    if (events.length > 500) {
      return NextResponse.json({ error: "Batch size exceeds maximum limit of 500 events" }, { status: 400 });
    }

    // Ensure session exists or create anonymous session
    let session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) {
      session = await prisma.session.create({
        data: { id: sessionId },
      });
    }

    const processedEvents = [];
    for (const evt of events) {
      // Validation & Bot / Spam Filter
      const isCorrupt = !evt.eventType || evt.stepsTaken === undefined;
      const isSpam = evt.stepsTaken < 2 && evt.rewardAccumulated === 0;

      let qualityStatus = "APPROVED_TRAINING";
      if (isCorrupt) qualityStatus = "REJECTED_CORRUPT";
      else if (isSpam) qualityStatus = "REJECTED_SPAM";

      processedEvents.push({
        sessionId,
        modelVersionId: evt.modelVersionId || null,
        eventType: evt.eventType || "STEP_ACTION",
        qualityStatus: qualityStatus as any,
        outcome: evt.outcome || "COMPLETED",
        rewardAccumulated: evt.rewardAccumulated !== undefined ? Number(evt.rewardAccumulated) : 0.0,
        stepsTaken: evt.stepsTaken !== undefined ? Number(evt.stepsTaken) : 1,
        payloadJson: evt.payload || null,
      });
    }

    // Ingest into Neon
    await prisma.telemetryEvent.createMany({
      data: processedEvents,
    });

    const approvedCount = processedEvents.filter((e) => e.qualityStatus === "APPROVED_TRAINING").length;

    // Update Dataset Approved counter if relevant
    if (approvedCount > 0) {
      await prisma.dataset.updateMany({
        where: { versionTag: "dataset_v1_approved" },
        data: {
          approvedEvents: { increment: approvedCount },
          totalEpisodes: { increment: 1 },
        },
      });
    }

    const responseData = {
      success: true,
      ingested: processedEvents.length,
      approvedForTraining: approvedCount,
      message: "Batch telemetry validated and stored into Neon PostgreSQL",
    };

    if (idempotencyKey) {
      idempotency.set(idempotencyKey, 200, responseData);
    }

    return NextResponse.json(responseData);
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to ingest telemetry" }, { status: 500 });
  }
}
