"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
      } else if (user.role === "hospital") {
        router.replace("/requests/new");
      }
    }
  }, [isBootstrapping, user, router]);

  if (isBootstrapping || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground bg-background">Loading gateway router…</div>;
  }

  async function handleLogout() {
    await api.post("/auth/logout");
    clear();
    router.push("/login");
  }

  return (
    <main className="relative mx-auto max-w-4xl px-6 py-12 min-h-screen bg-background">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-destructive/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="Sanguis Logo" className="h-9 w-9 rounded-xl object-cover shadow-md" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-glow">Sanguis Hub Gateway</h1>
            <p className="text-xs text-muted-foreground">Select your user role flow to continue</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={handleLogout} className="font-semibold glass hover:bg-muted">
            Logout
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {/* User Identity Banner */}
        <Card className="glass-card border border-border/40 relative overflow-hidden bg-card/50">
          <div className="absolute top-0 right-0 p-3 text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> Active Session
          </div>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Logged in as {user.name}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="font-mono bg-muted/65 px-2 py-0.5 rounded border border-border/30">{user.email}</span>
            <span>·</span>
            <span>Current privilege tier:</span>
            <span className="font-semibold capitalize bg-destructive/10 text-destructive px-1.5 py-0.2 rounded">{user.role}</span>
          </CardContent>
        </Card>

        {/* Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Donor Entrance */}
          <div className="glass-card glow-border p-6 rounded-2xl border border-border/40 hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between space-y-6 bg-card/30">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center">
                <Heart className="h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg">Volunteer Donor Dashboard</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Create/view your digital Donor Passport, trace streaks, track lives saved impact counters, verify eligibility cooldowns, and accept matching dispatches.
                </p>
              </div>
            </div>
            <Link href="/donor/dashboard" className="w-full">
              <Button className="w-full font-bold shadow-lg bg-destructive hover:bg-destructive/90 text-white flex items-center justify-center gap-2">
                Enter Donor Portal <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Hospital Entrance */}
          <div className="glass-card glow-border p-6 rounded-2xl border border-border/40 hover:translate-y-[-2px] transition-all duration-300 flex flex-col justify-between space-y-6 bg-card/30">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center">
                <Activity className="h-5.5 w-5.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg">Hospital Request panel</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Create emergency requests with real-time AI Urgency analyzers, dispatch matched donor networks, and monitor donor ETAs on the command map.
                </p>
              </div>
            </div>
            <Link href="/requests/new" className="w-full">
              <Button variant="outline" className="w-full font-bold glass flex items-center justify-center gap-2">
                Enter Request Panel <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

        </div>

        {/* Tip Widget */}
        <div className="rounded-xl border border-border/30 bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
          <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-foreground">Need to switch portals?</span> Sanguis users with Admin or Moderator accounts bypass direct role redirects, letting you use this Gateway screen to debug or switch between the hospital dispatch console and the volunteer donor dashboard dynamically.
          </div>
        </div>
      </div>
    </main>
  );
}
