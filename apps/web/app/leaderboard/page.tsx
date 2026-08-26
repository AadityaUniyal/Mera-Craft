"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Trophy, Medal, Award, Terminal, Swords, Sparkles, Filter } from "lucide-react";
import { soundSynth } from "@/lib/audio/sound-synth";

export default function LeaderboardPage() {
  const [filterMode, setFilterMode] = useState<"ALL" | "DIAMOND" | "BRIDGING" | "PARKOUR">("ALL");

  const rankings = [
    { rank: 1, name: "Steve (Miner v6)", category: "DIAMOND", score: 98.4, steps: 32, timeSec: 14.2, reward: "+92.50", badge: "Diamond Speedrun Record" },
    { rank: 2, name: "Alex (Bridger v6)", category: "BRIDGING", score: 96.8, steps: 44, timeSec: 18.5, reward: "+86.00", badge: "Zero Lava Fall" },
    { rank: 3, name: "Vanguard (Hunter v5)", category: "SURVIVAL", score: 94.2, steps: 58, timeSec: 24.1, reward: "+78.40", badge: "Creeper Sentry Record" },
    { rank: 4, name: "Shadow (Runner v5)", category: "PARKOUR", score: 92.5, steps: 28, timeSec: 11.9, reward: "+71.20", badge: "Flawless Gap Leaps" },
    { rank: 5, name: "Player Voxel_07", category: "DIAMOND", score: 88.0, steps: 65, timeSec: 29.4, reward: "+64.00", badge: "Human Grandmaster" },
  ];

  const filtered = rankings.filter((r) => {
    if (filterMode === "ALL") return true;
    return r.category === filterMode;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Trophy className="w-5 h-5 text-[#fbbf24]" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              GLOBAL SURVIVAL ARENA LEADERBOARD
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            Real-time rankings comparing trained AI agent bots and human players across all survival arenas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className="mc-btn mc-btn-primary text-[10px]"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>COMPETE IN 3D ARENA</span>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", "DIAMOND", "BRIDGING", "PARKOUR"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setFilterMode(mode);
              soundSynth.playBlockPlace();
            }}
            className={`mc-btn ${filterMode === mode ? "mc-btn-gold" : "mc-btn-stone"} text-[9px] py-1 px-3`}
          >
            {mode} ARENA
          </button>
        ))}
      </div>

      {/* Leaderboard Table Card */}
      <div className="mc-panel-stone p-5 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b-2 border-[#141720] text-[#94a3b8] font-pixel text-[9px]">
                <th className="pb-3">RANK</th>
                <th className="pb-3">PLAYER / BOT</th>
                <th className="pb-3">CATEGORY</th>
                <th className="pb-3">TIME</th>
                <th className="pb-3">STEPS</th>
                <th className="pb-3">REWARD</th>
                <th className="pb-3">HONOR BADGE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2330] text-[#cbd5e1]">
              {filtered.map((r) => (
                <tr key={r.rank} className="hover:bg-[#12151e] transition">
                  <td className="py-3 font-bold font-pixel text-xs">
                    {r.rank === 1 ? (
                      <span className="text-[#fbbf24] flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> #1</span>
                    ) : r.rank === 2 ? (
                      <span className="text-slate-300 flex items-center gap-1"><Medal className="w-3.5 h-3.5" /> #2</span>
                    ) : r.rank === 3 ? (
                      <span className="text-amber-600 flex items-center gap-1"><Award className="w-3.5 h-3.5" /> #3</span>
                    ) : (
                      <span className="text-[#64748b]">#{r.rank}</span>
                    )}
                  </td>
                  <td className="py-3 font-bold text-white flex items-center gap-1.5">
                    <span>{r.name}</span>
                  </td>
                  <td className="py-3">
                    <span className="font-pixel text-[8px] px-1.5 py-0.5 bg-[#12151e] border border-[#32394a] text-[#38bdf8]">
                      {r.category}
                    </span>
                  </td>
                  <td className="py-3 text-slate-300">{r.timeSec}s</td>
                  <td className="py-3 text-slate-300">{r.steps}</td>
                  <td className="py-3 font-bold text-[#34d399]">{r.reward}</td>
                  <td className="py-3">
                    <span className="mc-btn mc-btn-stone text-[8px] py-0.5 px-1.5">
                      {r.badge}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
