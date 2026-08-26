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

    const { modelVersionId, versionTag, bypassReleaseGate } = await req.json();

    if (!modelVersionId && !versionTag) {
      return NextResponse.json(
        { error: "modelVersionId or versionTag is required" },
        { status: 400 }
      );
    }

    // Find candidate model
    const candidate = await prisma.modelVersion.findFirst({
      where: modelVersionId ? { id: modelVersionId } : { versionTag },
      include: { evaluations: true, model: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Target ModelVersion not found in database" },
        { status: 404 }
      );
    }

    // Automated Release Gate Validation
    const latestEval = candidate.evaluations[0];
    const meetsGate = latestEval ? latestEval.successRatePercent >= 75.0 && latestEval.avgInferenceLatencyMs <= 10.0 : false;

    if (!meetsGate && !bypassReleaseGate) {
      return NextResponse.json(
        {
          error: "Release Gate Failed: Model does not satisfy production criteria (Success Rate >= 75%, Latency <= 10ms).",
          metrics: latestEval,
        },
        { status: 422 }
      );
    }

    // Demote current production model
    await prisma.modelVersion.updateMany({
      where: { status: "PRODUCTION" },
      data: { status: "APPROVED" },
    });

    // Promote new model to PRODUCTION
    const published = await prisma.modelVersion.update({
      where: { id: candidate.id },
      data: {
        status: "PRODUCTION",
        publishedAt: new Date(),
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: auth.user.id,
        action: "MODEL_PUBLISHED",
        targetType: "ModelVersion",
        targetId: candidate.id,
        details: {
          versionTag: candidate.versionTag,
          modelName: candidate.model.name,
          successRate: latestEval?.successRatePercent,
          latencyMs: latestEval?.avgInferenceLatencyMs,
          publishedBy: auth.user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Model ${candidate.versionTag} has been promoted to PRODUCTION.`,
      model: published,
    });
  } catch (error: any) {
    console.error("Publish error:", error);
    return NextResponse.json(
      { error: "Internal server error promoting model to production" },
      { status: 500 }
    );
  }
}
