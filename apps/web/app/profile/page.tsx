"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  User, 
  ShieldCheck, 
  Trophy, 
  Swords, 
  Cpu, 
  Flame, 
  Sparkles, 
  Zap, 
  Layers, 
  CheckCircle2, 
  Award, 
  Box, 
  Key, 
  RotateCcw,
  Terminal,
  Activity
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { soundSynth } from "@/lib/audio/sound-synth";

const AVATARS = [
  { id: "steve", name: "Steve — Miner", icon: "⛏️", color: "#0284c7" },
  { id: "alex", name: "Alex — Bridger", icon: "🧱", color: "#16a34a" },
  { id: "knight", name: "Diamond Knight", icon: "⚔️", color: "#00f0ff" },
  { id: "engineer", name: "Redstone Tech", icon: "⚡", color: "#ef4444" },
  { id: "hunter", name: "Creeper Hunter", icon: "🏹", color: "#a855f7" },
];

const ACHIEVEMENTS = [
  { id: "lava_walker", title: "Lava Walker", desc: "Build a 10-block cobblestone bridge over lava without taking damage.", icon: "🔥", unlocked: true },
  { id: "diamond_master", title: "Diamond Extractor", desc: "Mine and deposit 25 diamonds in a single speedrun session.", icon: "💎", unlocked: true },
  { id: "night_survivor", title: "Night Stalker", desc: "Survive 5 consecutive nights with active Creeper pursuit.", icon: "🌙", unlocked: true },
  { id: "ml_trainer", title: "Master AI Trainer", desc: "Train a PPO policy reaching >95% held-out success rate.", icon: "🧠", unlocked: true },
  { id: "parkour_god", title: "Parkour Precision", desc: "Complete 15 consecutive 2-block gap leaps without falling.", icon: "⚡", unlocked: false },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Player Stats
  const stats = {
    level: 28,
    xpCurrent: 3450,
    xpNext: 4000,
    totalSurvivalHours: 42.6,
    blocksMined: 1420,
    bridgesPlaced: 388,
    creepersEvaded: 194,
    diamondsDelivered: 86,
    modelsTrained: 14,
    globalRank: "#12",
  };

  const handleSelectAvatar = (av: typeof AVATARS[0]) => {
    setSelectedAvatar(av);
    soundSynth.playBlockPlace();
  };

  const handleSaveProfile = () => {
    setSavedSuccess(true);
    soundSynth.playLevelUp();
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <User className="w-5 h-5 text-[#34d399]" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              PLAYER GAMING PROFILE & LAB
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            Personal stats &bull; AI trainer credentials &bull; Achievement trophies &bull; Inventory chest
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className="mc-btn mc-btn-primary text-[10px]"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>LAUNCH 3D LAB</span>
          </Link>
        </div>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Avatar & Player Card */}
        <div className="lg:col-span-4 space-y-4">
          <div className="mc-panel-stone p-5 space-y-4 text-center">
            {/* Avatar Display */}
            <div className="relative w-24 h-24 mx-auto bg-[#12151e] border-4 border-[#3b4458] flex items-center justify-center shadow-2xl">
              <span className="text-5xl">{selectedAvatar.icon}</span>
              <span className="absolute -bottom-2 -right-2 mc-btn mc-btn-gold text-[8px] py-0.5 px-1.5 font-bold">
                LVL {stats.level}
              </span>
            </div>

            <div>
              <h2 className="font-pixel text-sm sm:text-base font-bold text-white">
                {user?.displayName || "Steve Voxel"}
              </h2>
              <span className="font-mono text-xs text-[#34d399]">
                {selectedAvatar.name}
              </span>
            </div>

            {/* Experience Bar */}
            <div className="space-y-1 text-left">
              <div className="flex justify-between font-pixel text-[8px] text-[#94a3b8]">
                <span>XP PROGRESS:</span>
                <span className="text-white font-mono">{stats.xpCurrent} / {stats.xpNext} XP</span>
              </div>
              <div className="mc-xp-bar">
                <div 
                  className="mc-xp-fill transition-all duration-500" 
                  style={{ width: `${(stats.xpCurrent / stats.xpNext) * 100}%` }}
                />
              </div>
            </div>

            {/* Avatar Switcher */}
            <div className="pt-2 border-t-2 border-[#141720] space-y-2 text-left">
              <span className="font-pixel text-[9px] text-[#94a3b8]">SELECT CHARACTER AVATAR:</span>
              <div className="grid grid-cols-5 gap-1.5">
                {AVATARS.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => handleSelectAvatar(av)}
                    className={`p-2 bg-[#12151e] border-2 flex items-center justify-center transition ${
                      selectedAvatar.id === av.id
                        ? "border-[#34d399] bg-[#10b981]/20 shadow-md"
                        : "border-[#32394a] hover:border-white"
                    }`}
                    title={av.name}
                  >
                    <span className="text-lg">{av.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              className="mc-btn mc-btn-primary text-[10px] w-full py-2"
            >
              {savedSuccess ? "PROFILE SAVED!" : "SAVE IDENTITY"}
            </button>
          </div>

          {/* Quick Links */}
          <div className="mc-panel-stone p-4 space-y-2">
            <span className="font-pixel text-[9px] text-[#94a3b8]">PORTAL SHORTCUTS:</span>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/characters" className="mc-btn mc-btn-stone text-[9px] py-1.5">
                <span>BOT ROSTER</span>
              </Link>
              <Link href="/enemies" className="mc-btn mc-btn-stone text-[9px] py-1.5">
                <span>BESTIARY</span>
              </Link>
              <Link href="/challenges" className="mc-btn mc-btn-stone text-[9px] py-1.5">
                <span>CHALLENGES</span>
              </Link>
              <Link href="/leaderboard" className="mc-btn mc-btn-stone text-[9px] py-1.5">
                <span>RANKINGS</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: In-Depth Statistics & Achievements */}
        <div className="lg:col-span-8 space-y-6">
          {/* Key Game & AI Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="mc-panel-stone p-3 text-center space-y-1">
              <span className="font-pixel text-[8px] text-[#94a3b8]">GLOBAL RANK</span>
              <div className="font-pixel text-base text-[#fbbf24]">{stats.globalRank}</div>
              <span className="font-mono text-[9px] text-[#64748b]">Top 1% Player</span>
            </div>

            <div className="mc-panel-stone p-3 text-center space-y-1">
              <span className="font-pixel text-[8px] text-[#94a3b8]">DIAMONDS MINED</span>
              <div className="font-pixel text-base text-[#00f0ff]">{stats.diamondsDelivered} 💎</div>
              <span className="font-mono text-[9px] text-[#64748b]">Deposited to Depot</span>
            </div>

            <div className="mc-panel-stone p-3 text-center space-y-1">
              <span className="font-pixel text-[8px] text-[#94a3b8]">BRIDGES BUILT</span>
              <div className="font-pixel text-base text-[#34d399]">{stats.bridgesPlaced} 🧱</div>
              <span className="font-mono text-[9px] text-[#64748b]">Over Lava/Water</span>
            </div>

            <div className="mc-panel-stone p-3 text-center space-y-1">
              <span className="font-pixel text-[8px] text-[#94a3b8]">CREEPERS EVADED</span>
              <div className="font-pixel text-base text-[#a855f7]">{stats.creepersEvaded} 💥</div>
              <span className="font-mono text-[9px] text-[#64748b]">0 Blast Deaths</span>
            </div>
          </div>

          {/* Player Inventory Chest */}
          <div className="mc-panel-stone p-5 space-y-3">
            <div className="flex items-center justify-between border-b-2 border-[#141720] pb-2">
              <div className="flex items-center gap-2 font-pixel text-xs text-[#34d399]">
                <Box className="w-4 h-4" />
                <span>PLAYER INVENTORY STASH (CHEST)</span>
              </div>
              <span className="font-mono text-[10px] text-[#94a3b8]">Capacity: 5/27 Slots</span>
            </div>

            <div className="mc-hotbar justify-start flex-wrap">
              <div className="mc-slot active" title="Enchanted Diamond Pickaxe">
                <span className="text-xl">⛏️</span>
                <span className="absolute bottom-0 right-1 font-pixel text-[8px] text-white">1</span>
              </div>
              <div className="mc-slot" title="Diamond Sword">
                <span className="text-xl">⚔️</span>
                <span className="absolute bottom-0 right-1 font-pixel text-[8px] text-white">1</span>
              </div>
              <div className="mc-slot" title="Bridge Cobblestone">
                <span className="text-xl">🧱</span>
                <span className="absolute bottom-0 right-1 font-pixel text-[8px] text-white">64</span>
              </div>
              <div className="mc-slot" title="Diamonds">
                <span className="text-xl">💎</span>
                <span className="absolute bottom-0 right-1 font-pixel text-[8px] text-white">{stats.diamondsDelivered}</span>
              </div>
              <div className="mc-slot" title="Cooked Beef">
                <span className="text-xl">🥩</span>
                <span className="absolute bottom-0 right-1 font-pixel text-[8px] text-white">16</span>
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="mc-slot opacity-30" />
              ))}
            </div>
          </div>

          {/* Achievements & Trophies */}
          <div className="mc-panel-stone p-5 space-y-3">
            <div className="flex items-center gap-2 font-pixel text-xs text-[#fbbf24] border-b-2 border-[#141720] pb-2">
              <Trophy className="w-4 h-4" />
              <span>UNLOCKED ACHIEVEMENTS & BADGES</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3 border-2 transition ${
                    ach.unlocked
                      ? "bg-[#12151e] border-[#3b4458]"
                      : "bg-[#0b0d13] border-[#1e2330] opacity-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{ach.icon}</span>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h4 className="font-pixel text-[10px] font-bold text-white">{ach.title}</h4>
                        {ach.unlocked && (
                          <span className="text-[8px] font-pixel text-[#34d399]">UNLOCKED</span>
                        )}
                      </div>
                      <p className="font-mono text-[10px] text-[#94a3b8] leading-tight">{ach.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
