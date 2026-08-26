"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Trophy, 
  Swords, 
  Flame, 
  Moon, 
  Zap, 
  Mountain, 
  Play, 
  Sparkles, 
  RefreshCw 
} from "lucide-react";
import { soundSynth } from "@/lib/audio/sound-synth";

interface ChallengeData {
  id: string;
  slug: string;
  title: string;
  description: string;
  challengeType: string;
  difficulty: string;
  parTimeSeconds: number;
  targetScore: number;
  arenaLevel: number;
}

const STATIC_CHALLENGES: ChallengeData[] = [
  {
    id: "ch_parkour",
    slug: "parkour-chasm",
    title: "1. Precision Parkour Gap",
    description: "Navigate 2-block gap leaps over void chasms. Requires sprint acceleration and timing jump momentum.",
    challengeType: "PARKOUR_CHASM",
    difficulty: "Medium",
    parTimeSeconds: 15,
    targetScore: 45,
    arenaLevel: 0,
  },
  {
    id: "ch_bridging",
    slug: "lava-bridging",
    title: "2. Lava Lake Bridging",
    description: "Safely cross a boiling lava lake using crouch edge protection and placing cobblestone bridge blocks.",
    challengeType: "LAVA_BRIDGING",
    difficulty: "Hard",
    parTimeSeconds: 25,
    targetScore: 60,
    arenaLevel: 1,
  },
  {
    id: "ch_water",
    slug: "water-island",
    title: "3. Water River Diamond Island",
    description: "Cross rapid water rivers without drowning to extract isolated diamond ore veins.",
    challengeType: "WATER_RIVER",
    difficulty: "Medium",
    parTimeSeconds: 20,
    targetScore: 50,
    arenaLevel: 2,
  },
  {
    id: "ch_night",
    slug: "night-creeper",
    title: "4. Night Creeper Survival",
    description: "Survive the pitch black night while an aggressive Creeper tracks your position in real-time.",
    challengeType: "NIGHT_SURVIVAL",
    difficulty: "Extreme",
    parTimeSeconds: 30,
    targetScore: 80,
    arenaLevel: 3,
  },
  {
    id: "ch_economy",
    slug: "speedrun-economy",
    title: "5. Diamond Speedrun Economy",
    description: "Complete full Minecraft progression: harvest oak wood, craft tools, mine iron, extract diamond, and deliver to depot.",
    challengeType: "SPEEDRUN_ECONOMY",
    difficulty: "Master",
    parTimeSeconds: 40,
    targetScore: 100,
    arenaLevel: 4,
  },
];

export default function ChallengesPage() {
  const [challenges] = useState<ChallengeData[]>(STATIC_CHALLENGES);

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case "PARKOUR_CHASM": return <Zap className="w-5 h-5 text-amber-400" />;
      case "LAVA_BRIDGING": return <Flame className="w-5 h-5 text-rose-400" />;
      case "WATER_RIVER": return <Sparkles className="w-5 h-5 text-[#38bdf8]" />;
      case "NIGHT_SURVIVAL": return <Moon className="w-5 h-5 text-purple-400" />;
      case "SPEEDRUN_ECONOMY": return <Trophy className="w-5 h-5 text-[#34d399]" />;
      default: return <Swords className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Swords className="w-5 h-5 text-[#fbbf24]" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              MINECRAFT CURRICULUM ARENAS
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            5 distinct procedural training arenas designed to evaluate navigation, bridging, combat, and economy
          </p>
        </div>

        <Link
          href="/demo"
          className="mc-btn mc-btn-primary text-[10px]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>OPEN 3D VOXEL LAB</span>
        </Link>
      </div>

      {/* Challenges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {challenges.map((ch) => (
          <div
            key={ch.id}
            className="mc-panel-stone p-5 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="p-2 bg-[#12151e] border-2 border-[#3b4458]">
                  {getChallengeIcon(ch.challengeType)}
                </div>
                <span className={`font-pixel text-[8px] py-0.5 px-1.5 font-bold uppercase ${
                  ch.difficulty === "Master" || ch.difficulty === "Extreme"
                    ? "mc-btn mc-btn-danger"
                    : ch.difficulty === "Hard"
                    ? "mc-btn mc-btn-gold"
                    : "mc-btn mc-btn-primary"
                }`}>
                  {ch.difficulty}
                </span>
              </div>

              <div>
                <h3 className="font-pixel text-xs font-bold text-white leading-snug">{ch.title}</h3>
                <p className="font-mono text-[11px] text-[#94a3b8] mt-1 leading-relaxed">{ch.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="bg-[#12151e] p-2 border border-[#1e2330] text-center">
                  <span className="text-[#64748b] block font-pixel text-[8px]">PAR TIME</span>
                  <div className="text-white font-bold mt-0.5">{ch.parTimeSeconds}s</div>
                </div>
                <div className="bg-[#12151e] p-2 border border-[#1e2330] text-center">
                  <span className="text-[#64748b] block font-pixel text-[8px]">TARGET PTS</span>
                  <div className="text-[#fbbf24] font-bold mt-0.5">+{ch.targetScore}</div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t-2 border-[#141720]">
              <Link
                href={`/demo?challenge=${ch.arenaLevel}`}
                onClick={() => soundSynth.playDiamondChime()}
                className="mc-btn mc-btn-primary text-[9px] w-full py-2 flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current text-black" />
                <span>LAUNCH ARENA STAGE {ch.arenaLevel + 1}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
