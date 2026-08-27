"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import * as THREE from "three";
import { 
  Bot, 
  Play, 
  Terminal, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  Sparkles, 
  Trophy, 
  Swords, 
  Eye,
  Activity,
  Flame,
  BrainCircuit,
  Skull,
  User,
  Compass,
  Shield,
  Hammer,
  Gem,
  Zap,
  Database
} from "lucide-react";
import { soundSynth } from "@/lib/audio/sound-synth";

export default function LandingPage() {
  const mountRef = useRef<HTMLDivElement>(null);

  // 3D Three.js Interactive Floating Island Background
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.02);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 5, 14);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(15, 25, 15);
    scene.add(dirLight);

    // Floating Voxel Island Group
    const islandGroup = new THREE.Group();
    scene.add(islandGroup);

    const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
    const diamondMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x0284c7, emissiveIntensity: 0.8 });
    const emeraldMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.8 });
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        const dist = Math.hypot(x, z);
        if (dist > 4.2) continue;

        const grass = new THREE.Mesh(boxGeo, grassMat);
        grass.position.set(x, 0, z);
        islandGroup.add(grass);

        const dirt = new THREE.Mesh(boxGeo, dirtMat);
        dirt.position.set(x, -1, z);
        islandGroup.add(dirt);

        if (dist < 3.2) {
          const isDiamond = (x === 1 && z === 1) || (x === -2 && z === 1);
          const isEmerald = (x === -1 && z === -1) || (x === 2 && z === -1);
          const ore = new THREE.Mesh(boxGeo, isDiamond ? diamondMat : (isEmerald ? emeraldMat : stoneMat));
          ore.position.set(x, -2, z);
          islandGroup.add(ore);
        }
      }
    }

    // Animated Steve Voxel Avatar
    const steveGroup = new THREE.Group();
    steveGroup.position.set(0, 0.5, 0);

    const bodyGeo = new THREE.BoxGeometry(0.6, 0.8, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    steveGroup.add(body);

    const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.05;
    steveGroup.add(head);

    islandGroup.add(steveGroup);

    // Floating Ember Particles
    const pCount = 50;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i += 3) {
      pPos[i] = (Math.random() - 0.5) * 18;
      pPos[i + 1] = Math.random() * 10 - 2;
      pPos[i + 2] = (Math.random() - 0.5) * 18;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.18,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;

      islandGroup.position.y = Math.sin(t * 0.7) * 0.25;
      islandGroup.rotation.y = t * 0.12 + mouseX * 0.25;

      head.rotation.y = Math.sin(t * 1.1) * 0.35 + mouseX * 0.4;
      head.rotation.x = -mouseY * 0.25;

      camera.position.x = mouseX * 1.5;
      camera.position.y = 5 - mouseY * 1.0;
      camera.lookAt(0, 0.6, 0);

      const posArr = pGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < pCount * 3; i += 3) {
        posArr[i] += 0.012;
        if (posArr[i] > 7) posArr[i] = -2;
      }
      pGeo.attributes.position.needsUpdate = true;

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
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 relative overflow-x-hidden select-none font-sans">
      {/* 3D WebGL Background Canvas */}
      <div ref={mountRef} className="fixed inset-0 pointer-events-none z-0" />

      <main className="relative z-10 w-full flex flex-col items-center pt-24 pb-16 px-4 space-y-20">
        
        {/* HERO SECTION */}
        <section className="text-center max-w-4xl mx-auto flex flex-col items-center">
          <div className="mb-6 flex items-center justify-center h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl text-emerald-400">
            <Bot className="h-8 w-8" />
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6">
            MIND<span className="text-emerald-400">CRAFT</span>
          </h1>
          <h2 className="text-lg sm:text-2xl text-slate-300 font-medium max-w-2xl mb-4 leading-relaxed">
            Enter a vibrant fullscreen 3D Minecraft world where autonomous AI characters roam, respond to your voice, mine, build, and fight alongside you!
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
            <Link
              href="/game"
              onClick={() => soundSynth.playDiamondChime?.()}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-base font-bold rounded-2xl flex items-center gap-3 shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-105 transition-all"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>🎮 Play Fullscreen Minecraft World</span>
            </Link>
            <Link
              href="/ai-studio"
              className="px-6 py-3.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 font-semibold rounded-2xl flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
            >
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span>AI Training Studio</span>
            </Link>
            <Link
              href="/sandbox"
              className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-semibold rounded-2xl flex items-center gap-2 transition-colors"
            >
              <Bot className="w-5 h-5 text-emerald-400" />
              <span>3D Sandbox Editor</span>
            </Link>
          </div>
        </section>

        {/* CHARACTER SPOTLIGHT */}
        <section className="w-full max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-400" />
              Character Spotlight
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Explorer */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col hover:border-cyan-400/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Compass className="w-8 h-8 text-cyan-400" />
                <div>
                  <h4 className="text-lg font-bold text-white">🧭 Explorer</h4>
                  <p className="text-cyan-400 text-xs font-mono uppercase tracking-wider">Navigation</p>
                </div>
              </div>
              <div className="mb-4 inline-flex px-3 py-1 rounded-full bg-slate-950 border border-slate-800 w-fit">
                <span className="text-[10px] text-slate-300 font-mono">Curriculum PPO</span>
              </div>
              <p className="text-sm text-slate-400 mb-6 flex-grow">
                Masters complex terrain traversal, optimizing pathfinding across varied biomes and overcoming natural obstacles.
              </p>
              <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">Unseen Rivers</span>
                <span className="text-cyan-400 font-mono font-bold">88.5%</span>
              </div>
            </div>

            {/* Guardian */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col hover:border-purple-400/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-8 h-8 text-purple-400" />
                <div>
                  <h4 className="text-lg font-bold text-white">🛡️ Guardian</h4>
                  <p className="text-purple-400 text-xs font-mono uppercase tracking-wider">Combat</p>
                </div>
              </div>
              <div className="mb-4 inline-flex px-3 py-1 rounded-full bg-slate-950 border border-slate-800 w-fit">
                <span className="text-[10px] text-slate-300 font-mono">Threat Interception PPO</span>
              </div>
              <p className="text-sm text-slate-400 mb-6 flex-grow">
                Trained to identify, intercept, and neutralize hostile entities before they can breach perimeter defenses.
              </p>
              <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">Creeper Elimination</span>
                <span className="text-purple-400 font-mono font-bold">91.2%</span>
              </div>
            </div>

            {/* Builder */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col hover:border-amber-400/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Hammer className="w-8 h-8 text-amber-400" />
                <div>
                  <h4 className="text-lg font-bold text-white">🧱 Builder</h4>
                  <p className="text-amber-400 text-xs font-mono uppercase tracking-wider">Engineering</p>
                </div>
              </div>
              <div className="mb-4 inline-flex px-3 py-1 rounded-full bg-slate-950 border border-slate-800 w-fit">
                <span className="text-[10px] text-slate-300 font-mono">Behavioral Cloning + PPO</span>
              </div>
              <p className="text-sm text-slate-400 mb-6 flex-grow">
                Excels at rapid scaffolding, defensive wall placement, and constructing bridging mechanics across chasms.
              </p>
              <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">Bridge Construction</span>
                <span className="text-amber-400 font-mono font-bold">86.4%</span>
              </div>
            </div>

            {/* Survivor */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col hover:border-emerald-400/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <Gem className="w-8 h-8 text-emerald-400" />
                <div>
                  <h4 className="text-lg font-bold text-white">💎 Survivor</h4>
                  <p className="text-emerald-400 text-xs font-mono uppercase tracking-wider">Economy</p>
                </div>
              </div>
              <div className="mb-4 inline-flex px-3 py-1 rounded-full bg-slate-950 border border-slate-800 w-fit">
                <span className="text-[10px] text-slate-300 font-mono">Multi-Task Economy PPO</span>
              </div>
              <p className="text-sm text-slate-400 mb-6 flex-grow">
                Balances harvesting, crafting, and threat evasion to secure high-value resources with maximum efficiency.
              </p>
              <div className="pt-4 border-t border-slate-800/50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">Speedrun Completion</span>
                <span className="text-emerald-400 font-mono font-bold">85.0%</span>
              </div>
            </div>
          </div>
        </section>

        {/* SIGNATURE DEMO BANNER */}
        <section className="w-full max-w-4xl mx-auto">
          <Link href="/signature-demo" className="block group">
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 group-hover:border-emerald-500/50 transition-colors overflow-hidden relative">
              <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Swords className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-xl font-bold text-white">Signature Demo: Champion vs Candidate</h3>
                </div>
                <p className="text-slate-400 text-sm">
                  Watch live generalization testing as our established models compete against new training checkpoints in unpredictable environments.
                </p>
              </div>
              <div className="relative z-10 bg-emerald-500/10 text-emerald-400 px-6 py-3 rounded-2xl border border-emerald-500/20 font-semibold group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors whitespace-nowrap">
                Watch Battle Arena
              </div>
            </div>
          </Link>
        </section>

        {/* CURRICULUM ARENAS SECTION */}
        <section className="w-full max-w-6xl mx-auto border-t border-slate-800/50 pt-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
              <Layers className="w-6 h-6 text-emerald-400" />
              Curriculum Challenge Arenas
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/demo?challenge=0" className="bg-slate-900/60 border border-slate-800 hover:border-emerald-400/50 rounded-2xl p-5 transition-all">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold block mb-2">Stage 1</span>
              <h3 className="text-sm font-bold text-white mb-2">Precision Parkour</h3>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">2-block chasm leaps with velocity and sprint momentum management.</p>
            </Link>

            <Link href="/demo?challenge=1" className="bg-slate-900/60 border border-slate-800 hover:border-orange-400/50 rounded-2xl p-5 transition-all">
              <span className="text-[10px] font-mono text-orange-400 uppercase tracking-widest font-bold block mb-2">Stage 2</span>
              <h3 className="text-sm font-bold text-white mb-2">Lava Lake Bridging</h3>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">Crouching edge protection and cobblestone bridging over lava lakes.</p>
            </Link>

            <Link href="/demo?challenge=3" className="bg-slate-900/60 border border-slate-800 hover:border-purple-400/50 rounded-2xl p-5 transition-all">
              <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest font-bold block mb-2">Stage 3</span>
              <h3 className="text-sm font-bold text-white mb-2">Night Creeper Survival</h3>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">Dynamic day/night cycle, hostile mob proximity tracking, and evasion.</p>
            </Link>

            <Link href="/demo?challenge=4" className="bg-slate-900/60 border border-slate-800 hover:border-cyan-400/50 rounded-2xl p-5 transition-all">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block mb-2">Stage 4</span>
              <h3 className="text-sm font-bold text-white mb-2">Speedrun Economy</h3>
              <p className="text-xs text-slate-400 font-mono leading-relaxed">Wood harvesting, pickaxe crafting, iron mining, and diamond depot delivery.</p>
            </Link>
          </div>
        </section>

        {/* BOTTOM TECH STACK SECTION */}
        <section className="w-full max-w-4xl mx-auto pt-16 mt-8 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 border-t border-slate-800/50 opacity-80">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-emerald-400" />
            <div className="text-left">
              <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Powered By</p>
              <p className="text-sm font-bold text-slate-300">Pure Neon Serverless PostgreSQL</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-cyan-400" />
            <div className="text-left">
              <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Inference</p>
              <p className="text-sm font-bold text-slate-300">Client-Side ONNX WASM &lt; 1.5ms</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
