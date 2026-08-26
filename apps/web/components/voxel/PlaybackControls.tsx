"use client";

import React from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward, 
  Shuffle, 
  Sparkles, 
  Box, 
  Compass, 
  Cpu, 
  Trophy, 
  Flame, 
  Zap 
} from "lucide-react";
import { InteractionMode } from "./VoxelCanvas";

interface PlaybackControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onReset: () => void;
  speed: number;
  onSetSpeed: (s: number) => void;
  seed: number;
  onSetSeed: (s: number) => void;
  onRandomizeSeed: () => void;
  curriculumLevel: number;
  onSetCurriculumLevel: (lvl: number) => void;
  modelVersion: string;
  onSetModelVersion: (v: string) => void;
  interactionMode: InteractionMode;
  onSetInteractionMode: (mode: InteractionMode) => void;
  movingTargetMode: boolean;
  onToggleMovingTarget: () => void;
}

export default function PlaybackControls({
  isPlaying,
  onTogglePlay,
  onStepForward,
  onReset,
  speed,
  onSetSpeed,
  seed,
  onSetSeed,
  onRandomizeSeed,
  curriculumLevel,
  onSetCurriculumLevel,
  modelVersion,
  onSetModelVersion,
  interactionMode,
  onSetInteractionMode,
  movingTargetMode,
  onToggleMovingTarget,
}: PlaybackControlsProps) {
  const speeds = [0.5, 1.0, 2.0, 5.0];
  const models = [
    { id: "master_v6_minecraft", label: "Minecraft Master v6 (10 Actions & Bridging)" },
    { id: "master_v5_pro", label: "Master-v5 Pro (36-dim Residual Brain)" },
    { id: "explorer_v2", label: "Explorer-v2 (Navigation Baseline)" },
  ];

  const tools: { id: InteractionMode; label: string; icon: any }[] = [
    { id: "relocate_target", label: "Place Diamond", icon: Sparkles },
    { id: "place_obstacle", label: "Place Wall", icon: Box },
    { id: "place_lava", label: "Place Lava", icon: Flame },
    { id: "teleport_agent", label: "Move Player", icon: Compass },
  ];

  return (
    <div className="mc-panel-stone p-4 space-y-3 font-mono text-xs shadow-2xl">
      {/* Top Bar: Playback Controls & Speed */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#141720] pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`mc-btn ${isPlaying ? "mc-btn-gold" : "mc-btn-primary"} text-[10px]`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? "PAUSE SIM" : "RUN SIMULATOR"}</span>
          </button>

          <button
            onClick={onStepForward}
            disabled={isPlaying}
            title="Step One Frame"
            className="mc-btn mc-btn-stone text-[10px] disabled:opacity-50"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>STEP</span>
          </button>

          <button
            onClick={onReset}
            title="Regenerate & Reset Episode"
            className="mc-btn mc-btn-diamond text-[10px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESPAWN</span>
          </button>
        </div>

        {/* Speed Multiplier */}
        <div className="flex items-center gap-1 bg-[#12151e] p-1 border-2 border-[#1e2330]">
          <span className="font-pixel text-[8px] text-[#94a3b8] px-1">SPEED:</span>
          {speeds.map((s) => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              className={`px-2 py-0.5 font-pixel text-[9px] border transition ${
                speed === s
                  ? "bg-[#10b981] text-[#0c0f17] border-[#34d399] font-bold"
                  : "bg-[#1e2330] text-[#94a3b8] border-[#32394a] hover:text-white"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* God Mode Interactive Tools */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#12151e] p-2 border-2 border-[#1e2330]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-pixel text-[8px] text-[#94a3b8]">GOD TOOLS:</span>
          {tools.map((t) => {
            const Icon = t.icon;
            const active = interactionMode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSetInteractionMode(t.id)}
                className={`flex items-center gap-1 px-2 py-1 font-pixel text-[8px] border-2 transition ${
                  active
                    ? "bg-[#10b981]/30 border-[#10b981] text-[#34d399] font-bold"
                    : "bg-[#1e2330] border-[#32394a] text-[#94a3b8] hover:text-white"
                }`}
              >
                <Icon className="w-3 h-3 text-amber-400" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Moving Target Mode */}
        <button
          onClick={onToggleMovingTarget}
          className={`flex items-center gap-1 px-2 py-1 font-pixel text-[8px] border-2 transition ${
            movingTargetMode
              ? "bg-[#d97706]/30 border-[#fbbf24] text-amber-300 font-bold"
              : "bg-[#1e2330] border-[#32394a] text-[#94a3b8] hover:text-white"
          }`}
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span>MOVING DIAMOND: {movingTargetMode ? "ON" : "OFF"}</span>
        </button>
      </div>

      {/* Challenge Mode, Seed & Model Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <div className="bg-[#12151e] p-2 border-2 border-[#1e2330]">
          <label className="block font-pixel text-[8px] text-[#94a3b8] mb-1">
            MAP SEED:
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={seed}
              onChange={(e) => onSetSeed(parseInt(e.target.value) || 0)}
              className="w-full bg-[#0b0d13] border border-[#32394a] px-2 py-1 text-white font-mono text-xs focus:border-[#10b981] outline-none"
            />
            <button
              onClick={onRandomizeSeed}
              title="Generate Random Seed"
              className="p-1 bg-[#1e2330] hover:bg-[#282f40] border border-[#32394a] text-white"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="bg-[#12151e] p-2 border-2 border-[#1e2330]">
          <label className="block font-pixel text-[8px] text-amber-400 mb-1 flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            <span>CHALLENGE ARENA:</span>
          </label>
          <select
            value={curriculumLevel}
            onChange={(e) => onSetCurriculumLevel(parseInt(e.target.value))}
            className="w-full bg-[#0b0d13] border border-[#32394a] px-1.5 py-1 text-amber-300 font-pixel text-[9px] focus:border-[#10b981] outline-none"
          >
            <option value={0}>[1] Obstacle Navigation Wall</option>
            <option value={1}>[2] Lava Chasm Bridging</option>
            <option value={2}>[3] Water River Island</option>
            <option value={3}>[4] Night Creeper Survival</option>
            <option value={4}>[5] Diamond Speedrun Economy</option>
          </select>
        </div>

        <div className="bg-[#12151e] p-2 border-2 border-[#1e2330]">
          <label className="block font-pixel text-[8px] text-[#34d399] mb-1 flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            <span>NEURAL MODEL:</span>
          </label>
          <select
            value={modelVersion}
            onChange={(e) => onSetModelVersion(e.target.value)}
            className="w-full bg-[#0b0d13] border border-[#32394a] px-1.5 py-1 text-[#34d399] font-pixel text-[9px] focus:border-[#10b981] outline-none"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
