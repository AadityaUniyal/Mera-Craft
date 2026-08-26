"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Bot, 
  Cpu, 
  Sparkles, 
  ShieldCheck, 
  Swords, 
  Flame, 
  Zap, 
  Play, 
  Layers, 
  Activity, 
  CheckCircle2, 
  Box,
  Compass
} from "lucide-react";
import { soundSynth } from "@/lib/audio/sound-synth";

interface CharacterModel {
  id: string;
  name: string;
  callsign: string;
  role: string;
  icon: string;
  color: string;
  modelFile: string;
  description: string;
  trainingCurriculum: string;
  timestepsTrained: number;
  successRate: number;
  skills: {
    mining: number;
    bridging: number;
    combat: number;
    parkour: number;
    survival: number;
  };
  triggerLogic: string;
}

const CHARACTERS: CharacterModel[] = [
  {
    id: "steve_master",
    name: "Steve — Master Miner",
    callsign: "AGENT_MINER_V6",
    role: "Resource Extraction & Speedrun Economy",
    icon: "⛏️",
    color: "#0284c7",
    modelFile: "master_v6_minecraft",
    description: "Trained across 500,000 steps with GAE on full Minecraft crafting graphs. Automatically seeks wood, crafts pickaxes, mines iron, extracts diamonds, and delivers resources to the base hub.",
    trainingCurriculum: "Multi-Tier Speedrun Economy & Crafting Hierarchy",
    timestepsTrained: 500000,
    successRate: 96.8,
    skills: { mining: 98, bridging: 75, combat: 80, parkour: 85, survival: 94 },
    triggerLogic: "Detects diamond/ore proximity within 7.0m LiDAR cone -> activates mining strike -> navigates return trajectory to base hub upon full bag.",
  },
  {
    id: "alex_bridger",
    name: "Alex — Lava Bridger",
    callsign: "AGENT_BRIDGER_V6",
    role: "Lava/Water Hazard Traversal & Edge Protection",
    icon: "🧱",
    color: "#16a34a",
    modelFile: "master_v6_minecraft",
    description: "Specialized in hazardous terrain navigation. Uses sneak crouching to clamp position to block edges and executes precision block placement to build cobblestone skyways across lava chasms.",
    trainingCurriculum: "Lava Lake Bridging & Safe Sneak Clamping",
    timestepsTrained: 350000,
    successRate: 98.4,
    skills: { mining: 70, bridging: 99, combat: 65, parkour: 88, survival: 98 },
    triggerLogic: "When hazard ray detects lava/water in heading vector (<1.5m) -> initiates sneak mode -> places cobblestone block directly in front -> steps safely onto bridge.",
  },
  {
    id: "vanguard_hunter",
    name: "Vanguard — Creeper Hunter",
    callsign: "AGENT_COMBAT_V5",
    role: "Hostile Mob Defense & Tactical Evasion",
    icon: "🏹",
    color: "#a855f7",
    modelFile: "master_v5_pro",
    description: "Trained specifically for hostile night survival. Perceives Creeper threat vectors via 4-directional proximity sensors, maintaining a 3-block safety standoff radius while executing counter-strikes.",
    trainingCurriculum: "Night Creeper Proximity Tracking & Tactical Retreat",
    timestepsTrained: 400000,
    successRate: 94.2,
    skills: { mining: 60, bridging: 70, combat: 98, parkour: 80, survival: 96 },
    triggerLogic: "Perceives Creeper within 6.0m vector -> triggers sprint evasive turn if dist < 2.5m -> circles to blind spot -> strikes with diamond weapon.",
  },
  {
    id: "shadow_runner",
    name: "Shadow — Parkour Runner",
    callsign: "AGENT_PARKOUR_V5",
    role: "Precision Velocity Jumping & Mountain Ascent",
    icon: "⚡",
    color: "#fbbf24",
    modelFile: "master_v5_pro",
    description: "Optimized for maximum traversal speed and gap clearance. Calculates sprint momentum and executes synchronized 1-to-2 block parkour leaps across sheer mountain canyons.",
    trainingCurriculum: "Chasm Gap Precision Leaps & Vertical Ascent",
    timestepsTrained: 300000,
    successRate: 95.0,
    skills: { mining: 50, bridging: 80, combat: 60, parkour: 99, survival: 90 },
    triggerLogic: "Evaluates ground depth delta via forward LiDAR ray -> engages sprint acceleration 1 block before gap -> executes jump at exact block edge.",
  },
];

export default function CharactersPage() {
  const [activeBot, setActiveBot] = useState<CharacterModel>(CHARACTERS[0]);

  const handleSelect = (bot: CharacterModel) => {
    setActiveBot(bot);
    soundSynth.playBlockPlace();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-[#34d399]" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              TRAINED AI CHARACTER ROSTER
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            Individually trained PyTorch PPO neural policies &bull; Custom behavioral logic &bull; Live arena testing
          </p>
        </div>

        <Link
          href={`/demo?model=${activeBot.modelFile}`}
          className="mc-btn mc-btn-primary text-[10px]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>TEST {activeBot.name.toUpperCase()} IN ARENA</span>
        </Link>
      </div>

      {/* Character Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CHARACTERS.map((char) => {
          const isSelected = activeBot.id === char.id;
          return (
            <div
              key={char.id}
              onClick={() => handleSelect(char)}
              className={`mc-panel-stone p-4 space-y-3 cursor-pointer transition-all ${
                isSelected
                  ? "border-2 border-[#10b981] bg-[#10b981]/10 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                  : "hover:border-[#727e99]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-[#12151e] border-2 border-[#3b4458] flex items-center justify-center text-2xl shadow">
                    {char.icon}
                  </div>
                  <div>
                    <h3 className="font-pixel text-xs font-bold text-white">{char.name}</h3>
                    <span className="font-mono text-[10px] text-[#34d399]">{char.callsign}</span>
                  </div>
                </div>
              </div>

              <p className="font-mono text-[11px] text-[#94a3b8] leading-tight line-clamp-3">
                {char.description}
              </p>

              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                <div className="bg-[#12151e] p-1.5 border border-[#1e2330]">
                  <span className="text-[#64748b] block font-pixel text-[7px]">SUCCESS:</span>
                  <span className="text-[#34d399] font-bold">{char.successRate}%</span>
                </div>
                <div className="bg-[#12151e] p-1.5 border border-[#1e2330]">
                  <span className="text-[#64748b] block font-pixel text-[7px]">TRAINED:</span>
                  <span className="text-amber-400 font-bold">{(char.timestepsTrained / 1000).toFixed(0)}k</span>
                </div>
              </div>

              <div className="pt-2 border-t-2 border-[#141720]">
                <button
                  className={`mc-btn ${isSelected ? "mc-btn-primary" : "mc-btn-stone"} text-[8px] w-full py-1`}
                >
                  {isSelected ? "ACTIVE SELECTION" : "VIEW DETAILS"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep Character Specification Panel */}
      <div className="mc-panel-stone p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#141720] pb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{activeBot.icon}</span>
            <div>
              <h2 className="font-pixel text-base font-bold text-white">{activeBot.name}</h2>
              <span className="font-mono text-xs text-[#38bdf8]">{activeBot.role}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/demo?model=${activeBot.modelFile}`}
              className="mc-btn mc-btn-diamond text-[9px] px-3 py-1.5"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>SPAWN IN 3D SIMULATION</span>
            </Link>
          </div>
        </div>

        {/* Skill Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2 bg-[#12151e] p-4 border-2 border-[#1e2330]">
            <span className="font-pixel text-[9px] text-[#34d399] block mb-2">
              NEURAL SKILL POLAR MATRIX:
            </span>
            {Object.entries(activeBot.skills).map(([skill, val]) => (
              <div key={skill} className="space-y-0.5">
                <div className="flex justify-between font-pixel text-[8px] text-[#94a3b8] uppercase">
                  <span>{skill}:</span>
                  <span className="text-white font-mono">{val}%</span>
                </div>
                <div className="h-2 bg-[#0b0d13] border border-[#32394a] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#059669] to-[#34d399]"
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Trigger Logic & Mathematical Decision Flow */}
          <div className="space-y-3 bg-[#12151e] p-4 border-2 border-[#1e2330]">
            <span className="font-pixel text-[9px] text-amber-400 block">
              TRAINED MATHEMATICAL TRIGGER LOGIC:
            </span>
            <p className="font-mono text-xs text-slate-200 leading-relaxed bg-[#0b0d13] p-3 border border-[#32394a]">
              {activeBot.triggerLogic}
            </p>
            <div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-[#94a3b8]">
              <div>Curriculum: <span className="text-white">{activeBot.trainingCurriculum}</span></div>
              <div>Model Artifact: <span className="text-[#38bdf8]">{activeBot.modelFile}.onnx</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
