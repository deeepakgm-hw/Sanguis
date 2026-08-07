"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";
import { 
  Building, 
  Map, 
  Heart, 
  ShieldCheck, 
  Activity, 
  Users, 
  Radio, 
  Plus, 
  ArrowRight,
  RefreshCw,
  Clock,
  TrendingUp,
  FileText,
  AlertTriangle,
  ChevronDown,
  Info
} from "lucide-react";
import Link from "next/link";
import { MapView } from "@/components/widgets/map-view";
import { StatCard } from "@/components/widgets/stat-card";

interface BankDetail {
  _id: string;
  name: string;
  address: string;
  contactPhone: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  inventory: Array<{
    bloodType: string;
    unitsAvailable: number;
    lastRestocked: string;
  }>;
  isVerified?: boolean;
}

interface DonorDetail {
  _id: string;
  bloodType: string;
  trustScore: number;
  location: {
    type: string;
    coordinates: [number, number];
  };
  isEligible: boolean;
}

interface HospitalDetail {
  _id: string;
  name: string;
  email: string;
}

interface DispatchDetail {
  _id: string;
  status: string;
  request: {
    _id: string;
    bloodType: string;
    urgencyLevel: string;
    status: string;
    geoLocation: {
      coordinates: [number, number];
    };
  };
  donor: {
    _id: string;
    bloodType: string;
    trustScore: number;
    location: {
      coordinates: [number, number];
    };
  };
}

export default function CommandCenterPage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    bloodBanks: BankDetail[];
    donors: DonorDetail[];
    hospitals: HospitalDetail[];
    dispatches: DispatchDetail[];
  } | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [priorityQueue, setPriorityQueue] = useState<any[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);

  const [forecasts, setForecasts] = useState<Record<string, any>>({});
  const [forecastsLoading, setForecastsLoading] = useState(false);

  // Form states for creating a new Blood Bank
  const [bankName, setBankName] = useState("");
  const [bankAddress, setBankAddress] = useState("");
  const [bankLat, setBankLat] = useState("13.0827");
  const [bankLng, setBankLng] = useState("80.2707");
  const [bankPhone, setBankPhone] = useState("");
  const [bankSubmitting, setBankSubmitting] = useState(false);

  // Quick restocking state
  const [restockBankId, setRestockBankId] = useState("");
  const [restockBloodType, setRestockBloodType] = useState("O-");
  const [restockDelta, setRestockDelta] = useState(10);
  const [restockSubmitting, setRestockSubmitting] = useState(false);

  // Gated route check
  useEffect(() => {
    if (!isBootstrapping && !user) {
      router.replace("/login");
      return;
    }
    if (user && user.role !== "admin" && user.role !== "moderator") {
      router.replace("/dashboard");
      toast.error("Requires administrative clearance.");
    }
  }, [isBootstrapping, user, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/bloodbanks/command-center/overview");
      setData(res.data.data);
      // Set default bank selection for restock dropdown if banks exist
      if (res.data.data.bloodBanks.length > 0) {
        setRestockBankId(res.data.data.bloodBanks[0]._id);
      }
      setError("");
      try {
        setQueueLoading(true);
        const queueRes = await api.get("/blood-requests/priority-queue");
        setPriorityQueue(queueRes.data.data || []);
      } catch { setPriorityQueue([]); } finally { setQueueLoading(false); }

      // Hydrate regional forecasts
      try {
        setForecastsLoading(true);
        const targetTypes = ["O-", "O+", "A+", "B+"];
        const results: Record<string, any> = {};
        await Promise.all(
          targetTypes.map(async (bt) => {
            try {
              const res = await api.get("/forecast", {
                params: { lat: 13.0827, lng: 80.2707, radiusKm: 50, bloodType: bt },
              });
              results[bt] = res.data.data;
            } catch {
              results[bt] = { tier: "healthy", tierLabel: "Stable Supply", ratio: 3.0 };
            }
          })
        );
        setForecasts(results);
      } catch {
      } finally {
        setForecastsLoading(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load command center overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "moderator")) {
      loadData();
    }
  }, [user, refreshTrigger]);

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "moderator")) {
      const interval = setInterval(() => {
        api.get("/bloodbanks/command-center/overview")
          .then((res) => setData(res.data.data))
          .catch((err) => console.error("Periodic command center update failed", err));
        
        api.get("/blood-requests/priority-queue")
          .then((res) => setPriorityQueue(res.data.data || []))
          .catch((err) => console.error("Periodic queue update failed", err));

        // Periodic forecast refresh
        const targetTypes = ["O-", "O+", "A+", "B+"];
        const results: Record<string, any> = {};
        Promise.all(
          targetTypes.map(async (bt) => {
            try {
              const res = await api.get("/forecast", {
                params: { lat: 13.0827, lng: 80.2707, radiusKm: 50, bloodType: bt },
              });
              results[bt] = res.data.data;
            } catch {
              results[bt] = { tier: "healthy", tierLabel: "Stable Supply", ratio: 3.0 };
            }
          })
        ).then(() => setForecasts(results));
      }, 10000); // 10s interval

      return () => clearInterval(interval);
    }
  }, [user]);

  if (isBootstrapping || !user || (user.role !== "admin" && user.role !== "moderator")) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground bg-background">Authenticating clearance…</div>;
  }

  // Handle register a new blood bank
  async function handleCreateBank(e: React.FormEvent) {
    e.preventDefault();
    setBankSubmitting(true);
    try {
      const latitude = parseFloat(bankLat);
      const longitude = parseFloat(bankLng);
      if (isNaN(latitude) || isNaN(longitude)) throw new Error("GPS coordinates must be valid numbers");

      await api.post("/bloodbanks", {
        name: bankName,
        address: bankAddress,
        location: {
          type: "Point",
          coordinates: [longitude, latitude], // GeoJSON order
        },
        contactPhone: bankPhone,
      });

      toast.success("Blood bank registered successfully!");
      setBankName("");
      setBankAddress("");
      setBankPhone("");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to register blood bank");
    } finally {
      setBankSubmitting(false);
    }
  }

  // Handle Restocking Stock
  async function handleRestock(e: React.FormEvent) {
    e.preventDefault();
    if (!restockBankId) {
      toast.error("Please select a blood bank first");
      return;
    }
    setRestockSubmitting(true);
    try {
      await api.patch(`/bloodbanks/${restockBankId}/inventory`, {
        bloodType: restockBloodType,
        delta: Number(restockDelta),
        reason: "donation_intake",
      });

      toast.success(`Restocked ${restockDelta} units of ${restockBloodType} successfully!`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to adjust stock");
    } finally {
      setRestockSubmitting(false);
    }
  }

  // Handle administrative verification flip
  async function handleVerifyBank(bankId: string, currentStatus: boolean) {
    try {
      await api.patch(`/bloodbanks/${bankId}/verify`, {
        isVerified: !currentStatus,
      });
      toast.success(`Blood Bank verification status updated!`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification adjustment failed");
    }
  }

  // Convert our data into MapMarker interface
  const mapMarkers: any[] = [];
  if (data) {
    data.bloodBanks.forEach((b) => {
      mapMarkers.push({
        id: b._id,
        lat: b.location.coordinates[1],
        lng: b.location.coordinates[0],
        layerType: "bank",
        label: b.name,
        sublabel: b.address,
      });
    });

    data.donors.forEach((d) => {
      mapMarkers.push({
        id: d._id,
        lat: d.location.coordinates[1],
        lng: d.location.coordinates[0],
        layerType: "donor",
        label: `Donor (${d.bloodType})`,
        sublabel: `Trust Score: ${d.trustScore}%`,
      });
    });

    data.dispatches.forEach((disp) => {
      if (disp.donor && disp.donor.location) {
        mapMarkers.push({
          id: disp._id,
          lat: disp.donor.location.coordinates[1],
          lng: disp.donor.location.coordinates[0],
          layerType: "dispatch",
          label: `In-Flight Match (${disp.donor.bloodType})`,
          sublabel: `Status: ${disp.status}`,
        });
      }
    });
  }

  return (
    <main className="relative mx-auto max-w-7xl px-6 py-12 min-h-screen bg-background">
      <div className="absolute top-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-destructive/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-border/40 pb-5">
        <div className="flex items-center gap-2.5">
          <Building className="h-7 w-7 text-destructive" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-glow">Sanguis Tactical Command Center</h1>
            <p className="text-xs text-muted-foreground">Unified real-time tracking of blood inventory, hospitals, and donor networks</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => setRefreshTrigger((p) => p + 1)} className="font-semibold glass hover:bg-muted">
            <RefreshCw className="h-4 w-4 mr-2" /> Live Reload
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="font-semibold glass hover:bg-muted">Gateway</Button>
          </Link>
        </div>
      </div>

      {loading && !data ? (
        <div className="text-center py-20 text-muted-foreground">Hydrating Command Center models...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT 8-COLS: Tactical Map & Inventory Ledger */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Unified Map View Fallback Widget */}
            <Card className="overflow-hidden glass-card border border-border/40 bg-card/40">
              <CardHeader className="bg-muted/30 pb-3 border-b border-border/30">
                <CardTitle className="text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Radio className="h-4 w-4 text-destructive animate-pulse" /> Unified Geographic Dispatch Map (SVG Grid)
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/25 px-2 py-0.5 rounded font-mono">
                    ONLINE
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 h-80 relative overflow-hidden">
                <MapView markers={mapMarkers} />
              </CardContent>
            </Card>

            {/* Inventory Ledger */}
            <Card className="border border-border/40 bg-card/30">
              <CardHeader className="pb-3 border-b border-border/20">
                <CardTitle className="text-base font-bold">Verified Blood Bank Inventories</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Unified real-time stock levels of all verified regional repositories</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {data?.bloodBanks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No blood banks registered yet.</p>
                ) : (
                  <div className="space-y-6">
                    {data?.bloodBanks.map((bank) => {
                      const totalStock = bank.inventory.reduce((a, b) => a + b.unitsAvailable, 0);

                      return (
                        <div key={bank._id} className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <h3 className="font-extrabold text-sm flex items-center gap-2">
                                {bank.name}
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  bank.isVerified 
                                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                                    : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                }`}>
                                  {bank.isVerified ? "Verified" : "Pending Verification"}
                                </span>
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5">{bank.address} · Tel: {bank.contactPhone}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-muted-foreground">Total: <strong className="text-foreground font-bold">{totalStock} units</strong></span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleVerifyBank(bank._id, bank.isVerified || false)}
                                className="text-[10px] font-bold h-7 px-2.5 glass"
                              >
                                {bank.isVerified ? "Revoke Verification" : "Verify Bank"}
                              </Button>
                            </div>
                          </div>

                          {/* Inventory Pill Blocks */}
                          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            {bank.inventory.map((item) => (
                              <div key={item.bloodType} className="border border-border/30 rounded-lg p-2 text-center bg-background/40">
                                <p className="text-xs font-bold text-destructive">{item.bloodType}</p>
                                <p className="text-sm font-extrabold mt-0.5">{item.unitsAvailable}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Priority Queue Panel */}
            <Card className="border border-border/40 bg-card/30">
              <CardHeader className="pb-3 border-b border-border/20">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                    Emergency Priority Queue
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/30">
                    {priorityQueue.length} ACTIVE
                  </span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Open requests ranked by urgency score. Score = urgency + wait time + shortfall + hospital verification.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {queueLoading ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">Computing priority scores…</div>
                ) : priorityQueue.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">No active requests in the queue.</div>
                ) : (
                  <div className="space-y-3">
                    {priorityQueue.map((req, idx) => {
                      const isExpanded = expandedRequest === req._id;
                      const urgencyColors: Record<string, string> = {
                        critical: 'text-destructive bg-destructive/10 border-destructive/30',
                        high: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
                        medium: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
                        low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
                      };
                      return (
                        <div key={req._id}
                          className={`rounded-xl border transition-all duration-200 ${
                            idx === 0 ? 'border-destructive/30 bg-destructive/5' : 'border-border/30 bg-muted/20'
                          }`}>
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer"
                            onClick={() => setExpandedRequest(isExpanded ? null : req._id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${
                                idx === 0 ? 'bg-destructive text-white border-destructive' : 'bg-muted/60 text-muted-foreground border-border/40'
                              }`}>#{idx + 1}</div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground">{req.bloodType}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${urgencyColors[req.urgencyLevel] || ''}`}>
                                    {req.urgencyLevel}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">{req.unitsNeeded} units</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {req.hospitalName || 'Unknown Hospital'} · {req.priorityBreakdown.hoursWaiting.toFixed(1)}h waiting
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className={`text-base font-black ${
                                  idx === 0 ? 'text-destructive' : 'text-foreground'
                                }`}>{req.priorityScore}</p>
                                <p className="text-[9px] text-muted-foreground">PRIORITY</p>
                              </div>
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`} />
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="px-3 pb-3 border-t border-border/20 pt-3">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Score Breakdown</p>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { label: 'Urgency', value: req.priorityBreakdown.urgencyScore, max: 100 },
                                  { label: 'Wait Time', value: req.priorityBreakdown.waitScore, max: 50 },
                                  { label: 'Units Needed', value: req.priorityBreakdown.shortfallScore, max: 40 },
                                  { label: 'Verified Hospital', value: req.priorityBreakdown.verificationBonus, max: 15 },
                                ].map(factor => (
                                  <div key={factor.label} className="space-y-1">
                                    <div className="flex justify-between text-[9px] text-muted-foreground">
                                      <span>{factor.label}</span>
                                      <span className="font-bold text-foreground">{factor.value}/{factor.max}</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden">
                                      <div
                                        className="h-full bg-destructive/70 rounded-full transition-all"
                                        style={{ width: `${(factor.value / factor.max) * 100}%` }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-2">
                                Status: <span className="font-semibold text-foreground capitalize">{req.status}</span> · 
                                Created: {new Date(req.createdAt).toLocaleString()}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Regional Shortage Forecasting Panel */}
            <Card className="border border-border/40 bg-card/30">
              <CardHeader className="pb-3 border-b border-border/20">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-destructive" />
                  Predictive Shortage Forecasting (50km Radius Grid)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Real-time supply forecasting risk matrix across key blood groups computed fresh using active request volume and available donor counts.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {forecastsLoading ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">Hydrating predictive risk models…</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {["O-", "O+", "A+", "B+"].map((bt) => {
                      const forecast = forecasts[bt];
                      const tier = forecast?.tier || "healthy";
                      const ratio = forecast?.ratio || 0;
                      const status = forecast?.tierLabel || "Stable Supply";
                      
                      let icon = Heart;
                      if (tier === "critical") icon = AlertTriangle;
                      else if (tier === "watch") icon = Info;
                      else icon = ShieldCheck;
                      
                      return (
                        <StatCard
                          key={bt}
                          label={`${bt} Forecast Status`}
                          value={status}
                          icon={icon}
                          trend={{
                            value: `Ratio: ${ratio.toFixed(2)}`,
                            direction: tier === "healthy" ? "up" : "down"
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* RIGHT 4-COLS: Register bank form & restock form */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Restock form */}
            <Card className="glass-card border border-border/40 bg-card/40">
              <CardHeader className="pb-3 border-b border-border/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-destructive" /> Stock restock ledger
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Atomically restock inventory parameters via transactions</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleRestock} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Repository</label>
                    <select
                      value={restockBankId}
                      onChange={(e) => setRestockBankId(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs"
                    >
                      <option value="">-- Choose Repository --</option>
                      {data?.bloodBanks.map((b) => (
                        <option key={b._id} value={b._id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Blood type</label>
                      <select
                        value={restockBloodType}
                        onChange={(e) => setRestockBloodType(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs"
                      >
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                          <option key={bt} value={bt}>{bt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Restock Volume</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={restockDelta}
                        onChange={(e) => setRestockDelta(parseInt(e.target.value, 10) || 0)}
                        className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs"
                      />
                    </div>
                  </div>

                  <Button type="submit" isLoading={restockSubmitting} className="w-full bg-destructive hover:bg-destructive/90 text-white font-semibold shadow-lg">
                    Submit Restock
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Register new blood bank form */}
            <Card className="glass-card border border-border/40 bg-card/40">
              <CardHeader className="pb-3 border-b border-border/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Plus className="h-4.5 w-4.5 text-destructive" /> Add blood bank profile
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Register new blood bank in the coordinate grid</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleCreateBank} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Bank Name</label>
                    <input
                      type="text"
                      required
                      placeholder="City Central Blood Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Address</label>
                    <input
                      type="text"
                      required
                      placeholder="100 Medical Plaza, District 5"
                      value={bankAddress}
                      onChange={(e) => setBankAddress(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Latitude</label>
                      <input
                        type="text"
                        required
                        value={bankLat}
                        onChange={(e) => setBankLat(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Longitude</label>
                      <input
                        type="text"
                        required
                        value={bankLng}
                        onChange={(e) => setBankLng(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contact Phone</label>
                    <input
                      type="text"
                      required
                      placeholder="+91-9876543210"
                      value={bankPhone}
                      onChange={(e) => setBankPhone(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs"
                    />
                  </div>

                  <Button type="submit" isLoading={bankSubmitting} className="w-full bg-destructive hover:bg-destructive/90 text-white font-semibold shadow-lg">
                    Add Bank
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Global Assist note */}
            <div className="rounded-xl border border-border/30 bg-muted/30 p-4 text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-foreground">Audit Trace Ledger:</span> All inventory updates trigger immutable transaction records, which are logged and auditable in real-time. Verification is required before banks are calculated for dispatch routing.
              </div>
            </div>
          </div>

        </div>
      )}
    </main>
  );
}
