"use client";

import React, { useState } from "react";
import { History, Play, Pause, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { ACTION_NAMES } from "@/lib/ai/browser-inference";

export interface TrajectoryStep {
  step: number;
  agentPos: [number, number];
  yaw: number;
  action: number;
  reward: number;
  cumulativeReward: number;
  distance: number;
}

interface ReplayViewerProps {
  trajectory: TrajectoryStep[];
  onSeek: (stepIndex: number) => void;
  currentStepIndex: number;
}

export default function ReplayViewer({
  trajectory,
  onSeek,
  currentStepIndex,
}: ReplayViewerProps) {
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);

  if (trajectory.length === 0) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500 font-mono">
        <History className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-slate-400" />
        No past episode trajectory recorded yet. Run a simulation to populate replay log.
      </div>
    );
  }

  const currentItem = trajectory[currentStepIndex] || trajectory[trajectory.length - 1];

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-xl space-y-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-white font-semibold">
          <History className="w-4 h-4 text-cyan-400" />
          <span>Episode Trajectory Replay ({trajectory.length} steps)</span>
        </div>
        <div className="text-slate-400">
          Step: <span className="text-emerald-400 font-bold">{currentStepIndex + 1}</span> / {trajectory.length}
        </div>
      </div>

      {/* Scrubber Range */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={trajectory.length - 1}
          value={currentStepIndex}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Start (Step 0)</span>
          <span>End (Step {trajectory.length})</span>
        </div>
      </div>

      {/* Selected Step Details */}
      {currentItem && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-[11px]">
          <div>
            <span className="text-slate-500">Action:</span>{" "}
            <span className="text-emerald-300 font-bold">{ACTION_NAMES[currentItem.action]}</span>
          </div>
          <div>
            <span className="text-slate-500">Reward:</span>{" "}
            <span className={currentItem.reward >= 0 ? "text-emerald-400" : "text-rose-400"}>
              {currentItem.reward >= 0 ? `+${currentItem.reward.toFixed(2)}` : currentItem.reward.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Distance:</span>{" "}
            <span className="text-white">{currentItem.distance.toFixed(2)}m</span>
          </div>
          <div>
            <span className="text-slate-500">Coordinates:</span>{" "}
            <span className="text-cyan-400">({currentItem.agentPos[0].toFixed(1)}, {currentItem.agentPos[1].toFixed(1)})</span>
          </div>
        </div>
      )}
    </div>
  );
}
