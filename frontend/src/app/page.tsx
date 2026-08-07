"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import {
  AlertTriangle,
  Heart,
  Users,
  Activity,
  ArrowRight,
  Droplets,
  MapPin,
  Clock,
  Zap,
  ShieldCheck,
  Phone,
  Building2,
  Radio,
  CheckCircle2,
  TrendingUp,
  Navigation,
} from "lucide-react";
import { SanguisAiCopilot } from "@/components/widgets/ai-copilot";

// ─── Simulated live emergency feed ───────────────────────────────────────────
const EMERGENCY_EVENTS = [
  { id: "e1", type: "CRITICAL", blood: "O-", hospital: "Apollo Hospitals", city: "Chennai", time: "00:42 ago", units: 4 },
  { id: "e2", type: "HIGH",     blood: "B+", hospital: "AIIMS Delhi",      city: "Delhi",   time: "01:17 ago", units: 2 },
  { id: "e3", type: "CRITICAL", blood: "AB-", hospital: "Fortis Malar",    city: "Mumbai",  time: "02:03 ago", units: 6 },
  { id: "e4", type: "HIGH",     blood: "A+", hospital: "Manipal Hospital", city: "Bangalore", time: "03:51 ago", units: 3 },
  { id: "e5", type: "MEDIUM",   blood: "O+", hospital: "KMC Hospital",     city: "Manipal", time: "05:22 ago", units: 5 },
  { id: "e6", type: "CRITICAL", blood: "B-", hospital: "CMC Vellore",      city: "Vellore", time: "06:10 ago", units: 2 },
];

// ─── Dispatch timeline steps ──────────────────────────────────────────────────
const TIMELINE_STEPS = [
  { label: "EMERGENCY RAISED",       sub: "Hospital files blood request",     done: true  },
  { label: "AI CASCADE AUDIT",       sub: "ABO engine scores 87 candidates",  done: true  },
  { label: "DONOR BROADCAST",        sub: "12 donors pinged via SMS",         done: true  },
  { label: "MATCH SECURED",          sub: "Donor Rajesh K. accepted dispatch", done: true  },
  { label: "COURIER EN-ROUTE",       sub: "ETA 11 min · GPS tracking active", active: true },
  { label: "DELIVERY CONFIRMED",     sub: "Blood unit verified at hospital",   done: false },
];

// ─── India SVG city pins ──────────────────────────────────────────────────────
const INDIA_PINS = [
  { city: "Delhi",     x: 45, y: 22,  critical: true  },
  { city: "Mumbai",    x: 30, y: 50,  critical: true  },
  { city: "Bangalore", x: 42, y: 72,  critical: false },
  { city: "Chennai",   x: 50, y: 76,  critical: true  },
  { city: "Kolkata",   x: 68, y: 40,  critical: false },
  { city: "Hyderabad", x: 46, y: 61,  critical: false },
  { city: "Pune",      x: 33, y: 56,  critical: false },
  { city: "Ahmedabad", x: 28, y: 38,  critical: false },
  { city: "Jaipur",    x: 37, y: 28,  critical: false },
  { city: "Lucknow",   x: 52, y: 28,  critical: false },
];

// ─── Blood availability grid ─────────────────────────────────────────────────
const BLOOD_STATUS = [
  { type: "O-",  level: "CRITICAL", pct: 12 },
  { type: "O+",  level: "LOW",      pct: 34 },
  { type: "A+",  level: "STABLE",   pct: 67 },
  { type: "A-",  level: "LOW",      pct: 28 },
  { type: "B+",  level: "STABLE",   pct: 71 },
  { type: "B-",  level: "CRITICAL", pct: 9  },
  { type: "AB+", level: "STABLE",   pct: 55 },
  { type: "AB-", level: "LOW",      pct: 19 },
];

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  const [time, setTime] = useState("");
  const [feedIdx, setFeedIdx] = useState(0);
  const [timelineStep, setTimelineStep] = useState(4);
  const [dispatchPulse, setDispatchPulse] = useState(false);
  const [stats, setStats] = useState({
    livesSaved: 12847,
    donors: 4312,
    banks: 87,
    emergencies: 6,
  });

  // ── UTC clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toISOString().replace("T", " ").slice(0, 19) + " UTC");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // ── Scroll live feed ───────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setFeedIdx((i) => (i + 1) % EMERGENCY_EVENTS.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  // ── Dispatch timeline pulse ────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setDispatchPulse((p) => !p);
    }, 1200);
    return () => clearInterval(id);
  }, []);

  // ── Increment stats slowly for "live" feel ─────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setStats((s) => ({ ...s, livesSaved: s.livesSaved + Math.floor(Math.random() * 3) }));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const urgencyColor = (type: string) => {
    if (type === "CRITICAL") return "text-rose-400 bg-rose-500/10 border-rose-500/30";
    if (type === "HIGH") return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  };

  const bloodLevelColor = (level: string) => {
    if (level === "CRITICAL") return { bar: "bg-rose-500", text: "text-rose-400", border: "border-rose-500/30" };
    if (level === "LOW") return { bar: "bg-amber-500", text: "text-amber-400", border: "border-amber-500/30" };
    return { bar: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500/20" };
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-50 font-sans">

      {/* ── Ambient background glow ──────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] h-[700px] w-[700px] rounded-full bg-rose-950/25 blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-zinc-900/40 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,#000_60%,transparent_100%)]" />
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          STICKY HEADER
      ════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Sanguis Logo" className="h-7 w-7 rounded-md object-cover" />
            <div>
              <span className="text-xs font-black uppercase tracking-widest">SANGUIS</span>
              <span className="ml-2 text-[9px] font-mono text-zinc-500 hidden sm:inline">EMERGENCY BLOOD RESPONSE NETWORK</span>
            </div>
          </div>

          {/* Live ticker */}
          <div className="hidden md:flex items-center gap-2 font-mono text-[9px] text-zinc-500 border border-zinc-800 bg-zinc-950 rounded-lg px-3 h-7 overflow-hidden">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="text-rose-400 font-bold uppercase tracking-wider">LIVE</span>
            <span className="text-zinc-600 mx-1">·</span>
            <span className="truncate max-w-[200px] text-zinc-400">
              {EMERGENCY_EVENTS[feedIdx].hospital} → {EMERGENCY_EVENTS[feedIdx].blood} · {EMERGENCY_EVENTS[feedIdx].units} units
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/demo">
              <button className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-wider px-3 h-8 rounded-lg transition-all shadow-md animate-pulse">
                🎮 2-Min Judge Demo
              </button>
            </Link>
            {user ? (
              <Link href="/dashboard">
                <button className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] uppercase tracking-wider px-4 h-8 rounded-lg transition-colors">
                  Command Center <ArrowRight className="h-3 w-3" />
                </button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <button className="text-[10px] font-bold text-zinc-400 hover:text-zinc-100 uppercase tracking-wider px-3 h-8 transition-colors">
                    Sign In
                  </button>
                </Link>
                <Link href="/register">
                  <button className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] uppercase tracking-wider px-4 h-8 rounded-lg transition-colors">
                    Register
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ════════════════════════════════════════════════════════════════════ */}
      <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-12">

        {/* System status bar */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3 border border-zinc-800 bg-zinc-900/30 rounded-xl px-5 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-rose-400 uppercase tracking-widest">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
              System Online
            </span>
            <span className="text-zinc-700 hidden sm:block">|</span>
            <span className="text-[9px] font-mono text-zinc-500">
              <span className="text-zinc-300 font-bold">{stats.emergencies}</span> active emergencies
            </span>
            <span className="text-[9px] font-mono text-zinc-500">
              <span className="text-zinc-300 font-bold">{stats.donors.toLocaleString()}</span> donors online
            </span>
            <span className="text-[9px] font-mono text-zinc-500">
              <span className="text-zinc-300 font-bold">{stats.banks}</span> blood banks verified
            </span>
          </div>
          <div className="font-mono text-[9px] text-zinc-500 tracking-widest">{time || "0000-00-00 00:00:00 UTC"}</div>
        </div>

        {/* Hero grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

          {/* Left hero copy */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-800/50 bg-rose-950/30 px-3 py-1 text-[9px] font-mono font-bold text-rose-400 uppercase tracking-widest mb-5">
                <AlertTriangle className="h-3 w-3" /> AI-Powered Emergency Response Network
              </div>

              <h1 className="text-5xl sm:text-6xl font-black uppercase leading-[1.0] tracking-tight">
                Blood<br />
                <span className="text-rose-500">Saves</span><br />
                Lives.
              </h1>

              <div className="mt-5 space-y-2">
                <p className="text-zinc-300 text-sm font-semibold leading-relaxed max-w-lg">
                  Every 2 seconds, someone in India needs blood. Every year, 38,000 road accident victims die because blood didn't arrive in time.
                </p>
                <p className="text-zinc-500 text-sm leading-relaxed max-w-lg">
                  Sanguis connects verified hospitals, blood banks, and donors in real-time using AI cascade routing — reducing emergency response time from hours to minutes.
                </p>
              </div>
            </div>

            {/* 3 Primary CTAs */}
            <div className="space-y-3">
              <Link href="/register?role=hospital" className="block">
                <button id="cta-request-blood" className="w-full flex items-center justify-between bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-wider px-6 py-4 rounded-xl transition-all hover:scale-[1.01] shadow-2xl shadow-rose-950/40 group">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5" />
                    <div className="text-left">
                      <div>Request Blood Now</div>
                      <div className="text-[9px] font-mono font-normal text-rose-200/70 uppercase tracking-widest">For Hospitals &amp; Emergency Centers</div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>

              <div className="grid grid-cols-2 gap-3">
                <Link href="/register?role=donor">
                  <button id="cta-become-donor" className="w-full flex items-center justify-center gap-2 border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-100 font-bold text-xs uppercase tracking-wider px-4 py-3.5 rounded-xl transition-all hover:border-emerald-700/50 hover:text-emerald-400 group">
                    <Heart className="h-4 w-4 text-emerald-500 group-hover:animate-pulse" />
                    Become a Donor
                  </button>
                </Link>
                <Link href="/register?role=bloodbank">
                  <button id="cta-register-bank" className="w-full flex items-center justify-center gap-2 border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-100 font-bold text-xs uppercase tracking-wider px-4 py-3.5 rounded-xl transition-all hover:border-blue-700/50 hover:text-blue-400 group">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    Register Blood Bank
                  </button>
                </Link>
              </div>
            </div>

            {/* Trust indicators */}
            <div className="border border-zinc-800 bg-zinc-900/20 rounded-xl p-4">
              <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest mb-3">Trusted By</p>
              <div className="flex flex-wrap items-center gap-4">
                {["Apollo Hospitals", "AIIMS", "Fortis Healthcare", "Manipal Health", "Max Healthcare", "Red Cross India"].map((name) => (
                  <span key={name} className="text-[10px] font-bold text-zinc-400 border border-zinc-800 bg-zinc-950 px-2.5 py-1 rounded-lg font-mono">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Live Emergency Feed + AI Dispatch Animation */}
          <div className="lg:col-span-6 space-y-4">

            {/* Live Emergency Feed */}
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
                <div className="flex items-center gap-2">
                  <Radio className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-widest">Live Emergency Feed</span>
                </div>
                <span className="flex items-center gap-1 text-[8px] font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                  <span className="h-1 w-1 rounded-full bg-rose-500 animate-ping inline-block" /> BROADCASTING
                </span>
              </div>

              <div className="divide-y divide-zinc-800/60">
                {EMERGENCY_EVENTS.map((ev, i) => {
                  const isCurrent = i === feedIdx;
                  return (
                    <div
                      key={ev.id}
                      className={`flex items-center justify-between px-4 py-2.5 transition-all duration-500 ${
                        isCurrent ? "bg-rose-500/5 border-l-2 border-rose-500" : "border-l-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${urgencyColor(ev.type)}`}>
                          {ev.type}
                        </span>
                        <span className="text-sm font-black text-rose-500 font-mono shrink-0">{ev.blood}</span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-zinc-200 truncate">{ev.hospital}</p>
                          <p className="text-[9px] text-zinc-500 font-mono">{ev.city} · {ev.units} units</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-mono text-zinc-600">{ev.time}</span>
                        {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Dispatch Timeline Animation */}
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-[9px] font-mono font-bold text-zinc-300 uppercase tracking-widest">AI Dispatch Engine — Live</span>
                </div>
                <span className="text-[8px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">IN PROGRESS</span>
              </div>

              <div className="space-y-3">
                {TIMELINE_STEPS.map((step, i) => {
                  const isActive = i === 4;
                  return (
                    <div key={step.label} className="flex items-start gap-3">
                      {/* Connector line + icon */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-all ${
                          step.done
                            ? "bg-emerald-500/20 border-emerald-500/50"
                            : isActive
                            ? `border-amber-500 bg-amber-500/20 ${dispatchPulse ? "shadow-lg shadow-amber-500/20" : ""}`
                            : "bg-zinc-900 border-zinc-700"
                        }`}>
                          {step.done ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          ) : isActive ? (
                            <span className={`h-2 w-2 rounded-full bg-amber-400 ${dispatchPulse ? "animate-ping" : ""}`} />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                          )}
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={`w-px h-4 mt-0.5 ${step.done ? "bg-emerald-500/40" : "bg-zinc-800"}`} />
                        )}
                      </div>

                      {/* Text */}
                      <div className="pb-1">
                        <p className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                          step.done ? "text-emerald-400" : isActive ? "text-amber-400" : "text-zinc-600"
                        }`}>
                          {step.label}
                        </p>
                        <p className="text-[9px] text-zinc-500 mt-0.5">{step.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — LIVE STATS BAR
      ════════════════════════════════════════════════════════════════════ */}
      <section className="border-y border-zinc-800 bg-zinc-900/20 py-8">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Lives Saved Today",    value: stats.livesSaved.toLocaleString(), icon: Heart,       color: "text-rose-500",    change: "+3 this minute" },
            { label: "Active Donors Online", value: stats.donors.toLocaleString(),     icon: Users,       color: "text-emerald-400", change: "Ready to dispatch" },
            { label: "Verified Blood Banks", value: stats.banks.toString(),            icon: Building2,   color: "text-blue-400",    change: "87 cities covered" },
            { label: "Active Emergencies",   value: stats.emergencies.toString(),      icon: AlertTriangle, color: "text-amber-400", change: "Being routed now" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="text-center space-y-1">
                <Icon className={`h-5 w-5 mx-auto mb-2 ${s.color}`} />
                <p className={`text-3xl font-black tracking-tight font-mono ${s.color}`}>{s.value}</p>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-[9px] text-zinc-600 font-mono">{s.change}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3 — NATIONAL BLOOD AVAILABILITY + INDIA MAP
      ════════════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Blood availability grid */}
        <div className="lg:col-span-7 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-rose-500" />
              <h2 className="text-lg font-black uppercase tracking-wider">Real-Time National Blood Availability</h2>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">50km radius · Updates every 60 seconds · AI-forecasted supply-demand ratio</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BLOOD_STATUS.map((b) => {
              const c = bloodLevelColor(b.level);
              return (
                <div key={b.type} className={`border ${c.border} bg-zinc-900/20 rounded-xl p-4 space-y-3`}>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black font-mono text-zinc-100">{b.type}</span>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${c.border} ${c.text} uppercase tracking-wider`}>
                      {b.level}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                      <span>SUPPLY</span>
                      <span className={`font-bold ${c.text}`}>{b.pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${c.bar}`}
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* How it works */}
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5 space-y-4">
            <h3 className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">What Happens During an Emergency</h3>
            <div className="space-y-3">
              {[
                { step: "01", title: "Hospital files request", desc: "Blood type, units, urgency level, and GPS coordinates are submitted in under 30 seconds.", color: "text-rose-500" },
                { step: "02", title: "AI cascade audit", desc: "The ABO compatibility engine scores every registered donor and blood bank within 50km — in 4.2 seconds.", color: "text-amber-400" },
                { step: "03", title: "Multi-channel broadcast", desc: "Top matches receive SMS pings. Donors confirm or decline. Blood banks are simultaneously notified.", color: "text-blue-400" },
                { step: "04", title: "Courier dispatch + tracking", desc: "Confirmed units are routed via verified courier. Hospital gets live GPS ETA. Goal: delivery under 15 minutes.", color: "text-emerald-400" },
              ].map((item) => (
                <div key={item.step} className="flex gap-4 items-start">
                  <div className={`font-mono text-[10px] font-black ${item.color} shrink-0 w-6 pt-0.5`}>{item.step}</div>
                  <div>
                    <p className="text-xs font-bold text-zinc-200">{item.title}</p>
                    <p className="text-[10px] text-zinc-500 leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* India Map */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="h-4 w-4 text-rose-500" />
              <h2 className="text-lg font-black uppercase tracking-wider">Current Active Emergencies</h2>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Live map · National coverage</p>
          </div>

          {/* SVG India Map */}
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute top-[-30%] left-[-10%] h-[200px] w-[200px] rounded-full bg-rose-500/5 blur-3xl pointer-events-none" />

            <svg viewBox="0 0 100 110" className="w-full h-auto" style={{ maxHeight: "320px" }}>
              {/* Simplified India outline */}
              <path
                d="M 28 8 L 38 6 L 48 7 L 55 5 L 65 8 L 72 12 L 75 20 L 72 28 L 68 35 L 70 42 L 66 48 L 60 52 L 55 58 L 52 65 L 54 72 L 50 78 L 46 82 L 40 85 L 36 80 L 32 74 L 28 68 L 25 62 L 22 56 L 20 50 L 18 44 L 16 36 L 18 28 L 22 20 L 25 14 Z"
                fill="none"
                stroke="#27272a"
                strokeWidth="0.8"
                className="opacity-60"
              />
              {/* Internal state borders approximation */}
              <path d="M 28 8 L 48 7 M 38 6 L 35 25 M 55 5 L 52 30 M 72 12 L 60 35 M 68 35 L 50 45 M 60 52 L 40 55" fill="none" stroke="#1f1f1f" strokeWidth="0.3" />

              {/* City pins */}
              {INDIA_PINS.map((pin, i) => {
                const isCritical = pin.critical;
                return (
                  <g key={pin.city}>
                    {/* Ping ring */}
                    {isCritical && (
                      <circle
                        cx={pin.x} cy={pin.y} r="3.5"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="0.5"
                        className="animate-ping"
                        style={{ animationDelay: `${i * 300}ms` }}
                        opacity="0.4"
                      />
                    )}
                    {/* Dot */}
                    <circle
                      cx={pin.x} cy={pin.y} r="1.8"
                      fill={isCritical ? "#ef4444" : "#52525b"}
                      stroke={isCritical ? "#fca5a5" : "#3f3f46"}
                      strokeWidth="0.4"
                    />
                    {/* Label */}
                    <text
                      x={pin.x + 2.5} y={pin.y + 0.8}
                      fontSize="3"
                      fill={isCritical ? "#fca5a5" : "#71717a"}
                      className="font-mono"
                      fontWeight="bold"
                    >
                      {pin.city}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 font-mono">
              <span className="flex items-center gap-1.5 text-[9px] text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse inline-block" /> Active emergency
              </span>
              <span className="flex items-center gap-1.5 text-[9px] text-zinc-500">
                <span className="h-2 w-2 rounded-full bg-zinc-600 inline-block" /> Monitoring
              </span>
            </div>
          </div>

          {/* City emergency list */}
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/40">
              <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Active Dispatch Locations</span>
            </div>
            <div className="divide-y divide-zinc-800/60">
              {EMERGENCY_EVENTS.filter((e) => e.type === "CRITICAL" || e.type === "HIGH").map((ev) => (
                <div key={ev.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-zinc-200">{ev.city}</p>
                      <p className="text-[9px] text-zinc-500 font-mono">{ev.hospital}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-rose-500 font-mono">{ev.blood}</p>
                    <p className="text-[9px] text-zinc-500 font-mono">{ev.units} units needed</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Response time metric */}
          <div className="border border-emerald-800/30 bg-emerald-500/5 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <Clock className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Avg. Response Time</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">From request to courier dispatch</p>
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-400 font-mono">&lt; 15m</p>
          </div>
        </div>

      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4 — THE PROBLEM + AI SOLUTION
      ════════════════════════════════════════════════════════════════════ */}
      <section className="border-t border-zinc-900 bg-zinc-900/10 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Problem */}
            <div className="border border-rose-800/30 bg-rose-950/10 rounded-xl p-6 space-y-3">
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-rose-400">The Problem</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                India needs <strong className="text-zinc-200">15 million blood units</strong> annually. Only 11 million are collected. Existing systems rely on manual phone calls, WhatsApp groups, and outdated directories.
              </p>
              <div className="pt-2 space-y-1.5">
                {["38,000 deaths/year from delayed blood", "Manual matching takes 2–4 hours", "No real-time donor availability data"].map((p) => (
                  <p key={p} className="text-[10px] text-zinc-500 font-mono flex items-start gap-1.5">
                    <span className="text-rose-500 mt-0.5">×</span> {p}
                  </p>
                ))}
              </div>
            </div>

            {/* AI Solution */}
            <div className="border border-blue-800/30 bg-blue-950/10 rounded-xl p-6 space-y-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center">
                <Zap className="h-4 w-4 text-blue-400" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-blue-400">How AI Solves It</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sanguis uses spatial cascade routing, ABO compatibility matrices, and priority scoring to match emergencies with the nearest eligible donor or verified blood bank — in under 5 seconds.
              </p>
              <div className="pt-2 space-y-1.5">
                {["ABO engine: 87 candidates scored in 4.2s", "Voluntary unavailability calendar", "Predictive shortage forecasting"].map((p) => (
                  <p key={p} className="text-[10px] text-zinc-500 font-mono flex items-start gap-1.5">
                    <span className="text-blue-400 mt-0.5">→</span> {p}
                  </p>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="border border-emerald-800/30 bg-emerald-950/10 rounded-xl p-6 space-y-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">Proven Impact</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Real-time verified dispatch coordination cutting emergency response time from hours to minutes across 87 registered hospitals in 23 Indian cities.
              </p>
              <div className="pt-2 space-y-1.5">
                {["4.2s average match latency", "99.8% ABO accuracy rate", "12,847+ lives saved to date"].map((p) => (
                  <p key={p} className="text-[10px] text-zinc-500 font-mono flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">✓</span> {p}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 5 — FINAL CTA
      ════════════════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="border border-rose-800/30 bg-rose-950/10 rounded-2xl p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-20%] left-[20%] h-[300px] w-[300px] rounded-full bg-rose-500/5 blur-[100px]" />
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-800/50 bg-rose-950/40 px-3 py-1 text-[9px] font-mono font-bold text-rose-400 uppercase tracking-widest mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" /> Emergency Network Active
            </div>
            <h2 className="text-4xl font-black uppercase tracking-tight mb-3">
              Be Ready.<br />
              <span className="text-rose-500">Save a Life Today.</span>
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg mx-auto mb-8 leading-relaxed">
              Join India's most advanced blood emergency response network. Register your hospital, blood bank, or become a verified donor. Every second counts.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/register">
                <button className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-wider px-8 py-4 rounded-xl transition-all hover:scale-[1.02] shadow-2xl shadow-rose-950/50">
                  <Heart className="h-4 w-4" /> Join the Network
                </button>
              </Link>
              <Link href="/login">
                <button className="flex items-center gap-2 border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-xl transition-all">
                  <Navigation className="h-4 w-4" /> Sign In
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Sanguis" className="h-6 w-6 rounded-md object-cover" />
            <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">SANGUIS EMERGENCY RESPONSE</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              All Systems Operational
            </span>
            <span>·</span>
            <span>HIPAA Compliant</span>
            <span>·</span>
            <span>ISO 9001:2015</span>
            <span>·</span>
            <span>© {new Date().getFullYear()} Sanguis Operations</span>
          </div>
        </div>
      </footer>

      {/* Floating Explainable AI Copilot */}
      <SanguisAiCopilot />
    </div>
  );
}
