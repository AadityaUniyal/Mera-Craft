import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth || auth.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin privileges required to publish models." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { modelVersionId, versionTag, bypassReleaseGate } = body;

    if (!modelVersionId && !versionTag) {
      return NextResponse.json(
        { error: "modelVersionId or versionTag is required" },
        { status: 400 }
      );
    }

    // Find candidate model with deterministically ordered evaluations
    const candidate = await prisma.modelVersion.findFirst({
      where: modelVersionId ? { id: modelVersionId } : { versionTag },
      include: {
        evaluations: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        character: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Target ModelVersion not found in database" },
        { status: 404 }
      );
    }

    // Automated Release Gate Validation
    const latestEval = candidate.evaluations[0];
    const meetsGate = latestEval
      ? latestEval.successRatePercent >= 75.0 && latestEval.avgInferenceLatencyMs <= 10.0
      : false;

    if (!meetsGate && !bypassReleaseGate) {
      return NextResponse.json(
        {
          error: "Release Gate Failed: Model does not satisfy production criteria (Success Rate >= 75%, Latency <= 10ms).",
          metrics: latestEval,
        },
        { status: 422 }
      );
    }

    // Atomic promotion using interactive transaction
    const published = await prisma.$transaction(async (tx) => {
      // 1. Demote current active model for this character
      await tx.modelVersion.updateMany({
        where: { characterId: candidate.characterId, status: "ACTIVE" },
        data: { status: "RETIRED", retiredAt: new Date() },
      });

      // 2. Promote new model to ACTIVE
      const updated = await tx.modelVersion.update({
        where: { id: candidate.id },
        data: {
          status: "ACTIVE",
          publishedAt: new Date(),
          canaryPercent: 100,
        },
      });

      // 3. Audit Logging
      await tx.auditLog.create({
        data: {
          actorId: auth.user.id,
          action: "MODEL_PROMOTED",
          targetType: "ModelVersion",
          targetId: candidate.id,
          details: {
            character: candidate.character.name,
            versionTag: candidate.versionTag,
            successRatePercent: latestEval?.successRatePercent,
            bypassedGate: !!bypassReleaseGate,
          },
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: `Model ${candidate.versionTag} successfully promoted to ACTIVE for ${candidate.character.name}.`,
      publishedModel: published,
    });
  } catch (err: any) {
    console.error("[-] Error publishing model:", err);
    return NextResponse.json(
      { error: "Internal Server Error during model promotion" },
      { status: 500 }
    );
  }
}
