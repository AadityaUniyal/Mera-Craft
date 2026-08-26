"use client";

import React from "react";
import { 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Zap
} from "lucide-react";
import { CameraPOVMode } from "./VoxelCanvas";
import { ACTION_NAMES } from "@/lib/ai/browser-inference";

interface AgentHUDProps {
  currentAction: number;
  probabilities?: number[];
  cumulativeReward: number;
  stepCount: number;
  inventory?: number;
  inventoryWood?: number;
  inventoryIron?: number;
  inventoryDiamond?: number;
  totalDelivered?: number;
  stamina?: number;
  health?: number;
  latencyMs: number;
  confidence: number;
  status: "running" | "goal_reached" | "collision" | "lava_hazard" | "mob_defeat" | "paused" | "timeout" | "idle";
  modelVersion: string;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  cameraMode?: CameraPOVMode;
  onSetCameraMode?: (mode: CameraPOVMode) => void;
  activeChallengeTitle?: string;
  timeOfDay?: "day" | "sunset" | "night";
}

export default function AgentHUD({
  currentAction,
  probabilities = [],
  cumulativeReward,
  stepCount,
  inventory = 0,
  inventoryWood = 0,
  inventoryIron = 0,
  inventoryDiamond = 0,
  totalDelivered = 0,
  stamina = 1.0,
  health = 1.0,
  latencyMs,
  confidence,
  status,
  modelVersion,
  soundEnabled = true,
  onToggleSound,
}: AgentHUDProps) {
  const heartsCount = Math.max(0, Math.min(10, Math.round(health * 10)));
  const hungerCount = Math.max(0, Math.min(10, Math.round(stamina * 10)));

  const hotbar = [
    { name: "Diamond Pickaxe", count: 1, icon: "⛏️", active: currentAction === 7 },
    { name: "Bridge Cobble", count: 16, icon: "🧱", active: currentAction === 8 },
    { name: "Oak Wood", count: inventoryWood, icon: "🪵", active: false },
    { name: "Iron Ingot", count: inventoryIron, icon: "🪙", active: false },
    { name: "Diamond Gem", count: inventoryDiamond, icon: "💎", active: false },
  ];

  const getStatusBadge = () => {
    switch (status) {
      case "goal_reached":
        return <span className="mc-btn mc-btn-primary text-[9px] py-1 px-2">🎯 GOAL REACHED</span>;
      case "lava_hazard":
        return <span className="mc-btn mc-btn-danger text-[9px] py-1 px-2">🔥 LAVA HAZARD</span>;
      case "mob_defeat":
        return <span className="mc-btn mc-btn-danger text-[9px] py-1 px-2">💥 CREEPER HIT</span>;
      case "collision":
        return <span className="mc-btn mc-btn-gold text-[9px] py-1 px-2">⚠️ WALL BUMP</span>;
      default:
        return <span className="mc-btn mc-btn-stone text-[9px] py-1 px-2">{status}</span>;
    }
  };

  const actionName = ACTION_NAMES[currentAction] || `Action ${currentAction}`;

  return (
    <div className="mc-panel-stone p-4 space-y-3 font-mono text-xs shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#141720] pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#10b981]" />
          <span className="font-pixel text-[11px] text-white uppercase tracking-wider">{modelVersion}</span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className={`p-1 border-2 transition ${
                soundEnabled
                  ? "bg-[#10b981]/20 border-[#10b981] text-[#34d399]"
                  : "bg-[#12151e] border-[#3b4458] text-[#64748b]"
              }`}
              title="Toggle Audio"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          )}
          {getStatusBadge()}
        </div>
      </div>

      {/* Hearts & Stamina Bar */}
      <div className="space-y-2 bg-[#12151e] p-2.5 border-2 border-t-[#0b0d13] border-l-[#0b0d13] border-r-[#32394a] border-b-[#32394a]">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[9px] text-[#94a3b8]">HEARTS:</span>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className={`text-xs ${i < heartsCount ? "text-red-500 animate-pulse" : "text-gray-800"}`}>
                ❤️
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-pixel text-[9px] text-[#94a3b8]">HUNGER:</span>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <span key={i} className={`text-xs ${i < hungerCount ? "text-amber-500" : "text-gray-800"}`}>
                🍗
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Decision Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-[#12151e] p-2 border-2 border-[#1e2330]">
          <span className="font-pixel text-[8px] text-[#94a3b8]">EXECUTING ACTION</span>
          <div className="font-pixel text-[10px] text-[#34d399] mt-1 truncate">{actionName}</div>
        </div>
        <div className="bg-[#12151e] p-2 border-2 border-[#1e2330]">
          <span className="font-pixel text-[8px] text-[#94a3b8]">CUMULATIVE REWARD</span>
          <div className={`font-pixel text-[10px] mt-1 ${cumulativeReward >= 0 ? "text-[#38bdf8]" : "text-red-400"}`}>
            {cumulativeReward >= 0 ? `+${cumulativeReward.toFixed(2)}` : cumulativeReward.toFixed(2)}
          </div>
        </div>
        <div className="bg-[#12151e] p-2 border-2 border-[#1e2330]">
          <span className="font-pixel text-[8px] text-[#94a3b8]">NEURAL LATENCY</span>
          <div className="font-pixel text-[10px] text-amber-300 mt-1">{latencyMs.toFixed(1)} ms</div>
        </div>
        <div className="bg-[#12151e] p-2 border-2 border-[#1e2330]">
          <span className="font-pixel text-[8px] text-[#94a3b8]">SIMULATION STEP</span>
          <div className="font-pixel text-[10px] text-white mt-1">{stepCount}</div>
        </div>
      </div>

      {/* Action Probability Distribution */}
      {probabilities.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t-2 border-[#141720]">
          <div className="flex items-center justify-between font-pixel text-[9px] text-[#94a3b8]">
            <span>POLICY ACTION PROBABILITIES:</span>
            <span className="text-[#34d399] font-mono">{confidence.toFixed(1)}% CONF</span>
          </div>
          <div className="space-y-1 bg-[#12151e] p-2 border-2 border-[#1e2330]">
            {probabilities.slice(0, 6).map((prob, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="w-24 font-pixel text-[8px] text-[#94a3b8] truncate">{ACTION_NAMES[i] || `Act ${i}`}</span>
                <div className="flex-1 bg-[#0b0d13] h-2 border border-[#32394a] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#059669] to-[#34d399] transition-all duration-100"
                    style={{ width: `${(prob * 100).toFixed(0)}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-[9px] text-white font-bold">{(prob * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5-Slot Hotbar */}
      <div className="pt-2 border-t-2 border-[#141720] space-y-1.5">
        <div className="font-pixel text-[9px] text-[#94a3b8]">HOTBAR INVENTORY:</div>
        <div className="grid grid-cols-5 gap-1.5">
          {hotbar.map((slot, idx) => (
            <div
              key={idx}
              className={`mc-slot ${slot.active ? "active" : ""}`}
              title={slot.name}
            >
              <span className="text-base">{slot.icon}</span>
              <span className="absolute bottom-0 right-1 font-pixel text-[9px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                {slot.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
