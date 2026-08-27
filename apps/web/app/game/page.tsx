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
import { SpatialRadar } from "@/components/game/SpatialRadar";
import { VoiceCommander } from "@/components/game/VoiceCommander";
import { soundFx } from "@/lib/audio-synthesizer";

// Dynamic import to avoid SSR issues with Three.js
const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => <GameLoadingScreen progress={50} message="Spawning Living Minecraft World..." />,
});

function GameLoadingScreen({ progress, message }: { progress: number; message: string }) {
  return (
    <div className="fixed inset-0 bg-[#0c0f17] flex flex-col items-center justify-center z-[200] select-none">
      <div className="text-center space-y-4 max-w-sm px-4">
        <div className="h-14 w-14 mx-auto bg-[#10b981] border-2 border-t-[#6ee7b7] border-l-[#6ee7b7] border-r-[#047857] border-b-[#047857] shadow-xl flex items-center justify-center">
          <span className="text-2xl">⛏️</span>
        </div>
        <h1 className="font-pixel text-xl sm:text-2xl font-bold tracking-widest text-white">
          MIND<span className="text-[#34d399]">CRAFT</span>
        </h1>
        <p className="font-mono text-xs text-[#94a3b8]">{message}</p>
        <div className="mc-xp-bar w-64 mx-auto">
          <div className="mc-xp-fill transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="font-pixel text-[8px] text-[#64748b]">LIVING VOXEL ENTITIES &bull; AUTONOMOUS AI &bull; DEEPGRAM</p>
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
  const [player, setPlayer] = useState<PlayerState>(createDefaultPlayer("Player Steve", 12, 12));
  const [aiEntities, setAIEntities] = useState<AIEntityState[]>([]);
  const [modelStatus, setModelStatus] = useState("REAL_MODEL");
  const [selectedNPC, setSelectedNPC] = useState<AIEntityState | null>(null);
  const [voiceCommand, setVoiceCommand] = useState<{ text: string; actionType: string; timestamp: number } | null>(null);

  useEffect(() => {
    let world: WorldData;
    if (worldId) {
      const loaded = getWorld(worldId);
      world = loaded || {
        id: "default",
        name: "Minecraft Living Voxel Realm",
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
        name: "Minecraft Living AI Arena",
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

  const handleVoiceCommand = (command: string, actionType: string, targetEntity?: string) => {
    setVoiceCommand({ text: command, actionType, timestamp: Date.now() });
  };

  if (isLoading) {
    return <GameLoadingScreen progress={100} message="Spawning Living Minecraft World..." />;
  }

  // Generate radar blips from living entities
  const radarBlips = aiEntities.map((ent) => ({
    id: ent.id,
    type: (ent.role === "creeper" ? "threat" : "resource") as "threat" | "resource",
    x: ent.position[0],
    z: ent.position[2],
    label: ent.name,
  }));

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* 3D Game Canvas Viewport */}
      <GameCanvas
        worldSeed={worldData?.seed || 42}
        worldType={worldData?.type || "riverland"}
        displayName={player.displayName}
        onPlayerUpdate={setPlayer}
        onAIEntitiesUpdate={setAIEntities}
        onModelStatusUpdate={setModelStatus}
        onPauseRequest={handlePauseRequest}
        isPaused={isPaused}
        activeVoiceCommand={voiceCommand}
      />

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
        <div className="h-4 w-4 border-2 border-white/80 rounded-full flex items-center justify-center">
          <div className="h-1 w-1 bg-white rounded-full" />
        </div>
      </div>

      {/* In-Game HUD Elements */}
      {!isPaused && (
        <>
          <GameHUD
            player={player}
            dayCount={1}
            timeOfDay="Day"
            modelStatus={modelStatus}
            worldName={worldData?.name || "Living Minecraft Arena"}
          />

          {/* Top-Right Spatial Minimap Radar */}
          <div className="absolute top-4 right-4 z-40 pointer-events-none hidden md:block">
            <SpatialRadar
              playerPos={player.position}
              playerYaw={player.yaw}
              activeActionName="Living NPC Sync Active"
              confidence={98.5}
              isRealInference={true}
              blips={radarBlips}
            />
          </div>

          {/* Bottom-Left AI Voice Radio Commander */}
          <div className="absolute bottom-20 left-4 z-40 max-w-sm">
            <VoiceCommander onCommandIssued={handleVoiceCommand} activeCharacter="Alex (Guardian)" />
          </div>

          {/* AI Entity Live State Feed */}
          <div className="absolute top-24 left-4 z-30 hidden lg:flex flex-col gap-1.5 pointer-events-none">
            {aiEntities.map((ent) => (
              <div
                key={ent.id}
                className={`rounded-xl border px-3 py-1.5 text-xs font-mono backdrop-blur-md transition-all ${
                  ent.role === "creeper"
                    ? "border-red-500/40 bg-red-950/70 text-red-300"
                    : ent.isInteractingWithPlayer
                    ? "border-emerald-500/60 bg-emerald-950/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    : "border-white/10 bg-slate-950/70 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-3 font-bold">
                  <span>{ent.name}</span>
                  <span className="text-[10px] text-slate-400 uppercase">{ent.currentActivity}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{ent.currentGoal}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pause Menu Overlay */}
      <PauseMenu
        isOpen={isPaused}
        onResume={() => setIsPaused(false)}
        worldName={worldData?.name || "Living Minecraft Arena"}
      />
    </div>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={<GameLoadingScreen progress={50} message="Preparing Voxel Shaders..." />}>
      <GamePageContent />
    </Suspense>
  );
}
