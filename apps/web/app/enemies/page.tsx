"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import * as THREE from "three";
import { 
  Skull, 
  Flame, 
  Moon, 
  ShieldAlert, 
  Swords, 
  Play, 
  Activity, 
  Target, 
  Eye,
  AlertTriangle,
  Radio
} from "lucide-react";
import { soundSynth } from "@/lib/audio/sound-synth";

interface EnemyData {
  id: string;
  name: string;
  type: string;
  icon: string;
  threatLevel: "EXTREME" | "HIGH" | "MEDIUM";
  detectionRadiusVal: number;
  attackDistanceVal: number;
  detectionRadius: string;
  attackDistance: string;
  damageValue: string;
  sunlightVulnerable: boolean;
  behaviorLogic: string;
  aiDefenseStrategy: string;
  spawnCode: number;
  color: number;
}

const ENEMIES: EnemyData[] = [
  {
    id: "creeper",
    name: "Creeper",
    type: "Silent Explosive Stalker",
    icon: "💥",
    threatLevel: "EXTREME",
    detectionRadiusVal: 7.0,
    attackDistanceVal: 1.3,
    detectionRadius: "7.0 meters (LiDAR Ray hit)",
    attackDistance: "1.3 meters (Fuse Trigger)",
    damageValue: "-50.0 HP (Lethal Blast)",
    sunlightVulnerable: false,
    behaviorLogic: "Perceives player coordinates -> silently pathfinds along shortest Euclidean path -> begins 1.5s hiss fuse countdown upon entering 1.3m radius -> detonates.",
    aiDefenseStrategy: "AI senses proximity vector (obs[20..23]) -> executes immediate 180° sprint retreat -> maintains >3.0m standoff -> strikes when fuse resets.",
    spawnCode: 2,
    color: 0x16a34a,
  },
  {
    id: "zombie",
    name: "Zombie",
    type: "Melee Swarm Aggressor",
    icon: "🧟",
    threatLevel: "MEDIUM",
    detectionRadiusVal: 10.0,
    attackDistanceVal: 1.2,
    detectionRadius: "10.0 meters",
    attackDistance: "1.2 meters (Melee Swipe)",
    damageValue: "-15.0 HP per hit",
    sunlightVulnerable: true,
    behaviorLogic: "Relentless direct line-of-sight tracking -> ignores obstacles up to 1 block high -> catches fire and takes burn damage during daytime phase.",
    aiDefenseStrategy: "AI navigates obstacles to create elevation choke points -> executes jump-strike to deal critical damage while staying out of melee range.",
    spawnCode: 3,
    color: 0x065f46,
  },
  {
    id: "skeleton",
    name: "Skeleton Archer",
    type: "Ranged Trajectory Sniper",
    icon: "🏹",
    threatLevel: "HIGH",
    detectionRadiusVal: 12.0,
    attackDistanceVal: 15.0,
    detectionRadius: "12.0 meters (Raycast Vision)",
    attackDistance: "15.0 meters (Arrow Projectile)",
    damageValue: "-20.0 HP per arrow",
    sunlightVulnerable: true,
    behaviorLogic: "Calculates lead angle and projectile arc -> fires arrows at 18m/s -> strategically retreats if target approaches within 3.5m.",
    aiDefenseStrategy: "AI performs zig-zag sprint evasion to break aim line -> places stone block cover -> closes distance rapidly between arrow reloads.",
    spawnCode: 4,
    color: 0x94a3b8,
  },
  {
    id: "spider",
    name: "Cave Spider",
    type: "Wall Climber & Chasm Leaper",
    icon: "🕷️",
    threatLevel: "HIGH",
    detectionRadiusVal: 8.0,
    attackDistanceVal: 3.5,
    detectionRadius: "8.0 meters (Wall-piercing)",
    attackDistance: "3.5 meters (Pounce Jump)",
    damageValue: "-18.0 HP + Poison",
    sunlightVulnerable: false,
    behaviorLogic: "Climbs vertical stone walls without penalty -> executes 3.5m pounce jumps across lava or water chasms -> inflicts poison effect.",
    aiDefenseStrategy: "AI avoids standing near cliff ledges -> uses sweeping weapon attacks at apex of spider leap -> creates 2-block overhang barriers.",
    spawnCode: 5,
    color: 0x334155,
  },
];

export default function EnemiesPage() {
  const [selectedEnemy, setSelectedEnemy] = useState<EnemyData>(ENEMIES[0]);
  const [simDistance, setSimDistance] = useState<number>(4.5);
  const mountRef = useRef<HTMLDivElement>(null);
  const mobGroupRef = useRef<THREE.Group | null>(null);

  const handleSelect = (enemy: EnemyData) => {
    setSelectedEnemy(enemy);
    if (enemy.id === "creeper") soundSynth.playCreeperHiss();
    else if (enemy.id === "zombie") soundSynth.playZombieGroan();
    else soundSynth.playBlockBreak();
  };

  // 3D Voxel Mob Preview in Three.js
  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d14);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 6);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5dd, 1.2);
    dirLight.position.set(5, 8, 5);
    scene.add(dirLight);

    // Floor Grid
    const grid = new THREE.GridHelper(10, 10, 0x3b4458, 0x1e2330);
    grid.position.y = -0.01;
    scene.add(grid);

    // Mob Mesh Group
    const mobGroup = new THREE.Group();
    scene.add(mobGroup);
    mobGroupRef.current = mobGroup;

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.7, 1.0, 0.5);
    const bodyMat = new THREE.MeshStandardMaterial({ color: selectedEnemy.color, roughness: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    mobGroup.add(body);

    // Head
    const headGeo = new THREE.BoxGeometry(0.65, 0.65, 0.65);
    const headMat = new THREE.MeshStandardMaterial({ color: selectedEnemy.color, roughness: 0.3 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.7;
    mobGroup.add(head);

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.16, 1.75, 0.33);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.16, 1.75, 0.33);
    mobGroup.add(eyeL, eyeR);

    // Detection Radius Circle
    const radiusGeo = new THREE.RingGeometry(selectedEnemy.detectionRadiusVal * 0.25 - 0.04, selectedEnemy.detectionRadiusVal * 0.25, 32);
    const radiusMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const radiusRing = new THREE.Mesh(radiusGeo, radiusMat);
    radiusRing.rotation.x = Math.PI / 2;
    radiusRing.position.y = 0.02;
    scene.add(radiusRing);

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      mobGroup.rotation.y += 0.015;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [selectedEnemy]);

  const isDetected = simDistance <= selectedEnemy.detectionRadiusVal;
  const isTriggered = simDistance <= selectedEnemy.attackDistanceVal;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Skull className="w-5 h-5 text-rose-500" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              HOSTILE MOB BESTIARY & AI TRIGGER LAB
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            Mathematical proximity trigger thresholds &bull; Mob pathfinding algorithms &bull; AI counter-strategies
          </p>
        </div>

        <Link
          href={`/demo?challenge=2`}
          className="mc-btn mc-btn-danger text-[10px]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>SPAWN {selectedEnemy.name.toUpperCase()} IN 3D ARENA</span>
        </Link>
      </div>

      {/* Enemies Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {ENEMIES.map((mob) => {
          const isSelected = selectedEnemy.id === mob.id;
          return (
            <div
              key={mob.id}
              onClick={() => handleSelect(mob)}
              className={`mc-panel-stone p-4 space-y-3 cursor-pointer transition-all ${
                isSelected
                  ? "border-2 border-red-500 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "hover:border-[#727e99]"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{mob.icon}</span>
                  <div>
                    <h3 className="font-pixel text-xs font-bold text-white">{mob.name}</h3>
                    <span className="font-mono text-[9px] text-[#94a3b8]">{mob.type}</span>
                  </div>
                </div>
                <span className={`font-pixel text-[7px] py-0.5 px-1 ${
                  mob.threatLevel === "EXTREME" ? "bg-red-500 text-black font-bold" :
                  mob.threatLevel === "HIGH" ? "bg-orange-500 text-black font-bold" :
                  "bg-amber-500 text-black font-bold"
                }`}>
                  {mob.threatLevel}
                </span>
              </div>

              <div className="space-y-1 font-mono text-[10px] bg-[#12151e] p-2 border border-[#1e2330]">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Detection:</span>
                  <span className="text-white font-bold">{mob.detectionRadius.split(" ")[0]}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Attack Trigger:</span>
                  <span className="text-rose-400 font-bold">{mob.attackDistance.split(" ")[0]}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Sunlight Burn:</span>
                  <span className={mob.sunlightVulnerable ? "text-[#34d399]" : "text-amber-400"}>
                    {mob.sunlightVulnerable ? "YES" : "IMMUNE"}
                  </span>
                </div>
              </div>

              <button
                className={`mc-btn ${isSelected ? "mc-btn-danger" : "mc-btn-stone"} text-[8px] w-full py-1`}
              >
                {isSelected ? "ACTIVE INSPECTION" : "INSPECT MOB"}
              </button>
            </div>
          );
        })}
      </div>

      {/* 3D Model & Interactive Distance Proximity Trigger Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Voxel Mob Viewport */}
        <div className="mc-panel-stone p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between border-b-2 border-[#141720] pb-2">
            <span className="font-pixel text-[9px] text-white flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-red-400" />
              <span>3D VOXEL MODEL INSPECTOR</span>
            </span>
            <span className="font-mono text-[9px] text-[#34d399]">360° Real-time</span>
          </div>

          <div ref={mountRef} className="w-full h-48 rounded bg-[#0b0d13] border border-[#1e2330]" />

          <div className="text-center font-mono text-[10px] text-[#94a3b8]">
            Proximity Ring: <span className="text-red-400 font-bold">{selectedEnemy.detectionRadiusVal}m Alert Radius</span>
          </div>
        </div>

        {/* Live Proximity Trigger Evaluator */}
        <div className="lg:col-span-2 mc-panel-stone p-5 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#141720] pb-2">
            <h2 className="font-pixel text-xs font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              <span>LIVE PROXIMITY TRIGGER SIMULATOR</span>
            </h2>
            <span className="font-mono text-[10px] text-[#94a3b8]">
              Distance: <strong className="text-white">{simDistance.toFixed(1)} meters</strong>
            </span>
          </div>

          {/* Interactive Range Slider */}
          <div className="space-y-2 bg-[#12151e] p-3 border border-[#1e2330]">
            <div className="flex justify-between font-mono text-[10px] text-[#94a3b8]">
              <span>0.5m (Point Blank)</span>
              <span>Distance to Bot</span>
              <span>12.0m (Far Distance)</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="12.0"
              step="0.1"
              value={simDistance}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSimDistance(val);
                if (val <= selectedEnemy.attackDistanceVal) {
                  if (selectedEnemy.id === "creeper") soundSynth.playCreeperHiss();
                  else soundSynth.playHurtGrunt();
                }
              }}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          {/* Live Reactive Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 border-2 font-mono text-xs ${
              isDetected
                ? "border-amber-500 bg-amber-950/20 text-amber-300"
                : "border-[#1e2330] bg-[#12151e] text-[#64748b]"
            }`}>
              <span className="font-pixel text-[8px] block mb-1">DETECTION SENSOR:</span>
              <div className="font-bold">{isDetected ? "⚠️ TARGET ACQUIRED (Pursuing)" : "🟢 CLEAR (Idle Roaming)"}</div>
            </div>

            <div className={`p-3 border-2 font-mono text-xs ${
              isTriggered
                ? "border-red-500 bg-red-950/40 text-red-300 animate-pulse"
                : "border-[#1e2330] bg-[#12151e] text-[#64748b]"
            }`}>
              <span className="font-pixel text-[8px] block mb-1">ATTACK TRIGGER:</span>
              <div className="font-bold">{isTriggered ? `💥 EXECUTING ${selectedEnemy.name.toUpperCase()} ATTACK!` : "🛡️ STANDOFF RANGE (Safe)"}</div>
            </div>
          </div>

          {/* Counter-Tactic Note */}
          <div className="bg-[#12151e] p-3 border border-[#1e2330] font-mono text-xs text-slate-300">
            <span className="font-pixel text-[8px] text-[#34d399] block mb-1">AI NEURAL TACTIC:</span>
            {selectedEnemy.aiDefenseStrategy}
          </div>
        </div>
      </div>
    </div>
  );
}
