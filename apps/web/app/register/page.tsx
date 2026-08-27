"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as THREE from "three";
import { 
  UserPlus, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  Bot, 
  Volume2, 
  VolumeX, 
  Mail, 
  KeyRound, 
  CheckCircle2, 
  ExternalLink 
} from "lucide-react";
import { soundSynth } from "@/lib/audio/sound-synth";

export default function RegisterPage() {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Step 1: Registration Form, Step 2: Email OTP Verification
  const [step, setStep] = useState<"form" | "verify">("form");
  const [otpCode, setOtpCode] = useState("");
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);

  // 3D Three.js Scene Setup
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
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x10b981, 1.2);
    sunLight.position.set(10, 20, 10);
    scene.add(sunLight);

    const islandGroup = new THREE.Group();
    scene.add(islandGroup);

    const grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
    const emeraldMat = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.8 });
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);

    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        const dist = Math.hypot(x, z);
        if (dist > 3.4) continue;

        const grass = new THREE.Mesh(boxGeo, grassMat);
        grass.position.set(x, 0, z);
        islandGroup.add(grass);

        const dirt = new THREE.Mesh(boxGeo, dirtMat);
        dirt.position.set(x, -1, z);
        islandGroup.add(dirt);

        if (dist < 2.5) {
          const isEmerald = (x === 0 && z === 1) || (x === -1 && z === -1);
          const ore = new THREE.Mesh(boxGeo, isEmerald ? emeraldMat : stoneMat);
          ore.position.set(x, -2, z);
          islandGroup.add(ore);
        }
      }
    }

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
      const time = Date.now() * 0.001;

      islandGroup.position.y = Math.sin(time * 0.8) * 0.25;
      islandGroup.rotation.y = time * 0.15 + mouseX * 0.3;

      camera.position.x = mouseX * 1.5;
      camera.position.y = 4 - mouseY * 1.0;
      camera.lookAt(0, 0.5, 0);

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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    if (soundEnabled) soundSynth.playBlockBreak();

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          displayName: displayName.trim() || email.split("@")[0],
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (soundEnabled) soundSynth.playLevelUp();
        if (data.previewUrl) setEmailPreviewUrl(data.previewUrl);
        setStep("verify");
      } else {
        setError(data.error || "Registration failed");
        if (soundEnabled) soundSynth.playHurtGrunt();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: otpCode.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (soundEnabled) soundSynth.playLevelUp();
        router.push("/game");
      } else {
        setError(data.error || "Invalid verification code");
        if (soundEnabled) soundSynth.playHurtGrunt();
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden select-none">
      {/* 3D Background */}
      <div ref={mountRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Audio Toggle */}
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
                PLAYER IDENTITY & EMAIL VERIFICATION
              </span>
            </div>
          </Link>
        </div>

        {/* GUI Panel */}
        <div className="mc-panel-stone p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="text-center border-b-2 border-[#141720] pb-3">
            <h1 className="font-pixel text-sm sm:text-base font-bold text-white tracking-wider">
              {step === "form" ? "NEW PLAYER REGISTRATION" : "VERIFY EMAIL CODE"}
            </h1>
            <p className="font-mono text-[11px] text-[#94a3b8] mt-1">
              {step === "form"
                ? "Enter player credentials to receive 6-digit OTP verification code"
                : `Enter the 6-digit code sent to ${email}`}
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/80 border-2 border-red-500 text-red-300 font-pixel text-[10px] shadow">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {step === "form" ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="font-pixel text-[9px] text-[#94a3b8] uppercase tracking-wider block">
                  PLAYER NAME / CALLSIGN
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Steve_Voxel"
                  className="w-full bg-[#12151e] border-2 border-t-[#0b0d13] border-l-[#0b0d13] border-r-[#32394a] border-b-[#32394a] px-3 py-2 text-white font-mono text-xs focus:border-[#10b981] outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="font-pixel text-[9px] text-[#94a3b8] uppercase tracking-wider block">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="steve@mindcraft.ai"
                  className="w-full bg-[#12151e] border-2 border-t-[#0b0d13] border-l-[#0b0d13] border-r-[#32394a] border-b-[#32394a] px-3 py-2 text-white font-mono text-xs focus:border-[#10b981] outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-pixel text-[9px] text-[#94a3b8] uppercase tracking-wider block">
                  PASSWORD CIPHER
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
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

              <button
                type="submit"
                disabled={isLoading}
                className="mc-btn mc-btn-primary w-full text-xs py-3 font-pixel tracking-wider shadow-lg"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                <span>{isLoading ? "SENDING OTP..." : "SEND VERIFICATION EMAIL"}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="space-y-1 text-center">
                <label className="font-pixel text-[9px] text-emerald-400 uppercase tracking-wider block">
                  6-DIGIT OTP CODE
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full text-center tracking-[12px] text-2xl font-mono font-bold bg-[#12151e] border-2 border-emerald-500/50 py-3 text-emerald-300 outline-none"
                  autoFocus
                  required
                />
              </div>

              {emailPreviewUrl && (
                <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/30 rounded text-center">
                  <a
                    href={emailPreviewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-mono text-[11px] text-cyan-300 hover:text-cyan-200 underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>View Sent Email Preview in Browser</span>
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || otpCode.length < 6}
                className="mc-btn mc-btn-primary w-full text-xs py-3 font-pixel tracking-wider shadow-lg"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{isLoading ? "VERIFYING..." : "VERIFY & ENTER MINECRAFT"}</span>
              </button>

              <button
                type="button"
                onClick={() => setStep("form")}
                className="w-full text-center font-mono text-[11px] text-slate-400 hover:text-white"
              >
                ← Back to Edit Email
              </button>
            </form>
          )}

          <div className="pt-3 border-t-2 border-[#141720] text-center">
            <Link
              href="/login"
              className="font-pixel text-[9px] text-[#38bdf8] hover:text-[#7dd3fc] transition"
            >
              ALREADY HAVE AN IDENTITY? SIGN IN →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
