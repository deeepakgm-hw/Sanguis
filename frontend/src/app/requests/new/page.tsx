"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { 
  Activity, 
  Brain, 
  Sparkles, 
  MapPin, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle
} from "lucide-react";
import Link from "next/link";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function NewBloodRequestPage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);

  const [bloodType, setBloodType] = useState("O-");
  const [unitsNeeded, setUnitsNeeded] = useState(2);
  const [lat, setLat] = useState("13.0827"); // Default coordinates (e.g. Chennai)
  const [lng, setLng] = useState("80.2707");
  const [urgencyLevel, setUrgencyLevel] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Authenticated Page Gate (standard project pattern)
  useEffect(() => {
    if (!isBootstrapping && !user) router.replace("/login");
  }, [isBootstrapping, user, router]);

  if (isBootstrapping || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground bg-background">Loading…</div>;
  }

  // Reactive AI Urgency Priority computations
  let aiUrgencyIndex = 30; // base value
  let shortageRisk = "Low Deficit Threat";
  let riskColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  let recommendations = "Standard donor proximity dispatch recommended.";

  if (urgencyLevel === "high") aiUrgencyIndex += 30;
  if (urgencyLevel === "critical") aiUrgencyIndex += 50;

  if (unitsNeeded >= 5) {
    aiUrgencyIndex += 20;
    shortageRisk = "High Volume Deficiency";
    riskColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
  }

  if (bloodType === "O-" || bloodType === "O+") {
    aiUrgencyIndex += 15;
    if (urgencyLevel === "critical" || unitsNeeded >= 5) {
      shortageRisk = "Critical Supply Deficit (O Group)";
      riskColor = "text-destructive bg-destructive/10 border-destructive/20";
      recommendations = "IMMEDIATE broadcast to all universal donors required.";
    }
  }

  if (aiUrgencyIndex > 100) aiUrgencyIndex = 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error("Latitude and Longitude must be valid numbers");
      }

      // Backend additionally gates this endpoint via requireVerifiedRequester middleware.
      const response = await api.post("/blood-requests", {
        bloodType,
        unitsNeeded,
        urgencyLevel,
        geoLocation: {
          type: "Point",
          coordinates: [longitude, latitude], // GeoJSON order: [lng, lat]
        },
      });

      setSuccess(true);
      const requestId = response.data?.data?.request?._id;
      if (requestId) {
        router.push(`/requests/${requestId}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || err.message || "Failed to create blood request"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative mx-auto max-w-5xl px-6 py-12 min-h-screen bg-background">
      {/* Background radial highlight */}
      <div className="absolute top-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-destructive/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="Sanguis Logo" className="h-9 w-9 rounded-xl object-cover shadow-md" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-glow">Emergency Request panel</h1>
            <p className="text-xs text-muted-foreground">Submit blood match dispatches to regional volunteer network</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="font-semibold glass hover:bg-muted">Gateway</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: Dispatch Form */}
        <div className="md:col-span-7">
          <Card className="glass-card border border-border/40 bg-card/40">
            <CardHeader>
              <CardTitle className="text-lg">Create Emergency Dispatch Request</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Enter emergency details below. AI scoring resolves priorities automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-xs font-semibold">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-semibold">
                    Request created successfully! Routing to matches…
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hospital (Auto-filled)</label>
                  <input
                    type="text"
                    disabled
                    value={user.name}
                    className="w-full h-9 rounded-lg border border-border bg-muted px-3 text-xs opacity-75"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Required Blood Group</label>
                    <select
                      value={bloodType}
                      onChange={(e) => setBloodType(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                    >
                      {BLOOD_TYPES.map((bt) => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Units Needed (Bags)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={unitsNeeded}
                      onChange={(e) => setUnitsNeeded(parseInt(e.target.value, 10) || 1)}
                      className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Urgency Tier</label>
                  <select
                    value={urgencyLevel}
                    onChange={(e) => setUrgencyLevel(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                  >
                    <option value="low">Low (Routine Check / Elective Surgery)</option>
                    <option value="medium">Medium (Standard Patient Support)</option>
                    <option value="high">High (Severe Bleeding / Trauma Case)</option>
                    <option value="critical">Critical (Immediate Organ Failure / Shock)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hospital Latitude Coordinates</label>
                    <input
                      type="text"
                      required
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="e.g. 13.0827"
                      className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Hospital Longitude Coordinates</label>
                    <input
                      type="text"
                      required
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="e.g. 80.2707"
                      className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full mt-4 bg-destructive hover:bg-destructive/90 text-white font-semibold shadow-lg">
                  {loading ? "Calculating matches..." : "Broadcast Request & Dispatch"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Reactive AI Urgency Analyzer */}
        <div className="md:col-span-5 space-y-6">
          <Card className="glass-card border border-border/40 relative overflow-hidden bg-card/40">
            <div className="absolute top-[-10px] right-[-10px] h-20 w-20 rounded-full bg-destructive/15 blur-xl pointer-events-none" />
            
            <CardHeader className="pb-3 border-b border-border/20">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-destructive" />
                <CardTitle className="text-sm font-bold">Emergency AI Priority Analyzer</CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">Reactive threat score analysis of input parameters</CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-5 text-xs">
              {/* Urgency Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>AI URGENCY COMPLIANCE INDEX</span>
                  <span className="text-destructive font-extrabold">{aiUrgencyIndex}/100</span>
                </div>
                <div className="h-2 w-full rounded-full bg-border/40 overflow-hidden">
                  <div
                    className="h-full bg-destructive transition-all duration-300 ease-out"
                    style={{ width: `${aiUrgencyIndex}%` }}
                  />
                </div>
              </div>

              {/* Status Flag */}
              <div className={`p-3 rounded-lg border flex items-start gap-2 ${riskColor}`}>
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-extrabold">Risk Condition:</h5>
                  <p className="mt-0.5 text-muted-foreground">{shortageRisk}</p>
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-1.5">
                <h5 className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">AI Proximity Recommendation</h5>
                <p className="text-muted-foreground leading-relaxed">
                  {recommendations} The system calculates compatibilities (ABO/Rh compatibility engine) and will rank results based on donor trust rating metrics.
                </p>
              </div>

              <div className="pt-3 border-t border-border/20 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold text-destructive">
                  <Sparkles className="h-3 w-3 animate-pulse" /> Verified Requester active
                </span>
                <span>Matches auto-created</span>
              </div>
            </CardContent>
          </Card>

          {/* Guidelines */}
          <div className="rounded-xl border border-border/30 bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
            <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-foreground">Gated creation:</span> This route is gated behind verified hospital checking middleware. While Teammate C completes integration parameters, it utilizes a passthrough stub.
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
