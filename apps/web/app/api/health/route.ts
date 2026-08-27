import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { keyManager } from "@/lib/key-manager";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Comprehensive System Health & Diagnostics Endpoint
 */
export async function GET() {
  const startTime = performance.now();

  // 1. Database Health Check
  let dbStatus = "healthy";
  let dbLatencyMs = 0;
  try {
    const dbStart = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = parseFloat((performance.now() - dbStart).toFixed(2));
  } catch (err: any) {
    dbStatus = "unhealthy";
  }

  // 2. Model Artifacts Inventory Check
  const modelsDir = path.join(process.cwd(), "public", "models");
  let availableModels: string[] = [];
  try {
    if (fs.existsSync(modelsDir)) {
      availableModels = fs.readdirSync(modelsDir).filter((f) => f.endsWith(".onnx"));
    }
  } catch {}

  // 3. AI Providers & Key Pools Status
  const keyHealth = keyManager.getHealthStatus();

  // 4. Process Memory & System Metrics
  const memory = process.memoryUsage();
  const memorySummary = {
    heapUsedMb: parseFloat((memory.heapUsed / 1024 / 1024).toFixed(2)),
    heapTotalMb: parseFloat((memory.heapTotal / 1024 / 1024).toFixed(2)),
    rssMb: parseFloat((memory.rss / 1024 / 1024).toFixed(2)),
  };

  const totalDurationMs = parseFloat((performance.now() - startTime).toFixed(2));
  const isHealthy = dbStatus === "healthy";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        modelStorage: {
          status: availableModels.length > 0 ? "ready" : "warning_empty",
          modelsCount: availableModels.length,
          models: availableModels,
        },
        aiKeyRotation: keyHealth,
        memory: memorySummary,
      },
      diagnosticsDurationMs: totalDurationMs,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
