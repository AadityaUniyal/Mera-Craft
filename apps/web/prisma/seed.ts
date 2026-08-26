import { PrismaClient, Role, ModelStatus, EpisodeOutcome } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("  SEEDING NEON POSTGRESQL DATABASE FOR MINDCRAFT  ");
  console.log("=================================================");

  // 1. Clean existing records for fresh deterministic seed
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
      role: Role.ADMIN,
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
      role: Role.USER,
      profile: {
        create: {
          displayName: "Alex Rivera",
          avatarUrl: "/avatars/user1.png",
        },
      },
    },
  });

  console.log(`[+] Created Users: ${admin.email} (ADMIN), ${demoUser.email} (USER)`);

  // 3. Create Model
  const model = await prisma.model.create({
    data: {
      name: "MINDCRAFT Embodied Voxel Intelligence",
      description: "Autonomous reinforcement learning agent perceiving 3D voxel grid and learning multi-task navigation, mining, hazard evasion, and base delivery.",
      taskFamily: "Embodied-Voxel-MultiTask",
    },
  });

  console.log(`[+] Created Model Entity: ${model.name}`);

  // 4. Create Model Versions with Real Training & Evaluation Lineage
  // Version 2: Production PPO
  const v2 = await prisma.modelVersion.create({
    data: {
      modelId: model.id,
      versionTag: "explorer_v2",
      artifactUri: "/models/explorer_v2.onnx",
      modelHashSha256: "a4f89dc2b781498b3687e8340df98a44b82191316b23d9df689033325e8945a2",
      status: ModelStatus.PRODUCTION,
      fileSizeKb: 468.2,
      publishedAt: new Date("2026-08-26T13:17:00Z"),
      trainingRuns: {
        create: {
          algorithm: "PPO + GAE (γ=0.99, λ=0.95)",
          environmentVersion: "v2-robust",
          rewardVersion: "v2-potential-shaping",
          hyperparametersJson: {
            learning_rate: 3e-4,
            batch_size: 1024,
            num_envs: 8,
            clip_coef: 0.2,
            entropy_coef: 0.02,
            vf_coef: 0.5,
            update_epochs: 4,
          },
          timestepsTrained: 140000,
          peakReward: 52.86,
          gitCommit: "b89f21a-robust-ppo",
        },
      },
      evaluations: {
        createMany: {
          data: [
            {
              scenario: "Unseen Seeds Generalization (80 Episodes)",
              heldOutSeedsCount: 80,
              successRatePercent: 95.0,
              generalizationScore: 93.33,
              meanEpisodeReward: 40.35,
              meanEpisodeSteps: 54.8,
              avgInferenceLatencyMs: 1.069,
              passedReleaseGate: true,
            },
            {
              scenario: "Heading Knockback Perturbation (±90°)",
              heldOutSeedsCount: 25,
              successRatePercent: 88.0,
              generalizationScore: 88.0,
              meanEpisodeReward: 41.16,
              meanEpisodeSteps: 92.5,
              avgInferenceLatencyMs: 1.12,
              passedReleaseGate: true,
            },
            {
              scenario: "Mid-Flight Agent Teleportation",
              heldOutSeedsCount: 25,
              successRatePercent: 84.0,
              generalizationScore: 84.0,
              meanEpisodeReward: 49.41,
              meanEpisodeSteps: 77.9,
              avgInferenceLatencyMs: 1.08,
              passedReleaseGate: true,
            },
            {
              scenario: "Dense Obstacle Maze with Random Traps",
              heldOutSeedsCount: 25,
              successRatePercent: 88.0,
              generalizationScore: 88.0,
              meanEpisodeReward: 44.42,
              meanEpisodeSteps: 68.7,
              avgInferenceLatencyMs: 1.15,
              passedReleaseGate: true,
            },
          ],
        },
      },
    },
  });

  // Version 4: Master Multi-Task
  const v4 = await prisma.modelVersion.create({
    data: {
      modelId: model.id,
      versionTag: "master_v4",
      artifactUri: "/models/master_v4.onnx",
      modelHashSha256: "c189ef04d2e8b23419084029384bb23450918234850982348509823459802345",
      status: ModelStatus.APPROVED,
      fileSizeKb: 486.5,
      publishedAt: new Date("2026-08-26T13:28:00Z"),
      trainingRuns: {
        create: {
          algorithm: "Multi-Task PPO (32-dim -> 8 actions)",
          environmentVersion: "v4-master-multitask",
          rewardVersion: "v4-multi-objective",
          hyperparametersJson: {
            learning_rate: 3e-4,
            batch_size: 1024,
            num_envs: 8,
            clip_coef: 0.2,
            entropy_coef: 0.02,
            vf_coef: 0.5,
            update_epochs: 4,
          },
          timestepsTrained: 160000,
          peakReward: 93.07,
          gitCommit: "d412e8c-master-v4",
        },
      },
      evaluations: {
        createMany: {
          data: [
            {
              scenario: "Base Delivery Cycle (Harvest -> Return)",
              heldOutSeedsCount: 25,
              successRatePercent: 72.0,
              generalizationScore: 72.0,
              meanEpisodeReward: 30.81,
              meanEpisodeSteps: 225.2,
              avgInferenceLatencyMs: 1.75,
              passedReleaseGate: true,
            },
            {
              scenario: "Multi-Resource Mining (Wood, Iron, Diamond)",
              heldOutSeedsCount: 25,
              successRatePercent: 64.0,
              generalizationScore: 64.0,
              meanEpisodeReward: 52.42,
              meanEpisodeSteps: 201.9,
              avgInferenceLatencyMs: 1.82,
              passedReleaseGate: true,
            },
            {
              scenario: "Hazardous Lava Survival & Evade",
              heldOutSeedsCount: 25,
              successRatePercent: 56.0,
              generalizationScore: 56.0,
              meanEpisodeReward: 56.78,
              meanEpisodeSteps: 188.2,
              avgInferenceLatencyMs: 1.72,
              passedReleaseGate: false,
            },
            {
              scenario: "Parkour Elevation & Hill Traversal",
              heldOutSeedsCount: 25,
              successRatePercent: 56.0,
              generalizationScore: 56.0,
              meanEpisodeReward: 45.98,
              meanEpisodeSteps: 201.3,
              avgInferenceLatencyMs: 1.78,
              passedReleaseGate: false,
            },
          ],
        },
      },
    },
  });

  // Version 3: Curriculum Mastery
  const v3 = await prisma.modelVersion.create({
    data: {
      modelId: model.id,
      versionTag: "explorer_v3",
      artifactUri: "/models/explorer_v3.onnx",
      modelHashSha256: "f839a9c8e1239845098234850982348509823485098234850982348509823485",
      status: ModelStatus.APPROVED,
      fileSizeKb: 468.2,
      publishedAt: new Date("2026-08-26T13:16:00Z"),
      trainingRuns: {
        create: {
          algorithm: "Curriculum PPO",
          environmentVersion: "v3-curriculum",
          rewardVersion: "v2-potential-shaping",
          hyperparametersJson: {
            learning_rate: 3e-4,
            batch_size: 1024,
            num_envs: 8,
            timesteps: 120000,
          },
          timestepsTrained: 120000,
          peakReward: 114.42,
          gitCommit: "a123f99-curriculum-ppo",
        },
      },
      evaluations: {
        create: {
          scenario: "Procedural Maze Benchmark (Level 3)",
          heldOutSeedsCount: 20,
          successRatePercent: 85.0,
          generalizationScore: 85.0,
          meanEpisodeReward: 58.52,
          meanEpisodeSteps: 117.5,
          avgInferenceLatencyMs: 1.05,
          passedReleaseGate: true,
        },
      },
    },
  });

  // Version 1: Baseline
  const v1 = await prisma.modelVersion.create({
    data: {
      modelId: model.id,
      versionTag: "explorer_v1",
      artifactUri: "/models/explorer_v1.onnx",
      modelHashSha256: "e018239480928340982348509823485098234850982348509823485098234850",
      status: ModelStatus.ARCHIVED,
      fileSizeKb: 468.2,
      retiredAt: new Date("2026-08-26T13:00:00Z"),
    },
  });

  console.log(`[+] Seeded Model Versions: ${v2.versionTag} (PRODUCTION), ${v4.versionTag} (APPROVED), ${v3.versionTag}, ${v1.versionTag}`);

  // 5. Create Sample User Session and Telemetry
  const session = await prisma.session.create({
    data: {
      userId: demoUser.id,
      modelVersionId: v2.id,
      goalsAttempted: 12,
      goalsCompleted: 11,
      avgFps: 59.4,
      telemetryEvents: {
        createMany: {
          data: [
            {
              eventType: "SESSION_STARTED",
              modelVersionId: v2.id,
              payloadJson: { client: "Three.js WebGL", platform: "Desktop" },
            },
            {
              eventType: "GOAL_COMPLETED",
              modelVersionId: v2.id,
              outcome: EpisodeOutcome.GOAL_REACHED,
              rewardAccumulated: 48.5,
              stepsTaken: 42,
              payloadJson: { goal: "collect_resource", seed: 42 },
            },
            {
              eventType: "GOAL_COMPLETED",
              modelVersionId: v2.id,
              outcome: EpisodeOutcome.GOAL_REACHED,
              rewardAccumulated: 52.0,
              stepsTaken: 38,
              payloadJson: { goal: "avoid_obstacle_and_collect", seed: 1042 },
            },
          ],
        },
      },
    },
  });

  // 6. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: admin.id,
        action: "MODEL_PUBLISHED",
        targetType: "ModelVersion",
        targetId: v2.id,
        details: {
          versionTag: "explorer_v2",
          reason: "Passed all 4 held-out robustness benchmarks (>84% success).",
        },
      },
      {
        actorId: admin.id,
        action: "SYSTEM_INITIALIZED",
        targetType: "Platform",
        targetId: "mindcraft-core",
        details: { database: "Neon PostgreSQL", releaseGate: "Automated Policy v1" },
      },
    ],
  });

  console.log("[+] Seeded Telemetry & Audit Logs successfully!");
  console.log("=================================================");
  console.log("  NEON DATABASE READY & SYNCHRONIZED  ");
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
