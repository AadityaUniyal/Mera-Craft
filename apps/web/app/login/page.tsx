"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as THREE from "three";
import { 
  LogIn, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  Bot, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Compass, 
  Play, 
  KeyRound
} from "lucide-react";
import { soundSynth } from "@/lib/audio/sound-synth";

export default function LoginPage() {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 3D Three.js Scene Setup for Immersive Login Background
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.025);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 4, 12);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    moonLight.position.set(10, 20, 10);
    scene.add(moonLight);

    const torchLight = new THREE.PointLight(0xf59e0b, 2.0, 15);
    torchLight.position.set(0, 2.5, 0);
    scene.add(torchLight);

    // 3D Floating Voxel Island
    const islandGroup = new THREE.Group();
    scene.add(islandGroup);

    const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
    const diamondMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x0284c7, emissiveIntensity: 0.8 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c391f, roughness: 0.8 });
    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 });
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    // Build Floating Island Terrain (7x7)
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        const distFromCenter = Math.hypot(x, z);
        if (distFromCenter > 3.4) continue;

        // Top Grass
        const grass = new THREE.Mesh(boxGeo, grassMat);
        grass.position.set(x, 0, z);
        grass.receiveShadow = true;
        islandGroup.add(grass);

        // Middle Dirt Layer
        const dirt = new THREE.Mesh(boxGeo, dirtMat);
        dirt.position.set(x, -1, z);
        dirt.receiveShadow = true;
        islandGroup.add(dirt);

        // Bottom Stone & Ores
        if (distFromCenter < 2.5) {
          const isDiamond = (x === 1 && z === 1) || (x === -1 && z === 0);
          const ore = new THREE.Mesh(boxGeo, isDiamond ? diamondMat : stoneMat);
          ore.position.set(x, -2, z);
          ore.receiveShadow = true;
          islandGroup.add(ore);
        }
      }
    }

    // Mini Tree on Island
    const trunk1 = new THREE.Mesh(boxGeo, woodMat);
    trunk1.position.set(-1.5, 1, -1.5);
    islandGroup.add(trunk1);
    const trunk2 = new THREE.Mesh(boxGeo, woodMat);
    trunk2.position.set(-1.5, 2, -1.5);
    islandGroup.add(trunk2);

    for (let lx = -2.5; lx <= -0.5; lx += 1) {
      for (let lz = -2.5; lz <= -0.5; lz += 1) {
        const leaves = new THREE.Mesh(boxGeo, leavesMat);
        leaves.position.set(lx, 3, lz);
        islandGroup.add(leaves);
      }
    }

    // 3D Animated Steve Voxel Avatar on Island
    const steveGroup = new THREE.Group();
    steveGroup.position.set(1.2, 0.5, 0.5);

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

    // Floating 3D Sparkle Particles
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 16;
      particlePositions[i + 1] = Math.random() * 8 - 2;
      particlePositions[i + 2] = (Math.random() - 0.5) * 16;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Mouse Parallax
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      const time = Date.now() * 0.001;

      // Island gentle floating bob & slow rotation
      islandGroup.position.y = Math.sin(time * 0.8) * 0.25;
      islandGroup.rotation.y = time * 0.15 + mouseX * 0.3;

      // Steve head turning
      head.rotation.y = Math.sin(time * 1.2) * 0.4 + mouseX * 0.5;
      head.rotation.x = -mouseY * 0.3;

      // Camera parallax
      camera.position.x = mouseX * 1.5;
      camera.position.y = 4 - mouseY * 1.0;
      camera.lookAt(0, 0.5, 0);

      // Float particles
      const positions = particleGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < particleCount * 3; i += 3) {
        positions[i] += 0.01;
        if (positions[i] > 6) positions[i] = -2;
      }
      particleGeo.attributes.position.needsUpdate = true;

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

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundSynth.enabled = next;
    if (next) soundSynth.playDiamondChime();
  };

  const handleDemoFill = () => {
    setEmail("admin@mindcraft.ai");
    setPassword("mindcraft2026");
    if (soundEnabled) soundSynth.playBlockPlace();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    if (soundEnabled) soundSynth.playBlockBreak();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (soundEnabled) soundSynth.playLevelUp();
        router.push("/demo");
      } else {
        setError(data.error || "Invalid credentials. Try Auto-fill Demo Account!");
        if (soundEnabled) soundSynth.playHurtGrunt();
      }
    } catch {
      setError("Network error. Launching guest AI lab mode.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden select-none">
      {/* Fullscreen 3D Three.js Canvas Background */}
      <div ref={mountRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Audio Toggle in Corner */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={handleToggleSound}
          className={`mc-btn ${soundEnabled ? "mc-btn-primary" : "mc-btn-stone"} text-[10px] px-3 py-1.5 flex items-center gap-1.5 shadow-xl`}
          title="Toggle 8-bit Audio"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          <span>{soundEnabled ? "AUDIO ON" : "MUTED"}</span>
        </button>
      </div>

      <div className="relative z-10 w-full max-w-md my-8">
        {/* Minecraft Logo Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="h-12 w-12 bg-[#10b981] border-2 border-t-[#6ee7b7] border-l-[#6ee7b7] border-r-[#047857] border-b-[#047857] shadow-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
              <Bot className="h-7 w-7 text-[#0c0f17]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-pixel text-lg font-bold text-white tracking-widest text-shadow">
                MIND<span className="text-[#34d399]">CRAFT</span>
              </span>
              <span className="font-pixel text-[9px] text-[#38bdf8] tracking-wider">
                3D VOXEL NEURAL LAB
              </span>
            </div>
          </Link>
        </div>

        {/* Minecraft GUI Box Card */}
        <div className="mc-panel-stone p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="text-center border-b-2 border-[#141720] pb-3">
            <h1 className="font-pixel text-sm sm:text-base font-bold text-white tracking-wider">
              ENTER VOXEL LAB
            </h1>
            <p className="font-mono text-[11px] text-[#94a3b8] mt-1">
              Authenticate into the live Neon DB neural ecosystem
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/80 border-2 border-red-500 text-red-300 font-pixel text-[10px] shadow">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="font-pixel text-[9px] text-[#94a3b8] uppercase tracking-wider block">
                PLAYER IDENTITY (EMAIL)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="steve@mindcraft.ai"
                className="w-full bg-[#12151e] border-2 border-t-[#0b0d13] border-l-[#0b0d13] border-r-[#32394a] border-b-[#32394a] px-3 py-2 text-white font-mono text-xs focus:border-[#10b981] outline-none"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <label className="font-pixel text-[9px] text-[#94a3b8] uppercase tracking-wider block">
                SECURITY CIPHER (PASSWORD)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#12151e] border-2 border-t-[#0b0d13] border-l-[#0b0d13] border-r-[#32394a] border-b-[#32394a] px-3 py-2 pr-10 text-white font-mono text-xs focus:border-[#10b981] outline-none"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Autofill Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleDemoFill}
                className="font-pixel text-[8px] text-[#38bdf8] hover:text-[#7dd3fc] flex items-center gap-1 transition"
              >
                <KeyRound className="w-3 h-3" />
                <span>AUTO-FILL DEMO ACCOUNT</span>
              </button>
            </div>

            {/* Enter World Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="mc-btn mc-btn-primary w-full text-xs py-3 font-pixel tracking-wider shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{isLoading ? "CONNECTING TO NEON..." : "ENTER 3D WORLD"}</span>
            </button>
          </form>

          {/* Quick Play Guest & Register Links */}
          <div className="pt-3 border-t-2 border-[#141720] flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
            <Link
              href="/register"
              className="font-pixel text-[9px] text-[#34d399] hover:text-[#6ee7b7] transition"
            >
              CREATE IDENTITY →
            </Link>

            <Link
              href="/demo"
              className="mc-btn mc-btn-diamond text-[9px] px-3 py-1.5"
            >
              <Sparkles className="w-3 h-3 text-yellow-300" />
              <span>GUEST AI LAB →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
