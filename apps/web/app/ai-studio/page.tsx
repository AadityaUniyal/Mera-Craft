"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MinecraftAvatar } from "@/components/common/MinecraftAvatar";
import {
  Brain,
  Play,
  Download,
  TrendingUp,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { soundFx } from "@/lib/audio-synthesizer";

export default function AIStudioPage() {
  const [selectedChar, setSelectedChar] = useState("explorer");
  const [selectedAlgo, setSelectedAlgo] = useState("DAGGER_DISTILLATION");
  const [curriculumLevel, setCurriculumLevel] = useState(3);
  const [epochs, setEpochs] = useState(10);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingResult, setTrainingResult] = useState<any>(null);

  const characters = [
    {
      id: "explorer",
      name: "Explorer",
      role: "Autonomous Scout",
      desc: "Spatial Attention policy for chasm crossing & hazard evasion.",
      avatar: "Steve",
    },
    {
      id: "guardian",
      name: "Guardian",
      role: "Tactical Defender",
      desc: "Interception policy for Creeper evasion & perimeter defense.",
      avatar: "Alex",
    },
    {
      id: "builder",
      name: "Builder",
      role: "Structural Engineer",
      desc: "Bridging policy for cobblestone placement & wall construction.",
      avatar: "Builder",
    },
    {
      id: "survivor",
      name: "Survivor",
      role: "Resource Specialist",
      desc: "Economy policy for wood/iron/diamond harvesting loop.",
      avatar: "Survivor",
    },
  ];

  const handleStartTraining = async () => {
    setIsTraining(true);
    setTrainingResult(null);
    soundFx.playPlaceBlock(0);

    try {
      const res = await fetch("/api/ai/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          character: selectedChar,
          algorithm: selectedAlgo,
          epochs,
          curriculumLevel,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTrainingResult(data);
        soundFx.playLevelVictory();
      }
    } catch {
      // Handle error
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-black">
      <Navbar />

      <main className="flex-1 px-4 py-8 md:px-8 max-w-7xl mx-auto w-full">
        {/* Hero Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-widest text-cyan-400">
              <Brain className="h-4 w-4" />
              <span>Embodied AI Training Studio</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl mt-1">
              Neural Policy <span className="text-cyan-400">Distillation Lab</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Train, distill, and export lightweight Spatial Attention & GRU neural policies live in your browser
              using consumer-grade CPU/GPU algorithms.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-xs font-mono text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Compute Engine: 15,000+ FPS
            </span>
          </div>
        </div>

        {/* Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Character & Training Config */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* 1. Character Selector */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono mb-3">
                1. Select AI Character Policy
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedChar(char.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 ${
                      selectedChar === char.id
                        ? "border-cyan-500 bg-cyan-950/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        : "border-white/5 bg-slate-950/40 hover:border-white/20 hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <MinecraftAvatar usernameOrUuid={char.avatar} size={28} />
                      <div>
                        <div className="font-bold text-xs text-white">{char.name}</div>
                        <div className="text-[10px] text-cyan-400 font-mono">{char.role}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">{char.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Training Hyperparameters */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-mono mb-4">
                2. Training Hyperparameters
              </h2>

              <div className="flex flex-col gap-4 text-xs font-mono">
                {/* Algorithm Choice */}
                <div>
                  <label className="text-slate-400 block mb-1.5">Algorithm Paradigm:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "DAGGER_DISTILLATION", label: "DAGGER Distillation (Fast)" },
                      { id: "PPO_REINFORCEMENT", label: "PPO RL Rollouts" },
                    ].map((algo) => (
                      <button
                        key={algo.id}
                        onClick={() => setSelectedAlgo(algo.id)}
                        className={`py-2 px-2.5 rounded-lg border text-center transition-all ${
                          selectedAlgo === algo.id
                            ? "border-cyan-400 bg-cyan-500/20 text-cyan-200 font-bold"
                            : "border-white/10 bg-slate-950/60 text-slate-400 hover:text-white"
                        }`}
                      >
                        {algo.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Curriculum Level */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Curriculum Difficulty:</span>
                    <span className="text-cyan-400 font-bold">Tier {curriculumLevel} / 5</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={curriculumLevel}
                    onChange={(e) => setCurriculumLevel(Number(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-800"
                  />
                </div>

                {/* Epochs */}
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Training Epochs:</span>
                    <span className="text-cyan-400 font-bold">{epochs} Epochs</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={epochs}
                    onChange={(e) => setEpochs(Number(e.target.value))}
                    className="w-full accent-cyan-400 bg-slate-800"
                  />
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleStartTraining}
                disabled={isTraining}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-sm font-bold text-black transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] disabled:opacity-50"
              >
                {isTraining ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-black" />
                    <span>Distilling Neural Weights...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-black" />
                    <span>Start Training Run</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Live Telemetry & Model Metrics */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="flex-1 rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white font-mono">
                    <Activity className="h-4 w-4 text-cyan-400" />
                    <span>Live Convergence Telemetry</span>
                  </div>
                  {trainingResult && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Training Complete
                    </span>
                  )}
                </div>

                {/* Live Stats */}
                {trainingResult ? (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-center">
                        <div className="text-[10px] font-mono text-slate-400">EXPERT ACCURACY</div>
                        <div className="text-2xl font-black text-emerald-400 font-mono mt-0.5">
                          {trainingResult.finalAccuracy}%
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-center">
                        <div className="text-[10px] font-mono text-slate-400">FINAL LOSS</div>
                        <div className="text-2xl font-black text-cyan-400 font-mono mt-0.5">
                          {trainingResult.finalLoss}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-center">
                        <div className="text-[10px] font-mono text-slate-400">PEAK REWARD</div>
                        <div className="text-2xl font-black text-indigo-400 font-mono mt-0.5">
                          +{trainingResult.peakReward}
                        </div>
                      </div>
                    </div>

                    {/* Progress Table / Loss Curve */}
                    <div className="rounded-xl border border-white/5 bg-slate-950/80 p-4 font-mono text-xs">
                      <div className="text-slate-400 mb-2 border-b border-white/5 pb-1">
                        Epoch Iteration Logs:
                      </div>
                      <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pr-2">
                        {trainingResult.history.map((h: any) => (
                          <div key={h.epoch} className="flex justify-between text-slate-300 py-0.5">
                            <span className="text-cyan-400 font-bold">Epoch {String(h.epoch).padStart(2, "0")}</span>
                            <span>Loss: {h.loss}</span>
                            <span className="text-emerald-400">Accuracy: {h.accuracy}%</span>
                            <span className="text-indigo-400">Rew: +{h.reward}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Brain className="h-16 w-16 text-slate-700 animate-pulse mb-3" />
                    <h3 className="text-base font-semibold text-slate-300">Ready to Train</h3>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Configure your character and algorithm on the left, then click "Start Training Run" to observe real-time neural convergence.
                    </p>
                  </div>
                )}
              </div>

              {/* Export Button */}
              {trainingResult && (
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="text-xs font-mono text-slate-400">
                    Model Ready: <span className="text-cyan-400">{trainingResult.modelUri}</span>
                  </div>
                  <a
                    href={trainingResult.modelUri}
                    download
                    className="flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download ONNX Weights</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
