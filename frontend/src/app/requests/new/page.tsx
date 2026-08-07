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
  HelpCircle,
  ShieldAlert
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

  const [forecast, setForecast] = useState<any | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchForecast = async () => {
      setForecastLoading(true);
      try {
        const res = await api.get("/forecast", {
          params: { lat: parseFloat(lat) || 13.0827, lng: parseFloat(lng) || 80.2707, radiusKm: 50, bloodType },
        });
        setForecast(res.data.data);
      } catch {
        setForecast(null);
      } finally {
        setForecastLoading(false);
      }
    };
    fetchForecast();
  }, [bloodType, lat, lng, user]);

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
      const routeResult = response.data?.data?.routeResult;
      if (requestId) {
        if (routeResult) {
          sessionStorage.setItem(`sanguis_route_result_${requestId}`, JSON.stringify(routeResult));
        }
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

      const isUnverifiedHospital = user && user.role === "hospital" && !user.isEmailVerified;

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

          {/* Verification Warning Card */}
          {isUnverifiedHospital && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl space-y-2 mb-6">
              <h3 className="text-sm font-extrabold text-destructive flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5" /> Account Verification Pending
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your hospital account has not yet been marked as a Verified Requester by Sanguis Administrators. 
                Emergency blood request dispatches are restricted to verified medical institutions to prevent fraudulent alerts. 
                <strong> Please contact system administration to verify your credentials.</strong>
              </p>
            </div>
          )}
    
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

                 <Button 
                   type="submit" 
                   disabled={loading || isUnverifiedHospital} 
                   className="w-full mt-4 bg-destructive hover:bg-destructive/90 text-white font-semibold shadow-lg disabled:opacity-50"
                 >
                   {loading 
                     ? "Calculating matches..." 
                     : isUnverifiedHospital 
                       ? "Submission Disabled (Verification Required)" 
                       : "Broadcast Request & Dispatch"
                   }
                 </Button>
               </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Live Cascade Pre-Flight Analysis */}
        <div className="md:col-span-5 space-y-6">
          <Card className="glass-card border border-border/40 relative overflow-hidden bg-card/40">
            <div className="absolute top-[-10px] right-[-10px] h-20 w-20 rounded-full bg-destructive/15 blur-xl pointer-events-none" />
            
            <CardHeader className="pb-3 border-b border-border/20">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-destructive animate-pulse" />
                <CardTitle className="text-sm font-bold">Cascade Pre-Flight Analyzer</CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">Real-time availability audit for {bloodType} group</CardDescription>
            </CardHeader>

            <CardContent className="pt-6 space-y-5 text-xs">
              {forecastLoading ? (
                <div className="text-center py-6 text-[11px] text-muted-foreground animate-pulse">Checking regional inventories...</div>
              ) : forecast ? (
                <>
                  {/* Status Flag */}
                  <div className={`p-3 rounded-lg border flex items-start gap-2 ${
                    forecast.tier === "critical" 
                      ? "text-destructive bg-destructive/10 border-destructive/20"
                      : forecast.tier === "watch"
                        ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                        : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                  }`}>
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-extrabold uppercase text-[10px]">Shortage risk tier:</h5>
                      <p className="mt-0.5 font-bold">{forecast.tierLabel}</p>
                    </div>
                  </div>

                  {/* Supply Stats */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-2.5 rounded-lg border border-border/20 bg-background/20">
                      <p className="text-base font-black text-foreground">{forecast.bankInventoryUnits}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold mt-0.5">Bank Stock</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border/20 bg-background/20">
                      <p className="text-base font-black text-foreground">{forecast.eligibleDonorCount}</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold mt-0.5">Active Donors</p>
                    </div>
                  </div>

                  {/* Cascade routing projection */}
                  <div className="space-y-1.5 pt-2 border-t border-border/20">
                    <h5 className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Routing Projection</h5>
                    <p className="text-muted-foreground leading-relaxed">
                      {forecast.bankInventoryUnits >= unitsNeeded ? (
                        <span className="text-emerald-500 font-medium">
                          ✓ Sufficient bank stock found. Request will resolve immediately from verified repository inventory without contacting individual donors.
                        </span>
                      ) : (
                        <span className="text-amber-500 font-medium">
                          ⚠ Deficit of {unitsNeeded - forecast.bankInventoryUnits} units. System will automatically fallback to volunteer donor broadcast and SMS outreach.
                        </span>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-[11px] text-muted-foreground">Enter coordinates to enable cascade projections.</div>
              )}

              <div className="pt-3 border-t border-border/20 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1 font-semibold text-destructive">
                  <Sparkles className="h-3 w-3" /> Real-time forecasting
                </span>
                <span>Radius: 50 KM</span>
              </div>
            </CardContent>
          </Card>

          {/* Guidelines */}
          <div className="rounded-xl border border-border/30 bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
            <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-foreground">Gated creation:</span> This route is restricted to verified requester accounts. Verify your status inside the Tactical Command Center to grant instant access.
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
