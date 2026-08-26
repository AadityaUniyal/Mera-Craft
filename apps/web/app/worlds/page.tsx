"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, Play, Globe, TreePine, Mountain, Swords,
  Calendar, Bot, Trash2, Box, Sparkles, Terminal
} from "lucide-react";
import {
  getWorlds, createWorld, deleteWorld,
  getWorldTypeLabel, getWorldTypeDescription,
  WorldData,
} from "@/lib/world-manager";
import { soundSynth } from "@/lib/audio/sound-synth";

const WORLD_TYPE_ICONS: Record<string, string> = {
  training_showcase: "🎓",
  riverland: "🌊",
  forest_outpost: "🌲",
  challenge_world: "⚔️",
};

export default function WorldsPage() {
  const router = useRouter();
  const [worlds, setWorlds] = useState<WorldData[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorldName, setNewWorldName] = useState("");
  const [newWorldType, setNewWorldType] = useState<WorldData["type"]>("riverland");

  useEffect(() => {
    setWorlds(getWorlds());
  }, []);

  const handleCreateWorld = () => {
    if (!newWorldName.trim()) return;
    const world = createWorld(newWorldName.trim(), newWorldType);
    setWorlds(getWorlds());
    setShowCreateModal(false);
    setNewWorldName("");
    soundSynth.playLevelUp();
    router.push(`/game?world=${world.id}`);
  };

  const handleDeleteWorld = (id: string) => {
    deleteWorld(id);
    setWorlds(getWorlds());
    soundSynth.playBlockBreak();
  };

  const handleEnterWorld = (id: string) => {
    soundSynth.playDiamondChime();
    router.push(`/game?world=${id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-[#34d399]" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              VOXEL REALMS & WORLDS
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            Explore procedural voxel worlds &bull; Play alongside autonomous PyTorch PPO AI bots
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowCreateModal(true);
              soundSynth.playBlockPlace();
            }}
            className="mc-btn mc-btn-primary text-[10px] flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>CREATE NEW REALM</span>
          </button>
        </div>
      </div>

      {/* Worlds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create World Card */}
        <button
          onClick={() => {
            setShowCreateModal(true);
            soundSynth.playBlockPlace();
          }}
          className="mc-panel-stone p-6 flex flex-col items-center justify-center min-h-[220px] text-center hover:border-white transition-all cursor-pointer group"
        >
          <div className="w-14 h-14 bg-[#10b981]/20 border-2 border-[#10b981] flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
            <Plus className="w-7 h-7 text-[#34d399]" />
          </div>
          <h3 className="font-pixel text-sm font-bold text-white">GENERATE NEW REALM</h3>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">Custom seed & terrain configuration</p>
        </button>

        {/* Existing Worlds */}
        {worlds.map((world) => {
          const icon = WORLD_TYPE_ICONS[world.type] || "🌍";
          const typeLabel = getWorldTypeLabel(world.type);

          return (
            <div
              key={world.id}
              className="mc-panel-stone p-5 flex flex-col justify-between space-y-4 relative group"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWorld(world.id);
                }}
                className="absolute top-3 right-3 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                title="Delete Realm"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#12151e] border-2 border-[#3b4458] flex items-center justify-center text-xl">
                    {icon}
                  </div>
                  <div>
                    <h3 className="font-pixel text-xs font-bold text-white truncate">{world.name}</h3>
                    <p className="font-mono text-[10px] text-[#34d399]">{typeLabel}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-[10px] bg-[#12151e] p-2 border border-[#1e2330]">
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">Day:</span>
                    <span className="text-white font-bold">{world.dayCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">AI Bots:</span>
                    <span className="text-[#38bdf8] font-bold">{world.aiPopulation}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t-2 border-[#141720]">
                <button
                  onClick={() => handleEnterWorld(world.id)}
                  className="mc-btn mc-btn-primary text-[9px] w-full py-2 flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current text-black" />
                  <span>ENTER 3D WORLD</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* Quick Demo Play Card */}
        <div className="mc-panel-stone p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-[#12151e] border-2 border-[#38bdf8] flex items-center justify-center text-xl">
                ⚡
              </div>
              <div>
                <h3 className="font-pixel text-xs font-bold text-white">QUICK PLAY ARENA</h3>
                <p className="font-mono text-[10px] text-[#38bdf8]">Instant Sandbox</p>
              </div>
            </div>
            <p className="font-mono text-xs text-[#94a3b8] leading-relaxed">
              Launch directly into a 3D procedural arena with active AI companions and voxel terrain.
            </p>
          </div>

          <div className="pt-2 border-t-2 border-[#141720]">
            <button
              onClick={() => router.push("/game")}
              className="mc-btn mc-btn-diamond text-[9px] w-full py-2 flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current text-black" />
              <span>INSTANT LAUNCH</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create World Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
          <div className="mc-panel-stone p-6 w-full max-w-md space-y-4 shadow-2xl border-4 border-[#3b4458]">
            <div className="border-b-2 border-[#141720] pb-2 text-center">
              <h2 className="font-pixel text-sm font-bold text-white">GENERATE VOXEL REALM</h2>
            </div>

            <div className="space-y-1">
              <label className="font-pixel text-[9px] text-[#94a3b8] block uppercase">
                REALM NAME:
              </label>
              <input
                type="text"
                value={newWorldName}
                onChange={(e) => setNewWorldName(e.target.value)}
                placeholder="Obsidian Valley"
                className="w-full bg-[#12151e] border-2 border-[#3b4458] px-3 py-2 text-white font-mono text-xs focus:border-[#10b981] outline-none"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="font-pixel text-[9px] text-[#94a3b8] block uppercase">
                TERRAIN BIOME:
              </label>
              <select
                value={newWorldType}
                onChange={(e) => setNewWorldType(e.target.value as any)}
                className="w-full bg-[#12151e] border-2 border-[#3b4458] px-3 py-2 text-white font-mono text-xs focus:border-[#10b981] outline-none"
              >
                <option value="riverland">Riverland & Diamond Islands</option>
                <option value="training_showcase">RL Training Showcase</option>
                <option value="forest_outpost">Forest Outpost</option>
                <option value="challenge_world">Survival Challenge Realm</option>
              </select>
            </div>

            <div className="pt-3 border-t-2 border-[#141720] flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="mc-btn mc-btn-stone text-[9px] flex-1 py-2"
              >
                CANCEL
              </button>
              <button
                onClick={handleCreateWorld}
                disabled={!newWorldName.trim()}
                className="mc-btn mc-btn-primary text-[9px] flex-1 py-2 disabled:opacity-50"
              >
                CREATE & ENTER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
