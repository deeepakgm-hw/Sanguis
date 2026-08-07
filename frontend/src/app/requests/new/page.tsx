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
        <main className="relative mx-auto max-w-5xl px-6 py-12 min-h-screen bg-zinc-950 text-zinc-50">
          {/* Background radial highlight */}
          <div className="absolute top-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-rose-500/5 blur-[100px] pointer-events-none" />
    
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
            <div className="flex items-center gap-3">
              <img src="/logo.jpg" alt="Sanguis Logo" className="h-9 w-9 rounded-xl object-cover shadow-md border border-zinc-800" />
              <div>
                <h1 className="text-lg font-black uppercase tracking-wider text-glow">Emergency Request Panel</h1>
                <p className="text-xs text-zinc-400 font-medium">Submit emergency dispatches to regional repositories and donor pools</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/command-center/hospital">
                <Button variant="outline" size="sm" className="font-bold text-xs uppercase tracking-wider border-rose-800/50 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400">Command Center</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="font-bold text-xs uppercase tracking-wider border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300">Gateway</Button>
              </Link>
            </div>
          </div>

          {/* Verification Warning Card */}
          {isUnverifiedHospital && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl space-y-2 mb-6">
              <h3 className="text-xs font-black text-rose-400 flex items-center gap-2 uppercase tracking-wider">
                <ShieldAlert className="h-4.5 w-4.5" /> Account Verification Required
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                Your hospital account has not yet been marked as a Verified Requester by Sanguis System Administrators. 
                Emergency blood request dispatches are restricted to verified medical institutions to prevent fraudulent alerts. 
                <strong> Please contact system administration to verify your credentials.</strong>
              </p>
            </div>
          )}
    
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* LEFT: Dispatch Form */}
        <div className="md:col-span-7">
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-6">
            <div className="border-b border-zinc-800 pb-4 mb-6">
              <h2 className="text-base font-extrabold uppercase tracking-wider text-zinc-100">Create Emergency Dispatch</h2>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                Enter emergency parameters below. Cascade routing checks blood bank stock automatically.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 rounded-lg text-xs font-bold font-mono">
                  ERROR: {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-lg text-xs font-bold font-mono">
                  SYNC_SUCCESS: Request created. Routing dispatch...
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Hospital (Auto-filled)</label>
                <input
                  type="text"
                  disabled
                  value={user.name}
                  className="w-full h-9 rounded-lg border border-zinc-850 bg-zinc-900 px-3 text-xs opacity-75 font-medium text-zinc-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Required Blood Group</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs shadow-inner font-bold text-zinc-100"
                  >
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Units Needed (Bags)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={unitsNeeded}
                    onChange={(e) => setUnitsNeeded(parseInt(e.target.value, 10) || 1)}
                    className="w-full h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs shadow-inner font-mono font-bold text-zinc-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Urgency Tier</label>
                <select
                  value={urgencyLevel}
                  onChange={(e) => setUrgencyLevel(e.target.value)}
                  className="w-full h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs shadow-inner font-bold text-zinc-100"
                >
                  <option value="low">Low (Routine Check / Elective Surgery)</option>
                  <option value="medium">Medium (Standard Patient Support)</option>
                  <option value="high">High (Severe Bleeding / Trauma Case)</option>
                  <option value="critical">Critical (Immediate Organ Failure / Shock)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Hospital Latitude Coordinates</label>
                  <input
                    type="text"
                    required
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="e.g. 13.0827"
                    className="w-full h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs shadow-inner font-mono font-bold text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Hospital Longitude Coordinates</label>
                  <input
                    type="text"
                    required
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="e.g. 80.2707"
                    className="w-full h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs shadow-inner font-mono font-bold text-zinc-100"
                  />
                </div>
              </div>

               <Button 
                 type="submit" 
                 disabled={loading || isUnverifiedHospital} 
                 className="w-full mt-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider h-10 shadow-lg shadow-rose-950/20"
               >
                 {loading 
                   ? "Syncing Routing Engine..." 
                   : isUnverifiedHospital 
                     ? "DISPATCH LOCKED (VERIFICATION REQUIRED)" 
                     : "Broadcast Request & Dispatch"
                 }
               </Button>
             </form>
          </div>
        </div>

        {/* RIGHT: Live Cascade Pre-Flight Analysis */}
        <div className="md:col-span-5 space-y-6">
          <div className="border border-zinc-800 rounded-xl relative overflow-hidden bg-zinc-900/10 p-6">
            <div className="absolute top-[-10px] right-[-10px] h-20 w-20 rounded-full bg-rose-500/5 blur-xl pointer-events-none" />
            
            <div className="border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-rose-500 animate-pulse" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Cascade Pre-Flight</h3>
              </div>
              <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest mt-1">Audit target: {bloodType} group</p>
            </div>

            <div className="space-y-4 text-xs">
              {forecastLoading ? (
                <div className="text-center py-6 text-[10px] text-zinc-500 uppercase tracking-widest font-mono animate-pulse">Querying regional stock registries...</div>
              ) : forecast ? (
                <>
                  {/* Status Flag */}
                  <div className={`p-3 rounded-lg border flex items-start gap-2 ${
                    forecast.tier === "critical" 
                      ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
                      : forecast.tier === "watch"
                        ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
                        : "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                  }`}>
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold uppercase text-[9px] tracking-wider">Stock risk level:</h5>
                      <p className="mt-0.5 font-extrabold text-[11px] uppercase tracking-wider">{forecast.tierLabel}</p>
                    </div>
                  </div>

                  {/* Supply Stats */}
                  <div className="grid grid-cols-2 gap-3 text-center font-mono">
                    <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/40">
                      <p className="text-base font-black text-zinc-100">{forecast.bankInventoryUnits}</p>
                      <p className="text-[8px] text-zinc-500 uppercase tracking-wider mt-0.5">Bank Stock (U)</p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/40">
                      <p className="text-base font-black text-zinc-100">{forecast.eligibleDonorCount}</p>
                      <p className="text-[8px] text-zinc-500 uppercase tracking-wider mt-0.5">Eligible Donors</p>
                    </div>
                  </div>

                  {/* Cascade routing projection */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-850">
                    <h5 className="font-bold text-zinc-400 uppercase tracking-wider text-[9px]">Routing Strategy</h5>
                    <p className="text-zinc-400 leading-relaxed font-medium text-[11px]">
                      {forecast.bankInventoryUnits >= unitsNeeded ? (
                        <span className="text-emerald-500 font-semibold">
                          ✓ Sufficient bank stock found. System will bypass donor dispatches and route pickup tasks to recommended repositories directly.
                        </span>
                      ) : (
                        <span className="text-rose-500 font-semibold">
                          ⚠ Stock deficit of {unitsNeeded - forecast.bankInventoryUnits} units detected. Platform will fallback to donor network broadcast and SMS outreach.
                        </span>
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Enter GPS parameters to enable pre-flight projection.</div>
              )}

              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1 font-bold text-rose-500">
                  <Sparkles className="h-3 w-3" /> Spatial Forecast
                </span>
                <span>Radius: 50 KM</span>
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 text-[10px] text-zinc-400 flex items-start gap-2.5 leading-relaxed font-medium">
            <HelpCircle className="h-4 w-4 text-zinc-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-zinc-300 uppercase tracking-wider">Gated creation:</span> This interface is restricted to verified requester accounts. Verify institution credentials inside the Tactical Command Center to grant instant access.
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
