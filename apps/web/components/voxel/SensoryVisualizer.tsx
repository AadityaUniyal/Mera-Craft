"use client";

import React from "react";
import { Compass, Eye, Target } from "lucide-react";

interface SensoryVisualizerProps {
  observation: number[];
  agentYaw: number;
  targetAngle: number;
  targetDistance: number;
}

export default function SensoryVisualizer({
  observation,
  agentYaw,
  targetAngle,
  targetDistance,
}: SensoryVisualizerProps) {
  const rayDists = observation.slice(0, 8);
  const targetRays = observation.slice(8, 16);

  return (
    <div className="mc-panel-stone p-4 space-y-3 font-mono text-xs shadow-2xl">
      <div className="flex items-center justify-between border-b-2 border-[#141720] pb-2">
        <div className="flex items-center gap-1.5 font-pixel text-[10px] text-[#34d399]">
          <Eye className="w-3.5 h-3.5" />
          <span>8-DIRECTIONAL LIDAR RADAR</span>
        </div>
        <div className="flex items-center gap-1 font-pixel text-[9px] text-[#94a3b8]">
          <Compass className="w-3 h-3 text-[#38bdf8]" />
          <span>YAW: {((agentYaw * 180) / Math.PI).toFixed(0)}°</span>
        </div>
      </div>

      {/* Radar Visualizer */}
      <div className="relative w-44 h-44 mx-auto bg-[#12151e] border-2 border-t-[#0b0d13] border-l-[#0b0d13] border-r-[#32394a] border-b-[#32394a] flex items-center justify-center">
        <div className="absolute inset-2 border border-dashed border-[#32394a]" />
        <div className="absolute inset-8 border border-[#1e2330]" />
        <div className="absolute w-full h-[1px] bg-[#1e2330]" />
        <div className="absolute h-full w-[1px] bg-[#1e2330]" />

        {/* Center Agent Icon */}
        <div className="relative z-10 w-4 h-4 bg-[#10b981] border border-black flex items-center justify-center shadow-md">
          <div 
            className="w-0.5 h-2 bg-white origin-bottom -translate-y-1"
            style={{ transform: `rotate(${agentYaw}rad)` }}
          />
        </div>

        {/* 8 LiDAR Rays */}
        {rayDists.map((dist, idx) => {
          const angle = idx * 45 * (Math.PI / 180);
          const r = Math.max(10, dist * 76);
          const x = Math.sin(angle) * r;
          const y = -Math.cos(angle) * r;
          const hasTarget = targetRays[idx] > 0.5;

          return (
            <div key={idx} className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`absolute w-[2px] origin-bottom transition-all ${
                  hasTarget 
                    ? "bg-[#fbbf24] shadow-[0_0_6px_#fbbf24]" 
                    : dist < 0.35 
                    ? "bg-[#ef4444] shadow-[0_0_6px_#ef4444]" 
                    : "bg-[#10b981]/70"
                }`}
                style={{
                  height: `${r}px`,
                  transform: `rotate(${idx * 45}deg)`,
                  bottom: "50%",
                }}
              />
              <div
                className={`absolute w-2 h-2 border border-black ${
                  hasTarget ? "bg-[#fbbf24] animate-ping" : dist < 0.35 ? "bg-[#ef4444]" : "bg-[#10b981]"
                }`}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                }}
              />
            </div>
          );
        })}

        {/* Target Diamond Vector */}
        <div
          className="absolute z-20 w-3.5 h-3.5 bg-[#00f0ff] border border-black flex items-center justify-center shadow-[0_0_10px_#00f0ff] animate-pulse"
          style={{
            transform: `translate(${Math.sin(targetAngle) * Math.min(76, targetDistance * 8)}px, ${-Math.cos(targetAngle) * Math.min(76, targetDistance * 8)}px)`,
          }}
        >
          <Target className="w-2.5 h-2.5 text-black" />
        </div>
      </div>

      {/* Target Distance & Heading Info */}
      <div className="grid grid-cols-2 gap-2 font-pixel text-[8px] text-[#94a3b8] pt-1 border-t-2 border-[#141720]">
        <div className="bg-[#12151e] p-1.5 border border-[#1e2330]">
          DIST: <span className="text-white font-bold">{targetDistance.toFixed(2)}m</span>
        </div>
        <div className="bg-[#12151e] p-1.5 border border-[#1e2330]">
          HEADING: <span className="text-[#38bdf8] font-bold">{((targetAngle * 180) / Math.PI).toFixed(0)}°</span>
        </div>
      </div>
    </div>
  );
}
