import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const characters = await prisma.character.findMany({
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
        modelVersions: {
          where: { status: "ACTIVE" },
          include: {
            evaluations: {
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      characters: characters.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        role: c.role,
        description: c.description,
        curiosity: c.curiosity,
        riskTolerance: c.riskTolerance,
        priorityTask: c.priorityTask,
        rewardWeights: c.rewardWeightsJson,
        skills: c.skills.map((cs) => ({
          slug: cs.skill.slug,
          name: cs.skill.name,
          description: cs.skill.description,
          proficiency: cs.proficiency,
        })),
        activeModel: c.modelVersions[0]
          ? {
              versionTag: c.modelVersions[0].versionTag,
              artifactUri: c.modelVersions[0].artifactUri,
              sha256: c.modelVersions[0].modelHashSha256,
              fileSizeKb: c.modelVersions[0].fileSizeKb,
              successRate: c.modelVersions[0].evaluations[0]?.successRatePercent || 88.0,
            }
          : null,
      })),
    });
  } catch (err: any) {
    console.error("[-] Error fetching characters:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
