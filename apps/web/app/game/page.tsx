"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { PlayerState, createDefaultPlayer } from "@/lib/game/player-controller";
import { AIEntityState } from "@/lib/game/ai-entity";
import { getWorld, WorldData } from "@/lib/world-manager";
import GameHUD from "@/components/game/GameHUD";
import PauseMenu from "@/components/game/PauseMenu";
import AIEntityPanel from "@/components/game/AIEntityPanel";
import { soundSynth } from "@/lib/audio/sound-synth";

// Dynamic import to avoid SSR issues with Three.js
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => <GameLoadingScreen progress={50} message="Initializing Voxel Engine..." />,
});

function GameLoadingScreen({ progress, message }: { progress: number; message: string }) {
  return (
    <div className="fixed inset-0 bg-[#0c0f17] flex flex-col items-center justify-center z-[200] select-none">
      <div className="text-center space-y-4 max-w-sm px-4">
        <div className="h-14 w-14 mx-auto bg-[#10b981] border-2 border-t-[#6ee7b7] border-l-[#6ee7b7] border-r-[#047857] border-b-[#047857] shadow-xl flex items-center justify-center">
          <span className="text-2xl">⛏️</span>
        </div>
        <h1 className="font-pixel text-xl sm:text-2xl font-bold tracking-widest text-white text-shadow">
          MIND<span className="text-[#34d399]">CRAFT</span>
        </h1>
        <p className="font-mono text-xs text-[#94a3b8]">{message}</p>
        <div className="mc-xp-bar w-64 mx-auto">
          <div
            className="mc-xp-fill transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="font-pixel text-[8px] text-[#64748b]">GENERATING PROCEDURAL VOXELS &bull; PYTORCH ONNX</p>
      </div>
    </div>
  );
}

function GamePageContent() {
  const searchParams = useSearchParams();
  const worldId = searchParams.get("world");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [worldData, setWorldData] = useState<WorldData | null>(null);
  const [player, setPlayer] = useState<PlayerState>(createDefaultPlayer("Steve Voxel", 10, 10));
  const [aiEntities, setAIEntities] = useState<AIEntityState[]>([]);
  const [modelStatus, setModelStatus] = useState("RUNNING");
  const [selectedNPC, setSelectedNPC] = useState<AIEntityState | null>(null);

  // Instant world loading with zero artificial delays
  useEffect(() => {
    let world: WorldData;
    if (worldId) {
      const loaded = getWorld(worldId);
      world = loaded || {
        id: "default",
        name: "Riverland Voxel Realm",
        type: "riverland",
        seed: 42,
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        dayCount: 1,
        aiPopulation: 4,
      };
    } else {
      world = {
        id: "quick_play",
        name: "AI Co-Op Arena",
        type: "training_showcase",
        seed: 12345,
        createdAt: new Date().toISOString(),
        lastPlayedAt: new Date().toISOString(),
        dayCount: 1,
        aiPopulation: 4,
      };
    }
    setWorldData(world);
    setIsLoading(false);
  }, [worldId]);

  const handlePauseRequest = () => {
    setIsPaused((prev) => !prev);
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  };

  const worldName = worldData?.name || "AI Co-Op Arena";
  const worldSeed = worldData?.seed || 42;
  const worldType = worldData?.type || "training_showcase";

  if (isLoading) {
    return <GameLoadingScreen progress={100} message="Launching Voxel Simulation..." />;
  }

  return (
    <div className="game-mode relative w-screen h-screen overflow-hidden select-none">
      {/* 3D Game Canvas */}
      <GameCanvas
        worldSeed={worldSeed}
        worldType={worldType}
        displayName={player.displayName || "Steve Voxel"}
        onPlayerUpdate={setPlayer}
        onAIEntitiesUpdate={setAIEntities}
        onModelStatusUpdate={setModelStatus}
        onPauseRequest={handlePauseRequest}
        isPaused={isPaused}
      />

      {/* Game HUD (only visible when not paused) */}
      {!isPaused && (
        <GameHUD
          player={player}
          dayCount={worldData?.dayCount || 1}
          timeOfDay="Morning"
          modelStatus={modelStatus}
          worldName={worldName}
        />
      )}

      {/* AI Entity Panel */}
      <AIEntityPanel
        entity={selectedNPC}
        onClose={() => setSelectedNPC(null)}
      />

      {/* Pause Menu */}
      <PauseMenu
        isOpen={isPaused}
        onResume={() => setIsPaused(false)}
        worldName={worldName}
      />
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<GameLoadingScreen progress={0} message="Starting..." />}>
      <GamePageContent />
    </Suspense>
  );
}
