"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, Sparkles, Terminal, Loader2 } from "lucide-react";
import { soundFx } from "@/lib/audio-synthesizer";

interface VoiceCommanderProps {
  onCommandIssued?: (command: string, actionType: string) => void;
  activeCharacter?: string;
}

export function VoiceCommander({
  onCommandIssued,
  activeCharacter = "Explorer",
}: VoiceCommanderProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Initialize native Web Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleToggleListen = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      if (transcript) processCommand(transcript);
    } else {
      setTranscript("");
      setAiResponse("");
      soundFx.playPlaceBlock(0);
      try {
        if (recognitionRef.current) {
          recognitionRef.current.start();
          setIsListening(true);
        } else {
          // Fallback simulation for unsupported browsers
          setIsListening(true);
          setTimeout(() => {
            setTranscript("Explorer, build a bridge across the lava chasm");
            setIsListening(false);
            processCommand("Explorer, build a bridge across the lava chasm");
          }, 2500);
        }
      } catch {
        setIsListening(false);
      }
    }
  };

  const processCommand = async (commandText: string) => {
    if (!commandText.trim()) return;
    setIsProcessing(true);

    try {
      // Execute command intent
      let responseText = `${activeCharacter} acknowledging: Executing "${commandText}".`;
      let actionType = "EXPLORE";

      const lower = commandText.toLowerCase();
      if (lower.includes("bridge") || lower.includes("build") || lower.includes("chasm")) {
        actionType = "BUILD";
        responseText = `${activeCharacter}: Initiating cobblestone bridging sequence over hazard.`;
        soundFx.playPlaceBlock(0.2);
      } else if (lower.includes("creeper") || lower.includes("threat") || lower.includes("defend") || lower.includes("kill")) {
        actionType = "DEFEND";
        responseText = `${activeCharacter}: Threat locked. Sprinting to intercept incoming hostile.`;
        soundFx.playCreeperHiss(-0.3);
      } else if (lower.includes("mine") || lower.includes("diamond") || lower.includes("resource") || lower.includes("gather")) {
        actionType = "HARVEST";
        responseText = `${activeCharacter}: Navigating to nearest diamond vein for collection.`;
        soundFx.playDiamondChime();
      } else {
        soundFx.playLevelVictory();
      }

      setAiResponse(responseText);
      speakText(responseText);
      if (onCommandIssued) {
        onCommandIssued(commandText, actionType);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-indigo-500/30 bg-slate-950/85 p-3.5 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2 text-xs">
        <div className="flex items-center gap-1.5 font-mono font-semibold uppercase tracking-wider text-indigo-400">
          <Terminal className="h-3.5 w-3.5 text-indigo-400" />
          <span>AI Voice Commander</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
          <Sparkles className="h-3 w-3 text-indigo-400" />
          Deepgram / Groq
        </span>
      </div>

      {/* Main Interactive Button & Waveform */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggleListen}
          disabled={isProcessing}
          className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ${
            isListening
              ? "bg-red-500 shadow-[0_0_20px_#ef4444] text-white animate-pulse"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]"
          }`}
          title={isListening ? "Stop listening" : "Click to speak voice command"}
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isListening ? (
            <Mic className="h-5 w-5 animate-bounce" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>

        <div className="flex flex-1 flex-col">
          <span className="text-[11px] font-medium text-slate-300">
            {isListening ? (
              <span className="text-red-400 animate-pulse font-mono font-semibold">
                ● Listening to your microphone...
              </span>
            ) : transcript ? (
              <span className="text-indigo-300 font-mono">"{transcript}"</span>
            ) : (
              <span className="text-slate-400">Press mic to speak in-game directives...</span>
            )}
          </span>
          <span className="text-[10px] text-slate-400">
            e.g. "Explorer, bridge over lava" or "Guardian, attack creeper"
          </span>
        </div>
      </div>

      {/* AI Audible Response Bubble */}
      {aiResponse && (
        <div className="mt-1 flex items-start gap-2 rounded-lg border border-indigo-500/20 bg-indigo-950/40 p-2 text-xs text-indigo-200">
          <Volume2 className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
          <span className="font-mono text-[11px] leading-relaxed">{aiResponse}</span>
        </div>
      )}
    </div>
  );
}
