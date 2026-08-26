"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import * as THREE from "three";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Cpu, 
  Activity, 
  TrendingUp, 
  Zap, 
  Sparkles, 
  Save, 
  Download, 
  Sliders, 
  Layers, 
  CheckCircle2, 
  Flame, 
  Trophy, 
  StepForward, 
  BrainCircuit,
  Terminal,
  ShieldCheck
} from "lucide-react";
import { BrowserRLTrainer, TrainingMetricsSnapshot } from "@/lib/ai/browser-rl-trainer";
import { soundSynth } from "@/lib/audio/sound-synth";
import { ACTION_NAMES } from "@/lib/ai/browser-inference";

export default function TrainingLabPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const trainerRef = useRef<BrowserRLTrainer>(new BrowserRLTrainer());

  const [isTraining, setIsTraining] = useState(false);
  const [curriculumStage, setCurriculumStage] = useState(1); // 1: Lava Bridging
  const [learningRate, setLearningRate] = useState(0.0003);
  const [gamma, setGamma] = useState(0.99);
  const [gaeLambda, setGaeLambda] = useState(0.95);
  const [clipCoef, setClipCoef] = useState(0.2);
  const [entropyCoef, setEntropyCoef] = useState(0.02);
  const [simSpeed, setSimSpeed] = useState(2.0);
  const [batchSize, setBatchSize] = useState(64);

  const [metrics, setMetrics] = useState<TrainingMetricsSnapshot>({
    globalStep: 0,
    updateCount: 0,
    meanReward: 0.0,
    recentSuccessRate: 0.0,
    policyLoss: 0.0,
    valueLoss: 0.0,
    entropy: 2.3,
    sps: 0,
    learningRate: 0.0003,
    rewardHistory: [],
    policyLossHistory: [],
    valueLossHistory: [],
    entropyHistory: [],
    successHistory: [],
  });

  const [lastAction, setLastAction] = useState(0);
  const [lastConfidence, setLastConfidence] = useState(0);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // 3D Three.js Environment Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const agentMeshRef = useRef<THREE.Group | null>(null);
  const blocksGroupRef = useRef<THREE.Group | null>(null);
  const rayLinesGroupRef = useRef<THREE.Group | null>(null);

  // Sim State
  const envState = useRef({
    gridSize: 16,
    agentPos: [3.5, 0.0, 8.0] as [number, number, number],
    agentYaw: 0.0,
    targetPos: [12.5, 0.0, 8.0] as [number, number, number],
    grid: [] as number[][],
    stepCount: 0,
    episodeReward: 0.0,
    health: 1.0,
    bridgeBlocks: 16,
  });

  // Re-build 3D Arena Terrain based on Curriculum Stage
  const rebuildTerrain = useCallback(() => {
    const s = envState.current;
    s.grid = Array.from({ length: s.gridSize }, () => Array(s.gridSize).fill(1));
    s.stepCount = 0;
    s.episodeReward = 0.0;
    s.health = 1.0;
    s.bridgeBlocks = 16;

    // Bedrock Perimeter
    for (let x = 0; x < s.gridSize; x++) {
      for (let z = 0; z < s.gridSize; z++) {
        if (x === 0 || x === s.gridSize - 1 || z === 0 || z === s.gridSize - 1) {
          s.grid[x][z] = 7;
        }
      }
    }

    if (curriculumStage === 0) {
      // Parkour Gap
      s.agentPos = [4.0, 0.0, 8.0];
      s.targetPos = [12.0, 0.0, 8.0];
      s.grid[7][8] = 0; // Void gap
      s.grid[8][8] = 0;
    } else if (curriculumStage === 1) {
      // Lava Lake Bridging
      s.agentPos = [3.5, 0.0, 8.0];
      s.targetPos = [12.5, 0.0, 8.0];
      for (let x = 6; x <= 9; x++) {
        for (let z = 2; z <= 13; z++) {
          s.grid[x][z] = 8; // Lava
        }
      }
    } else if (curriculumStage === 2) {
      // Water River Island
      s.agentPos = [3.0, 0.0, 8.0];
      s.targetPos = [13.0, 0.0, 8.0];
      for (let x = 6; x <= 8; x++) {
        for (let z = 1; z <= 14; z++) {
          s.grid[x][z] = 9; // Water
        }
      }
    } else {
      // Speedrun Economy
      s.agentPos = [2.5, 0.0, 2.5];
      s.targetPos = [12.5, 0.0, 12.5];
      s.grid[6][6] = 3;
      s.grid[8][8] = 8;
    }

    // Rebuild 3D Meshes
    if (blocksGroupRef.current) {
      while (blocksGroupRef.current.children.length > 0) {
        blocksGroupRef.current.remove(blocksGroupRef.current.children[0]);
      }

      const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
      const lavaMat = new THREE.MeshStandardMaterial({ color: 0xff3d00, emissive: 0xff1744, emissiveIntensity: 0.8 });
      const waterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, transparent: true, opacity: 0.7 });
      const cobbleMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.6 });
      const boxGeo = new THREE.BoxGeometry(1, 1, 1);

      for (let x = 0; x < s.gridSize; x++) {
        for (let z = 0; z < s.gridSize; z++) {
          const type = s.grid[x][z];
          if (type === 0) continue; // Air gap
          let mat = grassMat;
          if (type === 3 || type === 7) mat = stoneMat;
          else if (type === 8) mat = lavaMat;
          else if (type === 9) mat = waterMat;
          else if (type === 11) mat = cobbleMat;

          const voxel = new THREE.Mesh(boxGeo, mat);
          voxel.position.set(x + 0.5, -0.5, z + 0.5);
          voxel.receiveShadow = true;
          blocksGroupRef.current.add(voxel);
        }
      }
    }
  }, [curriculumStage]);

  // Three.js Scene Initialization
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c101c);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(16, 22, 26);
    camera.lookAt(8, 0, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5dd, 1.3);
    dirLight.position.set(20, 30, 20);
    scene.add(dirLight);

    const blocksGroup = new THREE.Group();
    scene.add(blocksGroup);
    blocksGroupRef.current = blocksGroup;

    const rayGroup = new THREE.Group();
    scene.add(rayGroup);
    rayLinesGroupRef.current = rayGroup;

    // Steve Learning Agent Mesh
    const agentGroup = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    agentGroup.add(body);

    const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.14;
    agentGroup.add(head);

    scene.add(agentGroup);
    agentMeshRef.current = agentGroup;

    // Target Diamond Mesh
    const targetGeo = new THREE.OctahedronGeometry(0.45, 0);
    const targetMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x0284c7, emissiveIntensity: 0.9 });
    const targetMesh = new THREE.Mesh(targetGeo, targetMat);
    targetMesh.position.set(12.5, 0.6, 8.0);
    scene.add(targetMesh);

    rebuildTerrain();

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      targetMesh.rotation.y += 0.03;
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [rebuildTerrain]);

  // Sync Hyperparameters to Trainer
  useEffect(() => {
    const t = trainerRef.current;
    t.hyperparams = {
      curriculumStage,
      learningRate,
      gamma,
      gaeLambda,
      clipCoef,
      entropyCoef,
      batchSize,
      updateEpochs: 3,
      simSpeed,
    };
  }, [curriculumStage, learningRate, gamma, gaeLambda, clipCoef, entropyCoef, batchSize, simSpeed]);

  // Execute Step in RL Simulation Loop
  const stepRLSimulation = useCallback(() => {
    const t = trainerRef.current;
    const s = envState.current;

    s.stepCount++;

    // 1. Build 42-dimensional observation vector
    const obs = new Float32Array(42);
    const relX = s.targetPos[0] - s.agentPos[0];
    const relZ = s.targetPos[2] - s.agentPos[2];
    const distToTarget = Math.hypot(relX, relZ);

    obs[0] = 0.8;
    obs[24] = relX / 22.0;
    obs[25] = relZ / 22.0;
    obs[26] = distToTarget / 22.0;
    obs[30] = Math.sin(s.agentYaw);
    obs[31] = Math.cos(s.agentYaw);
    obs[36] = s.bridgeBlocks / 16.0;
    obs[39] = s.health;

    // Check forward hazard
    const fwdGx = Math.floor(s.agentPos[0] + Math.sin(s.agentYaw) * 1.5);
    const fwdGz = Math.floor(s.agentPos[2] + Math.cos(s.agentYaw) * 1.5);
    if (fwdGx >= 0 && fwdGx < s.gridSize && fwdGz >= 0 && fwdGz < s.gridSize) {
      if (s.grid[fwdGx][fwdGz] === 8 || s.grid[fwdGx][fwdGz] === 9) {
        obs[16] = 1.0; // Lava/water hazard detected ahead
      }
    }

    // 2. Neural Forward Pass & Action Sampling
    const { probs, value } = t.forward(obs);
    const { action, logprob } = t.sampleAction(probs);

    setLastAction(action);
    setLastConfidence(parseFloat((probs[action] * 100).toFixed(1)));

    // 3. Execute Action & Calculate Physical Rewards
    let reward = -0.01;
    let done = false;
    let success = false;
    const moveDist = (action === 1 ? 0.65 : (action === 0 ? 0.40 : (action === 6 ? 0.20 : 0)));

    if (moveDist > 0) {
      const nextX = s.agentPos[0] + Math.sin(s.agentYaw) * moveDist;
      const nextZ = s.agentPos[2] + Math.cos(s.agentYaw) * moveDist;
      const gx = Math.floor(nextX);
      const gz = Math.floor(nextZ);

      if (gx >= 0 && gx < s.gridSize && gz >= 0 && gz < s.gridSize) {
        const cell = s.grid[gx][gz];
        if (cell === 8 || cell === 9) {
          // Stepped into lava/water hazard without bridge
          reward -= 20.0;
          done = true;
        } else if (cell === 3 || cell === 7) {
          reward -= 0.2; // Wall bump
        } else {
          s.agentPos[0] = nextX;
          s.agentPos[2] = nextZ;
          reward += 0.1;
        }
      }
    } else if (action === 3) {
      s.agentYaw = (s.agentYaw - 0.35) % (2 * Math.PI);
    } else if (action === 4) {
      s.agentYaw = (s.agentYaw + 0.35) % (2 * Math.PI);
    } else if (action === 8) { // Place Bridge Block
      const frontGx = Math.floor(s.agentPos[0] + Math.sin(s.agentYaw) * 1.2);
      const frontGz = Math.floor(s.agentPos[2] + Math.cos(s.agentYaw) * 1.2);
      if (frontGx >= 0 && frontGx < s.gridSize && frontGz >= 0 && frontGz < s.gridSize) {
        if (s.grid[frontGx][frontGz] === 8 || s.grid[frontGx][frontGz] === 9) {
          s.grid[frontGx][frontGz] = 11; // Placed cobblestone bridge
          s.bridgeBlocks--;
          reward += 6.0;
          rebuildTerrain();
        }
      }
    }

    // Goal reached check
    if (distToTarget < 1.2) {
      reward += 35.0;
      done = true;
      success = true;
    }

    if (s.stepCount >= 180) done = true;

    s.episodeReward += reward;

    // 4. Record step in PPO Rollout Buffer & trigger optimization
    t.recordStep(obs, action, logprob, reward, value, done, success);

    // Update Three.js agent position
    if (agentMeshRef.current) {
      agentMeshRef.current.position.set(s.agentPos[0], s.agentPos[1], s.agentPos[2]);
      agentMeshRef.current.rotation.y = s.agentYaw;
    }

    // Reset episode on termination
    if (done) {
      rebuildTerrain();
    }

    // Poll metrics snapshot
    if (s.stepCount % 5 === 0) {
      setMetrics(t.getSnapshot());
    }
  }, [rebuildTerrain]);

  // Live Training Loop Interval
  useEffect(() => {
    if (!isTraining) return;
    const interval = setInterval(stepRLSimulation, Math.max(8, 60 / simSpeed));
    return () => clearInterval(interval);
  }, [isTraining, simSpeed, stepRLSimulation]);

  const handleToggleTraining = () => {
    const next = !isTraining;
    setIsTraining(next);
    if (next) soundSynth.playLevelUp();
    else soundSynth.playBlockBreak();
  };

  const handleSaveCheckpoint = () => {
    const jsonStr = trainerRef.current.exportCheckpoint();
    localStorage.setItem("mindcraft_browser_checkpoint", jsonStr);
    setSaveStatus("CHECKPOINT SAVED TO LOCALSTORAGE!");
    soundSynth.playDiamondChime();
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleResumeCheckpoint = () => {
    const saved = localStorage.getItem("mindcraft_browser_checkpoint");
    if (saved) {
      const ok = trainerRef.current.loadCheckpoint(saved);
      if (ok) {
        setSaveStatus("LOADED CHECKPOINT! READY TO RESUME.");
        soundSynth.playLevelUp();
      }
    } else {
      setSaveStatus("NO SAVED CHECKPOINT FOUND.");
    }
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleExportJSON = () => {
    const jsonStr = trainerRef.current.exportCheckpoint();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mindcraft_policy_step_${trainerRef.current.globalStep}.json`;
    a.click();
    soundSynth.playDiamondChime();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <BrainCircuit className="w-6 h-6 text-[#10b981]" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              LIVE IN-BROWSER REINFORCEMENT LEARNING LAB
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            Train Actor-Critic neural policies directly in your browser with real-time gradient descent, GAE, and loss curves
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleTraining}
            className={`mc-btn ${isTraining ? "mc-btn-gold" : "mc-btn-primary"} text-[10px] px-4 py-2 flex items-center gap-1.5`}
          >
            {isTraining ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isTraining ? "PAUSE TRAINING" : "START LIVE TRAINING"}</span>
          </button>

          <button
            onClick={() => {
              stepRLSimulation();
              soundSynth.playBlockPlace();
            }}
            disabled={isTraining}
            className="mc-btn mc-btn-stone text-[10px] py-2 px-3 disabled:opacity-50"
          >
            <StepForward className="w-3.5 h-3.5" />
            <span>STEP 1 EPOCH</span>
          </button>
        </div>
      </div>

      {saveStatus && (
        <div className="mc-panel-stone p-2 text-center font-pixel text-xs text-[#34d399] border-2 border-[#10b981]">
          {saveStatus}
        </div>
      )}

      {/* Main Lab Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hyperparameters & Configuration Dock */}
        <div className="lg:col-span-4 space-y-4">
          <div className="mc-panel-stone p-5 space-y-4">
            <div className="flex items-center gap-2 font-pixel text-xs text-[#34d399] border-b-2 border-[#141720] pb-2">
              <Sliders className="w-4 h-4" />
              <span>HYPERPARAMETER CONTROLS</span>
            </div>

            {/* Curriculum Stage Selector */}
            <div className="space-y-1">
              <label className="font-pixel text-[8px] text-[#fbbf24] block">
                CURRICULUM TRAINING ARENA:
              </label>
              <select
                value={curriculumStage}
                onChange={(e) => setCurriculumStage(parseInt(e.target.value))}
                className="w-full bg-[#12151e] border-2 border-[#3b4458] px-2 py-1.5 font-pixel text-[9px] text-[#fbbf24] outline-none"
              >
                <option value={0}>[1] Precision Parkour Leaps</option>
                <option value={1}>[2] Lava Lake Bridging (Safe Crouch)</option>
                <option value={2}>[3] Water River Island Crossing</option>
                <option value={3}>[4] Diamond Speedrun Economy</option>
              </select>
            </div>

            {/* Learning Rate Slider */}
            <div className="space-y-1 bg-[#12151e] p-2.5 border border-[#1e2330]">
              <div className="flex justify-between font-pixel text-[8px] text-[#94a3b8]">
                <span>LEARNING RATE (η):</span>
                <span className="text-[#34d399] font-mono">{learningRate}</span>
              </div>
              <input
                type="range"
                min="0.00005"
                max="0.002"
                step="0.00005"
                value={learningRate}
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                className="w-full accent-[#10b981]"
              />
            </div>

            {/* Discount Factor (Gamma) */}
            <div className="space-y-1 bg-[#12151e] p-2.5 border border-[#1e2330]">
              <div className="flex justify-between font-pixel text-[8px] text-[#94a3b8]">
                <span>DISCOUNT FACTOR (γ):</span>
                <span className="text-[#38bdf8] font-mono">{gamma}</span>
              </div>
              <input
                type="range"
                min="0.90"
                max="0.999"
                step="0.005"
                value={gamma}
                onChange={(e) => setGamma(parseFloat(e.target.value))}
                className="w-full accent-[#38bdf8]"
              />
            </div>

            {/* GAE Lambda */}
            <div className="space-y-1 bg-[#12151e] p-2.5 border border-[#1e2330]">
              <div className="flex justify-between font-pixel text-[8px] text-[#94a3b8]">
                <span>GAE LAMBDA (λ):</span>
                <span className="text-amber-400 font-mono">{gaeLambda}</span>
              </div>
              <input
                type="range"
                min="0.80"
                max="0.99"
                step="0.01"
                value={gaeLambda}
                onChange={(e) => setGaeLambda(parseFloat(e.target.value))}
                className="w-full accent-[#fbbf24]"
              />
            </div>

            {/* PPO Clip Epsilon */}
            <div className="space-y-1 bg-[#12151e] p-2.5 border border-[#1e2330]">
              <div className="flex justify-between font-pixel text-[8px] text-[#94a3b8]">
                <span>PPO CLIP EPSILON (ε):</span>
                <span className="text-purple-400 font-mono">{clipCoef}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.4"
                step="0.02"
                value={clipCoef}
                onChange={(e) => setClipCoef(parseFloat(e.target.value))}
                className="w-full accent-[#a855f7]"
              />
            </div>

            {/* Sim Acceleration Speed */}
            <div className="space-y-1 bg-[#12151e] p-2.5 border border-[#1e2330]">
              <div className="flex justify-between font-pixel text-[8px] text-[#94a3b8]">
                <span>SIM ACCELERATION:</span>
                <span className="text-white font-mono">{simSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.5"
                value={simSpeed}
                onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
                className="w-full accent-white"
              />
            </div>

            {/* Checkpoint Actions */}
            <div className="pt-2 border-t-2 border-[#141720] grid grid-cols-2 gap-2">
              <button
                onClick={handleSaveCheckpoint}
                className="mc-btn mc-btn-primary text-[8px] py-1.5 flex items-center justify-center gap-1"
              >
                <Save className="w-3 h-3" />
                <span>SAVE CHECKPOINT</span>
              </button>

              <button
                onClick={handleResumeCheckpoint}
                className="mc-btn mc-btn-diamond text-[8px] py-1.5 flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RESUME SAVED</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="mc-btn mc-btn-gold text-[8px] py-1.5 col-span-2 flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>EXPORT NEURAL POLICY (.JSON)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Center & Right Column: 3D Arena Viewport & Live Telemetry Graphs */}
        <div className="lg:col-span-8 space-y-4">
          {/* 3D Training Arena Viewport */}
          <div className="relative h-[340px] w-full mc-panel-dark border-2 border-[#3b4458] overflow-hidden">
            <div ref={mountRef} className="w-full h-full cursor-crosshair" />

            {/* Floating Live Indicator Badge */}
            <div className="absolute top-3 left-3 px-3 py-1 bg-[#0c0f17]/90 border border-[#3b4458] flex items-center gap-2 font-pixel text-[9px] text-[#34d399]">
              <span className={`w-2 h-2 rounded-full ${isTraining ? "bg-[#10b981] animate-ping" : "bg-gray-500"}`} />
              <span>{isTraining ? `TRAINING LIVE (${metrics.sps} SPS)` : "TRAINING PAUSED"}</span>
            </div>

            {/* Real-time Decision Overlay */}
            <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-[#0c0f17]/90 border border-[#3b4458] font-mono text-[10px] text-slate-300">
              Action: <span className="text-[#34d399] font-bold">{ACTION_NAMES[lastAction]}</span> ({lastConfidence}%)
            </div>
          </div>

          {/* Key Metrics Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
            <div className="mc-panel-stone p-2.5">
              <span className="font-pixel text-[8px] text-[#94a3b8]">GLOBAL TIMESTEPS</span>
              <div className="font-pixel text-sm text-white mt-0.5">{metrics.globalStep}</div>
            </div>
            <div className="mc-panel-stone p-2.5">
              <span className="font-pixel text-[8px] text-[#94a3b8]">SUCCESS RATE</span>
              <div className="font-pixel text-sm text-[#34d399] mt-0.5">{metrics.recentSuccessRate}%</div>
            </div>
            <div className="mc-panel-stone p-2.5">
              <span className="font-pixel text-[8px] text-[#94a3b8]">EPISODE REWARD</span>
              <div className={`font-pixel text-sm mt-0.5 ${metrics.meanReward >= 0 ? "text-[#38bdf8]" : "text-red-400"}`}>
                {metrics.meanReward >= 0 ? `+${metrics.meanReward}` : metrics.meanReward}
              </div>
            </div>
            <div className="mc-panel-stone p-2.5">
              <span className="font-pixel text-[8px] text-[#94a3b8]">POLICY LOSS</span>
              <div className="font-pixel text-sm text-amber-400 mt-0.5">{metrics.policyLoss}</div>
            </div>
          </div>

          {/* Real-Time Live Loss & Reward Sparklines */}
          <div className="mc-panel-stone p-4 space-y-3">
            <div className="flex items-center justify-between border-b-2 border-[#141720] pb-2">
              <div className="flex items-center gap-2 font-pixel text-xs text-[#38bdf8]">
                <Activity className="w-4 h-4" />
                <span>REAL-TIME LEARNING CURVES & LOSS TELEMETRY</span>
              </div>
              <span className="font-mono text-[10px] text-[#94a3b8]">Updates: {metrics.updateCount}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Reward Progression Graph */}
              <div className="bg-[#12151e] p-3 border border-[#1e2330] space-y-1.5">
                <div className="flex justify-between font-pixel text-[8px] text-[#94a3b8]">
                  <span>REWARD PROGRESSION:</span>
                  <span className="text-[#34d399]">{metrics.meanReward}</span>
                </div>
                <div className="h-16 flex items-end gap-1 border-b border-[#32394a] pb-1 px-1">
                  {metrics.rewardHistory.length === 0 ? (
                    <div className="text-[10px] font-mono text-slate-600 m-auto">Start training to plot curves...</div>
                  ) : (
                    metrics.rewardHistory.slice(-25).map((rew, i) => {
                      const heightPct = Math.max(10, Math.min(100, (rew + 20) * 1.8));
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-[#059669] to-[#34d399] rounded-none transition-all duration-100"
                          style={{ height: `${heightPct}%` }}
                          title={`Reward: ${rew}`}
                        />
                      );
                    })
                  )}
                </div>
              </div>

              {/* Policy Loss Graph */}
              <div className="bg-[#12151e] p-3 border border-[#1e2330] space-y-1.5">
                <div className="flex justify-between font-pixel text-[8px] text-[#94a3b8]">
                  <span>POLICY SURROGATE LOSS:</span>
                  <span className="text-amber-400">{metrics.policyLoss}</span>
                </div>
                <div className="h-16 flex items-end gap-1 border-b border-[#32394a] pb-1 px-1">
                  {metrics.policyLossHistory.length === 0 ? (
                    <div className="text-[10px] font-mono text-slate-600 m-auto">PPO optimization batches...</div>
                  ) : (
                    metrics.policyLossHistory.slice(-25).map((loss, i) => {
                      const heightPct = Math.max(10, Math.min(100, Math.abs(loss) * 120 + 20));
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-[#d97706] to-[#fbbf24] rounded-none transition-all duration-100"
                          style={{ height: `${heightPct}%` }}
                          title={`Policy Loss: ${loss}`}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
