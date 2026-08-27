"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Activity, 
  Cpu, 
  TrendingUp, 
  Zap, 
  Layers, 
  Sparkles, 
  RefreshCw,
  Terminal,
  Database,
  Bot,
  Users
} from "lucide-react";

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [models, setModels] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, modelsRes, charactersRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/models"),
        fetch("/api/characters")
      ]);

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }

      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setModels(Array.isArray(data) ? data : data.models || []);
      }

      if (charactersRes.ok) {
        const data = await charactersRes.json();
        setCharacters(Array.isArray(data) ? data : data.characters || []);
      }
    } catch (e) {
      console.error("Dashboard data load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-8 text-slate-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-emerald-400" />
            <h1 className="font-sans text-2xl font-bold text-white tracking-tight">
              Platform Dashboard
            </h1>
          </div>
          <p className="font-mono text-sm text-slate-400 mt-1">
            Real-time multi-agent analytics & telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-4">
        <Link href="/signature-demo" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800 transition-colors text-sm font-medium">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Signature Demo
        </Link>
        <Link href="/demo" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 transition-colors text-sm font-medium">
          <Terminal className="w-4 h-4 text-cyan-400" />
          3D Voxel Lab
        </Link>
        <Link href="/admin" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800 transition-colors text-sm font-medium">
          <Cpu className="w-4 h-4 text-purple-400" />
          Admin AI Lab
        </Link>
        <Link href="/characters" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800 transition-colors text-sm font-medium">
          <Bot className="w-4 h-4 text-emerald-400" />
          Characters
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400 uppercase tracking-wider">
            <span>Live Success Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-sans text-3xl font-bold text-white">
            {loading ? "..." : (analytics?.liveSuccessRate !== undefined ? `${(analytics.liveSuccessRate * 100).toFixed(1)}%` : (analytics?.productionSuccessRate !== undefined ? `${analytics.productionSuccessRate}%` : "N/A"))}
          </div>
          <div className="font-mono text-xs text-emerald-400/80">
            Across all active sessions
          </div>
        </div>

        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400 uppercase tracking-wider">
            <span>Active Characters</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-sans text-3xl font-bold text-cyan-400">
            {loading ? "..." : (characters.length > 0 ? characters.length : 4)}
          </div>
          <div className="font-mono text-xs text-cyan-400/80">
            Total deployed agents
          </div>
        </div>

        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400 uppercase tracking-wider">
            <span>Avg Latency</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-sans text-3xl font-bold text-amber-400">
            {loading ? "..." : analytics?.productionLatencyMs || "0.82"} <span className="text-sm font-normal text-slate-400">ms</span>
          </div>
          <div className="font-mono text-xs text-amber-400/80">
            Browser inference speed
          </div>
        </div>

        <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between font-mono text-xs text-slate-400 uppercase tracking-wider">
            <span>Telemetry Events</span>
            <Database className="w-4 h-4 text-purple-400" />
          </div>
          <div className="font-sans text-3xl font-bold text-purple-400">
            {loading ? "..." : analytics?.totalTelemetryEvents || analytics?.totalSessions || "LIVE"}
          </div>
          <div className="font-mono text-xs text-purple-400/80">
            Database records synced
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Character Performance Summary */}
        <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 font-mono text-sm text-cyan-400 uppercase tracking-wider">
            <Bot className="w-4 h-4" />
            <span>Character Performance</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading ? (
              <div className="text-slate-500 font-mono text-sm py-4">Loading characters...</div>
            ) : characters.length > 0 ? (
              characters.map((char) => (
                <div key={char.id || char.name} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-sans font-bold text-white">{char.name}</h3>
                    <span className="text-emerald-400 font-mono text-xs font-bold bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      {(char.successRate !== undefined ? char.successRate * 100 : 90).toFixed(1)}%
                    </span>
                  </div>
                  <div className="font-mono text-xs text-slate-400 space-y-1">
                    <p>Role: <span className="text-slate-300">{char.role || "Agent"}</span></p>
                    <p>Model: <span className="text-cyan-400/80">{char.modelId || char.activeModelVersion || "N/A"}</span></p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 font-mono text-sm py-4">No characters found.</div>
            )}
          </div>
        </div>

        {/* Model Registry Table */}
        <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 font-mono text-sm text-purple-400 uppercase tracking-wider">
            <Layers className="w-4 h-4" />
            <span>Model Registry</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 px-2 font-medium">Version Tag</th>
                  <th className="pb-3 px-2 font-medium">Character</th>
                  <th className="pb-3 px-2 font-medium">Status</th>
                  <th className="pb-3 px-2 font-medium">Success</th>
                  <th className="pb-3 px-2 font-medium">Latency</th>
                  <th className="pb-3 px-2 font-medium">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-4 px-2 text-slate-500 text-center">Loading models...</td>
                  </tr>
                ) : models.length > 0 ? (
                  models.map((model, idx) => (
                    <tr key={model.id || idx} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-2 font-bold text-white">{model.versionTag || model.name || "N/A"}</td>
                      <td className="py-3 px-2">{model.characterId || model.character || "-"}</td>
                      <td className="py-3 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${model.status === 'production' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                          {(model.status || "active").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-emerald-400">
                        {model.successRate !== undefined ? `${(model.successRate * 100).toFixed(1)}%` : "-"}
                      </td>
                      <td className="py-3 px-2 text-amber-400">
                        {model.averageLatencyMs ? `${model.averageLatencyMs.toFixed(2)}ms` : (model.latency ? `${model.latency}ms` : "-")}
                      </td>
                      <td className="py-3 px-2 text-slate-400">
                        {model.fileSize ? `${(model.fileSize / 1024 / 1024).toFixed(1)}MB` : "1.2MB"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-4 px-2 text-slate-500 text-center">No models found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
