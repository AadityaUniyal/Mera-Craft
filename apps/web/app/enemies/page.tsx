"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Skull, 
  Flame, 
  Moon, 
  ShieldAlert, 
  Swords, 
  Play, 
  Activity, 
  Target, 
  Eye,
  AlertTriangle
} from "lucide-react";
import { soundSynth } from "@/lib/audio/sound-synth";

interface EnemyData {
  id: string;
  name: string;
  type: string;
  icon: string;
  threatLevel: "EXTREME" | "HIGH" | "MEDIUM";
  detectionRadius: string;
  attackDistance: string;
  damageValue: string;
  sunlightVulnerable: boolean;
  behaviorLogic: string;
  aiDefenseStrategy: string;
  spawnCode: number;
}

const ENEMIES: EnemyData[] = [
  {
    id: "creeper",
    name: "Creeper",
    type: "Silent Explosive Stalker",
    icon: "💥",
    threatLevel: "EXTREME",
    detectionRadius: "7.0 meters (LiDAR Ray hit)",
    attackDistance: "1.3 meters (Fuse Trigger)",
    damageValue: "-50.0 HP (Lethal Blast)",
    sunlightVulnerable: false,
    behaviorLogic: "Perceives player coordinates -> silently pathfinds along shortest Euclidean path -> begins 1.5s hiss fuse countdown upon entering 1.3m radius -> detonates.",
    aiDefenseStrategy: "AI senses proximity vector (obs[20..23]) -> executes immediate 180° sprint retreat -> maintains >3.0m standoff -> strikes when fuse resets.",
    spawnCode: 2,
  },
  {
    id: "zombie",
    name: "Zombie",
    type: "Melee Swarm Aggressor",
    icon: "🧟",
    threatLevel: "MEDIUM",
    detectionRadius: "10.0 meters",
    attackDistance: "1.2 meters (Melee Swipe)",
    damageValue: "-15.0 HP per hit",
    sunlightVulnerable: true,
    behaviorLogic: "Relentless direct line-of-sight tracking -> ignores obstacles up to 1 block high -> catches fire and takes burn damage during daytime phase.",
    aiDefenseStrategy: "AI navigates obstacles to create elevation choke points -> executes jump-strike to deal critical damage while staying out of melee range.",
    spawnCode: 3,
  },
  {
    id: "skeleton",
    name: "Skeleton Archer",
    type: "Ranged Trajectory Sniper",
    icon: "🏹",
    threatLevel: "HIGH",
    detectionRadius: "12.0 meters (Raycast Vision)",
    attackDistance: "15.0 meters (Arrow Projectile)",
    damageValue: "-20.0 HP per arrow",
    sunlightVulnerable: true,
    behaviorLogic: "Calculates lead angle and projectile arc -> fires arrows at 18m/s -> strategically retreats if target approaches within 3.5m.",
    aiDefenseStrategy: "AI performs zig-zag sprint evasion to break aim line -> places stone block cover -> closes distance rapidly between arrow reloads.",
    spawnCode: 4,
  },
  {
    id: "spider",
    name: "Cave Spider",
    type: "Wall Climber & Chasm Leaper",
    icon: "🕷️",
    threatLevel: "HIGH",
    detectionRadius: "8.0 meters (Wall-piercing)",
    attackDistance: "3.5 meters (Pounce Jump)",
    damageValue: "-18.0 HP + Poison",
    sunlightVulnerable: false,
    behaviorLogic: "Climbs vertical stone walls without penalty -> executes 3.5m pounce jumps across lava or water chasms -> inflicts poison effect.",
    aiDefenseStrategy: "AI avoids standing near cliff ledges -> uses sweeping weapon attacks at apex of spider leap -> creates 2-block overhang barriers.",
    spawnCode: 5,
  },
];

export default function EnemiesPage() {
  const [selectedEnemy, setSelectedEnemy] = useState<EnemyData>(ENEMIES[0]);

  const handleSelect = (enemy: EnemyData) => {
    setSelectedEnemy(enemy);
    if (enemy.id === "creeper") soundSynth.playCreeperHiss();
    else soundSynth.playBlockBreak();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Skull className="w-5 h-5 text-rose-500" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              HOSTILE MOB BESTIARY & AI TRIGGER LAB
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            Mathematical proximity trigger thresholds &bull; Mob pathfinding algorithms &bull; AI counter-strategies
          </p>
        </div>

        <Link
          href={`/demo?challenge=2`}
          className="mc-btn mc-btn-danger text-[10px]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>SPAWN {selectedEnemy.name.toUpperCase()} IN 3D ARENA</span>
        </Link>
      </div>

      {/* Enemies Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ENEMIES.map((mob) => {
          const isSelected = selectedEnemy.id === mob.id;
          return (
            <div
              key={mob.id}
              onClick={() => handleSelect(mob)}
              className={`mc-panel-stone p-4 space-y-3 cursor-pointer transition-all ${
                isSelected
                  ? "border-2 border-red-500 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "hover:border-[#727e99]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{mob.icon}</span>
                  <div>
                    <h3 className="font-pixel text-xs font-bold text-white">{mob.name}</h3>
                    <span className="font-mono text-[9px] text-[#94a3b8]">{mob.type}</span>
                  </div>
                </div>
                <span className={`font-pixel text-[7px] py-0.5 px-1 ${
                  mob.threatLevel === "EXTREME" ? "bg-red-500 text-black font-bold" :
                  mob.threatLevel === "HIGH" ? "bg-orange-500 text-black font-bold" :
                  "bg-amber-500 text-black font-bold"
                }`}>
                  {mob.threatLevel}
                </span>
              </div>

              <div className="space-y-1 font-mono text-[10px] bg-[#12151e] p-2 border border-[#1e2330]">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Detection:</span>
                  <span className="text-white font-bold">{mob.detectionRadius.split(" ")[0]}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Attack Trigger:</span>
                  <span className="text-rose-400 font-bold">{mob.attackDistance.split(" ")[0]}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Sunlight Burn:</span>
                  <span className={mob.sunlightVulnerable ? "text-[#34d399]" : "text-amber-400"}>
                    {mob.sunlightVulnerable ? "YES" : "IMMUNE"}
                  </span>
                </div>
              </div>

              <button
                className={`mc-btn ${isSelected ? "mc-btn-danger" : "mc-btn-stone"} text-[8px] w-full py-1`}
              >
                {isSelected ? "ACTIVE INSPECTION" : "INSPECT MOB"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected Enemy In-Depth Intelligence */}
      <div className="mc-panel-stone p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#141720] pb-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{selectedEnemy.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-pixel text-lg font-bold text-white">{selectedEnemy.name}</h2>
                <span className="mc-btn mc-btn-danger text-[8px] py-0.5 px-1.5 font-bold">
                  THREAT: {selectedEnemy.threatLevel}
                </span>
              </div>
              <span className="font-mono text-xs text-[#94a3b8]">{selectedEnemy.type}</span>
            </div>
          </div>

          <Link
            href={`/demo?challenge=2`}
            className="mc-btn mc-btn-primary text-[9px] px-3 py-1.5"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>TEST AI EVASION VS {selectedEnemy.name.toUpperCase()}</span>
          </Link>
        </div>

        {/* Intelligence Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3 bg-[#12151e] p-4 border-2 border-[#1e2330]">
            <span className="font-pixel text-[9px] text-rose-400 block flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>MOB PATHFINDING & PROXIMITY TRIGGER LOGIC:</span>
            </span>
            <p className="font-mono text-xs text-slate-200 leading-relaxed bg-[#0b0d13] p-3 border border-[#32394a]">
              {selectedEnemy.behaviorLogic}
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-[#94a3b8]">
              <div>Detection Cone: <span className="text-white">{selectedEnemy.detectionRadius}</span></div>
              <div>Max Blast/Hit: <span className="text-rose-400 font-bold">{selectedEnemy.damageValue}</span></div>
            </div>
          </div>

          <div className="space-y-3 bg-[#12151e] p-4 border-2 border-[#1e2330]">
            <span className="font-pixel text-[9px] text-[#34d399] block flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>OUR TRAINED NEURAL NETWORK COUNTER-TACTIC:</span>
            </span>
            <p className="font-mono text-xs text-slate-200 leading-relaxed bg-[#0b0d13] p-3 border border-[#32394a]">
              {selectedEnemy.aiDefenseStrategy}
            </p>
            <div className="font-mono text-[10px] text-[#94a3b8]">
              Perception Sensors: <span className="text-[#38bdf8]">LiDAR obs[20..23] Threat Proximity</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
