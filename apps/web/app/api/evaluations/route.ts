import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const evaluations = await prisma.evaluation.findMany({
      include: {
        modelVersion: {
          select: {
            id: true,
            versionTag: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      count: evaluations.length,
      evaluations,
    });
  } catch (error: any) {
    console.error("Failed to query evaluations from Neon:", error);
    return NextResponse.json(
      { error: "Database error querying evaluations" },
      { status: 500 }
    );
  }
}
