"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Award, 
  Brain, 
  Clock, 
  Activity, 
  Radio, 
  Truck,
  Sparkles,
  Globe,
  MessageSquare,
  Building,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { MapView, MapMarker } from "@/components/widgets/map-view";

interface BloodRequestDetail {
  _id: string;
  bloodType: string;
  unitsNeeded: number;
  urgencyLevel: "low" | "medium" | "high" | "critical";
  status: "open" | "matched" | "fulfilled" | "cancelled" | "expired";
  geoLocation: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  createdAt: string;
}

interface MatchDetail {
  _id: string;
  status: "pending" | "accepted" | "declined" | "expired";
  donor: {
    _id: string;
    bloodType: string;
    trustScore: number;
    location: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  respondedAt: string | null;
}

function useMatchBroadcast(requestId: string, onUpdate: () => void) {
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    // 5-second polling fallback (standard robust safety net)
    intervalRef.current = setInterval(() => {
      onUpdate();
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [requestId, onUpdate]);
}

export default function BloodRequestDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);

  const [request, setRequest] = useState<BloodRequestDetail | null>(null);
  const [matches, setMatches] = useState<MatchDetail[]>([]);
  const [routeResult, setRouteResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load routing result from sessionStorage if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(`sanguis_route_result_${params.id}`);
      if (stored) {
        try {
          setRouteResult(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [params.id]);

  // Authenticated route guard
  useEffect(() => {
    if (!isBootstrapping && !user) router.replace("/login");
  }, [isBootstrapping, user, router]);

  // Load request and match details
  const fetchData = async () => {
    try {
      const [reqRes, matchRes] = await Promise.all([
        api.get(`/blood-requests/${params.id}`),
        api.get(`/matches?requestId=${params.id}`),
      ]);
      setRequest(reqRes.data.data);
      setMatches(matchRes.data.data || []);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load request details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [params.id, user, refreshTrigger]);

  // Subscribes matching hook (polling/socket fallback)
  useMatchBroadcast(params.id, () => {
    setRefreshTrigger((prev) => prev + 1);
  });

  if (isBootstrapping || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground bg-background">Loading…</div>;
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground bg-background">Loading emergency command panel…</div>;
  }

  if (error || !request) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12 min-h-screen bg-background">
        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl font-semibold mb-4 text-xs">
          {error || "Blood request not found."}
        </div>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </main>
    );
  }

  // Helper calculations for visual metrics
  const urgencyTiers: Record<string, { label: string; color: string; ring: string }> = {
    low: { label: "Low Priority", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", ring: "border-blue-500" },
    medium: { label: "Medium Urgency", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", ring: "border-amber-500" },
    high: { label: "High Emergency", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", ring: "border-orange-500" },
    critical: { label: "Critical Priority One", color: "bg-destructive/10 text-destructive border-destructive/20", ring: "border-destructive" },
  };

  const currentUrgency = urgencyTiers[request.urgencyLevel] || urgencyTiers.medium;

  // Convert recommended blood banks into markers
  const bankMarkers = (routeResult?.recommendedBanks || []).map((b: any) => ({
    id: b.bank?._id || Math.random().toString(),
    lat: b.bank?.location?.coordinates[1] || request.geoLocation.coordinates[1],
    lng: b.bank?.location?.coordinates[0] || request.geoLocation.coordinates[0],
    layerType: "bank" as "bank" | "hospital" | "donor" | "dispatch",
    label: `Recommended Repository: ${b.bank?.name || "Blood Bank"}`,
    sublabel: `Units Available: ${b.availableUnits} · Distance: ${b.distanceKm?.toFixed(1) || 0}km`,
  }));

  // Convert matches into map markers
  const mapMarkers: MapMarker[] = [
    ...matches.map((m) => ({
      id: m._id,
      lat: m.donor.location.coordinates[1],
      lng: m.donor.location.coordinates[0],
      layerType: m.status === "accepted" ? "hospital" : (m.status === "declined" ? "donor" : "dispatch"),
      label: `Donor (${m.donor.bloodType})`,
      sublabel: `Status: ${m.status} · Trust Score: ${m.donor.trustScore}%`,
    })),
    ...bankMarkers
  ];

  return (
    <main className="relative mx-auto max-w-5xl px-6 py-12 min-h-screen bg-zinc-950 text-zinc-50">
      {/* Ambient background glow */}
      <div className="absolute top-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-rose-500/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Sanguis Logo" className="h-9 w-9 rounded-xl object-cover shadow-md border border-zinc-800" />
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-glow">Emergency Match Panel</h1>
            <p className="text-xs text-zinc-400 font-medium">Real-time coordinate dispatches and candidate tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => setRefreshTrigger((p) => p + 1)} className="font-bold text-xs uppercase tracking-wider border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="font-bold text-xs uppercase tracking-wider border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300">Gateway</Button>
          </Link>
        </div>
      </div>

      {/* Dispatch Stepper */}
      <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-4 mb-4 font-mono text-[9px] tracking-widest text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" /> DISPATCH STATE: LIVE COORDINATION</span>
          <span>DISPATCH_ID: {request._id.toUpperCase()}</span>
        </div>
        
        <div className="grid grid-cols-5 gap-2 relative">
          {[
            { id: 1, label: "CASCADE AUDIT", desc: "Inventory check", active: true, done: true },
            { id: 2, label: "SMS BROADCAST", desc: "Donor pool outreach", active: matches.length > 0 || request.status === "open", done: request.status === "fulfilled" || matches.some(m => m.status === "accepted") },
            { id: 3, label: "MATCH SECURED", desc: "Volunteer verified", active: matches.some(m => m.status === "accepted"), done: request.status === "fulfilled" },
            { id: 4, label: "COURIER ROUTE", desc: "Transit ETA monitor", active: matches.some(m => m.status === "accepted") && request.status !== "fulfilled", done: request.status === "fulfilled" },
            { id: 5, label: "DELIVERY COMPLETED", desc: "Fulfillment audit", active: request.status === "fulfilled", done: request.status === "fulfilled" }
          ].map((step) => {
            const isActive = step.active;
            const isDone = step.done;
            return (
              <div key={step.id} className="relative z-10 text-center font-mono">
                <div className={`mx-auto h-7 w-7 rounded-full flex items-center justify-center border text-[10px] font-bold transition-all ${
                  isDone 
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                    : isActive 
                      ? "bg-rose-500/10 border-rose-500 text-rose-400 animate-pulse"
                      : "bg-zinc-950 border-zinc-850 text-zinc-650"
                }`}>
                  {isDone ? "✓" : step.id}
                </div>
                <p className={`text-[8px] font-black uppercase mt-2 tracking-wider ${isActive || isDone ? "text-zinc-100" : "text-zinc-600"}`}>{step.label}</p>
                <p className="text-[7px] text-zinc-500 mt-0.5 tracking-wide">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Request Specifications Card */}
        <div className="md:col-span-4 space-y-6">
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5">
            <div className="border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Incident Specifications</h3>
            </div>
            
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-bold font-mono">Target Blood Group</span>
                <span className="text-4xl font-black text-rose-500 tracking-tight text-glow">{request.bloodType}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-zinc-500 block font-bold font-mono uppercase tracking-wider">Volume Needed</span>
                  <span className="text-sm font-bold text-zinc-200 mt-0.5 block">{request.unitsNeeded} units (Bags)</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block font-bold font-mono uppercase tracking-wider">Urgency Tier</span>
                  <span className={`inline-flex px-2 py-0.5 rounded font-mono font-bold uppercase text-[8px] border mt-1 ${currentUrgency.color}`}>
                    {currentUrgency.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-zinc-500 block font-bold font-mono uppercase tracking-wider">Operational Status</span>
                  <span className="inline-flex items-center text-[8px] font-mono font-bold uppercase text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded mt-1 border border-rose-500/20">
                    {request.status}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 block font-bold font-mono uppercase tracking-wider">Triage ID</span>
                  <span className="font-mono text-zinc-400 block mt-1">{request._id.slice(-6).toUpperCase()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-850">
                <span className="text-[9px] text-zinc-500 block font-bold font-mono uppercase tracking-wider">Incident GPS Coordinates</span>
                <span className="flex items-center text-xs text-zinc-400 mt-1 font-mono">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-rose-500 shrink-0" />
                  {request.geoLocation.coordinates[1].toFixed(4)}, {request.geoLocation.coordinates[0].toFixed(4)}
                </span>
              </div>

              {/* SMS Fallback status & Cross Referral */}
              <div className="pt-3 border-t border-zinc-850 space-y-2">
                <div>
                  <span className="text-[9px] text-zinc-500 block font-bold font-mono uppercase tracking-wider">Outreach Protocols</span>
                  <span className="inline-flex items-center gap-1 text-[8px] font-mono font-bold uppercase text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded mt-1 border border-emerald-500/20">
                    <MessageSquare className="h-3 w-3" /> SMS Dispatch Sync (Active)
                  </span>
                </div>

                {(request.urgencyLevel === "critical" || request.urgencyLevel === "high") && (
                  <div>
                    <span className="text-[9px] text-zinc-500 block font-bold font-mono uppercase tracking-wider">Cross-Referral Pool</span>
                    <span className="inline-flex items-center gap-1 text-[8px] font-mono font-bold uppercase text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded mt-1 border border-rose-500/20 animate-pulse">
                      <Globe className="h-3 w-3" /> Regional Pool Escalated
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive Radar Sweep Map & Matches Feed */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Cascade Routing Details Card */}
          {(() => {
            const isFulfillable = routeResult?.stage === "bank_fulfillable" || (routeResult === null && matches.length === 0 && request.status === "fulfilled");
            const isBroadcast = routeResult?.stage === "donor_broadcast" || (routeResult === null && matches.length > 0);

            if (isFulfillable) {
              return (
                <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-xl overflow-hidden">
                  <div className="p-4 flex items-center gap-3 border-b border-emerald-500/25">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/25">
                      <Building className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Cascade resolved via blood banks</h4>
                      <p className="text-[9px] text-zinc-400 mt-0.5">Sufficient stock found in verified repositories. Donor dispatches bypassed.</p>
                    </div>
                  </div>
                  <div className="p-4 text-xs space-y-3">
                    <div className="space-y-2 font-mono">
                      {(routeResult?.recommendedBanks || []).map((b: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                          <div>
                            <p className="font-bold text-zinc-200">{b.bank?.name || "Blood Bank"}</p>
                            <p className="text-[9px] text-zinc-500">{b.bank?.address || "Address unavailable"}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-emerald-400">{b.availableUnits} Units Ready</p>
                            <p className="text-[9px] text-zinc-500">Proximity: {b.distanceKm?.toFixed(1) || 0}km</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            if (isBroadcast) {
              return (
                <div className="border border-rose-900/60 bg-rose-950/5 rounded-xl overflow-hidden">
                  <div className="p-4 flex items-center gap-3 border-b border-rose-900/40">
                    <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/25">
                      <Radio className="h-4.5 w-4.5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">Cascade: fallback to donor broadcast</h4>
                      <p className="text-[9px] text-zinc-400 mt-0.5">Deficit in verified blood banks. Live matching sequence active.</p>
                    </div>
                  </div>
                  <div className="p-4 text-xs">
                    <div className="grid grid-cols-2 gap-4 p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/40 text-center font-mono">
                      <div>
                        <p className="text-base font-black text-zinc-100">{routeResult?.shortfallUnits || request.unitsNeeded}</p>
                        <p className="text-[8px] text-zinc-500 uppercase tracking-wider">Shortfall Units (Required)</p>
                      </div>
                      <div>
                        <p className="text-base font-black text-zinc-100">{routeResult?.partialBankSupply || 0}</p>
                        <p className="text-[8px] text-zinc-500 uppercase tracking-wider">Partial Bank Stock Found</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return null;
          })()}

          {/* Radar Sweep Map */}
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-zinc-800 bg-zinc-950/40">
              <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-zinc-500 uppercase font-bold">
                <span className="flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-rose-500 animate-pulse" /> Dispatch radar console
                </span>
                <span className="flex items-center gap-1 font-bold text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Connection Online
                </span>
              </div>
            </div>
            <div className="h-64 relative">
              <MapView 
                markers={mapMarkers} 
                centerLat={request.geoLocation.coordinates[1]} 
                centerLng={request.geoLocation.coordinates[0]} 
                radiusKm={15} 
              />
            </div>
          </div>

          {/* Matched Candidates List */}
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5">
            <div className="border-b border-zinc-800 pb-3 mb-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Matched Regional Candidates ({matches.length})</h3>
            </div>
            
            <div>
              {matches.length === 0 ? (
                <p className="text-[10px] text-zinc-500 py-8 text-center font-mono uppercase tracking-wider">
                  Querying database index for compatible candidates...
                </p>
              ) : (
                <div className="divide-y divide-zinc-850">
                  {matches.map((match) => {
                    const latDiff = Math.abs(request.geoLocation.coordinates[1] - match.donor.location.coordinates[1]);
                    const lngDiff = Math.abs(request.geoLocation.coordinates[0] - match.donor.location.coordinates[0]);
                    const distanceEstimate = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111;
                    const etaMin = Math.round(distanceEstimate * 1.6 + 5);
                    const confidence = request.bloodType === match.donor.bloodType ? 100 : 85;

                    return (
                      <div key={match._id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 first:pt-0 last:pb-0">
                        
                        {/* Info details */}
                        <div className="space-y-1.5 font-mono">
                          <div className="flex items-center gap-2 flex-wrap text-[9px] font-bold">
                            <span className="bg-zinc-950 px-2 py-0.5 rounded text-zinc-300 border border-zinc-800">
                              Donor {match.donor._id.slice(-4).toUpperCase()}
                            </span>
                            <span className="text-rose-500 font-black">{match.donor.bloodType}</span>
                            <span className="inline-flex items-center text-emerald-400 bg-emerald-500/5 px-1.5 py-0.2 rounded border border-emerald-500/25">
                              <Award className="h-3 w-3 mr-1" /> TRUST: {match.donor.trustScore || 100}%
                            </span>
                            <span className="inline-flex items-center text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/25">
                              CONFIDENCE: {confidence}%
                            </span>
                          </div>
                          
                          {/* AI Match Explanation */}
                          <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 text-[10px] text-zinc-400 flex items-start gap-2 max-w-lg leading-relaxed">
                            <Brain className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-zinc-200">ABO Engine:</span>{" "}
                              {confidence === 100 
                                ? "Identical compatibility match. Optimal match coefficient due to O- type safety and high donor trust index."
                                : "Universal backup compatibility. Donor will donate alternative blood Group under standard emergency backup rules."}
                            </div>
                          </div>
                        </div>

                        {/* Proximity ETA and Live Status */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:gap-2 shrink-0 font-mono text-[10px]">
                          
                          {/* Proximity ETA Badge */}
                          <div className="flex items-center text-zinc-400 font-bold">
                            <Truck className="h-3.5 w-3.5 mr-1 text-rose-500 shrink-0" />
                            ETA: <span className="text-zinc-100 font-extrabold ml-1">{etaMin}m</span>
                          </div>

                          {/* Status Badge */}
                          <div className="font-bold">
                            {match.status === "accepted" && (
                              <span className="flex items-center text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded border border-emerald-500/20">
                                <CheckCircle className="h-3.5 w-3.5 mr-1" /> Accepted
                              </span>
                            )}
                            {match.status === "declined" && (
                              <span className="flex items-center text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Declined
                              </span>
                            )}
                            {match.status === "pending" && (
                              <span className="flex items-center text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 animate-pulse">
                                <Clock className="h-3.5 w-3.5 mr-1" /> Pending
                              </span>
                            )}
                            {match.status === "expired" && (
                              <span className="text-zinc-500 bg-zinc-950 border border-zinc-850 px-2.5 py-1 rounded">
                                Expired
                              </span>
                            )}
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
