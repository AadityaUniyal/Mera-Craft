"use client";

import React, { useState } from "react";
import { AIEntityState } from "@/lib/game/ai-entity";
import { Eye, MessageSquare, HelpCircle, X, Loader2, Sparkles, Heart, Zap, TreePine } from "lucide-react";

interface AIEntityPanelProps {
  entity: AIEntityState | null;
  onClose: () => void;
}

export default function AIEntityPanel({ entity, onClose }: AIEntityPanelProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  if (!entity) return null;

  const handleWhyClick = async () => {
    setIsExplaining(true);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: entity.currentGoal,
          selectedAction: entity.lastActionName,
          actionId: entity.lastAction,
          targetDistance: 5.0,
          targetAngleDeg: 30,
          frontObstacleDist: 4.0,
          rewardDelta: 0.1,
          modelVersion: entity.modelVersion,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExplanation(data.explanation);
      } else {
        setExplanation(
          `${entity.name} is executing a ${entity.role} policy. Current action: ${entity.lastActionName}. ` +
          `The agent is pursuing its goal based on local observations and the trained policy.`
        );
      }
    } catch {
      setExplanation(
        `${entity.name} selected "${entity.lastActionName}" based on its current observations ` +
        `and the ${entity.isModelReal ? "trained neural" : "development"} policy.`
      );
    } finally {
      setIsExplaining(false);
    }
  };

  const healthPercent = (entity.health / entity.maxHealth) * 100;
  const energyPercent = (entity.energy / entity.maxEnergy) * 100;
  const totalInventory = entity.inventory.wood + entity.inventory.stone + entity.inventory.iron + entity.inventory.diamond;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md z-40 animate-slide-up">
      <div className="glass-dark rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">{entity.name}</h3>
            <p className="text-xs text-slate-400 font-mono capitalize">{entity.role}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <Heart className="w-3 h-3 text-red-400" />
              Health: {Math.round(entity.health)}%
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="hp-bar" style={{ width: `${healthPercent}%` }} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <Zap className="w-3 h-3 text-amber-400" />
              Energy: {Math.round(entity.energy)}%
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div className="stamina-bar" style={{ width: `${energyPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Current Goal */}
        <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800">
          <div className="text-[10px] text-slate-500 font-mono mb-1">CURRENT GOAL</div>
          <p className="text-sm text-white">{entity.currentGoal}</p>
        </div>

        {/* Info row */}
        <div className="flex items-center gap-4 text-[10px] font-mono text-slate-400">
          <span>Model: {entity.modelVersion}</span>
          <span>Steps: {entity.stepCount}</span>
          <span className="flex items-center gap-1">
            <TreePine className="w-3 h-3" /> {totalInventory}
          </span>
          <span className={entity.isModelReal ? "text-emerald-400" : "text-amber-400"}>
            {entity.isModelReal ? "Neural" : "Dev"}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button className="btn-secondary flex-1 text-xs py-2">
            <Eye className="w-3.5 h-3.5" />
            Watch
          </button>
          <button className="btn-secondary flex-1 text-xs py-2">
            <MessageSquare className="w-3.5 h-3.5" />
            Interact
          </button>
          <button
            onClick={handleWhyClick}
            disabled={isExplaining}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition"
          >
            {isExplaining ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Why?
          </button>
        </div>

        {/* Explanation */}
        {explanation && (
          <div className="bg-purple-950/30 border border-purple-500/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-[10px] text-purple-400 font-mono mb-1.5">
              <Sparkles className="w-3 h-3" />
              WHY DID {entity.name.toUpperCase()} DO THAT?
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
