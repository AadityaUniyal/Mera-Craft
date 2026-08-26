"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Sliders, 
  Activity, 
  TrendingUp, 
  Layers, 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  FileSpreadsheet,
  AlertCircle,
  Brain,
  Zap,
  Target
} from "lucide-react";
import { BrowserRLTrainer, RLHyperparameters, TrainingMetricsSnapshot, BrainDiagnosticEvent } from "@/lib/ai/browser-rl-trainer";
import { soundSynth } from "@/lib/audio/sound-synth";

export default function TrainerPage() {
  const trainerRef = useRef<BrowserRLTrainer>(new BrowserRLTrainer());
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<TrainingMetricsSnapshot>(trainerRef.current.getSnapshot());
  const [diagnostics, setDiagnostics] = useState<BrainDiagnosticEvent[]>([]);
  const [hyperparams, setHyperparams] = useState<RLHyperparameters>(trainerRef.current.hyperparams);

  // Simulation step loop in browser
  const simStepRef = useRef<() => void>(() => {});
  simStepRef.current = () => {
    if (!trainerRef.current.isTraining) return;

    const trainer = trainerRef.current;
    const obs = new Float32Array(42);

    // Synthetic observation based on training subject
    const subject = trainer.hyperparams.trainingSubject;
    for (let i = 0; i < 42; i++) obs[i] = Math.random() * 0.8;

    if (subject === "steve_river") {
      obs[16] = Math.random() > 0.6 ? 1.0 : 0.0; // Water hazard sensor
      obs[26] = 0.5; // Target diamond distance
    } else if (subject === "creeper_stalker") {
      obs[20] = 0.8; // Villager distance
      obs[26] = 0.3; // Stalking approach
    } else if (subject === "villager_evasion") {
      obs[20] = 0.9; // Creeper proximity
    }

    const { probs, value } = trainer.forward(obs);
    const { action, logprob } = trainer.sampleAction(probs);

    let reward = -0.01;
    let done = false;
    let feedback: { type: "RIGHT" | "WRONG" | "INSIGHT" | "COMPLETION"; reason: string; actionName: string } | undefined;

    const actionNames = ["Walk", "Sprint", "Backward", "Turn Left", "Turn Right", "Jump", "Sneak Crouch", "Mine", "Place Bridge", "Deposit"];
    const actionName = actionNames[action] || "Action";

    if (subject === "steve_river") {
      if (obs[16] > 0.5 && action === 8) {
        reward = +6.0;
        feedback = { type: "RIGHT", actionName, reason: "Placed bridge block before water hazard edge" };
      } else if (obs[16] > 0.5 && (action === 0 || action === 1)) {
        reward = -8.0;
        done = true;
        feedback = { type: "WRONG", actionName, reason: "Fell into deep water current without bridging" };
      } else if (action === 6) {
        reward = +1.5;
        feedback = { type: "INSIGHT", actionName, reason: "Engaged safe sneak clamping to protect edge" };
      } else if (Math.random() < 0.05) {
        reward = +25.0;
        done = true;
        feedback = { type: "COMPLETION", actionName, reason: "Successfully crossed river and extracted diamond!" };
      }
    } else if (subject === "creeper_stalker") {
      if (action === 1) {
        reward = +3.0;
        feedback = { type: "RIGHT", actionName, reason: "Closed distance to villager via silent sprint" };
      } else if (action === 0 && Math.random() < 0.1) {
        reward = +20.0;
        done = true;
        feedback = { type: "COMPLETION", actionName, reason: "Triggered 1.3m fuse explosion on villager target!" };
      }
    } else {
      if (action === 2 || action === 3 || action === 4) {
        reward = +4.0;
        feedback = { type: "RIGHT", actionName, reason: "Executed 180° retreat maneuver away from hissed creeper" };
      }
    }

    trainer.recordStep(obs, action, logprob, reward, value, done, feedback);
    setMetrics(trainer.getSnapshot());
    setDiagnostics([...trainer.diagnosticLogs]);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTraining) {
      trainerRef.current.isTraining = true;
      interval = setInterval(() => {
        simStepRef.current();
      }, Math.max(10, 100 / hyperparams.simSpeed));
    } else {
      trainerRef.current.isTraining = false;
    }
    return () => clearInterval(interval);
  }, [isTraining, hyperparams.simSpeed]);

  const toggleTraining = () => {
    setIsTraining(!isTraining);
    if (!isTraining) soundSynth.playLevelUp();
    else soundSynth.playBlockBreak();
  };

  const handleReset = () => {
    setIsTraining(false);
    trainerRef.current = new BrowserRLTrainer();
    trainerRef.current.hyperparams = hyperparams;
    setMetrics(trainerRef.current.getSnapshot());
    setDiagnostics([]);
    soundSynth.playBlockBreak();
  };

  const handleExportCSV = () => {
    const csv = trainerRef.current.exportCSVReport();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brain_telemetry_${hyperparams.trainingSubject}_step${metrics.globalStep}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    soundSynth.playDiamondChime();
  };

  const handleExportBrainJSON = () => {
    const json = trainerRef.current.exportBrainJSON();
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindcraft_brain_${hyperparams.trainingSubject}_step${metrics.globalStep}.json`;
    a.click();
    URL.revokeObjectURL(url);
    soundSynth.playLevelUp();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Brain className="w-6 h-6 text-[#34d399] animate-pulse" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              LIVE REINFORCEMENT LEARNING LAB
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            Train neural Actor-Critic policies in real-time &bull; Continuous reward feedback &bull; Exportable Brain weights
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTraining}
            className={`mc-btn ${isTraining ? "mc-btn-danger" : "mc-btn-primary"} text-xs px-4 py-2 flex items-center gap-2`}
          >
            {isTraining ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isTraining ? "PAUSE TRAINING" : "START LIVE TRAINING"}</span>
          </button>

          <button
            onClick={handleReset}
            className="mc-btn mc-btn-stone text-xs py-2 px-3"
            title="Reset Policy"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="mc-panel-stone p-3">
          <span className="text-[#64748b] block font-pixel text-[8px]">GLOBAL STEPS:</span>
          <span className="text-white font-bold text-base">{metrics.globalStep.toLocaleString()}</span>
        </div>
        <div className="mc-panel-stone p-3">
          <span className="text-[#64748b] block font-pixel text-[8px]">PPO MINI-BATCH UPDATES:</span>
          <span className="text-[#38bdf8] font-bold text-base">{metrics.updateCount}</span>
        </div>
        <div className="mc-panel-stone p-3">
          <span className="text-[#64748b] block font-pixel text-[8px]">MEAN EPISODE REWARD:</span>
          <span className="text-[#34d399] font-bold text-base">+{metrics.meanReward.toFixed(2)}</span>
        </div>
        <div className="mc-panel-stone p-3">
          <span className="text-[#64748b] block font-pixel text-[8px]">RECENT SUCCESS RATE:</span>
          <span className="text-amber-400 font-bold text-base">{metrics.recentSuccessRate.toFixed(1)}%</span>
        </div>
      </div>

      {/* Main Grid: Subject & Hyperparameters + Brain Diagnostics Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hyperparameter Controls */}
        <div className="mc-panel-stone p-5 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#141720] pb-2">
            <h2 className="font-pixel text-xs font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#34d399]" />
              <span>TRAINING REGIME & CONTROLS</span>
            </h2>
          </div>

          {/* Subject Selector */}
          <div className="space-y-1.5 font-mono text-xs">
            <label className="font-pixel text-[8px] text-[#94a3b8] block uppercase">TRAINING SUBJECT & SCENARIO:</label>
            <select
              value={hyperparams.trainingSubject}
              onChange={(e) => {
                const sub = e.target.value as any;
                setHyperparams({ ...hyperparams, trainingSubject: sub });
                trainerRef.current.hyperparams.trainingSubject = sub;
              }}
              className="w-full bg-[#12151e] border-2 border-[#3b4458] px-3 py-2 text-white font-mono text-xs focus:border-[#10b981] outline-none"
            >
              <option value="steve_river">🌊 Steve & Alex — River Crossing & Bridging</option>
              <option value="creeper_stalker">💥 Creeper AI — Silent Stalking & Fuse Timing</option>
              <option value="villager_evasion">🧑‍🌾 Villager AI — Evasion & Threat Retreat</option>
            </select>
          </div>

          {/* Sliders */}
          <div className="space-y-3 font-mono text-xs bg-[#12151e] p-3 border border-[#1e2330]">
            <div>
              <div className="flex justify-between text-[11px] text-[#94a3b8]">
                <span>Simulation Speed</span>
                <span className="text-white font-bold">{hyperparams.simSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6.0"
                step="0.5"
                value={hyperparams.simSpeed}
                onChange={(e) => setHyperparams({ ...hyperparams, simSpeed: parseFloat(e.target.value) })}
                className="w-full accent-[#10b981]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-[#94a3b8]">
                <span>Learning Rate</span>
                <span className="text-[#38bdf8] font-bold">{hyperparams.learningRate}</span>
              </div>
              <input
                type="range"
                min="0.00005"
                max="0.001"
                step="0.00005"
                value={hyperparams.learningRate}
                onChange={(e) => {
                  const lr = parseFloat(e.target.value);
                  setHyperparams({ ...hyperparams, learningRate: lr });
                  trainerRef.current.hyperparams.learningRate = lr;
                }}
                className="w-full accent-[#38bdf8]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-[#94a3b8]">
                <span>Discount Factor (&gamma;)</span>
                <span className="text-amber-400 font-bold">{hyperparams.gamma}</span>
              </div>
              <input
                type="range"
                min="0.90"
                max="0.999"
                step="0.005"
                value={hyperparams.gamma}
                onChange={(e) => {
                  const g = parseFloat(e.target.value);
                  setHyperparams({ ...hyperparams, gamma: g });
                  trainerRef.current.hyperparams.gamma = g;
                }}
                className="w-full accent-amber-400"
              />
            </div>
          </div>

          {/* Export Brain Buttons */}
          <div className="pt-2 border-t-2 border-[#141720] space-y-2">
            <button
              onClick={handleExportCSV}
              className="mc-btn mc-btn-primary text-[9px] w-full py-2 flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-black" />
              <span>EXPORT BRAIN TELEMETRY (.CSV)</span>
            </button>

            <button
              onClick={handleExportBrainJSON}
              className="mc-btn mc-btn-diamond text-[9px] w-full py-2 flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-black" />
              <span>SAVE BRAIN WEIGHTS (.JSON)</span>
            </button>
          </div>
        </div>

        {/* Live Brain Diagnostics Feedback Log */}
        <div className="lg:col-span-2 mc-panel-stone p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b-2 border-[#141720] pb-2 mb-3">
              <h2 className="font-pixel text-xs font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#34d399] animate-pulse" />
                <span>REAL-TIME BRAIN DIAGNOSTICS & WHAT IT IS LEARNING</span>
              </h2>
              <span className="font-mono text-[10px] text-[#94a3b8]">Live Stream</span>
            </div>

            {/* Diagnostic Events Feed */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {diagnostics.length === 0 ? (
                <div className="text-center py-16 font-mono text-xs text-[#64748b]">
                  Click &ldquo;START LIVE TRAINING&rdquo; to watch the neural policy evolve and evaluate actions in real-time...
                </div>
              ) : (
                diagnostics.map((d) => {
                  const isRight = d.type === "RIGHT" || d.type === "COMPLETION";
                  const isWrong = d.type === "WRONG";

                  return (
                    <div
                      key={d.id}
                      className={`p-2.5 border-2 font-mono text-xs flex items-start justify-between gap-3 ${
                        isRight
                          ? "border-[#10b981] bg-[#10b981]/10 text-slate-100"
                          : isWrong
                          ? "border-red-500 bg-red-950/20 text-rose-200"
                          : "border-[#38bdf8] bg-[#38bdf8]/10 text-slate-200"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 font-pixel text-[8px]">
                          <span className={isRight ? "text-[#34d399]" : isWrong ? "text-rose-400" : "text-[#38bdf8]"}>
                            [{d.type}]
                          </span>
                          <span className="text-[#94a3b8]">Step #{d.step} &bull; Action: {d.actionName}</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">{d.reason}</p>
                      </div>

                      <div className="text-right whitespace-nowrap font-pixel text-[9px]">
                        <span className={d.rewardDelta >= 0 ? "text-[#34d399]" : "text-rose-400"}>
                          {d.rewardDelta >= 0 ? `+${d.rewardDelta.toFixed(1)}` : d.rewardDelta.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t-2 border-[#141720] font-mono text-[10px] text-[#94a3b8] flex justify-between">
            <span>Actor-Critic Loss: <strong className="text-white">{metrics.policyLoss.toFixed(4)}</strong></span>
            <span>Entropy Regularization: <strong className="text-amber-400">{metrics.entropy.toFixed(3)}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
