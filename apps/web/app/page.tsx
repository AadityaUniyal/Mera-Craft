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
  User
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
    <div className="flex flex-col min-h-screen bg-[#0c0f17] relative overflow-hidden select-none">
      {/* 3D WebGL Background Canvas */}
      <div ref={mountRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-14 relative z-10 max-w-5xl mx-auto">
        {/* Minecraft Animated Block Badge */}
        <div className="mb-4">
          <div className="h-14 w-14 mx-auto bg-[#10b981] border-2 border-t-[#6ee7b7] border-l-[#6ee7b7] border-r-[#047857] border-b-[#047857] shadow-2xl flex items-center justify-center">
            <Bot className="h-8 w-8 text-[#0c0f17]" />
          </div>
        </div>

        {/* Wordmark */}
        <h1 className="font-pixel text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-wider mb-3 text-shadow">
          MIND<span className="text-[#34d399]">CRAFT</span>
        </h1>

        {/* Tagline */}
        <div className="inline-block bg-[#1e2330]/90 border-2 border-[#3b4458] px-4 py-1.5 mb-4 shadow-xl">
          <p className="font-pixel text-xs sm:text-sm text-[#38bdf8] uppercase tracking-wider">
            AUTONOMOUS 3D EMBODIED AI VOXEL PLATFORM
          </p>
        </div>

        {/* Sub-description */}
        <p className="text-xs sm:text-sm text-[#cbd5e1] font-mono max-w-2xl mx-auto leading-relaxed mb-6 bg-[#0c0f17]/80 p-3 border border-[#32394a]">
          PyTorch PPO Actor-Critic &bull; 42-Dim Spatial Laser LiDAR &bull; Zero Backend Cost ONNX WebAssembly &bull; Real-time Physics, Bridging & Mob Combat
        </p>

        {/* Main Navigation Portal Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <Link
            href="/demo"
            onClick={() => soundSynth.playDiamondChime()}
            className="mc-btn mc-btn-primary text-xs px-5 py-2.5"
          >
            <Terminal className="w-4 h-4 text-black" />
            <span>3D VOXEL AI LAB</span>
          </Link>

          <Link
            href="/trainer"
            onClick={() => soundSynth.playLevelUp()}
            className="mc-btn mc-btn-gold text-xs px-5 py-2.5"
          >
            <BrainCircuit className="w-4 h-4 text-black" />
            <span>LIVE RL TRAINER</span>
          </Link>

          <Link
            href="/characters"
            onClick={() => soundSynth.playBlockPlace()}
            className="mc-btn mc-btn-diamond text-xs px-5 py-2.5"
          >
            <Bot className="w-4 h-4 text-black" />
            <span>BOT ROSTER</span>
          </Link>

          <Link
            href="/profile"
            onClick={() => soundSynth.playBlockPlace()}
            className="mc-btn mc-btn-stone text-xs px-4 py-2.5"
          >
            <User className="w-4 h-4 text-[#34d399]" />
            <span>PLAYER PROFILE</span>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left">
          <div className="mc-panel-stone p-4 space-y-2 shadow-xl">
            <div className="flex items-center gap-2 font-pixel text-xs text-[#34d399]">
              <Eye className="w-4 h-4" />
              <span>3D LASER LIDAR VISION</span>
            </div>
            <p className="text-[11px] text-[#94a3b8] font-mono leading-relaxed">
              8 color-coded laser rays scanning obstacles, water, lava lakes, and hostile Creepers in real time.
            </p>
          </div>

          <div className="mc-panel-stone p-4 space-y-2 shadow-xl">
            <div className="flex items-center gap-2 font-pixel text-xs text-[#fbbf24]">
              <Cpu className="w-4 h-4" />
              <span>PPO CONTINUOUS ENGINE</span>
            </div>
            <p className="text-[11px] text-[#94a3b8] font-mono leading-relaxed">
              Generalized Advantage Estimation (GAE $\lambda=0.95, \gamma=0.99$) with resumable checkpoint pipeline.
            </p>
          </div>

          <div className="mc-panel-stone p-4 space-y-2 shadow-xl">
            <div className="flex items-center gap-2 font-pixel text-xs text-[#38bdf8]">
              <ShieldCheck className="w-4 h-4" />
              <span>TRUE VOXEL PHYSICS</span>
            </div>
            <p className="text-[11px] text-[#94a3b8] font-mono leading-relaxed">
              Hazard prevention clamps, crouch sneak edge protection, and cobblestone bridging over lava chasms.
            </p>
          </div>
        </div>
      </section>

      {/* Curriculum Arenas Section */}
      <section className="py-10 px-4 max-w-6xl mx-auto w-full relative z-10 border-t-2 border-[#1e2330]">
        <div className="text-center mb-6">
          <h2 className="font-pixel text-lg sm:text-xl font-bold text-white mb-1">
            CURRICULUM CHALLENGE ARENAS
          </h2>
          <p className="text-xs text-[#94a3b8] font-mono">
            Test trained neural policies against demanding Minecraft survival environments.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/demo?challenge=0" className="mc-panel-dark p-4 space-y-2 border-l-4 border-l-[#10b981] hover:border-[#10b981] transition">
            <span className="font-pixel text-[9px] text-[#34d399]">STAGE 1</span>
            <h3 className="font-pixel text-xs font-bold text-white">PRECISION PARKOUR</h3>
            <p className="text-[10px] text-[#94a3b8] font-mono">2-block chasm leaps with velocity and sprint momentum management.</p>
          </Link>

          <Link href="/demo?challenge=1" className="mc-panel-dark p-4 space-y-2 border-l-4 border-l-[#f97316] hover:border-orange-500 transition">
            <span className="font-pixel text-[9px] text-orange-400">STAGE 2</span>
            <h3 className="font-pixel text-xs font-bold text-white">LAVA LAKE BRIDGING</h3>
            <p className="text-[10px] text-[#94a3b8] font-mono">Crouching edge protection and cobblestone bridging over lava lakes.</p>
          </Link>

          <Link href="/demo?challenge=3" className="mc-panel-dark p-4 space-y-2 border-l-4 border-l-[#a855f7] hover:border-purple-500 transition">
            <span className="font-pixel text-[9px] text-purple-400">STAGE 3</span>
            <h3 className="font-pixel text-xs font-bold text-white">NIGHT CREEPER SURVIVAL</h3>
            <p className="text-[10px] text-[#94a3b8] font-mono">Dynamic day/night cycle, hostile mob proximity tracking, and evasion.</p>
          </Link>

          <Link href="/demo?challenge=4" className="mc-panel-dark p-4 space-y-2 border-l-4 border-l-[#00f0ff] hover:border-cyan-400 transition">
            <span className="font-pixel text-[9px] text-[#00f0ff]">STAGE 4</span>
            <h3 className="font-pixel text-xs font-bold text-white">SPEEDRUN ECONOMY</h3>
            <p className="text-[10px] text-[#94a3b8] font-mono">Wood harvesting, pickaxe crafting, iron mining, and diamond depot delivery.</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
