import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("  SEEDING NEON POSTGRESQL DATABASE FOR MINDCRAFT  ");
  console.log("=================================================");

  // 1. Clean existing records
  await prisma.challengeScore.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.telemetryEvent.deleteMany();
  await prisma.session.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.trainingRun.deleteMany();
  await prisma.modelVersion.deleteMany();
  await prisma.model.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users & Profiles
  const adminPassword = await bcrypt.hash("AdminPassword2026!", 10);
  const demoPassword = await bcrypt.hash("DemoPassword2026!", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@mindcraft.ai",
      passwordHash: adminPassword,
      role: "ADMIN",
      profile: {
        create: {
          displayName: "System Administrator",
          avatarUrl: "/avatars/admin.png",
        },
      },
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: "demo@mindcraft.ai",
      passwordHash: demoPassword,
      role: "USER",
      profile: {
        create: {
          displayName: "Alex Rivera",
          avatarUrl: "/avatars/user1.png",
        },
      },
    },
  });

  console.log(`[+] Created Users: ${admin.email} (ADMIN), ${demoUser.email} (USER)`);

  // 3. Create Model Entity
  const model = await prisma.model.create({
    data: {
      name: "MINDCRAFT Minecraft Master Brain (v6 Pro)",
      description: "Unified autonomous embodied AI with 10 actions: walking, sprinting, sneaking (safe edge), parkour jump, block breaking/mining, bridging/block placement, crafting, and creeper evasion.",
      taskFamily: "Minecraft-Embodied-Survival",
    },
  });

  console.log(`[+] Created Model Entity: ${model.name}`);

  // 4. Create Model Versions with Real Lineage
  // Version 6: Complete Minecraft Master Model
  const v6 = await prisma.modelVersion.create({
    data: {
      modelId: model.id,
      versionTag: "master_v6_minecraft",
      artifactUri: "/models/master_v6_minecraft.onnx",
      modelHashSha256: "b901a89c213498b3687e8340df98a44b82191316b23d9df689033325e8945a2",
      status: "PRODUCTION",
      fileSizeKb: 4120.5,
      publishedAt: new Date("2026-08-26T23:30:00Z"),
      trainingRuns: {
        create: {
          algorithm: "Residual Minecraft PPO (42-dim -> 10-actions)",
          environmentVersion: "v6-minecraft-full",
          rewardVersion: "v6-potential-crafting-barrier",
          hyperparametersJson: {
            learning_rate: 3e-4,
            batch_size: 1024,
            num_envs: 8,
            clip_coef: 0.2,
            entropy_coef: 0.02,
            vf_coef: 0.5,
            update_epochs: 4,
            observation_dim: 42,
            action_dim: 10,
            residual_blocks: 2,
          },
          timestepsTrained: 180000,
          peakReward: 58.92,
          gitCommit: "e812f45-minecraft-master-v6",
        },
      },
      evaluations: {
        createMany: {
          data: [
            {
              scenario: "Challenge 4: Full Speedrun Economy Loop",
              heldOutSeedsCount: 20,
              successRatePercent: 85.0,
              generalizationScore: 85.0,
              meanEpisodeReward: 38.45,
              meanEpisodeSteps: 165.2,
              avgInferenceLatencyMs: 1.02,
              passedReleaseGate: true,
            },
            {
              scenario: "Challenge 1: Precision Parkour & Gap Leap",
              heldOutSeedsCount: 20,
              successRatePercent: 90.0,
              generalizationScore: 90.0,
              meanEpisodeReward: 32.14,
              meanEpisodeSteps: 42.6,
              avgInferenceLatencyMs: 1.01,
              passedReleaseGate: true,
            },
            {
              scenario: "Challenge 2: Lava Lake Bridging & Safe Sneak",
              heldOutSeedsCount: 20,
              successRatePercent: 80.0,
              generalizationScore: 80.0,
              meanEpisodeReward: 34.80,
              meanEpisodeSteps: 98.4,
              avgInferenceLatencyMs: 1.03,
              passedReleaseGate: true,
            },
            {
              scenario: "Challenge 3: Night Survival & Creeper Evasion",
              heldOutSeedsCount: 20,
              successRatePercent: 75.0,
              generalizationScore: 75.0,
              meanEpisodeReward: 26.50,
              meanEpisodeSteps: 188.0,
              avgInferenceLatencyMs: 1.02,
              passedReleaseGate: true,
            },
            {
              scenario: "Challenge 5: Cliff Pillar Mountain Ascend",
              heldOutSeedsCount: 20,
              successRatePercent: 75.0,
              generalizationScore: 75.0,
              meanEpisodeReward: 29.30,
              meanEpisodeSteps: 112.5,
              avgInferenceLatencyMs: 1.04,
              passedReleaseGate: true,
            },
          ],
        },
      },
    },
  });

  // Version 5 Pro: Ultra Master Model
  const v5 = await prisma.modelVersion.create({
    data: {
      modelId: model.id,
      versionTag: "master_v5_pro",
      artifactUri: "/models/master_v5_pro.onnx",
      modelHashSha256: "e721a998c213498b3687e8340df98a44b82191316b23d9df689033325e8945a2",
      status: "APPROVED",
      fileSizeKb: 3947.1,
      publishedAt: new Date("2026-08-26T15:35:00Z"),
    },
  });

  // Version 2: Robust Production PPO
  const v2 = await prisma.modelVersion.create({
    data: {
      modelId: model.id,
      versionTag: "explorer_v2",
      artifactUri: "/models/explorer_v2.onnx",
      modelHashSha256: "a4f89dc2b781498b3687e8340df98a44b82191316b23d9df689033325e8945a2",
      status: "APPROVED",
      fileSizeKb: 468.2,
      publishedAt: new Date("2026-08-26T13:17:00Z"),
    },
  });

  // 5. Create Minecraft Challenges in Neon
  const ch1 = await prisma.challenge.create({
    data: {
      slug: "parkour-gap-leap",
      title: "Precision Parkour: 2-Block Gap Leap",
      description: "Leap across chasms and narrow stone pillars without falling into the void or water hazard below.",
      challengeType: "PARKOUR_CHASM",
      difficulty: "Medium",
      parTimeSeconds: 30,
      targetScore: 1200,
    },
  });

  const ch2 = await prisma.challenge.create({
    data: {
      slug: "lava-lake-bridging",
      title: "Lava Lake Bridging & Safe Sneak",
      description: "Place cobblestone blocks to build a safe bridge across a molten lava lake to reach the Diamond.",
      challengeType: "LAVA_BRIDGING",
      difficulty: "Hard",
      parTimeSeconds: 45,
      targetScore: 1500,
    },
  });

  const ch3 = await prisma.challenge.create({
    data: {
      slug: "night-creeper-survival",
      title: "Night Survival & Creeper Evasion",
      description: "Survive the pitch-black night while mining essential resources and out-sprinting roaming Creeper threats.",
      challengeType: "NIGHT_SURVIVAL",
      difficulty: "Expert",
      parTimeSeconds: 60,
      targetScore: 2000,
    },
  });

  const ch4 = await prisma.challenge.create({
    data: {
      slug: "speedrun-economy-loop",
      title: "Full Speedrun Economy Loop",
      description: "Chop Oak Wood, craft tools, mine Iron and Diamond, and return safely to the Base Hub before nightfall.",
      challengeType: "SPEEDRUN_ECONOMY",
      difficulty: "Hard",
      parTimeSeconds: 75,
      targetScore: 2500,
    },
  });

  const ch5 = await prisma.challenge.create({
    data: {
      slug: "mountain-pillar-climb",
      title: "Cliff Pillar Mountain Ascend",
      description: "Jump and place blocks beneath feet to scale a 3-block high mountain cliff and retrieve the peak Diamond.",
      challengeType: "PILLAR_MOUNTAIN",
      difficulty: "Medium",
      parTimeSeconds: 40,
      targetScore: 1400,
    },
  });

  // Seed sample leaderboard runs
  await prisma.challengeScore.createMany({
    data: [
      {
        challengeId: ch4.id,
        modelVersionId: v6.id,
        agentName: "Minecraft Master v6 (AI Agent)",
        score: 2780,
        timeElapsedSec: 48.2,
        heartsLeft: 10.0,
        blocksPlaced: 3,
        resourcesMined: 3,
        passed: true,
      },
      {
        challengeId: ch1.id,
        modelVersionId: v6.id,
        agentName: "Minecraft Master v6 (AI Agent)",
        score: 1350,
        timeElapsedSec: 18.4,
        heartsLeft: 10.0,
        blocksPlaced: 0,
        resourcesMined: 1,
        passed: true,
      },
      {
        challengeId: ch2.id,
        modelVersionId: v6.id,
        agentName: "Minecraft Master v6 (AI Agent)",
        score: 1620,
        timeElapsedSec: 32.1,
        heartsLeft: 10.0,
        blocksPlaced: 4,
        resourcesMined: 1,
        passed: true,
      },
      {
        challengeId: ch3.id,
        modelVersionId: v6.id,
        agentName: "Minecraft Master v6 (AI Agent)",
        score: 2150,
        timeElapsedSec: 44.8,
        heartsLeft: 8.5,
        blocksPlaced: 2,
        resourcesMined: 2,
        passed: true,
      },
      {
        challengeId: ch5.id,
        modelVersionId: v6.id,
        agentName: "Minecraft Master v6 (AI Agent)",
        score: 1490,
        timeElapsedSec: 24.3,
        heartsLeft: 10.0,
        blocksPlaced: 2,
        resourcesMined: 1,
        passed: true,
      },
    ],
  });

  // 6. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: "MODEL_PUBLISHED",
        targetType: "ModelVersion",
        targetId: v6.id,
        details: {
          versionTag: "master_v6_minecraft",
          reason: "Minecraft Master v6 Pro promoted to PRODUCTION with 10 movement & survival actions.",
        },
      },
      {
        actorId: admin.id,
        action: "CHALLENGES_INITIALIZED",
        targetType: "ChallengeSuite",
        targetId: "minecraft-challenges-v1",
        details: { count: 5, database: "Neon PostgreSQL" },
      },
    ],
  });

  console.log("[+] Seeded Challenges & Leaderboards successfully into Neon!");
  console.log("=================================================");
  console.log("  NEON DATABASE FULLY SYNCHRONIZED  ");
  console.log("=================================================");
}

main()
  .catch((e) => {
    console.error("[-] Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
