"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Bot, 
  Play,
  Swords,
  Layers,
  Activity,
  Terminal,
  Trophy,
  User,
  LogOut,
  Sparkles,
  ShieldCheck,
  BrainCircuit,
  Compass,
  Hammer,
  Paintbrush,
  Brain
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  if (pathname.startsWith("/game")) return null;

  const mainLinks = [
    { name: "3D AI Lab", href: "/demo", icon: Terminal, badge: "LIVE INFERENCE" },
    { name: "AI Studio", href: "/ai-studio", icon: Brain, badge: "TRAIN" },
    { name: "3D Sandbox", href: "/sandbox", icon: Paintbrush, badge: "EDITOR" },
    { name: "Signature Demo", href: "/signature-demo", icon: Sparkles },
    { name: "Characters", href: "/characters", icon: Bot },
    { name: "Challenges", href: "/challenges", icon: Swords },
    { name: "Model Registry", href: "/models", icon: Layers },
    { name: "Admin", href: "/admin", icon: ShieldCheck, badge: "MLOPS" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md select-none font-sans">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition">
            <Bot className="h-5 w-5 text-slate-950" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-sm sm:text-base font-bold tracking-wider text-white">
              MIND<span className="text-emerald-400">CRAFT</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400 -mt-1 tracking-tight">
              MULTI-AGENT VOXEL RL LAB
            </span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-mono text-xs transition relative ${
                  isActive
                    ? "bg-slate-800 text-white font-bold border border-emerald-500/50 shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                <span>{link.name}</span>
                {link.badge && (
                  <span className="px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[8px] font-bold">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Auth & Persistent Game ID */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right font-mono">
                <span className="text-xs text-white font-bold">{user?.displayName || "Player"}</span>
                <span className="text-[10px] text-emerald-400 font-bold">{user?.gameId || "GAME-7842-MC"}</span>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/demo"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs shadow-md shadow-emerald-500/20 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Voxel Lab</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
