import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/ai/train
 * Interactive In-Browser Training API Endpoint
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { character = "explorer", algorithm = "DAGGER_DISTILLATION", epochs = 10, curriculumLevel = 3 } = body;

    // Simulate multi-epoch training progression curve
    const history = [];
    let currentLoss = algorithm === "DAGGER_DISTILLATION" ? 0.85 : 1.45;
    let currentAccuracy = algorithm === "DAGGER_DISTILLATION" ? 82.0 : 45.0;
    let currentReward = 12.0;

    for (let epoch = 1; epoch <= epochs; epoch++) {
      const decay = Math.exp(-epoch / (epochs * 0.4));
      currentLoss = parseFloat((0.008 + decay * 0.7 + (Math.random() * 0.02 - 0.01)).toFixed(4));
      currentAccuracy = parseFloat((Math.min(100.0, 100.0 - decay * 18.0 + (Math.random() * 1.5 - 0.75))).toFixed(2));
      currentReward = parseFloat((48.0 - decay * 32.0 + (Math.random() * 3.0 - 1.5)).toFixed(1));

      history.push({
        epoch,
        loss: Math.max(0.005, currentLoss),
        accuracy: Math.min(100.0, currentAccuracy),
        reward: currentReward,
      });
    }

    return NextResponse.json({
      success: true,
      character,
      algorithm,
      epochsTrained: epochs,
      curriculumLevel,
      finalAccuracy: history[history.length - 1].accuracy,
      finalLoss: history[history.length - 1].loss,
      peakReward: Math.max(...history.map((h) => h.reward)),
      history,
      modelUri: `/models/${character === "explorer" ? "explorer_v2" : character === "guardian" ? "guardian_v1" : "builder_v1"}.onnx`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to execute training job" }, { status: 500 });
  }
}
