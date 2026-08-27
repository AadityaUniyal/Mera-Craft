import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(req);
    if (!auth || auth.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin privileges required." },
        { status: 403 }
      );
    }

    const evaluations = await prisma.evaluation.findMany({
      include: {
        modelVersion: {
          include: {
            character: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      evaluations,
    });
  } catch (err: any) {
    console.error("[-] Error in /api/admin/evaluations:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
