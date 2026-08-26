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
  BookOpen,
  Trophy,
  User,
  LogOut,
  Sparkles,
  Skull,
  BrainCircuit
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();

  // Hide navbar on full-screen game page
  if (pathname.startsWith("/game")) return null;

  const mainLinks = [
    { name: "3D AI Lab", href: "/demo", icon: Terminal, badge: "INFERENCE" },
    { name: "RL Trainer", href: "/trainer", icon: BrainCircuit, badge: "LIVE TRAIN" },
    { name: "Bots Roster", href: "/characters", icon: Bot },
    { name: "Bestiary", href: "/enemies", icon: Skull },
    { name: "Challenges", href: "/challenges", icon: Swords },
    { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    { name: "Dashboard", href: "/dashboard", icon: Activity },
    { name: "Models", href: "/models", icon: Layers },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-[#3b4458] bg-[#0c0f17]/95 backdrop-blur-md select-none">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-9 w-9 bg-[#10b981] border-2 border-t-[#6ee7b7] border-l-[#6ee7b7] border-r-[#047857] border-b-[#047857] shadow-md flex items-center justify-center group-hover:brightness-110 transition">
            <Bot className="h-5 w-5 text-[#0c0f17]" />
          </div>
          <div className="flex flex-col">
            <span className="font-pixel text-sm sm:text-base font-bold tracking-wider text-white text-shadow">
              MIND<span className="text-[#34d399]">CRAFT</span>
            </span>
            <span className="text-[8px] font-pixel text-[#94a3b8] -mt-1 tracking-tight">
              EMBODIED AI VOXEL LAB
            </span>
          </div>
        </Link>

        {/* Navigation - Blocky Tabs */}
        <nav className="hidden xl:flex items-center gap-1">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-2 py-1.5 font-pixel text-[9px] uppercase tracking-wide border-2 transition-all ${
                  isActive
                    ? "bg-[#10b981]/20 text-[#34d399] border-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    : "bg-[#1e2330] text-[#94a3b8] border-t-[#3b4458] border-l-[#3b4458] border-r-[#0f121a] border-b-[#0f121a] hover:text-white hover:bg-[#282f40]"
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{link.name}</span>
                {link.badge && (
                  <span className={`text-[7px] px-1 py-0.2 font-mono font-bold ${
                    link.badge === "LIVE TRAIN" ? "bg-[#d97706] text-white" : "bg-[#059669] text-white"
                  }`}>
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side Profile & Login */}
        <div className="flex items-center gap-2">
          <Link
            href="/trainer"
            className="mc-btn mc-btn-gold text-[9px] px-2.5 py-1.5 hidden md:flex items-center gap-1"
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>TRAIN AI</span>
          </Link>

          <Link
            href="/profile"
            className={`mc-btn ${pathname === "/profile" ? "mc-btn-primary" : "mc-btn-stone"} text-[9px] px-2.5 py-1.5 flex items-center gap-1`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PROFILE</span>
          </Link>

          {isAuthenticated && (
            <button
              onClick={logout}
              className="mc-btn mc-btn-danger text-[9px] px-2 py-1.5"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
