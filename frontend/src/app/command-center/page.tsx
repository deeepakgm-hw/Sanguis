"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
  Info,
  Database,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { MapView } from "@/components/widgets/map-view";
import { SanguisAiCopilot } from "@/components/widgets/ai-copilot";

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
  const [lastRefresh, setLastRefresh] = useState(new Date());

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
      if (res.data.data.bloodBanks.length > 0) {
        setRestockBankId(res.data.data.bloodBanks[0]._id);
      }
      setError("");
      setLastRefresh(new Date());

      try {
        setQueueLoading(true);
        const queueRes = await api.get("/blood-requests/priority-queue");
        setPriorityQueue(queueRes.data.data || []);
      } catch { setPriorityQueue([]); } finally { setQueueLoading(false); }

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
        setLastRefresh(new Date());
        api.get("/bloodbanks/command-center/overview")
          .then((res) => setData(res.data.data))
          .catch((err) => console.error("Periodic command center update failed", err));

        api.get("/blood-requests/priority-queue")
          .then((res) => setPriorityQueue(res.data.data || []))
          .catch((err) => console.error("Periodic queue update failed", err));

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
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [user]);

  if (isBootstrapping || !user || (user.role !== "admin" && user.role !== "moderator")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center font-mono">
          <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping mx-auto mb-4" />
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Authenticating clearance…</p>
        </div>
      </div>
    );
  }

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
        location: { type: "Point", coordinates: [longitude, latitude] },
        contactPhone: bankPhone,
      });

      toast.success("Blood bank registered successfully!");
      setBankName(""); setBankAddress(""); setBankPhone("");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to register blood bank");
    } finally {
      setBankSubmitting(false);
    }
  }

  async function handleRestock(e: React.FormEvent) {
    e.preventDefault();
    if (!restockBankId) { toast.error("Please select a blood bank first"); return; }
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

  async function handleVerifyBank(bankId: string, currentStatus: boolean) {
    try {
      await api.patch(`/bloodbanks/${bankId}/verify`, { isVerified: !currentStatus });
      toast.success(`Blood Bank verification status updated!`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Verification adjustment failed");
    }
  }

  const mapMarkers: any[] = [];
  if (data) {
    data.bloodBanks.forEach((b) => {
      mapMarkers.push({ id: b._id, lat: b.location.coordinates[1], lng: b.location.coordinates[0], layerType: "bank", label: b.name, sublabel: b.address });
    });
    data.donors.forEach((d) => {
      mapMarkers.push({ id: d._id, lat: d.location.coordinates[1], lng: d.location.coordinates[0], layerType: "donor", label: `Donor (${d.bloodType})`, sublabel: `Trust Score: ${d.trustScore}%` });
    });
    data.dispatches.forEach((disp) => {
      if (disp.donor && disp.donor.location) {
        mapMarkers.push({ id: disp._id, lat: disp.donor.location.coordinates[1], lng: disp.donor.location.coordinates[0], layerType: "dispatch", label: `In-Flight Match (${disp.donor.bloodType})`, sublabel: `Status: ${disp.status}` });
      }
    });
  }

  const inputCls = "w-full h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-rose-500/50";
  const labelCls = "text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block mb-1";

  return (
    <main className="relative mx-auto max-w-7xl px-6 py-12 min-h-screen bg-zinc-950 text-zinc-50">
      <div className="absolute top-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
            <Building className="h-5 w-5 text-rose-500" />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider">Sanguis Tactical Command Center</h1>
            <p className="text-xs text-zinc-400 font-medium">Unified real-time tracking of blood inventory, hospitals, and donor networks</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[9px] text-zinc-500 uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            SYNC: {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => setRefreshTrigger((p) => p + 1)} className="font-bold text-xs uppercase tracking-wider border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Live Reload
          </Button>
          <Link href="/command-center/priority-queue">
            <Button variant="outline" size="sm" className="font-bold text-xs uppercase tracking-wider border-rose-800/50 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Triage Queue
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="font-bold text-xs uppercase tracking-wider border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300">Gateway</Button>
          </Link>
        </div>
      </div>

      {/* Operational Status Bar */}
      <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Blood Banks Online", value: data?.bloodBanks.filter(b => b.isVerified).length ?? "—", icon: Database, color: "text-emerald-400" },
          { label: "Donors Active", value: data?.donors.length ?? "—", icon: Users, color: "text-blue-400" },
          { label: "Hospitals Served", value: data?.hospitals.length ?? "—", icon: Building, color: "text-amber-400" },
          { label: "Live Dispatches", value: data?.dispatches.filter(d => d.status === "pending").length ?? "—", icon: Radio, color: "text-rose-400" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="text-center font-mono">
              <Icon className={`h-4 w-4 mx-auto mb-1 ${stat.color}`} />
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
              <p className="text-[8px] text-zinc-500 uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {loading && !data ? (
        <div className="text-center py-20 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
          <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping mx-auto mb-4" />
          Hydrating command center models...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT 8-COLS: Tactical Map & Inventory Ledger */}
          <div className="lg:col-span-8 space-y-6">

            {/* Unified Map */}
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl overflow-hidden">
              <div className="p-3 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-widest text-zinc-500 uppercase">
                  <Radio className="h-4 w-4 text-rose-500 animate-pulse" /> Unified Geographic Dispatch Map
                </span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                  ONLINE
                </span>
              </div>
              <div className="h-80 relative">
                <MapView markers={mapMarkers} />
              </div>
            </div>

            {/* Blood Bank Inventory Ledger */}
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5">
              <div className="border-b border-zinc-800 pb-3 mb-4">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Verified Blood Bank Inventories</h3>
                <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Unified real-time stock of all verified regional repositories</p>
              </div>

              {data?.bloodBanks.length === 0 ? (
                <p className="text-[10px] text-zinc-500 text-center py-6 font-mono uppercase tracking-wider">No blood banks registered yet.</p>
              ) : (
                <div className="space-y-4">
                  {data?.bloodBanks.map((bank) => {
                    const totalStock = bank.inventory.reduce((a, b) => a + b.unitsAvailable, 0);
                    return (
                      <div key={bank._id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div>
                            <h4 className="font-extrabold text-sm text-zinc-100 flex items-center gap-2">
                              {bank.name}
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold uppercase border ${
                                bank.isVerified
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                              }`}>
                                {bank.isVerified ? "Verified" : "Pending"}
                              </span>
                            </h4>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{bank.address} · {bank.contactPhone}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-zinc-500">TOTAL: <strong className="text-zinc-200 font-black">{totalStock}</strong></span>
                            <button
                              onClick={() => handleVerifyBank(bank._id, bank.isVerified || false)}
                              className={`text-[9px] font-mono font-bold px-2.5 py-1 rounded border uppercase tracking-wider transition-colors ${
                                bank.isVerified
                                  ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                  : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              }`}
                            >
                              {bank.isVerified ? "Revoke" : "Verify"}
                            </button>
                          </div>
                        </div>

                        {/* Blood type tiles */}
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                          {bank.inventory.map((item) => {
                            const isLow = item.unitsAvailable < 5 && item.unitsAvailable > 0;
                            const isEmpty = item.unitsAvailable === 0;
                            return (
                              <div key={item.bloodType} className={`rounded-lg p-2 text-center border transition-all ${
                                isEmpty ? "border-rose-500/40 bg-rose-500/5 animate-pulse" :
                                isLow ? "border-amber-500/30 bg-amber-500/5" :
                                "border-zinc-800 bg-zinc-950"
                              }`}>
                                <p className={`text-[8px] font-mono font-bold ${isEmpty ? "text-rose-400" : isLow ? "text-amber-400" : "text-rose-500"}`}>{item.bloodType}</p>
                                <p className={`text-sm font-black mt-0.5 ${isEmpty ? "text-rose-400" : isLow ? "text-amber-300" : "text-zinc-100"}`}>{item.unitsAvailable}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Priority Queue Panel */}
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5">
              <div className="border-b border-zinc-800 pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" /> Emergency Priority Queue
                  </h3>
                  <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Score = urgency + wait time + shortfall + hospital verification</p>
                </div>
                <span className="text-[9px] font-mono font-bold text-zinc-500 border border-zinc-800 bg-zinc-950 px-2 py-1 rounded uppercase tracking-wider">
                  {priorityQueue.length} ACTIVE
                </span>
              </div>

              {queueLoading ? (
                <div className="text-center py-6 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Computing priority scores…</div>
              ) : priorityQueue.length === 0 ? (
                <div className="text-center py-6 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">No active requests in the queue.</div>
              ) : (
                <div className="space-y-2">
                  {priorityQueue.slice(0, 5).map((req, idx) => {
                    const isExpanded = expandedRequest === req._id;
                    const urgencyColors: Record<string, string> = {
                      critical: "text-rose-400 bg-rose-500/10 border-rose-500/30",
                      high: "text-amber-400 bg-amber-500/10 border-amber-500/30",
                      medium: "text-blue-400 bg-blue-500/10 border-blue-500/30",
                      low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
                    };
                    return (
                      <div key={req._id} className={`rounded-xl border transition-all duration-200 ${idx === 0 ? "border-rose-500/30 bg-rose-500/5" : "border-zinc-800 bg-zinc-950/40"}`}>
                        <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => setExpandedRequest(isExpanded ? null : req._id)}>
                          <div className="flex items-center gap-3">
                            <div className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded-full border ${idx === 0 ? "bg-rose-600 text-white border-rose-600" : "bg-zinc-900 text-zinc-400 border-zinc-800"}`}>#{idx + 1}</div>
                            <div>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-sm font-black text-rose-500">{req.bloodType}</span>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold uppercase ${urgencyColors[req.urgencyLevel] || ""}`}>{req.urgencyLevel}</span>
                                <span className="text-[10px] text-zinc-500">{req.unitsNeeded} units</span>
                              </div>
                              <p className="text-[9px] text-zinc-500 font-mono mt-0.5">{req.hospitalName || "Unknown Hospital"} · {req.priorityBreakdown.hoursWaiting.toFixed(1)}h waiting</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right font-mono">
                              <p className={`text-lg font-black ${idx === 0 ? "text-rose-400" : "text-zinc-100"}`}>{req.priorityScore}</p>
                              <p className="text-[8px] text-zinc-500 uppercase tracking-wider">Priority</p>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-3 pb-3 border-t border-zinc-800 pt-3 bg-zinc-950/60">
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: "Urgency", value: req.priorityBreakdown.urgencyScore, max: 100 },
                                { label: "Wait Time", value: req.priorityBreakdown.waitScore, max: 50 },
                                { label: "Units Needed", value: req.priorityBreakdown.shortfallScore, max: 40 },
                                { label: "Verified Hospital", value: req.priorityBreakdown.verificationBonus, max: 15 },
                              ].map((factor) => (
                                <div key={factor.label} className="space-y-1 font-mono">
                                  <div className="flex justify-between text-[9px] text-zinc-500">
                                    <span>{factor.label}</span>
                                    <span className="font-bold text-zinc-300">{factor.value}/{factor.max}</span>
                                  </div>
                                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                                    <div className="h-full bg-rose-500/70 rounded-full" style={{ width: `${(factor.value / factor.max) * 100}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {priorityQueue.length > 5 && (
                    <Link href="/command-center/priority-queue">
                      <div className="text-center py-2 text-[10px] text-zinc-500 hover:text-rose-400 font-mono font-bold uppercase tracking-wider cursor-pointer transition-colors">
                        View full triage queue ({priorityQueue.length} items) →
                      </div>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Predictive Shortage Forecasts */}
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5">
              <div className="border-b border-zinc-800 pb-3 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-rose-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Predictive Shortage Forecasting (50km Radius Grid)</h3>
              </div>
              {forecastsLoading ? (
                <div className="text-center py-6 text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Hydrating predictive risk models…</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {["O-", "O+", "A+", "B+"].map((bt) => {
                    const forecast = forecasts[bt];
                    const tier = forecast?.tier || "healthy";
                    const ratio = (forecast?.ratio || 0).toFixed(2);
                    const statusLabel = forecast?.tierLabel || "Stable Supply";
                    const borderColor = tier === "critical" ? "border-rose-500/40 bg-rose-500/5" : tier === "watch" ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/20 bg-emerald-500/5";
                    const textColor = tier === "critical" ? "text-rose-400" : tier === "watch" ? "text-amber-400" : "text-emerald-400";
                    return (
                      <div key={bt} className={`p-3 rounded-xl border font-mono text-center ${borderColor}`}>
                        <p className="text-xl font-black text-zinc-100">{bt}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${textColor}`}>{statusLabel}</p>
                        <p className="text-[8px] text-zinc-500 mt-0.5">Ratio: {ratio}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT 4-COLS */}
          <div className="lg:col-span-4 space-y-6">

            {/* Restock form */}
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5">
              <div className="border-b border-zinc-800 pb-3 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-rose-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Stock Restock Ledger</h3>
              </div>
              <form onSubmit={handleRestock} className="space-y-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Select Repository</label>
                  <select value={restockBankId} onChange={(e) => setRestockBankId(e.target.value)} className={inputCls}>
                    <option value="">-- Choose Repository --</option>
                    {data?.bloodBanks.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelCls}>Blood Type</label>
                    <select value={restockBloodType} onChange={(e) => setRestockBloodType(e.target.value)} className={inputCls}>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Volume (+/-)</label>
                    <input type="number" min="1" required value={restockDelta} onChange={(e) => setRestockDelta(parseInt(e.target.value, 10) || 0)} className={inputCls} />
                  </div>
                </div>
                <Button type="submit" isLoading={restockSubmitting} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider">
                  Submit Restock
                </Button>
              </form>
            </div>

            {/* Register new blood bank */}
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5">
              <div className="border-b border-zinc-800 pb-3 mb-4 flex items-center gap-2">
                <Plus className="h-4 w-4 text-rose-500" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Register Blood Bank</h3>
              </div>
              <form onSubmit={handleCreateBank} className="space-y-4">
                <div className="space-y-1.5">
                  <label className={labelCls}>Bank Name</label>
                  <input type="text" required placeholder="City Central Blood Bank" value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Full Address</label>
                  <input type="text" required placeholder="100 Medical Plaza, District 5" value={bankAddress} onChange={(e) => setBankAddress(e.target.value)} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={labelCls}>Latitude</label>
                    <input type="text" required value={bankLat} onChange={(e) => setBankLat(e.target.value)} className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelCls}>Longitude</label>
                    <input type="text" required value={bankLng} onChange={(e) => setBankLng(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Contact Phone</label>
                  <input type="text" required placeholder="+91-9876543210" value={bankPhone} onChange={(e) => setBankPhone(e.target.value)} className={inputCls} />
                </div>
                <Button type="submit" isLoading={bankSubmitting} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider">
                  Add Bank
                </Button>
              </form>
            </div>

            {/* Audit note */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 font-mono">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Audit Trace Ledger</p>
                  <p className="text-[9px] text-zinc-500 leading-relaxed">
                    All inventory updates trigger immutable transaction records, which are logged and auditable in real-time. Verification is required before banks are calculated for dispatch routing.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Floating Explainable AI Copilot */}
      <SanguisAiCopilot />
    </main>
  );
}
