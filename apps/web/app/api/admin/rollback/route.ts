import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth || auth.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin privileges required to execute model rollback." },
        { status: 403 }
      );
    }

    const { targetVersionTag } = await req.json();

    const targetModel = await prisma.modelVersion.findFirst({
      where: targetVersionTag ? { versionTag: targetVersionTag } : { status: "APPROVED" },
      orderBy: { publishedAt: "desc" },
      include: { model: true },
    });

    if (!targetModel) {
      return NextResponse.json(
        { error: "No viable approved previous model version found for rollback." },
        { status: 404 }
      );
    }

    const currentProd = await prisma.modelVersion.findFirst({
      where: { status: "PRODUCTION" },
    });

    // Demote current production model to ARCHIVED or APPROVED
    if (currentProd) {
      await prisma.modelVersion.update({
        where: { id: currentProd.id },
        data: { status: "APPROVED", retiredAt: new Date() },
      });
    }

    // Promote target model
    const rolledBack = await prisma.modelVersion.update({
      where: { id: targetModel.id },
      data: {
        status: "PRODUCTION",
        publishedAt: new Date(),
      },
    });

    // Write Audit Log
    await prisma.auditLog.create({
      data: {
        actorId: auth.user.id,
        action: "MODEL_ROLLED_BACK",
        targetType: "ModelVersion",
        targetId: targetModel.id,
        details: {
          previousProduction: currentProd?.versionTag,
          activeProduction: targetModel.versionTag,
          reason: "Manual admin emergency rollback",
          executedBy: auth.user.email,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Emergency rollback successful. ${targetModel.versionTag} is now active PRODUCTION.`,
      model: rolledBack,
    });
  } catch (error: any) {
    console.error("Rollback error:", error);
    return NextResponse.json(
      { error: "Internal server error executing rollback" },
      { status: 500 }
    );
  }
}
