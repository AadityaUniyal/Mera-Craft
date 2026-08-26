/**
 * MINDCRAFT — Telemetry Ingestion & Aggregator Client
 */

export interface TelemetryPayload {
  sessionId: string;
  modelVersion: string;
  seed: number;
  curriculumLevel: number;
  steps: number;
  cumulativeReward: number;
  resourcesCollected: number;
  status: "goal_reached" | "timeout" | "crashed";
  avgLatencyMs: number;
  timestamp: string;
}

export async function sendTelemetryEvent(payload: TelemetryPayload): Promise<boolean> {
  try {
    const res = await fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    console.warn("Telemetry dispatch error (cached locally):", err);
    return false;
  }
}
