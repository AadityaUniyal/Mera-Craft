"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2, Sparkles, Terminal, Loader2, Radio, Send } from "lucide-react";
import { soundFx } from "@/lib/audio-synthesizer";

interface VoiceCommanderProps {
  onCommandIssued?: (command: string, actionType: string, targetEntity?: string) => void;
  activeCharacter?: string;
  className?: string;
}

export function VoiceCommander({
  onCommandIssued,
  activeCharacter = "Alex",
  className = "",
}: VoiceCommanderProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

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

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition event:", event.error);
          setIsListening(false);
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

  const startListening = async () => {
    setTranscript("");
    setAiResponse("");
    soundFx.playPlaceBlock(0);

    // 1. Try Browser Native SpeechRecognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        return;
      } catch (e) {
        console.warn("Native recognition restart:", e);
      }
    }

    // 2. MediaRecorder fallback
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(",")[1];
            if (base64Data) {
              setIsProcessing(true);
              try {
                const res = await fetch("/api/voice/transcribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ audioBase64: base64Data, mimeType: "audio/webm" }),
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.transcript) {
                    setTranscript(data.transcript);
                    processCommand(data.transcript);
                  }
                }
              } catch (err) {
                console.warn("Audio transcription error:", err);
              } finally {
                setIsProcessing(false);
              }
            }
          };
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start();
        setIsListening(true);

        setTimeout(() => {
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            setIsListening(false);
          }
        }, 4000);
      }
    } catch (err) {
      console.warn("Microphone access permission notice:", err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (transcript) {
      processCommand(transcript);
    }
  };

  const handleToggleListen = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const processCommand = async (commandText: string) => {
    if (!commandText.trim()) return;
    setIsProcessing(true);

    try {
      let responseText = `${activeCharacter}: Roger that! Executing "${commandText}".`;
      let actionType = "EXPLORE";
      let targetEntity = activeCharacter;

      const lower = commandText.toLowerCase();
      if (lower.includes("follow") || lower.includes("come here") || lower.includes("with me")) {
        actionType = "FOLLOW";
        responseText = `${activeCharacter}: Following your lead, Commander!`;
        soundFx.playPlaceBlock(0.1);
      } else if (lower.includes("attack") || lower.includes("creeper") || lower.includes("kill") || lower.includes("defend") || lower.includes("protect")) {
        actionType = "DEFEND";
        responseText = `${activeCharacter}: Hostile locked! Engaging Creeper in combat!`;
        soundFx.playCreeperHiss(-0.2);
      } else if (lower.includes("bridge") || lower.includes("build") || lower.includes("chasm") || lower.includes("river")) {
        actionType = "BUILD";
        responseText = `${activeCharacter}: Constructing cobblestone bridge across the hazard!`;
        soundFx.playPlaceBlock(0.3);
      } else if (lower.includes("mine") || lower.includes("diamond") || lower.includes("wood") || lower.includes("gather")) {
        actionType = "HARVEST";
        responseText = `${activeCharacter}: Mining nearby resources now!`;
        soundFx.playDiamondChime();
      } else if (lower.includes("stop") || lower.includes("wait") || lower.includes("stay") || lower.includes("hold")) {
        actionType = "HOLD";
        responseText = `${activeCharacter}: Holding position and guarding this area.`;
        soundFx.playMineBlock(0);
      } else {
        soundFx.playLevelVictory();
      }

      setAiResponse(responseText);
      speakText(responseText);
      if (onCommandIssued) {
        onCommandIssued(commandText, actionType, targetEntity);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setTranscript(textInput);
    processCommand(textInput);
    setTextInput("");
  };

  return (
    <div
      className={`flex flex-col gap-2.5 rounded-2xl border border-emerald-500/40 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-md ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs">
        <div className="flex items-center gap-2 font-mono font-bold uppercase tracking-wider text-emerald-400">
          <Radio className="h-4 w-4 animate-pulse text-emerald-400" />
          <span>AI Radio & Comms</span>
        </div>
        <span className="rounded bg-emerald-950/80 px-2 py-0.5 text-[10px] font-mono text-emerald-300 border border-emerald-500/30">
          VOICE & TEXT LIVE
        </span>
      </div>

      {/* Mic Button & Live Waveform */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggleListen}
          disabled={isProcessing}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${
            isListening
              ? "bg-red-500 shadow-[0_0_25px_#ef4444] text-white animate-pulse"
              : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          }`}
          title={isListening ? "Click to stop recording" : "Click to speak voice command"}
        >
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin text-black" />
          ) : isListening ? (
            <Mic className="h-5 w-5 animate-bounce text-white" />
          ) : (
            <Mic className="h-5 w-5 text-black" />
          )}
        </button>

        <form onSubmit={handleTextSubmit} className="flex flex-1 items-center gap-1.5">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Speak into mic or type command (e.g. 'follow me', 'attack creeper')..."
            className="w-full bg-slate-900 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
          />
          <button
            type="submit"
            className="h-8 px-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg font-mono text-xs font-bold shrink-0 flex items-center gap-1"
          >
            <Send className="w-3 h-3" />
            <span>Send</span>
          </button>
        </form>
      </div>

      {/* Quick Action Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { label: "🏃 Follow Me", cmd: "Alex follow me" },
          { label: "⚔️ Attack Creeper", cmd: "Guardian attack creeper" },
          { label: "🏗️ Build Bridge", cmd: "Builder build a bridge" },
          { label: "⛏️ Mine Diamonds", cmd: "Mine diamonds" },
          { label: "🛑 Hold Position", cmd: "Hold position" },
        ].map((chip) => (
          <button
            key={chip.label}
            onClick={() => {
              setTranscript(chip.cmd);
              processCommand(chip.cmd);
            }}
            className="px-2.5 py-1 bg-slate-900/80 hover:bg-emerald-950/80 border border-white/10 hover:border-emerald-500/40 rounded-lg text-[10px] font-mono text-slate-300 hover:text-emerald-300 transition-colors"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* AI Audible Response Box */}
      {aiResponse && (
        <div className="mt-1 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/50 p-2.5 text-xs text-emerald-200 animate-fade-in">
          <Volume2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          <span className="font-mono text-xs leading-relaxed">{aiResponse}</span>
        </div>
      )}
    </div>
  );
}
