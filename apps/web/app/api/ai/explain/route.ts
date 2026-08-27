import { NextResponse } from "next/server";
import { ResilientAIGateway } from "@/lib/ai-gateway";
import { aiCircuitBreaker } from "@/lib/resilience";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Sanitize and constrain input parameters
    const rawGoal = typeof body.goal === "string" ? body.goal.slice(0, 100).replace(/[^\w\s.,-]/gi, "") : "Navigate to diamond resource block";
    const rawAction = typeof body.selectedAction === "string" ? body.selectedAction.slice(0, 50).replace(/[^\w\s-]/gi, "") : "Turn Right";
    const rawModel = typeof body.modelVersion === "string" ? body.modelVersion.slice(0, 40).replace(/[^\w.-]/gi, "") : "explorer-v2";

    const actionId = typeof body.actionId === "number" ? body.actionId : 3;
    const targetDistance = typeof body.targetDistance === "number" ? Math.max(0, Math.min(100, body.targetDistance)) : 4.2;
    const targetAngleDeg = typeof body.targetAngleDeg === "number" ? Math.max(-180, Math.min(180, body.targetAngleDeg)) : 45;
    const frontObstacleDist = typeof body.frontObstacleDist === "number" ? Math.max(0, Math.min(20, body.frontObstacleDist)) : 0.8;
    const rewardDelta = typeof body.rewardDelta === "number" ? Math.max(-50, Math.min(50, body.rewardDelta)) : 0.35;

    const systemPrompt = `You are the MINDCRAFT Embodied AI Neural Explanation Agent. Explain concisely (2 sentences max) why the agent selected this action based on spatial geometry and sensor raycasts.`;

    const userPrompt = `Telemetry Context:
- Current Objective: ${rawGoal}
- Selected Action: ${rawAction}
- Target Distance: ${targetDistance.toFixed(2)}m
- Target Angle relative to heading: ${targetAngleDeg.toFixed(0)} degrees
- Forward Raycast Obstacle Distance: ${frontObstacleDist.toFixed(2)}m
- Reward Delta: ${rewardDelta.toFixed(2)}
- Active Policy Model: ${rawModel}`;

    const localFallbackText = () => {
      if (actionId === 0) {
        return `The forward raycast detected unobstructed path (${frontObstacleDist.toFixed(1)}m clear) and the target vector is aligned with heading (${Math.abs(targetAngleDeg).toFixed(0)}° deviation). The policy executed 'Forward' to minimize Euclidean distance and capture positive delta reward (+${rewardDelta.toFixed(2)}).`;
      } else if (actionId === 2 || actionId === 3) {
        const dir = actionId === 3 ? "clockwise (Right)" : "counter-clockwise (Left)";
        return `The target beacon is offset by ${Math.abs(targetAngleDeg).toFixed(0)}° from the agent's current heading. The policy initiated a ${dir} angular correction to orient its primary forward sensor towards the resource target.`;
      } else if (actionId === 4) {
        return `Forward sensory rays detected a low obstacle within 0.5m. The agent triggered 'Jump' to traverse terrain elevation while preserving forward momentum.`;
      } else if (actionId === 5) {
        return `The agent is within 1.2m proximity threshold of an uncollected voxel resource. It executed 'Collect' to gather the target block and claim the goal reward.`;
      }
      return `The agent stabilized its position while evaluating adjacent obstacle raycasts to prevent boundary collisions.`;
    };

    let result = await aiCircuitBreaker.execute(
      async () => {
        return await ResilientAIGateway.generate({
          systemPrompt,
          userPrompt,
          maxTokens: 150,
          temperature: 0.3,
        });
      },
      () => ({
        text: localFallbackText(),
        provider: "MINDCRAFT Evidence Reasoner (Local Heuristic)",
        model: "spatial-heuristic-v6",
        latencyMs: 0.5,
      })
    );

    return NextResponse.json({
      explanation: result.text,
      confidence: 0.94,
      provider: result.provider,
      model: result.model,
      latencyMs: result.latencyMs,
      circuitState: aiCircuitBreaker.getState(),
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
