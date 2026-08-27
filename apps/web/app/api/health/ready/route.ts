import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Kubernetes / Container Readiness Probe
 * Verifies that the database connection pool is healthy and accepting queries.
 */
export async function GET() {
  try {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const latencyMs = parseFloat((performance.now() - start).toFixed(2));

    return NextResponse.json({
      status: "ready",
      database: "connected",
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "unready",
        database: "disconnected",
        error: "Database readiness check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
