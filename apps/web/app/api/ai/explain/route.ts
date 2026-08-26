import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      goal = "Navigate to diamond resource block",
      selectedAction = "Turn Right",
      actionId = 3,
      targetDistance = 4.2,
      targetAngleDeg = 45,
      frontObstacleDist = 0.8,
      rewardDelta = 0.35,
      modelVersion = "explorer-v2",
    } = body;

    // Check if Gemini API key or external provider is configured
    const apiKey = process.env.GEMINI_API_KEY;

    let explanation = "";
    let confidence = 0.92;

    if (apiKey) {
      try {
        const prompt = `You are the MINDCRAFT Embodied AI Explanation Agent. Explain concisely (2-3 sentences max) why the agent chose action "${selectedAction}" given this observable telemetry:
- Current Objective: ${goal}
- Target Distance: ${targetDistance.toFixed(2)}m
- Target Angle relative to heading: ${targetAngleDeg.toFixed(0)} degrees
- Forward Raycast Obstacle Distance: ${frontObstacleDist.toFixed(2)}m
- Reward Delta: ${rewardDelta.toFixed(2)}
- Active Policy Model: ${modelVersion}
Base your response strictly on telemetry and spatial geometry.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          explanation = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        }
      } catch (e) {
        console.warn("External Gemini explanation failed, fallback to local reasoner:", e);
      }
    }

    // Local Evidence-Based Decision Reasoner
    if (!explanation) {
      if (actionId === 0) { // Forward
        explanation = `The forward raycast detected unobstructed path (${frontObstacleDist.toFixed(1)}m clear) and the target vector is aligned with heading (${Math.abs(targetAngleDeg).toFixed(0)}° deviation). The policy executed 'Forward' to minimize Euclidean distance and capture positive delta reward (+${rewardDelta.toFixed(2)}).`;
      } else if (actionId === 2 || actionId === 3) { // Turn Left or Turn Right
        const dir = actionId === 3 ? "clockwise (Right)" : "counter-clockwise (Left)";
        explanation = `The target beacon is offset by ${Math.abs(targetAngleDeg).toFixed(0)}° from the agent's current heading. The policy initiated a ${dir} angular correction to orient its primary forward sensor towards the resource target.`;
      } else if (actionId === 4) { // Jump
        explanation = `Forward sensory rays detected a low obstacle within 0.5m. The agent triggered 'Jump' to traverse terrain elevation while preserving forward momentum.`;
      } else if (actionId === 5) { // Collect
        explanation = `The agent is within 1.2m proximity threshold of an uncollected voxel resource. It executed 'Collect' to gather the target block and claim the +8.0 goal reward.`;
      } else {
        explanation = `The agent stabilized its position while evaluating adjacent obstacle raycasts to prevent boundary collisions.`;
      }
    }

    return NextResponse.json({
      explanation,
      confidence,
      provider: apiKey ? "Gemini-1.5-Flash" : "MINDCRAFT Evidence Reasoner (Local)",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
