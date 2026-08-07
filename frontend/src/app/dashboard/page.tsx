"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";
import { Heart, Activity, User, ShieldCheck, HelpCircle, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    if (!isBootstrapping && !user) {
      router.replace("/login");
      return;
    }

    if (user) {
      if (user.role === "donor") {
        router.replace("/donor/dashboard");
      }
    }
  }, [isBootstrapping, user, router]);

  if (isBootstrapping || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground bg-zinc-950 font-mono text-xs uppercase tracking-wider">Loading gateway router…</div>;
  }

  async function handleLogout() {
    await api.post("/auth/logout");
    clear();
    router.push("/login");
  }

  return (
    <main className="relative mx-auto max-w-5xl px-6 py-12 min-h-screen bg-zinc-950 text-zinc-50 font-mono">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-rose-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-zinc-900/10 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Sanguis Logo" className="h-9 w-9 rounded-xl object-cover shadow-md border border-zinc-800" />
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-glow">Sanguis Gateway</h1>
            <p className="text-xs text-zinc-400 font-medium">Select your command operations portal flow</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/demo">
            <Button className="font-black text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black animate-pulse">
              🎮 2-Min Judge Demo
            </Button>
          </Link>
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={handleLogout} className="font-bold text-xs uppercase tracking-wider border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300">
            Logout
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* User Identity Banner */}
        <div className="border border-zinc-800 rounded-xl relative overflow-hidden bg-zinc-900/20 p-5">
          <div className="absolute top-4 right-4 text-[9px] uppercase font-mono font-bold tracking-widest text-emerald-500 bg-emerald-500/5 border border-emerald-500/20 px-2 py-0.5 rounded">
            SYS_SESSION_ACTIVE
          </div>
          <h2 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">Operator: {user.name}</h2>
          <div className="text-[11px] text-zinc-400 mt-2 flex flex-wrap items-center gap-2 font-mono">
            <span className="bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">{user.email}</span>
            <span>·</span>
            <span>PRIVILEGE_TIER:</span>
            <span className="font-bold capitalize bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded">{user.role}</span>
          </div>
        </div>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Donor Entrance */}
          <div className="border border-zinc-800 p-6 rounded-xl flex flex-col justify-between space-y-6 bg-zinc-900/10 hover:bg-zinc-900/20 transition-all duration-300">
            <div className="space-y-3">
              <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                <Heart className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-100">Volunteer Donor Dashboard</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mt-1.5 font-medium font-sans">
                  Create/view your digital Donor Passport, trace streaks, track lives saved impact counters, verify eligibility cooldowns, and accept matching dispatches.
                </p>
              </div>
            </div>
            <Link href="/donor/dashboard" className="w-full">
              <Button className="w-full font-bold text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/20">
                Enter Donor Portal
              </Button>
            </Link>
          </div>

          {/* Hospital Entrance */}
          <div className="border border-zinc-800 p-6 rounded-xl flex flex-col justify-between space-y-6 bg-zinc-900/10 hover:bg-zinc-900/20 transition-all duration-300">
            <div className="space-y-3">
              <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                <Activity className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-100">Hospital Request Panel</h3>
                <p className="text-xs text-zinc-400 leading-relaxed mt-1.5 font-medium font-sans">
                  Create emergency requests with real-time AI Urgency analyzers, dispatch matched donor networks, and monitor donor ETAs on the command map.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/requests/new" className="flex-1">
                <Button variant="outline" className="w-full font-bold text-xs uppercase tracking-wider border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 h-9">
                  Request Panel
                </Button>
              </Link>
              <Link href="/command-center/hospital" className="flex-1">
                <Button className="w-full font-bold text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white h-9">
                  Command Map
                </Button>
              </Link>
            </div>
          </div>

          {/* Blood Bank Entrance */}
          <div className="border border-zinc-800 p-6 rounded-xl flex flex-col justify-between space-y-6 bg-zinc-900/10 hover:bg-zinc-900/20 transition-all duration-300 md:col-span-2">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center w-full">
              <div className="space-y-3">
                <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-zinc-100">Blood Bank Owner Portal</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-1.5 max-w-xl font-medium font-sans">
                    Register your repository, manage real-time inventory parameters, adjust stock levels via audit ledgers, and track incoming verification dispatches.
                  </p>
                </div>
              </div>
              <Link href="/bloodbank" className="w-full md:w-auto shrink-0">
                <Button className="w-full md:w-auto font-bold text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/20 px-6">
                  Manage Repository
                </Button>
              </Link>
            </div>
          </div>

          {/* Admin Command Center Entrance */}
          {(user.role === "admin" || user.role === "moderator") && (
            <div className="border border-rose-900/60 p-6 rounded-xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-rose-950/5 md:col-span-2 shadow-lg shadow-rose-950/5">
              <div className="space-y-3">
                <div className="h-9 w-9 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                  <Activity className="h-4.5 w-4.5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-rose-400">Tactical Command Center</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-1.5 max-w-xl font-medium font-sans">
                    Unified tactical oversight: monitor live geographic dispatch radar maps, verified blood bank stocks, active donor lists, and verified hospital status. Manage the explainable emergency priority queue.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 font-mono">
                <Link href="/command-center" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto font-bold text-xs uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white px-5">
                    Tactical Map
                  </Button>
                </Link>
                <Link href="/command-center/priority-queue" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto font-bold text-xs uppercase tracking-wider border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 px-5">
                    Priority Queue
                  </Button>
                </Link>
              </div>
            </div>
          )}

        </div>

        {/* Tip Widget */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 text-[11px] text-zinc-400 flex items-start gap-2.5">
          <HelpCircle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
          <div className="leading-relaxed font-sans">
            <span className="font-bold text-zinc-300">Operational Bypass Key:</span> Sanguis users with Admin or Moderator privileges bypass role redirects, allowing you to use this gateway to toggle between the hospital emergency dispatch interface and the volunteer donor passport view.
          </div>
        </div>
      </div>
    </main>
  );
}
