"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Trophy, 
  Swords, 
  Flame, 
  Droplets, 
  Zap, 
  Mountain, 
  Play, 
  Sparkles, 
  RefreshCw,
  Shield,
  Star,
  Clock,
  Target,
  Bot
} from "lucide-react";

interface ChallengeScore {
  id: string;
  agentName: string;
  score: number;
  timeElapsedSec: number;
  heartsLeft: number;
  blocksPlaced: number;
  passed: boolean;
}

interface ChallengeData {
  id: string;
  slug: string;
  title: string;
  description: string;
  challengeType: string;
  difficulty: string;
  parTimeSeconds: number;
  targetScore: number;
  character: string;
  scores: ChallengeScore[];
}

const DIFFICULTY_STYLES: Record<string, string> = {
  Medium: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40",
  Hard: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
  Expert: "bg-rose-500/20 text-rose-300 border border-rose-500/40",
};

const CHALLENGE_ICONS: Record<string, React.ReactNode> = {
  PARKOUR: <Zap className="w-5 h-5 text-amber-400" />,
  LAVA_BRIDGING: <Flame className="w-5 h-5 text-rose-400" />,
  NIGHT_SURVIVAL: <Shield className="w-5 h-5 text-purple-400" />,
  SPEEDRUN_ECONOMY: <Trophy className="w-5 h-5 text-emerald-400" />,
  PILLAR_MOUNTAIN: <Mountain className="w-5 h-5 text-cyan-400" />,
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const res = await fetch("/api/challenges");
        if (res.ok) {
          const data = await res.json();
          setChallenges(data.challenges || []);
        }
      } catch (err) {
        console.error("Failed to load challenges:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs font-bold">
              <Swords className="w-3.5 h-3.5" />
              <span>CURRICULUM CHALLENGE ARENAS</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white">
              Minecraft Training Scenarios & Leaderboards
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              5 distinct procedural arenas testing navigation, bridging, combat survival, and economy speedrun. Each arena assigns a recommended AI character and tracks high scores.
            </p>
          </div>

          <Link
            href="/demo"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs shadow-md shadow-emerald-500/20 transition"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Open 3D Voxel Lab</span>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
            <span className="ml-3 text-slate-400 font-mono text-sm">Loading challenges from Neon...</span>
          </div>
        )}

        {/* Challenges Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((ch, index) => (
              <div
                key={ch.id}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between hover:border-slate-700 transition shadow-lg"
              >
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-md">
                      {CHALLENGE_ICONS[ch.challengeType] || <Swords className="w-5 h-5 text-slate-400" />}
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono uppercase ${
                      DIFFICULTY_STYLES[ch.difficulty] || "bg-slate-800 text-slate-300"
                    }`}>
                      {ch.difficulty}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-white font-mono">{ch.title}</h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{ch.description}</p>
                  </div>

                  {/* Recommended Character */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs">
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-slate-400">Recommended Agent:</span>
                    <span className="text-purple-300 font-bold">{ch.character}</span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <Clock className="w-3.5 h-3.5 text-slate-500 mx-auto mb-1" />
                      <span className="text-slate-500 text-[10px] block">PAR TIME</span>
                      <div className="text-white font-bold mt-0.5">{ch.parTimeSeconds}s</div>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <Target className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                      <span className="text-slate-500 text-[10px] block">TARGET SCORE</span>
                      <div className="text-amber-400 font-bold mt-0.5">+{ch.targetScore}</div>
                    </div>
                  </div>

                  {/* Leaderboard Preview */}
                  {ch.scores && ch.scores.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-slate-500 text-[10px] font-bold font-mono uppercase">Top Scores:</span>
                      {ch.scores.slice(0, 2).map((score, idx) => (
                        <div key={score.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              idx === 0 ? "bg-amber-500/20 text-amber-300" : "bg-slate-800 text-slate-400"
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="text-slate-200 font-bold">{score.agentName}</span>
                          </div>
                          <span className="text-emerald-400 font-bold">{score.score} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Launch Button */}
                <div className="pt-3 border-t border-slate-800">
                  <Link
                    href={`/demo?challenge=${index}`}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs shadow-md shadow-emerald-500/20 transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Launch Arena Stage {index + 1}</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
