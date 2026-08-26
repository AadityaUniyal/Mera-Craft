"use client";

import React, { useEffect, useState } from "react";
import { 
  Box, 
  Download, 
  Cpu, 
  ShieldCheck, 
  Layers, 
  RefreshCw,
  GitBranch
} from "lucide-react";

interface ModelVersionData {
  id: string;
  dbId: string;
  modelName: string;
  versionTag: string;
  artifactUri: string;
  modelHashSha256: string;
  status: string;
  fileSizeKb: number;
  isProduction: boolean;
  publishedAt: string | null;
  overallSuccessRate: number;
  avgLatencyMs: number;
  timestepsTrained: number;
  peakReward: number;
  evaluations: any[];
  trainingRun: any;
}

export default function ModelsRegistryPage() {
  const [models, setModels] = useState<ModelVersionData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/models");
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
      }
    } catch (e) {
      console.error("Failed to fetch models from Neon:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#38bdf8]" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              ONNX NEURAL MODEL REGISTRY
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            Versioned ONNX artifacts &bull; SHA-256 cryptographic checksums &bull; Held-out benchmark metrics
          </p>
        </div>

        <button
          onClick={fetchModels}
          className="mc-btn mc-btn-stone text-[10px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>SYNC REGISTRY</span>
        </button>
      </div>

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {models.map((m) => (
          <div
            key={m.id}
            className={`mc-panel-stone p-5 space-y-3 ${
              m.isProduction ? "border-l-4 border-l-[#10b981]" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-4 border-b-2 border-[#141720] pb-2.5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-pixel text-sm font-bold text-white">{m.versionTag}</h3>
                  {m.isProduction && (
                    <span className="mc-btn mc-btn-primary text-[8px] py-0.5 px-1.5">
                      ACTIVE PRODUCTION
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-[#94a3b8] mt-0.5">
                  {m.modelName} &bull; {m.fileSizeKb} KB
                </div>
              </div>

              <a
                href={m.artifactUri}
                download
                className="mc-btn mc-btn-diamond text-[9px] px-2.5 py-1"
              >
                <Download className="w-3 h-3" />
                <span>ONNX</span>
              </a>
            </div>

            {/* Checksum */}
            <div className="bg-[#12151e] p-2 border-2 border-[#1e2330] font-mono text-[10px] text-[#94a3b8] overflow-hidden text-ellipsis whitespace-nowrap">
              <span className="text-[#64748b]">SHA-256: </span>
              <span className="text-[#38bdf8]">{m.modelHashSha256}</span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-2 font-mono text-xs text-center">
              <div className="bg-[#12151e] p-2 border-2 border-[#1e2330]">
                <div className="font-pixel text-[8px] text-[#94a3b8]">SUCCESS</div>
                <div className="font-pixel text-xs text-[#34d399] mt-0.5">{m.overallSuccessRate}%</div>
              </div>
              <div className="bg-[#12151e] p-2 border-2 border-[#1e2330]">
                <div className="font-pixel text-[8px] text-[#94a3b8]">LATENCY</div>
                <div className="font-pixel text-xs text-[#38bdf8] mt-0.5">{m.avgLatencyMs} ms</div>
              </div>
              <div className="bg-[#12151e] p-2 border-2 border-[#1e2330]">
                <div className="font-pixel text-[8px] text-[#94a3b8]">TRAINED</div>
                <div className="font-pixel text-xs text-amber-300 mt-0.5">{(m.timestepsTrained / 1000).toFixed(0)}k</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
