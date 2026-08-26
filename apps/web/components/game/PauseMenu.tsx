"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Play, Settings, Save, Globe, LogOut } from "lucide-react";

interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  worldName: string;
}

export default function PauseMenu({ isOpen, onResume, worldName }: PauseMenuProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Menu Panel */}
      <div className="relative glass-dark rounded-2xl p-8 w-full max-w-sm space-y-6 shadow-2xl">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white tracking-tight">PAUSED</h2>
          <p className="text-sm text-slate-400 mt-1 font-mono">{worldName}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onResume}
            className="btn-primary w-full text-base py-3"
          >
            <Play className="w-5 h-5" />
            Resume
          </button>

          <button
            onClick={() => {
              // Save world state to localStorage
              onResume();
            }}
            className="btn-secondary w-full"
          >
            <Save className="w-4 h-4" />
            Save World
          </button>

          <button
            onClick={() => router.push("/worlds")}
            className="btn-secondary w-full"
          >
            <Globe className="w-4 h-4" />
            Return to World Select
          </button>

          <button
            onClick={() => router.push("/")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Quit to Main Menu
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-500 font-mono">
          Press ESC to resume
        </p>
      </div>
    </div>
  );
}
