"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Lock, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  History, 
  Loader2, 
  RefreshCw, 
  UserCheck 
} from "lucide-react";
import { soundSynth } from "@/lib/audio/sound-synth";

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [models, setModels] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("admin@mindcraft.ai");
  const [password, setPassword] = useState("mindcraft2026");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      }
    } catch {
      setCurrentUser(null);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [modelsRes, auditRes] = await Promise.all([
        fetch("/api/models"),
        fetch("/api/admin/audit-logs"),
      ]);

      if (modelsRes.ok) {
        const data = await modelsRes.json();
        setModels(data.models || []);
      }

      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.auditLogs || []);
      }
    } catch (e) {
      console.error("Failed to load admin data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    loadDashboardData();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        soundSynth.playLevelUp();
        loadDashboardData();
      } else {
        const err = await res.json();
        setLoginError(err.error || "Invalid credentials");
        soundSynth.playHurtGrunt();
      }
    } catch {
      setLoginError("Login failed. Check server connection.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePublishModel = async (versionTag: string) => {
    setActionStatus(`Evaluating release gate for ${versionTag}...`);
    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionTag }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionStatus(`[SUCCESS] ${data.message}`);
        soundSynth.playLevelUp();
        loadDashboardData();
      } else {
        setActionStatus(`[REJECTED] ${data.error}`);
        soundSynth.playHurtGrunt();
      }
    } catch (e: any) {
      setActionStatus(`[ERROR] Publish failed: ${e.message}`);
    }
  };

  const handleRollback = async (targetVersionTag?: string) => {
    setActionStatus(`Executing rollback to ${targetVersionTag || "master_v5_pro"}...`);
    try {
      const res = await fetch("/api/admin/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetVersionTag }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionStatus(`[SUCCESS] ${data.message}`);
        soundSynth.playDiamondChime();
        loadDashboardData();
      } else {
        setActionStatus(`[FAILED] ${data.error}`);
      }
    } catch (e: any) {
      setActionStatus(`[ERROR] Rollback failed: ${e.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#3b4458] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#34d399]" />
            <h1 className="font-pixel text-xl sm:text-2xl font-bold text-white tracking-wider">
              ADMIN & MLOPS CONTROL CENTER
            </h1>
          </div>
          <p className="font-mono text-xs text-[#94a3b8] mt-1">
            Automated quality release gates &bull; Controlled production promotion &bull; Zero-downtime rollback
          </p>
        </div>

        {currentUser && (
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="mc-panel-stone px-3 py-1 text-slate-300 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#34d399]" />
              <span>{currentUser.email} ({currentUser.role})</span>
            </span>
          </div>
        )}
      </div>

      {/* If Not Authenticated -> Show Minecraft Login Panel */}
      {(!currentUser || currentUser.role !== "ADMIN") && (
        <div className="max-w-md mx-auto mc-panel-stone p-6 sm:p-8 space-y-5 shadow-2xl">
          <div className="text-center space-y-1 border-b-2 border-[#141720] pb-3">
            <h2 className="font-pixel text-sm font-bold text-white">ADMIN AUTHENTICATION REQUIRED</h2>
            <p className="font-mono text-[11px] text-[#94a3b8]">
              Sign in with operator credentials to access production release controls.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 font-mono text-xs">
            {loginError && (
              <div className="p-2.5 bg-red-950/80 border-2 border-red-500 text-red-300 font-pixel text-[9px]">
                {loginError}
              </div>
            )}

            <div className="space-y-1">
              <label className="font-pixel text-[8px] text-[#94a3b8] uppercase block">Admin Email:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#12151e] border-2 border-[#3b4458] px-3 py-2 text-white font-mono text-xs focus:border-[#10b981] outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-pixel text-[8px] text-[#94a3b8] uppercase block">Security Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#12151e] border-2 border-[#3b4458] px-3 py-2 text-white font-mono text-xs focus:border-[#10b981] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="mc-btn mc-btn-primary w-full text-xs py-2.5 font-pixel"
            >
              {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{isLoggingIn ? "AUTHENTICATING..." : "SIGN IN AS ADMIN"}</span>
            </button>
          </form>
        </div>
      )}

      {/* Admin Dashboard */}
      {currentUser && currentUser.role === "ADMIN" && (
        <div className="space-y-6">
          {actionStatus && (
            <div className="mc-panel-stone p-3 font-pixel text-xs text-[#34d399] border-2 border-[#10b981]">
              {actionStatus}
            </div>
          )}

          {/* Model Release Management Table */}
          <div className="mc-panel-stone p-5 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#141720] pb-2">
              <h2 className="font-pixel text-xs font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#34d399]" />
                <span>PRODUCTION MODEL RELEASE GATES</span>
              </h2>
              <span className="font-mono text-[10px] text-[#94a3b8]">
                Gate: Success &ge; 75% &bull; Latency &le; 5.0ms
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b-2 border-[#141720] text-[#94a3b8] font-pixel text-[8px]">
                    <th className="pb-2">VERSION</th>
                    <th className="pb-2">STATUS</th>
                    <th className="pb-2">HELD-OUT SUCCESS</th>
                    <th className="pb-2">AVG LATENCY</th>
                    <th className="pb-2">GATE STATUS</th>
                    <th className="pb-2 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2330] text-[#cbd5e1]">
                  {models.map((m) => {
                    const meetsGate = m.overallSuccessRate >= 75.0 && m.avgLatencyMs <= 10.0;
                    return (
                      <tr key={m.id} className="hover:bg-[#12151e] transition">
                        <td className="py-3 font-bold text-white">{m.versionTag}</td>
                        <td className="py-3">
                          <span className={`font-pixel text-[8px] px-1.5 py-0.5 ${
                            m.isProduction
                              ? "mc-btn mc-btn-primary"
                              : "mc-btn mc-btn-stone"
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-3 text-[#34d399] font-bold">{m.overallSuccessRate}%</td>
                        <td className="py-3 text-[#38bdf8]">{m.avgLatencyMs} ms</td>
                        <td className="py-3">
                          {meetsGate ? (
                            <span className="text-[#34d399] flex items-center gap-1 font-pixel text-[8px]">
                              <CheckCircle2 className="w-3 h-3" /> PASSED
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1 font-pixel text-[8px]">
                              <AlertTriangle className="w-3 h-3" /> REVIEW
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {!m.isProduction && (
                            <button
                              onClick={() => handlePublishModel(m.versionTag)}
                              className="mc-btn mc-btn-gold text-[8px] py-1 px-2.5"
                            >
                              PROMOTE TO PROD
                            </button>
                          )}
                          {m.isProduction && (
                            <span className="text-[#64748b] font-pixel text-[8px]">ACTIVE PROD</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Emergency 1-Click Rollback */}
          <div className="mc-panel-stone p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-pixel text-xs font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>INSTANT EMERGENCY ROLLBACK</span>
              </h3>
              <p className="font-mono text-xs text-[#94a3b8] mt-1">
                Instantly roll back public users to verified stable checkpoint if production anomalies are detected.
              </p>
            </div>

            <button
              onClick={() => handleRollback("master_v5_pro")}
              className="mc-btn mc-btn-danger text-[9px] py-2 px-3 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ROLLBACK TO MASTER-V5-PRO</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
