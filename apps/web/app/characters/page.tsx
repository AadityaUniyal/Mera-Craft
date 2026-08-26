"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import * as THREE from "three";
import { 
  Bot, 
  Cpu, 
  Sparkles, 
  ShieldCheck, 
  Swords, 
  Flame, 
  Zap, 
  Play, 
  Layers, 
  Activity, 
  CheckCircle2, 
  Box,
  Compass,
  Eye
} from "lucide-react";
import { soundSynth } from "@/lib/audio/sound-synth";

interface CharacterModel {
  id: string;
  name: string;
  callsign: string;
  role: string;
  icon: string;
  shirtColor: number;
  pantsColor: number;
  skinColor: number;
  modelFile: string;
  description: string;
  trainingCurriculum: string;
  timestepsTrained: number;
  successRate: number;
  skills: {
    mining: number;
    bridging: number;
    combat: number;
    parkour: number;
    survival: number;
  };
  triggerLogic: string;
}

const CHARACTERS: CharacterModel[] = [
  {
    id: "steve_master",
    name: "Steve — Master Miner",
    callsign: "AGENT_MINER_V6",
    role: "Resource Extraction & Speedrun Economy",
    icon: "⛏️",
    shirtColor: 0x0284c7, // Cyan/Blue
    pantsColor: 0x1e3a8a, // Navy
    skinColor: 0xfde047,
    modelFile: "master_v6_minecraft",
    description: "Trained across 500,000 steps with GAE on full Minecraft crafting graphs. Automatically seeks wood, crafts pickaxes, mines iron, extracts diamonds, and delivers resources to the base hub.",
    trainingCurriculum: "Multi-Tier Speedrun Economy & Crafting Hierarchy",
    timestepsTrained: 500000,
    successRate: 96.8,
    skills: { mining: 98, bridging: 75, combat: 80, parkour: 85, survival: 94 },
    triggerLogic: "Detects diamond/ore proximity within 7.0m LiDAR cone -> activates mining strike -> navigates return trajectory to base hub upon full bag.",
  },
  {
    id: "alex_bridger",
    name: "Alex — Lava Bridger",
    callsign: "AGENT_BRIDGER_V6",
    role: "Lava/Water Hazard Traversal & Edge Protection",
    icon: "🧱",
    shirtColor: 0x16a34a, // Green
    pantsColor: 0x582f0e, // Brown
    skinColor: 0xfcd34d,
    modelFile: "master_v6_minecraft",
    description: "Specialized in hazardous terrain navigation. Uses sneak crouching to clamp position to block edges and executes precision block placement to build cobblestone skyways across lava chasms.",
    trainingCurriculum: "Lava Lake Bridging & Safe Sneak Clamping",
    timestepsTrained: 350000,
    successRate: 98.4,
    skills: { mining: 70, bridging: 99, combat: 65, parkour: 88, survival: 98 },
    triggerLogic: "When hazard ray detects lava/water in heading vector (<1.5m) -> initiates sneak mode -> places cobblestone block directly in front -> steps safely onto bridge.",
  },
  {
    id: "vanguard_hunter",
    name: "Vanguard — Creeper Hunter",
    callsign: "AGENT_COMBAT_V5",
    role: "Hostile Mob Defense & Tactical Evasion",
    icon: "🏹",
    shirtColor: 0x7e22ce, // Purple Knight Armor
    pantsColor: 0x3b0764, // Dark Obsidian
    skinColor: 0xe2e8f0,
    modelFile: "master_v5_pro",
    description: "Trained specifically for hostile night survival. Perceives Creeper threat vectors via 4-directional proximity sensors, maintaining a 3-block safety standoff radius while executing counter-strikes.",
    trainingCurriculum: "Night Creeper Proximity Tracking & Tactical Retreat",
    timestepsTrained: 400000,
    successRate: 94.2,
    skills: { mining: 60, bridging: 70, combat: 98, parkour: 80, survival: 96 },
    triggerLogic: "Perceives Creeper within 6.0m vector -> triggers sprint evasive turn if dist < 2.5m -> circles to blind spot -> strikes with diamond weapon.",
  },
  {
    id: "shadow_runner",
    name: "Shadow — Parkour Runner",
    callsign: "AGENT_PARKOUR_V5",
    role: "Precision Velocity Jumping & Mountain Ascent",
    icon: "⚡",
    shirtColor: 0xd97706, // Amber Speedrunner
    pantsColor: 0x1e293b, // Dark Slate
    skinColor: 0xfde68a,
    modelFile: "master_v5_pro",
    description: "Optimized for maximum traversal speed and gap clearance. Calculates sprint momentum and executes synchronized 1-to-2 block parkour leaps across sheer mountain canyons.",
    trainingCurriculum: "Chasm Gap Precision Leaps & Vertical Ascent",
    timestepsTrained: 300000,
    successRate: 95.0,
    skills: { mining: 50, bridging: 80, combat: 60, parkour: 99, survival: 90 },
    triggerLogic: "Evaluates ground depth delta via forward LiDAR ray -> engages sprint acceleration 1 block before gap -> executes jump at exact block edge.",
  },
];

export default function CharactersPage() {
  const [activeBot, setActiveBot] = useState<CharacterModel>(CHARACTERS[0]);
  const mountRef = useRef<HTMLDivElement>(null);
  const botGroupRef = useRef<THREE.Group | null>(null);

  const handleSelect = (bot: CharacterModel) => {
    setActiveBot(bot);
    soundSynth.playBlockPlace();
  };

  // 3D Avatar Rendering in Three.js
  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d14);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 4.5);
    camera.lookAt(0, 0.9, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5dd, 1.3);
    dirLight.position.set(4, 6, 4);
    scene.add(dirLight);

    // Floor
    const grid = new THREE.GridHelper(6, 6, 0x3b4458, 0x1e2330);
    grid.position.y = -0.01;
    scene.add(grid);

    // Character Group
    const group = new THREE.Group();
    scene.add(group);
    botGroupRef.current = group;

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: activeBot.shirtColor, roughness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    group.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
    const headMat = new THREE.MeshStandardMaterial({ color: activeBot.skinColor, roughness: 0.5 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.44;
    group.add(head);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.24, 0.55, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: activeBot.pantsColor, roughness: 0.5 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-0.15, 0.22, 0);
    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(0.15, 0.22, 0);
    group.add(leftLeg, rightLeg);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      group.rotation.y += 0.015;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [activeBot]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-[#34d399]" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              TRAINED AI CHARACTER ROSTER
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            Individually trained PyTorch PPO neural policies &bull; Custom behavioral logic &bull; Live arena testing
          </p>
        </div>

        <Link
          href={`/demo?model=${activeBot.modelFile}`}
          className="mc-btn mc-btn-primary text-[10px]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>TEST {activeBot.name.toUpperCase()} IN ARENA</span>
        </Link>
      </div>

      {/* Character Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CHARACTERS.map((char) => {
          const isSelected = activeBot.id === char.id;
          return (
            <div
              key={char.id}
              onClick={() => handleSelect(char)}
              className={`mc-panel-stone p-4 space-y-3 cursor-pointer transition-all ${
                isSelected
                  ? "border-2 border-[#10b981] bg-[#10b981]/10 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                  : "hover:border-[#727e99]"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-[#12151e] border-2 border-[#3b4458] flex items-center justify-center text-2xl shadow">
                    {char.icon}
                  </div>
                  <div>
                    <h3 className="font-pixel text-xs font-bold text-white">{char.name}</h3>
                    <span className="font-mono text-[10px] text-[#34d399]">{char.callsign}</span>
                  </div>
                </div>
              </div>

              <p className="font-mono text-[11px] text-[#94a3b8] leading-tight line-clamp-3">
                {char.description}
              </p>

              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                <div className="bg-[#12151e] p-1.5 border border-[#1e2330]">
                  <span className="text-[#64748b] block font-pixel text-[7px]">SUCCESS:</span>
                  <span className="text-[#34d399] font-bold">{char.successRate}%</span>
                </div>
                <div className="bg-[#12151e] p-1.5 border border-[#1e2330]">
                  <span className="text-[#64748b] block font-pixel text-[7px]">TRAINED:</span>
                  <span className="text-amber-400 font-bold">{(char.timestepsTrained / 1000).toFixed(0)}k</span>
                </div>
              </div>

              <div className="pt-2 border-t-2 border-[#141720]">
                <button
                  className={`mc-btn ${isSelected ? "mc-btn-primary" : "mc-btn-stone"} text-[8px] w-full py-1`}
                >
                  {isSelected ? "ACTIVE SELECTION" : "VIEW DETAILS"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep Character Specification & 3D Avatar Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Bot Avatar Viewer */}
        <div className="mc-panel-stone p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b-2 border-[#141720] pb-2">
            <span className="font-pixel text-[9px] text-white flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#34d399]" />
              <span>3D BOT AVATAR INSPECTOR</span>
            </span>
            <span className="font-mono text-[9px] text-[#34d399]">360° Real-time</span>
          </div>

          <div ref={mountRef} className="w-full h-48 rounded bg-[#0b0d13] border border-[#1e2330]" />

          <div className="text-center font-mono text-[10px] text-[#94a3b8]">
            Skin Profile: <strong className="text-white">{activeBot.name}</strong>
          </div>
        </div>

        {/* Skill Matrix & Trigger Flow */}
        <div className="lg:col-span-2 mc-panel-stone p-5 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#141720] pb-2">
            <div>
              <h2 className="font-pixel text-xs font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#34d399]" />
                <span>{activeBot.name} — TECHNICAL SPECIFICATION</span>
              </h2>
              <span className="font-mono text-[10px] text-[#38bdf8]">{activeBot.role}</span>
            </div>
            <Link
              href={`/demo?model=${activeBot.modelFile}`}
              className="mc-btn mc-btn-diamond text-[8px] px-2.5 py-1"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>TEST IN ARENA</span>
            </Link>
          </div>

          {/* Skill Polar Matrix */}
          <div className="space-y-1.5 bg-[#12151e] p-3 border border-[#1e2330]">
            <span className="font-pixel text-[8px] text-[#34d399] block mb-1">
              NEURAL CAPABILITY PROFILE:
            </span>
            {Object.entries(activeBot.skills).map(([skill, val]) => (
              <div key={skill} className="space-y-0.5">
                <div className="flex justify-between font-pixel text-[7px] text-[#94a3b8] uppercase">
                  <span>{skill}:</span>
                  <span className="text-white font-mono">{val}%</span>
                </div>
                <div className="h-1.5 bg-[#0b0d13] border border-[#32394a] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#059669] to-[#34d399]"
                    style={{ width: `${val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Mathematical Trigger Logic */}
          <div className="bg-[#12151e] p-3 border border-[#1e2330] font-mono text-xs text-slate-300">
            <span className="font-pixel text-[8px] text-amber-400 block mb-1">
              BEHAVIORAL PROXIMITY TRIGGER LOGIC:
            </span>
            <p className="text-[11px] leading-relaxed text-slate-200">
              {activeBot.triggerLogic}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
