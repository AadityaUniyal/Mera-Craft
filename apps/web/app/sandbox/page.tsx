"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import VoxelCanvas, { InteractionMode } from "@/components/voxel/VoxelCanvas";
import { SpatialRadar } from "@/components/game/SpatialRadar";
import { VoiceCommander } from "@/components/game/VoiceCommander";
import {
  Paintbrush,
  Flame,
  Droplets,
  Gem,
  TreePine,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { soundFx } from "@/lib/audio-synthesizer";

export default function SandboxPage() {
  const [selectedBrush, setSelectedBrush] = useState<InteractionMode>("place_obstacle");
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([2.5, 0.0, 2.5]);
  const [playerYaw, setPlayerYaw] = useState<number>(0.0);
  const [activeAction, setActiveAction] = useState<string>("Walk Forward");
  const [confidence, setConfidence] = useState<number>(95.4);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [seed, setSeed] = useState<number>(42);
  const [stepTrigger, setStepTrigger] = useState<number>(0);

  const brushes: { id: InteractionMode; name: string; icon: any; color: string }[] = [
    { id: "relocate_target", name: "Target Relocate", icon: Gem, color: "text-cyan-400 border-cyan-500/40 bg-cyan-950/40" },
    { id: "place_lava", name: "Lava Hazard", icon: Flame, color: "text-orange-500 border-orange-500/40 bg-orange-950/40" },
    { id: "place_obstacle", name: "Stone Block", icon: TreePine, color: "text-amber-500 border-amber-500/40 bg-amber-950/40" },
    { id: "spawn_creeper", name: "Spawn Creeper", icon: ShieldAlert, color: "text-red-400 border-red-500/40 bg-red-950/40" },
  ];

  const handleSelectBrush = (id: InteractionMode) => {
    setSelectedBrush(id);
    soundFx.playPlaceBlock(0);
  };

  const handleVoiceCommand = (command: string, actionType: string) => {
    setActiveAction(actionType === "BUILD" ? "Place Bridge Block" : actionType === "DEFEND" ? "Sprint Forward" : "Walk Forward");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-black">
      <Navbar />

      <main className="flex-1 px-4 py-6 md:px-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400">
              <Paintbrush className="h-4 w-4" />
              <span>Interactive Voxel Sandbox</span>
            </div>
            <h1 className="text-2xl font-black text-white md:text-3xl mt-1">
              3D World <span className="text-cyan-400">Brush & AI Simulation</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/60 px-3 py-1.5 text-xs font-mono text-cyan-300 hover:bg-cyan-900/50 transition-all"
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-cyan-300" />}
              <span>{isPlaying ? "Pause AI" : "Resume AI"}</span>
            </button>
            <button
              onClick={() => {
                setSeed(seed + 1);
                soundFx.playMineBlock(0);
              }}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-300 hover:bg-slate-800 transition-all"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Regenerate World</span>
            </button>
          </div>
        </div>

        {/* Workspace Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 3D Voxel Viewport */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="relative h-[540px] w-full rounded-2xl border border-white/10 bg-slate-900 overflow-hidden shadow-2xl">
              <VoxelCanvas
                seed={seed}
                curriculumLevel={3}
                isPlaying={isPlaying}
                speed={1.0}
                modelVersion="/models/master_v6_minecraft.onnx"
                stepTrigger={stepTrigger}
                interactionMode={selectedBrush}
                onTelemetryUpdate={(data) => {
                  setPlayerYaw(data.agentYaw);
                  setActiveAction(data.status === "lava_hazard" ? "Sneak Safe Edge" : "Walk Forward");
                  setConfidence(data.confidence || 94.5);
                }}
              />

              {/* Floating Spatial Radar Minimap */}
              <div className="absolute top-4 right-4 z-20 pointer-events-none">
                <SpatialRadar
                  playerPos={playerPos}
                  playerYaw={playerYaw}
                  activeActionName={activeAction}
                  confidence={confidence}
                  isRealInference={true}
                  blips={[
                    { id: "diamond_1", type: "resource", x: 28, z: 28, label: "Diamond" },
                    { id: "threat_1", type: "threat", x: 16, z: 16, label: "Creeper" },
                  ]}
                />
              </div>
            </div>

            {/* Brush Toolbar */}
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-3.5 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400 font-semibold mr-1">Voxel Tool:</span>
                {brushes.map((b) => {
                  const Icon = b.icon;
                  const isSelected = selectedBrush === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => handleSelectBrush(b.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all ${
                        isSelected
                          ? `${b.color} font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]`
                          : "border-white/5 bg-slate-950/60 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Voice Commander & Live Diagnostics */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <VoiceCommander onCommandIssued={handleVoiceCommand} activeCharacter="Explorer" />

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 font-mono text-xs text-slate-300 backdrop-blur-md">
              <div className="flex items-center gap-2 text-cyan-400 font-bold border-b border-white/5 pb-2 mb-3">
                <Sparkles className="h-4 w-4" />
                <span>Live Agent Behavior</span>
              </div>
              <ul className="flex flex-col gap-2.5 text-[11px] text-slate-400 leading-relaxed">
                <li>
                  ● <strong className="text-slate-200">Lava Avoidance:</strong> When lava is placed in the forward trajectory, the agent switches to sneak mode or builds a cobblestone bridge.
                </li>
                <li>
                  ● <strong className="text-slate-200">Threat Reaction:</strong> Hostile Creepers trigger tactical sprinting and perimeter containment.
                </li>
                <li>
                  ● <strong className="text-slate-200">Resource Pathfinding:</strong> Diamond ore triggers Euclidean potential attraction for rapid harvesting.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
