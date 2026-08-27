import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Kubernetes / Container Liveness Probe
 * Returns 200 OK as long as the process is alive.
 */
export async function GET() {
  return NextResponse.json({
    status: "alive",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
}
