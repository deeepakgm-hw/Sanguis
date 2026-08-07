"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MapView, MapMarker } from "@/components/widgets/map-view";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Sparkles,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Clock,
  Truck,
  MapPin,
  Heart,
  TrendingUp,
  Brain,
  ShieldCheck,
  Building2,
  Navigation,
  ArrowRight,
  Zap,
} from "lucide-react";
import { SanguisAiCopilot } from "@/components/widgets/ai-copilot";

// ─── Demo Flow Stages ─────────────────────────────────────────────────────────
const DEMO_STAGES = [
  {
    id: 1,
    timecode: "00:00 - 00:15",
    title: "1. Patient Arrival (Trauma Center)",
    sub: "Emergency trauma patient admitted to Apollo Hospital Emergency Room",
    urgency: "CRITICAL",
    badgeColor: "bg-rose-500 text-white",
    aiRationale: "Patient Rahul V. admitted with Class III acute hemorrhagic shock. Immediate 4-unit O- transfusion required. Emergency request initiated.",
    mapState: { centerLat: 13.0827, centerLng: 80.2707, radiusKm: 10 },
    notifications: ["🚨 EMERGENCY: Patient admitted to Apollo ER (Trauma Bay 2)", "⚠️ Urgency set to CRITICAL (O- blood group needed)"],
    metrics: { eta: "15:00", status: "PATIENT ADMITTED", matchLatency: "0.0s", livesSaved: 12847 },
  },
  {
    id: 2,
    timecode: "00:15 - 00:30",
    title: "2. Emergency Request Raised",
    sub: "Hospital submits dispatch order to Sanguis Spatial Cascade Router",
    urgency: "CRITICAL",
    badgeColor: "bg-rose-500 text-white",
    aiRationale: "Priority score computed: 185/205 (Urgency: 100, Volume: 40, Verified Hospital Bonus: 15, Wait Factor: 30). Dispatched to spatial engine.",
    mapState: { centerLat: 13.0827, centerLng: 80.2707, radiusKm: 12 },
    notifications: ["📡 Dispatch #REQ-8041 created by Dr. K. Raghavan", "🧠 Sanguis AI: Priority score 185 computed in 12ms"],
    metrics: { eta: "14:45", status: "ROUTING DISPATCH", matchLatency: "0.4s", livesSaved: 12847 },
  },
  {
    id: 3,
    timecode: "00:30 - 00:45",
    title: "3. AI Cascade & Bank Inventory Check",
    sub: "Sanguis ABO Engine audits regional blood bank cold storage repositories",
    urgency: "CRITICAL",
    badgeColor: "bg-rose-500 text-white",
    aiRationale: "Central Red Cross Bank has 2 units O- available (partial match). Deficit of 2 units detected. Automatic fallback triggered: SMS broadcast to nearby O- donors.",
    mapState: { centerLat: 13.0827, centerLng: 80.2707, radiusKm: 15 },
    notifications: ["🏦 Bank Audit: Central Red Cross has 2/4 units O-", "⚠️ Deficit detected. Triggering SMS broadcast to 12 nearby O- donors"],
    metrics: { eta: "14:30", status: "CASCADE FALLBACK", matchLatency: "1.8s", livesSaved: 12847 },
  },
  {
    id: 4,
    timecode: "00:45 - 01:00",
    title: "4. AI Donor Ranking & SMS Broadcast",
    sub: "Top candidate donor identified and pinged via high-priority SMS gateway",
    urgency: "HIGH",
    badgeColor: "bg-amber-400 text-black",
    aiRationale: "Donor Rajesh Kumar ranked #1 (Match Score: 98.4/100). ABO Exact Match, 4.2 km proximity, 98% trust score, 0% no-show risk.",
    mapState: { centerLat: 13.0827, centerLng: 80.2707, radiusKm: 10 },
    notifications: ["📲 SMS Alert dispatched to Donor Rajesh Kumar (+91 98401XXXX)", "🧠 AI Ranking: Candidate #1 selected with 98.4% match score"],
    metrics: { eta: "14:15", status: "SMS BROADCAST SENT", matchLatency: "4.2s", livesSaved: 12847 },
  },
  {
    id: 5,
    timecode: "01:00 - 01:15",
    title: "5. Donor Accepts Emergency Ping",
    sub: "Donor accepts dispatch on mobile app. Transit telemetry initialized.",
    urgency: "HIGH",
    badgeColor: "bg-amber-400 text-black",
    aiRationale: "Donor response received in 8.4 seconds. Match status updated to ACCEPTED. Live GPS stream established with 12-minute transit ETA.",
    mapState: { centerLat: 13.0827, centerLng: 80.2707, radiusKm: 10 },
    notifications: ["✅ MATCH ACCEPTED: Donor Rajesh Kumar en-route to Apollo ER", "📍 GPS Navigation active: 4.2 km · ETA 12 min"],
    metrics: { eta: "12:00", status: "MATCH SECURED", matchLatency: "4.2s", livesSaved: 12847 },
  },
  {
    id: 6,
    timecode: "01:15 - 01:35",
    title: "6. Live GPS Navigation & Transit",
    sub: "Real-time movement tracked on command radar map with traffic adaptation",
    urgency: "MEDIUM",
    badgeColor: "bg-blue-500 text-white",
    aiRationale: "Live spatial tracking active. Traffic multiplier 1.1x applied. Courier speed 38 km/h. ETA decrements in real time.",
    mapState: { centerLat: 13.0827, centerLng: 80.2707, radiusKm: 8 },
    notifications: ["🚗 Transit Progress: Courier 1.8 km from Apollo ER", "⏱️ Revised ETA: 4 minutes remaining"],
    metrics: { eta: "04:00", status: "COURIER EN-ROUTE", matchLatency: "4.2s", livesSaved: 12847 },
  },
  {
    id: 7,
    timecode: "01:35 - 01:50",
    title: "7. Blood Reaches Hospital & Handover",
    sub: "Courier arrives at emergency gate. Cold-chain temp (+3.8°C) verified.",
    urgency: "LOW",
    badgeColor: "bg-emerald-500 text-white",
    aiRationale: "Cold-chain sensor verified (+3.8°C within +2°C..+6°C AABB norm). Barcode scanned and handed over to trauma team.",
    mapState: { centerLat: 13.0827, centerLng: 80.2707, radiusKm: 5 },
    notifications: ["🏥 ARRIVAL: Courier reached Apollo Emergency Gate", "❄️ Cold-chain verified: +3.8°C nominal. Transfusion underway."],
    metrics: { eta: "00:00", status: "DELIVERY COMPLETE", matchLatency: "4.2s", livesSaved: 12847 },
  },
  {
    id: 8,
    timecode: "01:50 - 02:00",
    title: "8. Hospital Confirms & Analytics Update",
    sub: "Hospital confirms successful delivery. Real-time platform counters update.",
    urgency: "COMPLETE",
    badgeColor: "bg-emerald-500 text-white",
    aiRationale: "Emergency lifecycle completed in 1m 52s total response time. Lives saved counter incremented (+3). Donor trust score upgraded to 99%.",
    mapState: { centerLat: 13.0827, centerLng: 80.2707, radiusKm: 15 },
    notifications: ["🎉 CONFIRMED: Hospital receipt verified. Emergency closed.", "📈 Analytics: +3 Lives Saved recorded! Donor Trust score set to 99%."],
    metrics: { eta: "00:00", status: "LIFECYCLE CLOSED", matchLatency: "4.2s", livesSaved: 12850 },
  },
];

export default function JudgeDemoPage() {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [donorProgress, setDonorProgress] = useState(0); // 0 to 1 for donor movement
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stage = DEMO_STAGES[currentStageIdx];

  // Auto-play timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStageIdx((prev) => {
          if (prev >= DEMO_STAGES.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 4500); // 4.5 seconds per step for 2-minute total feel
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  // Animate donor movement during stages 5, 6, 7
  useEffect(() => {
    if (currentStageIdx === 4) setDonorProgress(0.1);
    else if (currentStageIdx === 5) setDonorProgress(0.5);
    else if (currentStageIdx === 6) setDonorProgress(0.95);
    else if (currentStageIdx === 7) setDonorProgress(1.0);
    else setDonorProgress(0);
  }, [currentStageIdx]);

  // Map markers computed dynamically per stage
  const donorLat = 13.0910 - (13.0910 - 13.0827) * donorProgress;
  const donorLng = 80.2550 + (80.2707 - 80.2550) * donorProgress;

  const markers: MapMarker[] = [
    {
      id: "hospital-apollo",
      lat: 13.0827,
      lng: 80.2707,
      layerType: "hospital",
      label: "Apollo Hospitals Emergency Room",
      sublabel: "Trauma Room 2 · O- Needed",
    },
    {
      id: "bank-central",
      lat: 13.0750,
      lng: 80.2650,
      layerType: "bank",
      label: "Central Red Cross Bank",
      sublabel: "2 Units O- Available",
    },
  ];

  if (currentStageIdx >= 3) {
    markers.push({
      id: "donor-rajesh",
      lat: donorLat,
      lng: donorLng,
      layerType: currentStageIdx >= 5 ? "dispatch" : "donor",
      label: "Donor: Rajesh Kumar (O-)",
      sublabel: currentStageIdx >= 5 ? "EN-ROUTE TO HOSPITAL" : "Rank #1 · Trust: 98%",
    });
  }

  return (
    <main className="relative min-h-screen bg-zinc-950 text-zinc-50 font-mono overflow-x-hidden">

      {/* ── Ambient Background Glow ── */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-[-10%] left-[20%] h-[500px] w-[500px] rounded-full bg-rose-500/5 blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[10%] h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-[140px]" />
      </div>

      {/* ── TOP DEMO CONTROLLER HEADER ── */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Sanguis" className="h-8 w-8 rounded-lg object-cover" />
            <div>
              <h1 className="text-xs font-black uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                SANGUIS 2-MINUTE LIVE JUDGE DEMO
                <span className="text-[8px] bg-rose-500 text-white font-mono px-2 py-0.5 rounded uppercase tracking-widest animate-pulse">
                  HACKATHON MODE
                </span>
              </h1>
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Autonomous emergency response flow simulation</p>
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 px-4 h-9 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-lg ${
                isPlaying
                  ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-950/40"
                  : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40"
              }`}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isPlaying ? "Pause Demo" : "▶ Auto-Play 2-Min Demo"}
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentStageIdx(0);
              }}
              className="flex items-center gap-1 border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 text-xs uppercase font-bold px-3 h-9 rounded-lg transition-colors"
              title="Reset Demo"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setCurrentStageIdx((i) => Math.max(0, i - 1))}
              disabled={currentStageIdx === 0}
              className="border border-zinc-800 bg-zinc-900/60 disabled:opacity-40 text-zinc-300 text-xs font-bold px-2.5 h-9 rounded-lg"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setCurrentStageIdx((i) => Math.min(DEMO_STAGES.length - 1, i + 1))}
              disabled={currentStageIdx === DEMO_STAGES.length - 1}
              className="border border-zinc-800 bg-zinc-900/60 disabled:opacity-40 text-zinc-300 text-xs font-bold px-2.5 h-9 rounded-lg"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>

            <ThemeToggle />
            <Link href="/dashboard">
              <span className="inline-flex items-center border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-300 font-bold text-xs uppercase px-3 h-9 rounded-lg transition-colors cursor-pointer">
                Exit Demo
              </span>
            </Link>
          </div>

        </div>
      </header>

      {/* ── STEPPER BAR ── */}
      <div className="border-b border-zinc-900 bg-zinc-950/60 py-3 px-6 overflow-x-auto">
        <div className="mx-auto max-w-7xl flex items-center justify-between min-w-[700px] gap-2">
          {DEMO_STAGES.map((s, idx) => {
            const isActive = idx === currentStageIdx;
            const isCompleted = idx < currentStageIdx;
            return (
              <div
                key={s.id}
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentStageIdx(idx);
                }}
                className={`flex-1 flex flex-col items-center cursor-pointer transition-all ${
                  isActive
                    ? "text-rose-400 font-bold"
                    : isCompleted
                    ? "text-emerald-400"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <span className={`h-2 w-2 rounded-full ${
                    isActive ? "bg-rose-500 animate-ping" : isCompleted ? "bg-emerald-500" : "bg-zinc-700"
                  }`} />
                  <span className="text-[8px] font-mono tracking-wider">STAGE {s.id}</span>
                </div>
                <span className="text-[9px] truncate max-w-[90px] uppercase font-bold text-center">
                  {s.title.split(". ")[1] || s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MAIN SPLIT CANVAS ── */}
      <div className="mx-auto max-w-7xl px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT 6-COLS: Live Radar Map & Movement ── */}
        <div className="lg:col-span-6 space-y-4">
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-2xl overflow-hidden relative shadow-2xl">
            {/* Header */}
            <div className="p-3 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
                <span className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-widest">
                  Live Dispatch Radar Telemetry
                </span>
              </div>
              <span className="text-[8px] font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded uppercase">
                {stage.metrics.status}
              </span>
            </div>

            {/* Map Canvas */}
            <div className="h-[420px] relative">
              <MapView
                markers={markers}
                centerLat={stage.mapState.centerLat}
                centerLng={stage.mapState.centerLng}
                radiusKm={stage.mapState.radiusKm}
              />

              {/* Transit Overlay Banner */}
              {currentStageIdx >= 4 && (
                <div className="absolute bottom-4 left-4 right-4 border border-rose-500/40 bg-zinc-950/90 backdrop-blur-md rounded-xl p-3 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-2.5">
                    <Truck className="h-4 w-4 text-rose-500 animate-bounce" />
                    <div>
                      <p className="font-bold text-zinc-100">Live Courier Transit Active</p>
                      <p className="text-[9px] text-zinc-400">Donor: Rajesh Kumar → Apollo ER</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-rose-400">{stage.metrics.eta}</p>
                    <p className="text-[8px] text-zinc-500 uppercase">Transit ETA</p>
                  </div>
                </div>
              )}
            </div>

            {/* Map Metadata footer */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950/80 grid grid-cols-3 gap-2 text-center text-[9px] font-mono text-zinc-500 uppercase">
              <div>
                <p className="text-zinc-400 font-bold">MATCH LATENCY</p>
                <p className="text-rose-400 font-bold mt-0.5">{stage.metrics.matchLatency}</p>
              </div>
              <div className="border-x border-zinc-800">
                <p className="text-zinc-400 font-bold">ABO ENGINE</p>
                <p className="text-emerald-400 font-bold mt-0.5">100% COMPATIBLE</p>
              </div>
              <div>
                <p className="text-zinc-400 font-bold">TIMECODE</p>
                <p className="text-zinc-200 font-bold mt-0.5">{stage.timecode}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT 6-COLS: Live Telemetry, AI Rationale, Notifications ── */}
        <div className="lg:col-span-6 space-y-4">

          {/* Current Stage Banner */}
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-2xl p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${stage.badgeColor}`}>
                {stage.urgency}
              </span>
              <span className="text-[10px] font-mono font-bold text-zinc-500">
                STAGE {stage.id} OF {DEMO_STAGES.length}
              </span>
            </div>

            <div>
              <h2 className="text-xl font-black uppercase text-zinc-100">{stage.title}</h2>
              <p className="text-xs text-zinc-400 mt-1 font-sans leading-relaxed">{stage.sub}</p>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-rose-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${((stage.id) / DEMO_STAGES.length) * 100}%` }}
              />
            </div>
          </div>

          {/* AI Explanation Box (XAI) */}
          <div className="border border-rose-900/40 bg-rose-950/10 rounded-2xl p-5 space-y-3 relative overflow-hidden">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2.5">
              <Sparkles className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-rose-400">
                AI Decision Rationale (Explainable AI - XAI)
              </h3>
            </div>
            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
              {stage.aiRationale}
            </p>
          </div>

          {/* Simulated Notification Toasts */}
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
              <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" /> Real-Time Telemetry Feed
              </span>
              <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded">
                BROADCAST ACTIVE
              </span>
            </div>

            <div className="space-y-2">
              {stage.notifications.map((note, idx) => (
                <div
                  key={idx}
                  className="p-3 border border-zinc-800 bg-zinc-950 rounded-xl text-xs text-zinc-200 font-mono flex items-start gap-2.5 animate-fadeIn"
                >
                  <span className="text-rose-500 font-bold">▸</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Real-Time Platform Impact Counter */}
          <div className="border border-emerald-800/40 bg-emerald-950/10 rounded-2xl p-4 flex items-center justify-between font-mono">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Heart className="h-5 w-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Total Platform Lives Saved</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">Updated live across all Sanguis nodes</p>
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-400 font-mono">{stage.metrics.livesSaved.toLocaleString()}</p>
          </div>

        </div>

      </div>

      {/* Floating Copilot */}
      <SanguisAiCopilot />
    </main>
  );
}
