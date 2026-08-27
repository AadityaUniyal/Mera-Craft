"use client";

import React from "react";
import { Compass, ShieldAlert, Target, Sparkles, Navigation } from "lucide-react";

interface EntityBlip {
  id: string;
  type: "player" | "target" | "threat" | "bridge" | "resource";
  x: number;
  z: number;
  label?: string;
}

interface SpatialRadarProps {
  playerPos: [number, number, number];
  playerYaw: number;
  gridSize?: number;
  blips?: EntityBlip[];
  activeActionName?: string;
  confidence?: number;
  isRealInference?: boolean;
}

export function SpatialRadar({
  playerPos,
  playerYaw,
  gridSize = 32,
  blips = [],
  activeActionName = "Walk Forward",
  confidence = 94.2,
  isRealInference = true,
}: SpatialRadarProps) {
  const radarRadius = 60; // px
  const center = 70;

  // Convert world coordinates to radar pixel coordinates relative to player center
  const getRadarCoords = (wx: number, wz: number) => {
    const dx = wx - playerPos[0];
    const dz = wz - playerPos[2];
    const maxRange = 16.0; // max block range visible on radar

    // Rotate by player yaw so top of radar is always "Forward"
    const cosY = Math.cos(-playerYaw);
    const sinY = Math.sin(-playerYaw);
    const rotX = dx * cosY - dz * sinY;
    const rotZ = dx * sinY + dz * cosY;

    const scale = radarRadius / maxRange;
    const rx = center + Math.max(-radarRadius, Math.min(radarRadius, rotX * scale));
    const rz = center + Math.max(-radarRadius, Math.min(radarRadius, rotZ * scale));

    return { rx, rz };
  };

  return (
    <div className="relative flex flex-col items-center rounded-xl border border-cyan-500/30 bg-slate-950/85 p-3.5 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="mb-2 flex w-full items-center justify-between border-b border-cyan-500/20 pb-1.5 text-xs">
        <div className="flex items-center gap-1.5 font-mono font-semibold uppercase tracking-wider text-cyan-400">
          <Compass className="h-3.5 w-3.5 animate-spin-slow text-cyan-400" />
          <span>Spatial Radar</span>
        </div>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
            isRealInference
              ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/30"
              : "bg-amber-950/80 text-amber-400 border border-amber-500/30"
          }`}
        >
          {isRealInference ? "ONNX ACTIVE" : "HEURISTIC"}
        </span>
      </div>

      {/* Circular Radar Display */}
      <div className="relative h-[140px] w-[140px] rounded-full border border-cyan-500/40 bg-slate-900/90 shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]">
        {/* Concentric Range Rings */}
        <div className="absolute inset-[20px] rounded-full border border-cyan-500/20" />
        <div className="absolute inset-[45px] rounded-full border border-cyan-500/20" />
        
        {/* Crosshair Lines */}
        <div className="absolute left-1/2 top-0 h-full w-[1px] -translate-x-1/2 bg-cyan-500/15" />
        <div className="absolute top-1/2 left-0 h-[1px] w-full -translate-y-1/2 bg-cyan-500/15" />

        {/* Forward Heading Cone / Raycast Arc */}
        <div
          className="absolute left-1/2 top-0 h-1/2 w-[28px] -translate-x-1/2 origin-bottom bg-gradient-to-t from-cyan-500/20 to-transparent blur-[1px]"
          style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
        />

        {/* Center Agent / Player Pointer */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Navigation className="h-4 w-4 fill-cyan-400 text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
        </div>

        {/* Entity Blips */}
        {blips.map((blip) => {
          const { rx, rz } = getRadarCoords(blip.x, blip.z);

          if (blip.type === "threat") {
            return (
              <div
                key={blip.id}
                title={blip.label || "Threat / Creeper"}
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse"
                style={{ left: `${rx}px`, top: `${rz}px` }}
              />
            );
          }
          if (blip.type === "target" || blip.type === "resource") {
            return (
              <div
                key={blip.id}
                title={blip.label || "Diamond / Goal"}
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-ping-slow"
                style={{ left: `${rx}px`, top: `${rz}px` }}
              />
            );
          }
          return null;
        })}
      </div>

      {/* Action Telemetry Footer */}
      <div className="mt-2.5 flex w-full flex-col gap-1 rounded bg-slate-900/60 p-1.5 font-mono text-[11px]">
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-400">Action:</span>
          <span className="font-semibold text-cyan-300">{activeActionName}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span className="text-slate-400">Confidence:</span>
          <span className="font-semibold text-emerald-400">{confidence.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
