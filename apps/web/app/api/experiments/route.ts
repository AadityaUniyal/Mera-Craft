import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const trainingRuns = await prisma.trainingRun.findMany({
      include: {
        modelVersion: {
          include: {
            evaluations: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    const experiments = trainingRuns.map((run) => {
      const v = run.modelVersion;
      const evals = v.evaluations;
      const overallSuccess = evals.length > 0
        ? evals.reduce((acc, e) => acc + e.successRatePercent, 0) / evals.length
        : 0;

      return {
        id: run.id,
        modelVersion: v.versionTag,
        algorithm: run.algorithm,
        environmentVersion: run.environmentVersion,
        rewardVersion: run.rewardVersion,
        hyperparameters: run.hyperparametersJson,
        timestepsTrained: run.timestepsTrained,
        peakReward: run.peakReward,
        gitCommit: run.gitCommit,
        startedAt: run.startedAt,
        status: v.status,
        overallSuccessRate: parseFloat(overallSuccess.toFixed(1)),
        evaluations: evals,
      };
    });

    return NextResponse.json({
      success: true,
      count: experiments.length,
      experiments,
    });
  } catch (error: any) {
    console.error("Failed to query experiments from Neon:", error);
    return NextResponse.json(
      { error: "Database error querying experiment tracking" },
      { status: 500 }
    );
  }
}
