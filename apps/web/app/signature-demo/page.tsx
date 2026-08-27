"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Shuffle, 
  Sliders, 
  Cpu, 
  Layers,
  ArrowRight,
  Zap,
  Activity
} from "lucide-react";
import VoxelCanvas from "@/components/voxel/VoxelCanvas";
import { soundSynth } from "@/lib/audio/sound-synth";

export default function SignatureDemoPage() {
  const [modelMode, setModelMode] = useState<"explorer_v1" | "explorer_v2">("explorer_v2");
  const [unseenSeed, setUnseenSeed] = useState(5001);
  const [riverWidth, setRiverWidth] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepTrigger, setStepTrigger] = useState(0);

  const [telemetry, setTelemetry] = useState({
    action: 0,
    probabilities: [] as number[],
    reward: 0,
    cumulativeReward: 0,
    stepCount: 0,
    health: 1.0,
    stamina: 1.0,
    inventoryDiamond: 0,
    latencyMs: 1.02,
    confidence: 88,
    status: "idle" as any,
  });

  const handleRandomizeUnseen = () => {
    const nextSeed = Math.floor(5000 + Math.random() * 50);
    setUnseenSeed(nextSeed);
    setIsPlaying(false);
    setStepTrigger((prev) => prev + 1);
  };

  const handleTogglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setStepTrigger((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>THE SIGNATURE ML DEMO — SECTION 46</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white">
              Champion vs Candidate: Generalization on Unseen Rivers
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl">
              Compare baseline <span className="text-rose-400 font-bold font-mono">Explorer v1</span> (which memorized coordinates and falls into rivers) against production <span className="text-emerald-400 font-bold font-mono">Explorer v2</span> (trained via Curriculum PPO & potential hazard barriers to solve arbitrary unseen river crossings).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRandomizeUnseen}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-xs font-bold transition shadow-sm"
            >
              <Shuffle className="w-4 h-4 text-cyan-400" />
              <span>Next Unseen Map (Seed {unseenSeed})</span>
            </button>
          </div>
        </div>

        {/* Model Toggle Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => { setModelMode("explorer_v1"); setStepTrigger((p) => p + 1); }}
            className={`p-5 rounded-2xl border text-left transition relative ${
              modelMode === "explorer_v1"
                ? "bg-rose-950/30 border-rose-500/80 shadow-lg shadow-rose-950/50"
                : "bg-slate-900/50 border-slate-800 hover:border-slate-700 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-mono text-xs font-bold border border-rose-500/40">
                BASELINE: Explorer v1
              </span>
              <span className="text-xs font-mono text-rose-400 font-bold">42.0% Success Rate</span>
            </div>
            <h3 className="text-base font-bold text-white mt-2">Unconditioned Baseline Model</h3>
            <p className="text-xs text-slate-400 mt-1">
              Memorized static coordinates. Fails when river width or bridge position changes, falling into water hazard.
            </p>
          </button>

          <button
            onClick={() => { setModelMode("explorer_v2"); setStepTrigger((p) => p + 1); }}
            className={`p-5 rounded-2xl border text-left transition relative ${
              modelMode === "explorer_v2"
                ? "bg-emerald-950/30 border-emerald-500/80 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/50"
                : "bg-slate-900/50 border-slate-800 hover:border-slate-700 opacity-70"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40">
                CANDIDATE / ACTIVE: Explorer v2
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">88.5% Success Rate</span>
            </div>
            <h3 className="text-base font-bold text-white mt-2">Curriculum PPO + Potential Barrier</h3>
            <p className="text-xs text-slate-400 mt-1">
              Generalizes across variable river widths (3 to 6 blocks) using safe edge sneaking and spatial raycast routing.
            </p>
          </button>
        </div>

        {/* Live Simulation Viewport */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-4">
            <div className="relative h-[500px] w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
              <VoxelCanvas
                seed={unseenSeed}
                curriculumLevel={5}
                isPlaying={isPlaying}
                speed={1.0}
                modelVersion={modelMode}
                stepTrigger={stepTrigger}
                onTelemetryUpdate={(d) => setTelemetry(d as any)}
              />

              {/* Status Overlay */}
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 font-mono text-xs text-slate-200 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>ACTIVE MODEL: <strong className="text-emerald-400 uppercase">{modelMode}</strong></span>
                <span className="text-slate-500">|</span>
                <span>MAP SEED: <strong className="text-amber-400">{unseenSeed}</strong></span>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/90 border border-slate-800 font-mono text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTogglePlay}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition shadow-md ${
                    isPlaying
                      ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                      : "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                  <span>{isPlaying ? "Pause" : "Run Unseen Scenario"}</span>
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  <span>Respawn</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Procedural River Width:</span>
                {[3, 4, 5, 6].map((w) => (
                  <button
                    key={w}
                    onClick={() => { setRiverWidth(w); handleReset(); }}
                    className={`px-2.5 py-1 rounded-lg border font-bold transition ${
                      riverWidth === w
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {w} Blocks
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Telemetry & Quantitative Comparison Metrics */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white uppercase">Live Inference Telemetry</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  telemetry.status === "goal_reached" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-slate-800 text-slate-400"
                }`}>
                  {telemetry.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px]">CUMULATIVE REWARD</span>
                  <div className={`font-bold text-xs mt-0.5 ${telemetry.cumulativeReward >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {telemetry.cumulativeReward >= 0 ? `+${telemetry.cumulativeReward.toFixed(2)}` : telemetry.cumulativeReward.toFixed(2)}
                  </div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px]">INFERENCE LATENCY</span>
                  <div className="text-amber-300 font-bold text-xs mt-0.5">{telemetry.latencyMs.toFixed(2)} ms</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px]">SIMULATION STEP</span>
                  <div className="text-slate-200 font-bold text-xs mt-0.5">{telemetry.stepCount}</div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 text-[10px]">DIAMONDS COLLECTED</span>
                  <div className="text-cyan-400 font-bold text-xs mt-0.5">{telemetry.inventoryDiamond}</div>
                </div>
              </div>

              {/* Benchmark Comparison Table */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <span className="text-slate-400 text-[11px] font-bold">50 Held-Out River Seeds Audit:</span>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Success Rate Delta:</span>
                    <span className="text-emerald-400 font-bold">+46.5% Improvement</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">River Hazard Reduction:</span>
                    <span className="text-emerald-400 font-bold">-100% Falls Eliminated</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Release Gate Status:</span>
                    <span className="text-emerald-400 font-bold">[PASSED & PROMOTED]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
