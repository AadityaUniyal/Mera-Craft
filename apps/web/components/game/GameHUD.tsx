"use client";

import React from "react";
import { PlayerState } from "@/lib/game/player-controller";
import { Heart, Zap, Compass, Sun, Pickaxe, TreePine, Gem, Mountain } from "lucide-react";

interface GameHUDProps {
  player: PlayerState;
  dayCount: number;
  timeOfDay: string;
  modelStatus: string;
  worldName: string;
}

export default function GameHUD({ player, dayCount, timeOfDay, modelStatus, worldName }: GameHUDProps) {
  const healthPercent = (player.health / player.maxHealth) * 100;
  const staminaPercent = (player.stamina / player.maxStamina) * 100;

  // Count inventory items
  const totalItems = player.inventory.reduce((sum, slot) => sum + slot.count, 0);

  return (
    <>
      {/* Crosshair */}
      <div className="crosshair" />

      {/* Top Left - Player Status */}
      <div className="absolute top-4 left-4 hud-panel p-3 space-y-2 min-w-[200px] animate-fade-in">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{player.displayName}</span>
          {player.isSprinting && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 font-mono">
              SPRINT
            </span>
          )}
        </div>

        {/* HP Bar */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] text-slate-400 font-mono">{Math.round(player.health)}</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="hp-bar transition-all duration-300"
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        {/* Stamina Bar */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-400 font-mono">{Math.round(player.stamina)}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="stamina-bar transition-all duration-300"
              style={{ width: `${staminaPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top Right - World Info & Minimap */}
      <div className="absolute top-4 right-4 space-y-2 animate-fade-in">
        <div className="hud-panel p-2.5 text-right space-y-1">
          <div className="flex items-center justify-end gap-2">
            <span className="text-[11px] text-slate-300 font-mono">{worldName}</span>
          </div>
          <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400 font-mono">
            <Sun className="w-3 h-3 text-amber-400" />
            <span>Day {dayCount} · {timeOfDay}</span>
          </div>
          <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono">
            <Compass className="w-3 h-3 text-cyan-400" />
            <span className="text-slate-400">
              {Math.round(player.position[0])}, {Math.round(player.position[2])}
            </span>
          </div>
        </div>

        {/* Model Status */}
        <div className="hud-panel p-2 text-right">
          <div className="flex items-center justify-end gap-1.5 text-[10px] font-mono">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                modelStatus === "REAL_MODEL" ? "bg-emerald-400" : "bg-amber-400"
              } animate-pulse`}
            />
            <span className={modelStatus === "REAL_MODEL" ? "text-emerald-400" : "text-amber-400"}>
              {modelStatus === "REAL_MODEL" ? "AI MODEL ACTIVE" : "DEV MODE"}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Center - Hotbar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-fade-in">
        <div className="flex items-center gap-1.5 hud-panel p-2">
          {player.inventory.map((slot, i) => (
            <div
              key={i}
              className={`hotbar-slot ${i === player.selectedSlot ? "active" : ""}`}
            >
              {slot.type && (
                <span className="text-xs text-white font-mono">
                  {slot.type === "wood" && <TreePine className="w-5 h-5 text-amber-600" />}
                  {slot.type === "stone" && <Mountain className="w-5 h-5 text-slate-400" />}
                  {slot.type === "iron" && <Pickaxe className="w-5 h-5 text-blue-300" />}
                  {slot.type === "diamond" && <Gem className="w-5 h-5 text-cyan-400" />}
                </span>
              )}
              {slot.count > 0 && (
                <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white font-mono">
                  {slot.count}
                </span>
              )}
              <span className="absolute top-0.5 left-1 text-[8px] text-slate-500 font-mono">
                {i + 1}
              </span>
            </div>
          ))}
        </div>

        {/* Interaction hint */}
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-500 font-mono">
            WASD to move · Mouse to look · Space to jump · Shift to sprint · ESC for menu
          </span>
        </div>
      </div>
    </>
  );
}
