"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuthStore } from "@/store/auth.store";
import { ShieldCheck, Heart, Users, Activity, Sparkles, Brain, ArrowRight, BarChart2 } from "lucide-react";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  // AI Forecaster Simulator State
  const [selectedRegion, setSelectedRegion] = useState("city-center");
  const [selectedBlood, setSelectedBlood] = useState("O-");

  const regionData: Record<string, { name: string; demand: number; supply: number; status: string; color: string }> = {
    "city-center": { name: "City Central District", demand: 92, supply: 34, status: "Critical Shortage Expected", color: "text-destructive bg-destructive/10" },
    "north-sub": { name: "North Suburbs Metro", demand: 45, supply: 62, status: "Stable Supply", color: "text-emerald-500 bg-emerald-500/10" },
    "south-metro": { name: "South Metro Hospital Hub", demand: 78, supply: 22, status: "High Urgency Deficit", color: "text-amber-500 bg-amber-500/10" },
  };

  const currentForecast = regionData[selectedRegion];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-destructive/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Grid Lines Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))/0.15_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))/0.15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="Sanguis Logo" className="h-9 w-9 rounded-lg object-cover shadow-md" />
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground via-muted-foreground to-foreground bg-clip-text text-transparent">
              Sanguis
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard">
                <Button className="font-semibold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Go to Dashboard <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <div className="flex gap-2">
                <Link href="/login">
                  <Button variant="ghost" className="font-semibold text-sm">Sign In</Button>
                </Link>
                <Link href="/register">
                  <Button className="font-semibold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all text-sm">
                    Register
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative mx-auto max-w-7xl px-6 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Side: Copy */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/65 px-4 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm glass">
            <ShieldCheck className="h-3.5 w-3.5 text-destructive" />
            AI-Engineered Emergency Blood Response Platform
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl leading-[1.1] text-glow">
            Blood Donors Found in <span className="bg-gradient-to-r from-destructive via-amber-500 to-destructive bg-clip-text text-transparent">Seconds</span>
          </h1>

          <p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Sanguis bridges the critical gap between hospitals and eligible donors. Leveraging real-time location dispatches, ABO compatibility engines, and predictive demand AI to route compatibility dispatches immediately.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            {user ? (
              <Link href="/dashboard">
                <Button size="lg" className="h-12 px-8 font-semibold shadow-lg hover:scale-[1.03] transition-all text-base bg-destructive hover:bg-destructive/90 text-white">
                  Enter Command Portal
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/register">
                  <Button size="lg" className="h-12 px-8 font-semibold shadow-lg hover:scale-[1.03] transition-all text-base bg-destructive hover:bg-destructive/90 text-white">
                    Become a Donor
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="h-12 px-8 font-semibold glass hover:scale-[1.03] transition-all text-base">
                    Hospital Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-6 pt-10 border-t border-border/40">
            <div>
              <p className="text-3xl font-extrabold tracking-tight">4.2m</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase font-semibold">Response Speed</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold tracking-tight">99.8%</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase font-semibold">Match Accuracy</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold tracking-tight">&lt; 15m</p>
              <p className="text-xs text-muted-foreground mt-1 uppercase font-semibold">Average ETA</p>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive AI Predictor Widget */}
        <div className="lg:col-span-5">
          <div className="glass-card glow-border p-6 rounded-2xl shadow-2xl relative overflow-hidden border border-border/40 bg-card/40">
            {/* Ambient Background Glow inside the card */}
            <div className="absolute top-[-20%] right-[-20%] h-40 w-40 rounded-full bg-destructive/10 blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-destructive/15 p-2 text-destructive">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Sanguis Predictor AI</h3>
                <p className="text-xs text-muted-foreground">Blood Shortage Forecaster</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Region Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Region Hub</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                >
                  <option value="city-center">City Central District</option>
                  <option value="north-sub">North Suburbs Metro</option>
                  <option value="south-metro">South Metro Hospital Hub</option>
                </select>
              </div>

              {/* Blood Type Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Blood Type Group</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {["A+", "O-", "B+", "AB-"].map((bt) => (
                    <button
                      key={bt}
                      type="button"
                      onClick={() => setSelectedBlood(bt)}
                      className={`h-8 rounded-lg text-xs font-semibold border transition-all ${
                        selectedBlood === bt
                          ? "border-destructive text-destructive bg-destructive/5 font-bold"
                          : "border-border bg-background/30 hover:bg-background"
                      }`}
                    >
                      {bt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Analysis */}
              <div className="mt-6 p-4 rounded-xl border border-border/30 bg-muted/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Sanguis Forecast:</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${currentForecast.color}`}>
                    {currentForecast.status}
                  </span>
                </div>

                {/* SVG Visual Bars */}
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-semibold">
                      <span>PROJECTED DEMAND INDEX</span>
                      <span>{currentForecast.demand}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-border/40 overflow-hidden">
                      <div
                        className="h-full bg-destructive transition-all duration-500 ease-out"
                        style={{ width: `${currentForecast.demand}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-semibold">
                      <span>COMMUNITY SUPPLY INDEX</span>
                      <span>{currentForecast.supply}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-border/40 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500 ease-out"
                        style={{ width: `${currentForecast.supply}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/25 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Confidence rating: 97.4%</span>
                  <span className="flex items-center gap-1 font-semibold text-destructive">
                    <Sparkles className="h-3 w-3" /> Auto-optimising dispatches
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="relative mx-auto max-w-7xl px-6 py-20 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-card glow-border p-6 rounded-xl space-y-4 hover:translate-y-[-4px] transition-all duration-300">
          <div className="h-10 w-10 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center">
            <Heart className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg">ABO Engine Compatibility</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Standardized compatibility rules matches specific dispatches automatically, eliminating human mismatches.
          </p>
        </div>

        <div className="glass-card glow-border p-6 rounded-xl space-y-4 hover:translate-y-[-4px] transition-all duration-300">
          <div className="h-10 w-10 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg">Gamified Donor Passport</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Encourages continuous volunteers with streak counters, lives saved tracking, and official donor digital badges.
          </p>
        </div>

        <div className="glass-card glow-border p-6 rounded-xl space-y-4 hover:translate-y-[-4px] transition-all duration-300">
          <div className="h-10 w-10 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center">
            <Activity className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-lg">Live Dispatch Command</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Hospital dispatchers get real-time proximity alerts, compatibility indices, and ETA statuses for all candidates.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground glass">
        &copy; {new Date().getFullYear()} Sanguis Healthcare Technologies. Secure, automated dispatches.
      </footer>
    </div>
  );
}
