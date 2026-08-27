// MINDCRAFT — Complete Database Seeder for Neon PostgreSQL
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("=================================================");
  console.log("  SEEDING NEON POSTGRESQL FOR MINDCRAFT (v6 PRO) ");
  console.log("=================================================");

  // 1. Create Users with Bcrypt Hashing
  const adminPasswordHash = await bcrypt.hash("AdminPassword2026!", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@mindcraft.ai" },
    update: {},
    create: {
      email: "admin@mindcraft.ai",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      profile: {
        create: {
          displayName: "Mindcraft Admin & ML Lead",
        },
      },
    },
  });

  const demoPasswordHash = await bcrypt.hash("DemoPlayer2026!", 10);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@mindcraft.ai" },
    update: {},
    create: {
      email: "demo@mindcraft.ai",
      passwordHash: demoPasswordHash,
      role: "USER",
      profile: {
        create: {
          displayName: "Steve Navigator",
        },
      },
    },
  });

  // 2. Create Persistent Game Profiles & Game IDs
  await prisma.gameProfile.upsert({
    where: { gameId: "GAME-ADMIN-001" },
    update: {},
    create: {
      gameId: "GAME-ADMIN-001",
      userId: adminUser.id,
      worldSeed: 1337,
      level: 10,
      experiencePts: 4850,
      totalPlayTimeSec: 12400,
      playerX: 2.5,
      playerY: 0.0,
      playerZ: 2.5,
      inventoryJson: { wood: 12, stone: 24, iron: 8, diamond: 4, cobble: 64 },
    },
  });

  await prisma.gameProfile.upsert({
    where: { gameId: "GAME-7842-MC" },
    update: {},
    create: {
      gameId: "GAME-7842-MC",
      userId: demoUser.id,
      worldSeed: 42,
      level: 3,
      experiencePts: 850,
      totalPlayTimeSec: 3600,
      playerX: 4.5,
      playerY: 0.0,
      playerZ: 4.5,
      inventoryJson: { wood: 4, stone: 8, iron: 2, diamond: 1, cobble: 16 },
    },
  });
  console.log(`[+] Created Users & Persistent Game IDs: [GAME-ADMIN-001, GAME-7842-MC]`);

  // 3. Create the 4 Specialized AI Characters
  const explorerChar = await prisma.character.upsert({
    where: { slug: "explorer" },
    update: {},
    create: {
      slug: "explorer",
      name: "Explorer",
      role: "EXPLORER",
      description: "Autonomous scout trained via PPO & intrinsic curiosity to navigate terrain, avoid lava hazards, cross rivers, and discover new resource nodes.",
      curiosity: 0.95,
      riskTolerance: 0.60,
      priorityTask: "Discover new regions, reach exploration targets, and cross rivers safely",
      rewardWeightsJson: { discovery: 10.0, target_reach: 20.0, safe_return: 5.0, hazard_penalty: -25.0 },
    },
  });

  const guardianChar = await prisma.character.upsert({
    where: { slug: "guardian" },
    update: {},
    create: {
      slug: "guardian",
      name: "Guardian",
      role: "GUARDIAN",
      description: "Tactical defender trained via PPO to protect player and base hub, detect and intercept hostile Creepers, and eliminate threats before breach.",
      curiosity: 0.15,
      riskTolerance: 0.90,
      priorityTask: "Protect target & base from incoming threats, intercept hostile Creepers",
      rewardWeightsJson: { target_protected: 20.0, enemy_defeated: 15.0, threat_intercept: 10.0, base_damage: -30.0 },
    },
  });

  const builderChar = await prisma.character.upsert({
    where: { slug: "builder" },
    update: {},
    create: {
      slug: "builder",
      name: "Builder",
      role: "BUILDER",
      description: "Structural engineer trained via Behavioral Cloning from expert demonstrations followed by PPO fine-tuning to construct bridges and defensive walls.",
      curiosity: 0.40,
      riskTolerance: 0.20,
      priorityTask: "Construct bridges over rivers/chasms and erect defensive structures efficiently",
      rewardWeightsJson: { block_placed: 5.0, bridge_complete: 50.0, material_waste: -2.0, fall_penalty: -20.0 },
    },
  });

  const survivorChar = await prisma.character.upsert({
    where: { slug: "survivor" },
    update: {},
    create: {
      slug: "survivor",
      name: "Survivor",
      role: "SURVIVOR",
      description: "Survival specialist trained to harvest wood/stone/iron/diamond economy, manage health & hunger, and deposit resources at the Base Hub.",
      curiosity: 0.70,
      riskTolerance: 0.40,
      priorityTask: "Manage health & stamina, harvest resource progression, return safely to Base",
      rewardWeightsJson: { harvest_wood: 7.0, harvest_iron: 11.0, harvest_diamond: 18.0, deposit_base: 30.0 },
    },
  });
  console.log(`[+] Created AI Characters: [Explorer, Guardian, Builder, Survivor]`);

  // 4. Create Skills Library
  const skillsData = [
    { slug: "cross_river", name: "River Crossing", description: "Navigates across water/chasm hazards safely without drowning or falling", preconditions: "Water or river present in trajectory" },
    { slug: "avoid_lava", name: "Lava Hazard Evasion", description: "Detects thermal proximity and routes around molten rock", preconditions: "Lava sensor > 0.3" },
    { slug: "climb_mountain", name: "Mountain Escalation", description: "Performs parkour leaps and step-ups over elevation changes", preconditions: "Vertical elevation > 1.0" },
    { slug: "intercept_threat", name: "Threat Interception", description: "Calculates lead angle and sprints to intercept incoming hostiles", preconditions: "Hostile within 8 blocks" },
    { slug: "defend_base", name: "Base Perimeter Defense", description: "Holds station around the Base Hub and eliminates approaching threats", preconditions: "Enemy distance to base < 6" },
    { slug: "build_bridge", name: "Chasm Bridging", description: "Places cobblestone blocks ahead while sneaking to span rivers", preconditions: "Gap in front, placeable blocks > 0" },
    { slug: "build_wall", name: "Defensive Wall", description: "Stacks 2-block high barrier to block enemy pathfinding", preconditions: "Threat approaching base" },
    { slug: "gather_economy", name: "Resource Harvesting", description: "Sequentially harvests Wood -> Crafts Pickaxe -> Mines Iron & Diamond", preconditions: "Uncollected resources present" },
  ];

  for (const s of skillsData) {
    const createdSkill = await prisma.skill.upsert({
      where: { slug: s.slug },
      update: {},
      create: s,
    });
    if (["cross_river", "avoid_lava", "climb_mountain"].includes(s.slug)) {
      await prisma.characterSkill.upsert({
        where: { characterId_skillId: { characterId: explorerChar.id, skillId: createdSkill.id } },
        update: {},
        create: { characterId: explorerChar.id, skillId: createdSkill.id, proficiency: 0.92 },
      });
    }
    if (["intercept_threat", "defend_base"].includes(s.slug)) {
      await prisma.characterSkill.upsert({
        where: { characterId_skillId: { characterId: guardianChar.id, skillId: createdSkill.id } },
        update: {},
        create: { characterId: guardianChar.id, skillId: createdSkill.id, proficiency: 0.95 },
      });
    }
    if (["build_bridge", "build_wall"].includes(s.slug)) {
      await prisma.characterSkill.upsert({
        where: { characterId_skillId: { characterId: builderChar.id, skillId: createdSkill.id } },
        update: {},
        create: { characterId: builderChar.id, skillId: createdSkill.id, proficiency: 0.88 },
      });
    }
    if (["gather_economy", "avoid_lava"].includes(s.slug)) {
      await prisma.characterSkill.upsert({
        where: { characterId_skillId: { characterId: survivorChar.id, skillId: createdSkill.id } },
        update: {},
        create: { characterId: survivorChar.id, skillId: createdSkill.id, proficiency: 0.90 },
      });
    }
  }
  console.log(`[+] Seeded Skills Library & Character Associations`);

  // 5. Create Model Versions
  const explorerV1 = await prisma.modelVersion.upsert({
    where: { characterId_versionTag: { characterId: explorerChar.id, versionTag: "explorer_v1_baseline" } },
    update: {},
    create: {
      characterId: explorerChar.id,
      versionTag: "explorer_v1_baseline",
      artifactUri: "/models/explorer_v1.onnx",
      modelHashSha256: "explorer_v1_baseline_2026",
      status: "RETIRED",
      fileSizeKb: 142.5,
      canaryPercent: 0,
      publishedAt: new Date(Date.now() - 86400000 * 7),
      retiredAt: new Date(Date.now() - 86400000 * 2),
    },
  });

  const explorerV2 = await prisma.modelVersion.upsert({
    where: { characterId_versionTag: { characterId: explorerChar.id, versionTag: "explorer_v2" } },
    update: {},
    create: {
      characterId: explorerChar.id,
      versionTag: "explorer_v2",
      artifactUri: "/models/explorer_v2.onnx",
      modelHashSha256: "explorer_v2_curriculum_2026",
      status: "ACTIVE",
      fileSizeKb: 145.2,
      canaryPercent: 100,
      publishedAt: new Date(),
    },
  });

  const guardianV1 = await prisma.modelVersion.upsert({
    where: { characterId_versionTag: { characterId: guardianChar.id, versionTag: "guardian_v1" } },
    update: {},
    create: {
      characterId: guardianChar.id,
      versionTag: "guardian_v1",
      artifactUri: "/models/guardian_v1.onnx",
      modelHashSha256: "guardian_v1_threat_intercept_2026",
      status: "ACTIVE",
      fileSizeKb: 152.0,
      canaryPercent: 100,
      publishedAt: new Date(),
    },
  });

  const builderV1 = await prisma.modelVersion.upsert({
    where: { characterId_versionTag: { characterId: builderChar.id, versionTag: "builder_v1" } },
    update: {},
    create: {
      characterId: builderChar.id,
      versionTag: "builder_v1",
      artifactUri: "/models/builder_v1.onnx",
      modelHashSha256: "builder_v1_imitation_ppo_2026",
      status: "ACTIVE",
      fileSizeKb: 148.8,
      canaryPercent: 100,
      publishedAt: new Date(),
    },
  });

  const masterV6 = await prisma.modelVersion.upsert({
    where: { characterId_versionTag: { characterId: survivorChar.id, versionTag: "master_v6_minecraft" } },
    update: {},
    create: {
      characterId: survivorChar.id,
      versionTag: "master_v6_minecraft",
      artifactUri: "/models/master_v6_minecraft.onnx",
      modelHashSha256: "master_v6_minecraft_full_loop_2026",
      status: "ACTIVE",
      fileSizeKb: 164.4,
      canaryPercent: 100,
      publishedAt: new Date(),
    },
  });
  console.log(`[+] Seeded Model Registry with Character Model Versions`);

  // 6. Create Training Runs & Benchmark Evaluations
  await prisma.trainingRun.create({
    data: {
      modelVersionId: explorerV2.id,
      algorithm: "Curriculum PPO + Intrinsic Curiosity (ICM)",
      environmentVersion: "v6-32x32-procedural-river",
      rewardVersion: "v6-explorer-potential-shaping",
      hyperparametersJson: { lr: 0.0003, gamma: 0.99, gae_lambda: 0.95, clip_range: 0.2, entropy_coef: 0.015, batch_size: 1024 },
      timestepsTrained: 180000,
      peakReward: 38.6,
    },
  });

  await prisma.trainingRun.create({
    data: {
      modelVersionId: builderV1.id,
      algorithm: "Behavioral Cloning (100 Expert Trajectories) + PPO Fine-Tuning",
      environmentVersion: "v6-32x32-chasm-bridging",
      rewardVersion: "v6-builder-efficiency",
      hyperparametersJson: { bc_epochs: 25, ppo_lr: 0.0002, clip_range: 0.15, batch_size: 512 },
      timestepsTrained: 120000,
      peakReward: 46.2,
    },
  });

  await prisma.evaluation.create({
    data: {
      modelVersionId: explorerV1.id,
      scenario: "Unseen Procedural River Scenarios (50 Held-Out Maps)",
      heldOutSeedsCount: 50,
      successRatePercent: 42.0,
      generalizationScore: 0.38,
      meanEpisodeReward: -4.2,
      meanEpisodeSteps: 180.0,
      avgInferenceLatencyMs: 0.98,
      passedReleaseGate: false,
      isChampionVsCandidate: false,
    },
  });

  await prisma.evaluation.create({
    data: {
      modelVersionId: explorerV2.id,
      scenario: "Unseen Procedural River Scenarios (50 Held-Out Maps)",
      heldOutSeedsCount: 50,
      successRatePercent: 88.5,
      generalizationScore: 0.89,
      meanEpisodeReward: 28.4,
      meanEpisodeSteps: 44.2,
      avgInferenceLatencyMs: 1.02,
      passedReleaseGate: true,
      isChampionVsCandidate: true,
    },
  });

  await prisma.evaluation.create({
    data: {
      modelVersionId: guardianV1.id,
      scenario: "Adversarial Creeper Interception (30 Held-Out Seeds)",
      heldOutSeedsCount: 30,
      successRatePercent: 91.2,
      generalizationScore: 0.92,
      meanEpisodeReward: 32.1,
      meanEpisodeSteps: 28.6,
      avgInferenceLatencyMs: 1.05,
      passedReleaseGate: true,
      isChampionVsCandidate: true,
    },
  });

  await prisma.evaluation.create({
    data: {
      modelVersionId: builderV1.id,
      scenario: "Variable Width Chasm Bridging (30 Held-Out Seeds)",
      heldOutSeedsCount: 30,
      successRatePercent: 86.4,
      generalizationScore: 0.87,
      meanEpisodeReward: 42.8,
      meanEpisodeSteps: 34.0,
      avgInferenceLatencyMs: 1.01,
      passedReleaseGate: true,
      isChampionVsCandidate: true,
    },
  });
  console.log(`[+] Seeded Training Runs & Unseen Scenario Benchmark Evaluations`);

  // 7. Seed Datasets & Audit Logs
  await prisma.dataset.upsert({
    where: { versionTag: "dataset_v1_approved" },
    update: {},
    create: {
      versionTag: "dataset_v1_approved",
      description: "Approved high-quality telemetry experiences filtered for valid states, non-spam trajectories, and goal completions.",
      approvedEvents: 1420,
      totalEpisodes: 85,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: adminUser.id,
      action: "MODEL_PROMOTED",
      targetType: "ModelVersion",
      targetId: explorerV2.id,
      details: { versionTag: "explorer_v2", reason: "Exceeded 85% success on 50 unseen river scenarios without critical regressions" },
    },
  });
  console.log(`[+] Seeded Approved Datasets & System Audit Logs`);

  console.log("=================================================");
  console.log("  NEON DATABASE SEEDING COMPLETED SUCCESSFULLY  ");
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
