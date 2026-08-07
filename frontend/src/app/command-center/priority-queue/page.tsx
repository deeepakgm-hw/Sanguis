"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";
import {
  Building,
  AlertTriangle,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  Clock,
  RefreshCw,
  Activity,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface PriorityRequest {
  _id: string;
  bloodType: string;
  unitsNeeded: number;
  urgencyLevel: string;
  status: string;
  hospital: string;
  hospitalName: string | null;
  createdAt: string;
  priorityScore: number;
  priorityBreakdown: {
    urgencyScore: number;
    waitScore: number;
    shortfallScore: number;
    verificationBonus: number;
    totalScore: number;
    hoursWaiting: number;
    urgencyLevel: string;
    unitsNeeded: number;
    hospitalVerified: boolean;
  };
}

export default function PriorityQueuePage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);

  const [queue, setQueue] = useState<PriorityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [verifyingMap, setVerifyingMap] = useState<Record<string, boolean>>({});

  // Route protection
  useEffect(() => {
    if (!isBootstrapping && !user) {
      router.replace("/login");
      return;
    }
    if (user && user.role !== "admin" && user.role !== "moderator") {
      router.replace("/dashboard");
      toast.error("Requires administrative clearance.");
    }
  }, [isBootstrapping, user, router]);

  // Load Priority Queue data
  const loadQueue = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get("/blood-requests/priority-queue");
      setQueue(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch priority queue");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "moderator")) {
      loadQueue();
    }
  }, [user, refreshTrigger]);

  // 10s silent periodic polling
  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "moderator")) {
      const interval = setInterval(() => {
        loadQueue(true);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Handle hospital verification toggling
  const handleToggleVerification = async (hospitalId: string, currentStatus: boolean) => {
    setVerifyingMap((prev) => ({ ...prev, [hospitalId]: true }));
    try {
      await api.patch(`/users/${hospitalId}/verify`, {
        isEmailVerified: !currentStatus,
      });
      toast.success(currentStatus ? "Hospital verification revoked." : "Hospital verified successfully!");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update hospital verification status");
    } finally {
      setVerifyingMap((prev) => ({ ...prev, [hospitalId]: false }));
    }
  };

  if (isBootstrapping || !user || (user.role !== "admin" && user.role !== "moderator")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 animate-pulse">
          Authenticating clearance…
        </p>
      </div>
    );
  }

  return (
    <main className="relative mx-auto max-w-5xl px-6 py-10 min-h-screen bg-zinc-950">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-[-8%] right-[-8%] h-[360px] w-[360px] rounded-full bg-rose-500/5 blur-[120px]" />

      {/* ── Header ── */}
      <div className="mb-8 flex items-center justify-between border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-rose-500 animate-pulse" />
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-zinc-100">
              Emergency Priority Triage Queue
            </h1>
            <p className="text-[10px] font-mono text-zinc-500 mt-0.5 uppercase tracking-widest">
              Explainable scoring · urgency · wait · volume · verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setRefreshTrigger((p) => p + 1)}
            className="inline-flex items-center gap-1.5 border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-lg px-3 h-9 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Live Reload
          </button>
          <Link href="/command-center">
            <span className="inline-flex items-center border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-lg px-3 h-9 transition-colors cursor-pointer">
              Tactical Map
            </span>
          </Link>
          <Link href="/dashboard">
            <span className="inline-flex items-center border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-wider rounded-lg px-3 h-9 transition-colors cursor-pointer">
              Gateway
            </span>
          </Link>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 animate-pulse">
            Computing priority scores…
          </p>
        </div>
      ) : (
        <div className="space-y-4">

          {/* ── Queue Overview Banner ── */}
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div className="font-mono">
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Active Requests in Queue</p>
              <p className="text-3xl font-black text-zinc-100">{queue.length}</p>
            </div>
            <div className="text-right font-mono">
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Scoring Formula</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Urgency(100) + Wait(50) + Volume(40) + Verified(15)
              </p>
            </div>
          </div>

          {/* ── Empty State ── */}
          {queue.length === 0 ? (
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-12 text-center">
              <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                No active emergency requests in the queue
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((req, idx) => {
                const isExpanded = expandedRequest === req._id;
                const isHospitalVerified = req.priorityBreakdown.hospitalVerified;
                const isVerifying = verifyingMap[req.hospital] || false;
                const isTop = idx === 0;

                const urgencyStyle: Record<string, string> = {
                  critical: "bg-rose-500/10 border-rose-500/30 text-rose-400",
                  high:     "bg-amber-400/10 border-amber-400/30 text-amber-400",
                  medium:   "bg-blue-500/10  border-blue-500/30  text-blue-400",
                  low:      "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
                };

                return (
                  <div
                    key={req._id}
                    className={`rounded-xl border transition-all duration-200 ${
                      isTop
                        ? "border-rose-500/40 bg-rose-500/5"
                        : "border-zinc-800 bg-zinc-900/5"
                    }`}
                  >
                    {/* ── Row Header ── */}
                    <div
                      className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none"
                      onClick={() => setExpandedRequest(isExpanded ? null : req._id)}
                    >
                      {/* Left cluster */}
                      <div className="flex items-center gap-4">
                        {/* Rank badge */}
                        <div
                          className={`font-mono text-[11px] font-black px-2.5 py-1 rounded-full border ${
                            isTop
                              ? "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-900/40"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400"
                          }`}
                        >
                          #{idx + 1}
                        </div>

                        {/* Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {/* Blood type */}
                            <span className="font-mono font-black text-rose-500 text-sm tracking-wide">
                              {req.bloodType}
                            </span>

                            {/* Urgency badge */}
                            <span
                              className={`font-mono text-[8px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded border ${
                                urgencyStyle[req.urgencyLevel] || "bg-zinc-800 border-zinc-700 text-zinc-400"
                              }`}
                            >
                              {req.urgencyLevel}
                            </span>

                            {/* Units */}
                            <span className="font-mono text-[10px] text-zinc-500">
                              {req.unitsNeeded} units
                            </span>

                            {/* ID chip */}
                            <span className="font-mono text-[10px] bg-zinc-950 border border-zinc-800 text-zinc-600 px-1.5 py-0.5 rounded">
                              {req._id.slice(-6).toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            {/* Hospital name */}
                            <span className="text-zinc-200 font-bold text-xs">
                              {req.hospitalName || "Unknown Hospital"}
                            </span>
                            <span className="text-zinc-700">·</span>
                            {/* Wait time */}
                            <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-400">
                              <Clock className="h-3 w-3 text-zinc-600" />
                              {req.priorityBreakdown.hoursWaiting.toFixed(1)}h elapsed
                            </span>
                            <span className="text-zinc-700">·</span>
                            {/* Verification pip */}
                            {isHospitalVerified ? (
                              <span className="flex items-center gap-1 font-mono text-[9px] uppercase text-emerald-400">
                                <ShieldCheck className="h-3 w-3" /> Verified
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 font-mono text-[9px] uppercase text-amber-400">
                                <ShieldAlert className="h-3 w-3" /> Unverified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right cluster */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p
                            className={`text-xl font-black tracking-tight ${
                              isTop ? "text-rose-500" : "text-zinc-100"
                            }`}
                          >
                            {req.priorityScore}
                          </p>
                          <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                            Score
                          </p>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-zinc-600 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* ── Expanded Breakdown Panel ── */}
                    {isExpanded && (
                      <div className="border-t border-zinc-800 bg-zinc-950/60 rounded-b-xl px-4 pt-4 pb-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                          {/* ── Left: Parameters + Verification ── */}
                          <div className="space-y-3">
                            <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                              Parameters &amp; Audit
                            </p>

                            {/* Stat grid */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-2.5">
                                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                                  Status
                                </p>
                                <p className="font-bold text-xs capitalize text-zinc-200 mt-0.5">
                                  {req.status}
                                </p>
                              </div>
                              <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-2.5">
                                <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                                  Time Raised
                                </p>
                                <p className="font-mono font-bold text-xs text-zinc-200 mt-0.5">
                                  {new Date(req.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            </div>

                            {/* Hospital verification action */}
                            <div className="border border-zinc-800 bg-zinc-900/40 rounded-lg p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                {isHospitalVerified ? (
                                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                                ) : (
                                  <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                                )}
                                <div>
                                  <p className="text-xs font-bold text-zinc-200">Hospital Verification</p>
                                  <p className="font-mono text-[9px] text-zinc-500 mt-0.5">
                                    {isHospitalVerified
                                      ? "Verified · +15 bonus applied"
                                      : "Pending admin verification"}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() =>
                                  handleToggleVerification(req.hospital, isHospitalVerified)
                                }
                                disabled={isVerifying}
                                className={`shrink-0 font-mono text-[9px] uppercase tracking-widest font-bold h-7 px-3 rounded-md border transition-colors disabled:opacity-50 ${
                                  isHospitalVerified
                                    ? "bg-amber-400/10 border-amber-400/20 text-amber-400 hover:bg-amber-400/20"
                                    : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                                }`}
                              >
                                {isVerifying ? "Working…" : isHospitalVerified ? "Revoke" : "Verify"}
                              </button>
                            </div>
                          </div>

                          {/* ── Right: Weight Bars ── */}
                          <div className="space-y-3">
                            <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                              Priority Weight Breakdown
                            </p>

                            <div className="space-y-3">
                              {[
                                {
                                  label: "Urgency Tier",
                                  value: req.priorityBreakdown.urgencyScore,
                                  max: 100,
                                  bar: "bg-rose-500",
                                  val: "text-rose-400",
                                },
                                {
                                  label: "Wait Starvation",
                                  value: req.priorityBreakdown.waitScore,
                                  max: 50,
                                  bar: "bg-amber-500",
                                  val: "text-amber-400",
                                },
                                {
                                  label: "Shortfall Volume",
                                  value: req.priorityBreakdown.shortfallScore,
                                  max: 40,
                                  bar: "bg-blue-500",
                                  val: "text-blue-400",
                                },
                                {
                                  label: "Verified Bonus",
                                  value: req.priorityBreakdown.verificationBonus,
                                  max: 15,
                                  bar: "bg-emerald-500",
                                  val: "text-emerald-400",
                                },
                              ].map((factor) => (
                                <div key={factor.label} className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500">
                                      {factor.label}
                                    </span>
                                    <span className={`font-mono text-[10px] font-bold ${factor.val}`}>
                                      {factor.value}
                                      <span className="text-zinc-700"> / {factor.max}</span>
                                    </span>
                                  </div>
                                  <div className="h-1.5 w-full bg-zinc-800 overflow-hidden rounded-full">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${factor.bar}`}
                                      style={{
                                        width: `${Math.min(
                                          (factor.value / factor.max) * 100,
                                          100
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* ── Footer: Launch Dispatch ── */}
                        <div className="flex justify-end pt-1">
                          <Link href={`/requests/${req._id}`}>
                            <span className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold text-[9px] uppercase tracking-widest h-7 px-3 rounded-md transition-colors cursor-pointer">
                              Launch Dispatch
                              <ArrowRight className="h-3 w-3" />
                            </span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
