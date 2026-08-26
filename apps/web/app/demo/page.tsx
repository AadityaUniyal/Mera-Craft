"use client";

import React, { useState } from "react";
import VoxelCanvas, { InteractionMode, CameraPOVMode } from "@/components/voxel/VoxelCanvas";
import AgentHUD from "@/components/voxel/AgentHUD";
import PlaybackControls from "@/components/voxel/PlaybackControls";
import SensoryVisualizer from "@/components/voxel/SensoryVisualizer";
import ReplayViewer, { TrajectoryStep } from "@/components/voxel/ReplayViewer";
import { 
  Bot, 
  Terminal, 
  Sparkles, 
  HelpCircle, 
  MessageSquare, 
  Send,
  Loader2,
  MousePointerClick,
  Video,
  Volume2,
  VolumeX,
  Compass
} from "lucide-react";
import { ACTION_NAMES } from "@/lib/ai/browser-inference";
import { soundSynth } from "@/lib/audio/sound-synth";

export default function DemoPage() {
  const [seed, setSeed] = useState(42);
  const [curriculumLevel, setCurriculumLevel] = useState(2);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [modelVersion, setModelVersion] = useState("explorer_v2");
  const [stepTrigger, setStepTrigger] = useState(0);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("relocate_target");
  const [cameraMode, setCameraMode] = useState<CameraPOVMode>("orbit");
  const [movingTargetMode, setMovingTargetMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Live Telemetry State
  const [telemetry, setTelemetry] = useState({
    action: 0,
    probabilities: [0.82, 0.02, 0.04, 0.04, 0.06, 0.02, 0.0],
    reward: 0.0,
    cumulativeReward: 0.0,
    stepCount: 0,
    inventory: 0,
    inventoryWood: 0,
    inventoryIron: 0,
    inventoryDiamond: 0,
    totalDelivered: 0,
    stamina: 1.0,
    latencyMs: 0.85,
    confidence: 82.0,
    status: "running" as "running" | "goal_reached" | "timeout" | "paused",
    agentYaw: 0.0,
    targetAngle: 0.25,
    targetDistance: 5.4,
    observation: new Array(24).fill(0.5),
    trajectory: [] as TrajectoryStep[],
  });

  const [replayIndex, setReplayIndex] = useState(0);

  // LLM Explainability State
  const [explanation, setExplanation] = useState<string | null>(
    "The agent evaluates 8-directional spatial sensory rays, maneuvers around obstacle voxels, and approaches the resource block."
  );
  const [isExplaining, setIsExplaining] = useState(false);

  const handleTelemetryUpdate = (data: any) => {
    setTelemetry(data);
    setReplayIndex(data.trajectory.length - 1);
  };

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 90000) + 1000);
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundSynth.enabled = next;
  };

  const handleRequestExplanation = async () => {
    setIsExplaining(true);
    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: "Harvest voxel resources and deliver items to Base Hub",
          selectedAction: ACTION_NAMES[telemetry.action] || "Forward",
          actionId: telemetry.action,
          targetDistance: telemetry.targetDistance,
          targetAngleDeg: (telemetry.targetAngle * 180) / Math.PI,
          frontObstacleDist: (telemetry.observation[0] || 1.0) * 6.0,
          rewardDelta: telemetry.reward,
          modelVersion: modelVersion,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExplanation(data.explanation);
      }
    } catch (e) {
      console.warn("Failed to fetch explanation:", e);
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">3D Voxel AI Laboratory</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-semibold">
              Client-Side Autonomous Brain
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Interactive Manipulation &bull; Web Audio Synthesizer &bull; Multi-Camera POV Modes &bull; Base Hub Delivery
          </p>
        </div>

        {/* Action Controls & Explainability */}
        <div className="flex items-center gap-2">
          {/* Camera POV Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg font-mono text-xs">
            <Video className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <button
              onClick={() => setCameraMode("orbit")}
              className={`px-2 py-1 rounded transition ${cameraMode === "orbit" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"}`}
            >
              Orbit
            </button>
            <button
              onClick={() => setCameraMode("follow")}
              className={`px-2 py-1 rounded transition ${cameraMode === "follow" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"}`}
            >
              Follow
            </button>
            <button
              onClick={() => setCameraMode("first_person")}
              className={`px-2 py-1 rounded transition ${cameraMode === "first_person" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"}`}
            >
              1st-Person
            </button>
            <button
              onClick={() => setCameraMode("top_down")}
              className={`px-2 py-1 rounded transition ${cameraMode === "top_down" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"}`}
            >
              Top-Down
            </button>
          </div>

          <button
            onClick={handleRequestExplanation}
            disabled={isExplaining}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono transition"
          >
            {isExplaining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
            <span>Explain Action</span>
          </button>
        </div>
      </div>

      {/* Main Simulation Viewport & Sidebars */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 3D Simulation Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative h-[480px] w-full">
            <VoxelCanvas
              seed={seed}
              curriculumLevel={curriculumLevel}
              isPlaying={isPlaying}
              speed={speed}
              modelVersion={modelVersion}
              stepTrigger={stepTrigger}
              interactionMode={interactionMode}
              cameraMode={cameraMode}
              movingTargetMode={movingTargetMode}
              soundEnabled={soundEnabled}
              onTelemetryUpdate={handleTelemetryUpdate}
            />

            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-2 shadow-lg pointer-events-none">
              <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {interactionMode === "relocate_target" && "Click anywhere on map to relocate target!"}
                {interactionMode === "place_obstacle" && "Click tiles to place/remove stone walls!"}
                {interactionMode === "teleport_agent" && "Click anywhere to nudge/teleport agent!"}
              </span>
            </div>
          </div>

          {/* Interactive Playback & Manipulation Controls */}
          <PlaybackControls
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onStepForward={() => setStepTrigger((prev) => prev + 1)}
            onReset={() => {
              setSeed((s) => s);
              setStepTrigger((prev) => prev + 1);
            }}
            speed={speed}
            onSetSpeed={setSpeed}
            seed={seed}
            onSetSeed={setSeed}
            onRandomizeSeed={handleRandomizeSeed}
            curriculumLevel={curriculumLevel}
            onSetCurriculumLevel={setCurriculumLevel}
            modelVersion={modelVersion}
            onSetModelVersion={setModelVersion}
            interactionMode={interactionMode}
            onSetInteractionMode={setInteractionMode}
            movingTargetMode={movingTargetMode}
            onToggleMovingTarget={() => setMovingTargetMode(!movingTargetMode)}
          />

          {/* Trajectory Replay Scrubber */}
          <ReplayViewer
            trajectory={telemetry.trajectory}
            onSeek={setReplayIndex}
            currentStepIndex={replayIndex}
          />
        </div>

        {/* Telemetry Sidebars */}
        <div className="lg:col-span-4 space-y-4">
          <AgentHUD
            currentAction={telemetry.action}
            probabilities={telemetry.probabilities}
            cumulativeReward={telemetry.cumulativeReward}
            stepCount={telemetry.stepCount}
            inventory={telemetry.inventory}
            inventoryWood={telemetry.inventoryWood}
            inventoryIron={telemetry.inventoryIron}
            inventoryDiamond={telemetry.inventoryDiamond}
            totalDelivered={telemetry.totalDelivered}
            stamina={telemetry.stamina}
            latencyMs={telemetry.latencyMs}
            confidence={telemetry.confidence}
            status={telemetry.status}
            modelVersion={modelVersion}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            cameraMode={cameraMode}
            onSetCameraMode={setCameraMode}
          />

          <SensoryVisualizer
            observation={telemetry.observation}
            agentYaw={telemetry.agentYaw}
            targetAngle={telemetry.targetAngle}
            targetDistance={telemetry.targetDistance}
          />

          {/* LLM Observable Decision Reasoning */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-mono text-purple-400 font-semibold uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Observable Action Reasoning</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Spatial Telemetry Grounding</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
              {explanation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
