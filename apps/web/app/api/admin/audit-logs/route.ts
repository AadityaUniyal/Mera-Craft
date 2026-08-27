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

    const auditLogs = await prisma.auditLog.findMany({
      include: {
        actor: {
          select: {
            email: true,
            role: true,
            profile: { select: { displayName: true } },
          },
        },
      },
      orderBy: { timestamp: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      count: auditLogs.length,
      auditLogs,
    });
  } catch (error: any) {
    console.error("Audit log query error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
