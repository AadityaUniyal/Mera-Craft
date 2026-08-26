"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Terminal, Shield, Layers, Cpu } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();
  
  // Hide footer on full-screen game page
  if (pathname.startsWith("/game")) return null;

  return (
    <footer className="border-t-2 border-[#3b4458] bg-[#0c0f17] py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 bg-[#10b981] border border-[#6ee7b7] flex items-center justify-center">
              <Bot className="h-4 w-4 text-[#0c0f17]" />
            </div>
            <div className="flex flex-col">
              <span className="font-pixel text-xs font-bold text-white tracking-wider">
                MINDCRAFT <span className="text-[#34d399]">AI LAB</span>
              </span>
              <span className="font-mono text-[10px] text-[#64748b]">
                PyTorch PPO &bull; 42-Dim Raycasting &bull; ONNX WebAssembly &bull; Neon DB
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-pixel text-[#94a3b8]">
            <Link href="/demo" className="hover:text-[#34d399] transition flex items-center gap-1">
              <Terminal className="w-3 h-3" />
              <span>3D AI LAB</span>
            </Link>
            <Link href="/models" className="hover:text-[#38bdf8] transition flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>MODELS</span>
            </Link>
            <Link href="/dashboard" className="hover:text-[#fbbf24] transition flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>TRAINING DASHBOARD</span>
            </Link>
            <Link href="/docs" className="hover:text-white transition flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>DOCS</span>
            </Link>
          </div>

          <div className="font-pixel text-[10px] text-[#64748b]">
            &copy; 2026 MINDCRAFT
          </div>
        </div>
      </div>
    </footer>
  );
}
