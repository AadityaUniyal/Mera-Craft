"use client";

import React from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Brain, 
  Terminal, 
  Layers, 
  ShieldCheck, 
  HelpCircle, 
  FileCode,
  Zap,
  Code,
  Sparkles
} from "lucide-react";

export default function DocsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#34d399]" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              MINDCRAFT ENGINEERING & MATHEMATICAL SPECIFICATION
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            42-Dim Sensory Perception &bull; Residual Spatial-Kinematic Actor-Critic &bull; Continuous PPO & GAE
          </p>
        </div>

        <Link
          href="/trainer"
          className="mc-btn mc-btn-primary text-[10px]"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>OPEN LIVE RL TRAINER</span>
        </Link>
      </div>

      {/* Section 1: Embodied AI Formulation */}
      <div className="mc-panel-stone p-6 space-y-4 shadow-xl">
        <h2 className="font-pixel text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <Brain className="w-4 h-4 text-[#34d399]" />
          <span>1. Embodied AI Problem Formulation</span>
        </h2>
        <p className="font-mono text-xs text-[#cbd5e1] leading-relaxed">
          MINDCRAFT implements genuine <strong>Embodied Artificial Intelligence</strong> in a 3D Minecraft voxel environment. 
          The agent perceives the world through a 42-dimensional multimodal observation vector containing 8-directional laser LiDAR obstacle rays, 8-directional lava/water hazard detectors, 4-directional Creeper proximity vectors, target delta vectors, and somatic vitals (health, hunger, and inventory capacity).
        </p>

        <div className="bg-[#12151e] p-4 border-2 border-[#1e2330] font-mono text-xs space-y-1.5">
          <div className="text-[#34d399] font-bold font-pixel text-[9px]">SYSTEM ARCHITECTURE LIFECYCLE:</div>
          <div>1. <strong>OFFLINE TRAINING:</strong> PyTorch continuous PPO with GAE (<code className="text-white">train.py --resume</code>) on CUDA GPUs.</div>
          <div>2. <strong>COMPILATION:</strong> Export to optimized ONNX computational graph with standardized LayerNorm.</div>
          <div>3. <strong>CLIENT EVALUATION:</strong> Sub-millisecond client-side browser inference via ONNX Runtime WebAssembly.</div>
          <div>4. <strong>TELEMETRY SYNC:</strong> Real-time session analytics and leaderboard scores synchronized to Neon PostgreSQL.</div>
        </div>
      </div>

      {/* Section 2: PPO Algorithm & GAE */}
      <div className="mc-panel-stone p-6 space-y-4 shadow-xl">
        <h2 className="font-pixel text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <FileCode className="w-4 h-4 text-[#38bdf8]" />
          <span>2. Proximal Policy Optimization (PPO) & GAE Math</span>
        </h2>
        <p className="font-mono text-xs text-[#cbd5e1] leading-relaxed">
          The policy is optimized using clipped surrogate objectives to avoid destructive updates during reinforcement learning iterations:
        </p>

        <div className="bg-[#12151e] p-4 border-2 border-[#1e2330] font-mono text-xs text-slate-200 overflow-x-auto space-y-2">
          <div className="text-[#38bdf8] font-bold font-pixel text-[9px]">SURROGATE OBJECTIVE LOSS FUNCTION:</div>
          <div className="text-[#38bdf8] bg-[#0b0d13] p-3 border border-[#32394a]">
            L_CLIP(θ) = E_t [ min( r_t(θ) * A_t, clip(r_t(θ), 1 - ε, 1 + ε) * A_t ) ]
          </div>
          <div className="text-[#94a3b8] text-[11px]">
            where r_t(θ) = π_θ(a_t | s_t) / π_θ_old(a_t | s_t) and A_t is the Generalized Advantage Estimation (γ = 0.99, λ = 0.95).
          </div>
        </div>
      </div>

      {/* Section 3: 42-Dimensional Sensory Perception */}
      <div className="mc-panel-stone p-6 space-y-4 shadow-xl">
        <h2 className="font-pixel text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>3. 42-Dimensional Spatial & Somatic Observation Vector</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="bg-[#12151e] p-4 border-2 border-[#1e2330] space-y-2">
            <span className="font-pixel text-[9px] text-amber-400 block">SPATIAL SENSORY INPUTS (42 FLOATS):</span>
            <ul className="text-[#94a3b8] space-y-1 text-[11px]">
              <li>&bull; <strong className="text-white">obs[0..7]:</strong> 8-directional laser LiDAR obstacle distances</li>
              <li>&bull; <strong className="text-white">obs[8..15]:</strong> 8-directional diamond/target raycast flags</li>
              <li>&bull; <strong className="text-white">obs[16..19]:</strong> 4-directional lava/water hazard proximity sensors</li>
              <li>&bull; <strong className="text-white">obs[20..23]:</strong> 4-directional hostile Creeper threat vectors</li>
              <li>&bull; <strong className="text-white">obs[24..26]:</strong> Relative target displacement (dx, dy, dz)</li>
              <li>&bull; <strong className="text-white">obs[27..29]:</strong> Normalized distance to base depot</li>
              <li>&bull; <strong className="text-white">obs[30..31]:</strong> Agent yaw orientation (sin ψ, cos ψ)</li>
              <li>&bull; <strong className="text-white">obs[32..35]:</strong> Crafting graph state (wood, pickaxe, iron, diamond)</li>
              <li>&bull; <strong className="text-white">obs[36..38]:</strong> Bridge block inventory & time ratio</li>
              <li>&bull; <strong className="text-white">obs[39..41]:</strong> Somatic vitals (Health, Hunger, Sneak state)</li>
            </ul>
          </div>

          <div className="bg-[#12151e] p-4 border-2 border-[#1e2330] space-y-2">
            <span className="font-pixel text-[9px] text-[#34d399] block">10 DISCRETE ACTION OUTPUTS:</span>
            <ul className="text-[#94a3b8] space-y-1 text-[11px]">
              <li>&bull; <strong className="text-white">Action 0:</strong> Walk Forward (0.40 blocks/tick)</li>
              <li>&bull; <strong className="text-white">Action 1:</strong> Sprint Forward (0.65 blocks/tick)</li>
              <li>&bull; <strong className="text-white">Action 2:</strong> Backward Retreat (0.25 blocks/tick)</li>
              <li>&bull; <strong className="text-white">Action 3:</strong> Turn Left (0.35 rad)</li>
              <li>&bull; <strong className="text-white">Action 4:</strong> Turn Right (0.35 rad)</li>
              <li>&bull; <strong className="text-white">Action 5:</strong> Jump Parkour (Vertical & Momentum)</li>
              <li>&bull; <strong className="text-white">Action 6:</strong> Sneak Crouch (Edge-clamping protection)</li>
              <li>&bull; <strong className="text-white">Action 7:</strong> Mine Voxel (Extract Wood / Ore / Diamond)</li>
              <li>&bull; <strong className="text-white">Action 8:</strong> Place Bridge Block (Cobblestone over lava/water)</li>
              <li>&bull; <strong className="text-white">Action 9:</strong> Craft / Eat / Deposit (Execute progression graph)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 4: Technical Interview Defense */}
      <div className="mc-panel-stone p-6 space-y-4 shadow-xl">
        <h2 className="font-pixel text-sm sm:text-base font-bold text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-purple-400" />
          <span>4. Machine Learning Engineering Architectural Q&A</span>
        </h2>

        <div className="space-y-3 font-mono text-xs">
          <div className="bg-[#12151e] p-3 border border-[#1e2330] space-y-1">
            <h4 className="font-pixel text-[10px] text-white">Q: Why use client-side ONNX Runtime Web rather than streaming from a GPU server?</h4>
            <p className="text-[#94a3b8] text-[11px] leading-relaxed">
              Evaluating the 42-dim neural network locally in WASM provides deterministic sub-millisecond inference (~0.95ms) with zero round-trip network jitter, allowing smooth 60 FPS real-time physical simulation without incurring backend GPU hosting costs.
            </p>
          </div>

          <div className="bg-[#12151e] p-3 border border-[#1e2330] space-y-1">
            <h4 className="font-pixel text-[10px] text-white">Q: How does the agent avoid falling into lava or water without hardcoding?</h4>
            <p className="text-[#94a3b8] text-[11px] leading-relaxed">
              Hazard sensors obs[16..19] encode ground depth and voxel matter states. During PPO curriculum training, stepping into lava/water incurs a heavy negative penalty (-20.0), while placing bridge blocks (Action 8) when hazard flags are high yields positive potential rewards (+6.0), causing the policy to autonomously discover safe bridging.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
