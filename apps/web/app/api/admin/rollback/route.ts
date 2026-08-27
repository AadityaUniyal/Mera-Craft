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

    const body = await req.json().catch(() => null);
    const characterId = body?.characterId;
    const targetVersionTag = body?.targetVersionTag;

    // Find viable rollback model (RETIRED or APPROVED)
    const targetModel = await prisma.modelVersion.findFirst({
      where: {
        ...(characterId ? { characterId } : {}),
        ...(targetVersionTag ? { versionTag: targetVersionTag } : { status: "RETIRED" }),
      },
      orderBy: { publishedAt: "desc" },
      include: { character: true },
    });

    if (!targetModel) {
      return NextResponse.json(
        { error: "No viable previous model version found for rollback." },
        { status: 404 }
      );
    }

    // Atomic rollback using transaction
    const rolledBack = await prisma.$transaction(async (tx) => {
      // 1. Demote current active model
      await tx.modelVersion.updateMany({
        where: { characterId: targetModel.characterId, status: "ACTIVE" },
        data: { status: "RETIRED", retiredAt: new Date() },
      });

      // 2. Promote rollback model back to ACTIVE
      const updated = await tx.modelVersion.update({
        where: { id: targetModel.id },
        data: {
          status: "ACTIVE",
          publishedAt: new Date(),
          canaryPercent: 100,
        },
      });

      // 3. Write Audit Log
      await tx.auditLog.create({
        data: {
          actorId: auth.user.id,
          action: "MODEL_ROLLED_BACK",
          targetType: "ModelVersion",
          targetId: targetModel.id,
          details: {
            character: targetModel.character.name,
            restoredVersion: targetModel.versionTag,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully rolled back to version ${targetModel.versionTag} for ${targetModel.character.name}.`,
      restoredModel: rolledBack,
    });
  } catch (err: any) {
    console.error("[-] Error during model rollback:", err);
    return NextResponse.json(
      { error: "Internal Server Error during rollback execution" },
      { status: 500 }
    );
  }
}
