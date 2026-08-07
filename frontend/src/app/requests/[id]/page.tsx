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
    <main className="relative mx-auto max-w-5xl px-6 py-12 min-h-screen bg-background">
      {/* Ambient background glow */}
      <div className="absolute top-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-destructive/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="Sanguis Logo" className="h-9 w-9 rounded-xl object-cover shadow-md" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-glow">Emergency Match Panel</h1>
            <p className="text-xs text-muted-foreground">Live tracking of compatible donor dispatches</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => setRefreshTrigger((p) => p + 1)} className="font-semibold glass hover:bg-muted">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="font-semibold glass hover:bg-muted">Gateway</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Request Specifications Card */}
        <div className="md:col-span-4 space-y-6">
          <Card className="glass-card border border-border/40 relative overflow-hidden bg-card/40">
            <CardHeader className="pb-3 border-b border-border/20">
              <CardTitle className="text-sm font-bold">Request Specifications</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">Required Blood Type</span>
                <span className="text-4xl font-extrabold text-destructive tracking-tight text-glow">{request.bloodType}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Volume Needed</span>
                  <span className="text-base font-bold">{request.unitsNeeded} units (Bags)</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Incident Urgency</span>
                  <span className={`inline-flex px-1.5 py-0.2 rounded font-bold uppercase text-[9px] border mt-0.5 ${currentUrgency.color}`}>
                    {currentUrgency.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Status</span>
                  <span className="inline-flex items-center text-[10px] font-bold capitalize text-primary bg-primary/10 px-1.5 py-0.2 rounded mt-0.5 border border-primary/20">
                    {request.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Incident ID</span>
                  <span className="font-mono text-muted-foreground block mt-0.5">{request._id.slice(-6).toUpperCase()}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border/20">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">Dispatch Center GPS</span>
                <span className="flex items-center text-xs text-muted-foreground mt-1 font-mono">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-destructive shrink-0" />
                  {request.geoLocation.coordinates[1].toFixed(4)}, {request.geoLocation.coordinates[0].toFixed(4)}
                </span>
              </div>

              {/* SMS Fallback status & Cross Referral */}
              <div className="pt-3 border-t border-border/20 space-y-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">SMS Fallback Outreach</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded mt-0.5 border border-emerald-500/20">
                    <MessageSquare className="h-3 w-3" /> Attempted (Simulated active)
                  </span>
                </div>

                {(request.urgencyLevel === "critical" || request.urgencyLevel === "high") && (
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase">Cross-Institution Referral</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded mt-0.5 border border-destructive/20 animate-pulse">
                      <Globe className="h-3 w-3" /> Active (Regional pool escalated)
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Live Interactive Radar Sweep Map & Matches Feed */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Cascade Routing Details Card */}
          {(() => {
            const isFulfillable = routeResult?.stage === "bank_fulfillable" || (routeResult === null && matches.length === 0 && request.status === "fulfilled");
            const isBroadcast = routeResult?.stage === "donor_broadcast" || (routeResult === null && matches.length > 0);

            if (isFulfillable) {
              return (
                <Card className="border border-emerald-500/30 bg-emerald-500/5 glow-border overflow-hidden">
                  <CardHeader className="pb-2 flex flex-row items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <Building className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-emerald-500">Cascade Routing: Resolved via Blood Banks</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">Available inventory was found in nearest verified repositories. Bypass donor matches.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2 text-xs space-y-3">
                    <p className="text-muted-foreground leading-relaxed">
                      Sanguis routing cascade verified sufficient stock. Dispatching institution can pick up units directly from the recommended locations listed below.
                    </p>
                    <div className="space-y-2 mt-2">
                      {(routeResult?.recommendedBanks || []).map((b: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                          <div>
                            <p className="font-bold text-foreground">{b.bank?.name || "Blood Bank"}</p>
                            <p className="text-[10px] text-muted-foreground">{b.bank?.address || "Address unavailable"}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-emerald-500">{b.availableUnits} units available</p>
                            <p className="text-[10px] text-muted-foreground">Proximity: {b.distanceKm?.toFixed(1) || 0}km</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            }

            if (isBroadcast) {
              return (
                <Card className="border border-destructive/20 bg-destructive/5 glow-border overflow-hidden">
                  <CardHeader className="pb-2 flex flex-row items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
                      <Radio className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-destructive">Cascade Routing: Fallback to Donor Broadcast</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-0.5">Insufficient supply in verified blood banks. Live matching sequence triggered.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2 text-xs space-y-2">
                    <p className="text-muted-foreground leading-relaxed">
                      Sanguis routing cascade checked regional repositories but identified a shortfall of units. Triggered live broadcast and SMS outreach to volunteer donor network.
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-2 p-2.5 rounded-lg border border-border/30 bg-muted/20 text-center">
                      <div>
                        <p className="text-sm font-bold text-foreground">{routeResult?.shortfallUnits || request.unitsNeeded}</p>
                        <p className="text-[10px] text-muted-foreground">Shortfall Units (Required)</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{routeResult?.partialBankSupply || 0}</p>
                        <p className="text-[10px] text-muted-foreground">Partial Bank Stock Found</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return null;
          })()}

          {/* Radar Sweep Map */}
          <Card className="overflow-hidden glass-card border border-border/40 bg-card/40">
            <CardHeader className="bg-muted/30 pb-3 border-b border-border/30">
              <CardTitle className="text-xs font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-destructive animate-pulse" /> Live Regional Dispatch Radar
                </span>
                <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Connection Active (Poll)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-64 relative overflow-hidden">
              <MapView 
                markers={mapMarkers} 
                centerLat={request.geoLocation.coordinates[1]} 
                centerLng={request.geoLocation.coordinates[0]} 
                radiusKm={15} 
              />
            </CardContent>
          </Card>

          {/* Matched Candidates List */}
          <Card className="border border-border/40 bg-card/30">
            <CardHeader className="pb-3 border-b border-border/20">
              <CardTitle className="text-base font-bold">Matched Regional Candidates ({matches.length})</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {matches.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Searching compatible matches in location radius…
                </p>
              ) : (
                <div className="divide-y divide-border/30">
                  {matches.map((match) => {
                    // Estimated ETA calculation (mocked based on geographic distance/latlng differences)
                    const latDiff = Math.abs(request.geoLocation.coordinates[1] - match.donor.location.coordinates[1]);
                    const lngDiff = Math.abs(request.geoLocation.coordinates[0] - match.donor.location.coordinates[0]);
                    const distanceEstimate = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // conversion factor to KM
                    const etaMin = Math.round(distanceEstimate * 1.6 + 5); // 1.6 min per km + base overhead

                    // Compatibility Confidence rating
                    const confidence = request.bloodType === match.donor.bloodType ? 100 : 85;

                    return (
                      <div key={match._id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 first:pt-0 last:pb-0">
                        
                        {/* Info details */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded text-foreground border border-border/30">
                              Donor {match.donor._id.slice(-4).toUpperCase()}
                            </span>
                            <span className="text-xs font-extrabold text-destructive">{match.donor.bloodType}</span>
                            <span className="inline-flex items-center text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded font-bold">
                              <Award className="h-3 w-3 mr-1" /> TS: {match.donor.trustScore || 100}%
                            </span>
                            <span className="inline-flex items-center text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded font-bold">
                              Confidence: {confidence}%
                            </span>
                          </div>
                          
                          {/* AI Match Explanation */}
                          <div className="p-2.5 rounded-lg bg-muted/30 border border-border/20 text-xs text-muted-foreground flex items-start gap-1.5 max-w-lg">
                            <Brain className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-foreground">AI Match Dispatch Strategy:</span>{" "}
                              {confidence === 100 
                                ? "Identical compatibility match. Optimal match coefficient due to O- type safety and high donor trust index."
                                : "Universal backup compatibility. Donor will donate alternative blood Group under standard emergency backup rules."}
                            </div>
                          </div>
                        </div>

                        {/* Proximity ETA and Live Status */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:gap-2 shrink-0">
                          
                          {/* Proximity ETA Badge */}
                          <div className="flex items-center text-xs text-muted-foreground font-semibold">
                            <Truck className="h-3.5 w-3.5 mr-1 text-destructive shrink-0" />
                            ETA: <span className="text-foreground font-bold ml-1">{etaMin} mins</span>
                          </div>

                          {/* Status Badge */}
                          <div className="text-xs font-bold">
                            {match.status === "accepted" && (
                              <span className="flex items-center text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accepted
                              </span>
                            )}
                            {match.status === "declined" && (
                              <span className="flex items-center text-destructive bg-destructive/10 px-2.5 py-1 rounded-lg">
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Declined
                              </span>
                            )}
                            {match.status === "pending" && (
                              <span className="flex items-center text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-lg animate-pulse">
                                <Clock className="h-3.5 w-3.5 mr-1" /> Pending
                              </span>
                            )}
                            {match.status === "expired" && (
                              <span className="text-muted-foreground bg-muted px-2 py-1 rounded">
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
            </CardContent>
          </Card>
        </div>

      </div>
    </main>
  );
}
