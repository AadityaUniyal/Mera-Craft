"use client";

import React, { useState, useEffect } from "react";
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
  Compass,
  Hammer,
  Shield,
  Heart
} from "lucide-react";

interface CharacterProfile {
  slug: string;
  name: string;
  role: string;
  badge: string;
  icon: string;
  color: string;
  curiosity: number;
  riskTolerance: number;
  activeModel: string;
  successRate: number;
  description: string;
  priorityTask: string;
  skills: { name: string; proficiency: number }[];
  trainingMethod: string;
}

const CHARACTERS: CharacterProfile[] = [
  {
    slug: "explorer",
    name: "Explorer",
    role: "Autonomous Scout & River Crosser",
    badge: "CURRICULUM PPO + CURIOSITY",
    icon: "🧭",
    color: "from-cyan-500 to-blue-600",
    curiosity: 0.95,
    riskTolerance: 0.60,
    activeModel: "explorer_v2.onnx",
    successRate: 88.5,
    description: "Trained through 6 curriculum levels to explore procedurally varied terrain, avoid lava hazards, navigate arbitrary river widths (3 to 6 blocks), and reach remote diamond nodes.",
    priorityTask: "Discover new territory, cross rivers safely, and return to base",
    skills: [
      { name: "River Crossing (Water Evasion)", proficiency: 92 },
      { name: "Lava Hazard Proximity Routing", proficiency: 95 },
      { name: "Mountain Cliff Escalation", proficiency: 88 },
      { name: "Intrinsic Map Discovery", proficiency: 96 },
    ],
    trainingMethod: "PPO with Generalized Advantage Estimation & Intrinsic Curiosity Module (ICM)",
  },
  {
    slug: "guardian",
    name: "Guardian",
    role: "Tactical Base & Target Defender",
    badge: "THREAT INTERCEPTION PPO",
    icon: "🛡️",
    color: "from-purple-500 to-indigo-600",
    curiosity: 0.15,
    riskTolerance: 0.90,
    activeModel: "guardian_v1.onnx",
    successRate: 91.2,
    description: "Specialized in perimeter defense and threat interception. Calculates lead angles on approaching hostile Creepers and sprints to eliminate threats before base penetration.",
    priorityTask: "Protect player and Base Hub from hostile intruders, eliminate Creepers",
    skills: [
      { name: "Threat Lead-Angle Interception", proficiency: 95 },
      { name: "Base Perimeter Station Holding", proficiency: 94 },
      { name: "Sprinting Pursuit Dash", proficiency: 92 },
      { name: "Tactical Tactical Retreat & Recovery", proficiency: 86 },
    ],
    trainingMethod: "Multi-Agent Threat Simulation PPO with Proximity Reward Delta Shaping",
  },
  {
    slug: "builder",
    name: "Builder",
    role: "Structural Engineer & Chasm Bridger",
    badge: "IMITATION LEARNING + PPO",
    icon: "🧱",
    color: "from-amber-500 to-orange-600",
    curiosity: 0.40,
    riskTolerance: 0.20,
    activeModel: "builder_v1.onnx",
    successRate: 86.4,
    description: "Trained using Behavioral Cloning from expert bridging demonstrations followed by PPO fine-tuning. Automatically sneaks to ledge edges and places cobblestone blocks to build bridges across rivers.",
    priorityTask: "Construct bridges over rivers/chasms and erect defensive structures efficiently",
    skills: [
      { name: "Safe Edge Sneak Bridging", proficiency: 94 },
      { name: "Chasm Span Construction", proficiency: 88 },
      { name: "Defensive Wall Erection", proficiency: 85 },
      { name: "Material Efficiency Optimization", proficiency: 90 },
    ],
    trainingMethod: "Behavioral Cloning (Expert Demonstrations) + PPO Fine-Tuning",
  },
  {
    slug: "survivor",
    name: "Survivor",
    role: "Full Speedrun Economy Specialist",
    badge: "10-ACTION MASTER RL",
    icon: "💎",
    color: "from-emerald-500 to-teal-600",
    curiosity: 0.70,
    riskTolerance: 0.40,
    activeModel: "master_v6_minecraft.onnx",
    successRate: 85.0,
    description: "Master multi-task policy executing the full Minecraft economy loop: chop Oak Wood -> craft Pickaxe -> mine Iron & Diamond -> manage Health & Hunger -> deposit at Base Hub before nightfall.",
    priorityTask: "Manage health & stamina, harvest economic progression, deposit at Base",
    skills: [
      { name: "Hierarchical Crafting Graph", proficiency: 92 },
      { name: "Health & Hunger Management", proficiency: 90 },
      { name: "Multi-Tier Mining Progression", proficiency: 89 },
      { name: "Base Hub Resource Deposit", proficiency: 94 },
    ],
    trainingMethod: "Hierarchical Multi-Task PPO across 5 Diverse Challenge Scenarios",
  },
];

export default function CharactersPage() {
  const [selectedChar, setSelectedChar] = useState<CharacterProfile>(CHARACTERS[0]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2 border-b border-slate-800 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono text-xs font-bold">
            <Bot className="w-3.5 h-3.5" />
            <span>AI CHARACTERS & SPECIALIZED ROLES</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white">
            Embodied Character Intelligence Roster
          </h1>
          <p className="text-sm text-slate-400 max-w-3xl">
            Each AI character possesses a unique DNA profile, distinct reward priorities, specialized curriculum, and active model version.
          </p>
        </div>

        {/* Character Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CHARACTERS.map((c) => {
            const isSelected = selectedChar.slug === c.slug;
            return (
              <button
                key={c.slug}
                onClick={() => setSelectedChar(c)}
                className={`p-5 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                  isSelected
                    ? "bg-slate-900 border-white shadow-xl shadow-slate-900/80 ring-1 ring-white/50"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700 opacity-80"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{c.icon}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 font-mono text-[10px] font-bold text-emerald-400 border border-slate-800">
                      {c.successRate}% WIN
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-3">{c.name}</h3>
                  <div className="text-xs text-slate-400 font-mono">{c.role}</div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span>Model:</span>
                  <span className="text-slate-300 font-bold">{c.activeModel}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detailed Character DNA Profile Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md">
          {/* Left Column: Personality, Curiosity & Priorities */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow-md">
                {selectedChar.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold font-mono text-white">{selectedChar.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold uppercase">
                  {selectedChar.badge}
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedChar.description}
            </p>

            <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs">
              <span className="text-slate-400 font-bold uppercase text-[11px]">Character DNA Attributes:</span>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Curiosity & Exploration Weight:</span>
                  <span className="text-cyan-400 font-bold">{(selectedChar.curiosity * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${selectedChar.curiosity * 100}%` }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span>Combat & Risk Tolerance:</span>
                  <span className="text-purple-400 font-bold">{(selectedChar.riskTolerance * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div className="h-full bg-purple-400 rounded-full" style={{ width: `${selectedChar.riskTolerance * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-1">
              <span className="text-slate-500 text-[10px] font-bold uppercase">Primary Directive:</span>
              <div className="text-white font-bold">{selectedChar.priorityTask}</div>
            </div>
          </div>

          {/* Right Column: Skills Library & Model Info */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 font-mono space-y-4">
              <span className="text-slate-400 font-bold uppercase text-xs">Specialized Skills Library:</span>

              <div className="space-y-3">
                {selectedChar.skills.map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-200">{s.name}</span>
                      <span className="text-emerald-400 font-bold">{s.proficiency}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.proficiency}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs space-y-2">
              <span className="text-slate-500 text-[10px] font-bold uppercase">Training Methodology:</span>
              <div className="text-slate-300 text-xs">{selectedChar.trainingMethod}</div>
              <div className="pt-2 flex items-center justify-between border-t border-slate-900 text-slate-400">
                <span>Active Artifact:</span>
                <span className="text-white font-bold">/models/{selectedChar.activeModel}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/demo"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs shadow-md shadow-emerald-500/20 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Simulate {selectedChar.name} in 3D Lab</span>
              </Link>

              <Link
                href="/signature-demo"
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs border border-slate-700 transition"
              >
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Signature Benchmark</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
