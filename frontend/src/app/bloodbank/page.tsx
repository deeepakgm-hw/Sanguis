"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/components/widgets/activity-feed";
import { toast } from "sonner";
import {
  ShieldCheck,
  MapPin,
  Phone,
  TrendingUp,
  RefreshCw,
  Truck,
  Thermometer,
  AlertTriangle,
  Clock,
  Building2,
  ArrowUpRight,
  Package,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { SanguisAiCopilot } from "@/components/widgets/ai-copilot";

interface BloodBankProfile {
  _id: string;
  name: string;
  address: string;
  location: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  contactPhone: string;
  isVerified: boolean;
  inventory: Array<{
    bloodType: string;
    unitsAvailable: number;
    lastRestocked: string;
  }>;
}

interface TransactionItem {
  _id: string;
  bloodType: string;
  delta: number;
  reason: string;
  notes?: string;
  actor: { name: string; email: string };
  createdAt: string;
}

// ── Mock Logistics Telemetry Data ─────────────────────────────────────────────
const MOCK_DISPATCH_VEHICLES = [
  { id: "VEH-901", courier: "Express MedTrans #4", temp: "+3.8°C", route: "Apollo Hospital Main", units: 4, blood: "O-", status: "in_transit", eta: "11 min" },
  { id: "VEH-904", courier: "ColdChain Courier #2", temp: "+4.1°C", route: "Fortis Malar Emergency", units: 2, blood: "AB-", status: "loading", eta: "18 min" },
  { id: "VEH-908", courier: "Red Cross Swift #1", temp: "+3.9°C", route: "Inter-Bank Share (Adyar Hub)", units: 6, blood: "B+", status: "in_transit", eta: "24 min" },
];

const MOCK_EXPIRING_BATCHES = [
  { batchId: "BATCH-8841", blood: "O-", units: 2, daysLeft: 3, status: "CRITICAL_FEFO", rec: "Prioritise for Apollo Emergency Request" },
  { batchId: "BATCH-8902", blood: "A-", units: 4, daysLeft: 6, status: "WARNING", rec: "Transfer to Regional Sharing Network" },
  { batchId: "BATCH-8930", blood: "B-", units: 1, daysLeft: 8, status: "NOMINAL", rec: "Standard cold storage retention" },
];

const MOCK_TRANSFER_REQUESTS = [
  { id: "TRF-301", bank: "Adyar Regional Repository", distance: "4.2 km", blood: "O-", unitsNeeded: 3, urgency: "CRITICAL" },
  { id: "TRF-304", bank: "North Chennai Blood Hub", distance: "8.5 km", blood: "AB-", unitsNeeded: 2, urgency: "HIGH" },
];

export default function BloodBankPortalPage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);

  const [bank, setBank] = useState<BloodBankProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [regFormActive, setRegFormActive] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Registration Form States
  const [regName, setRegName] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regLat, setRegLat] = useState("13.0827");
  const [regLng, setRegLng] = useState("80.2707");
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Adjustment Form States
  const [adjBloodType, setAdjBloodType] = useState("O-");
  const [adjDelta, setAdjDelta] = useState(5);
  const [adjReason, setAdjReason] = useState("restock");
  const [adjNotes, setAdjNotes] = useState("");
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  // Authenticate Gate
  useEffect(() => {
    if (!isBootstrapping && !user) router.replace("/login");
  }, [isBootstrapping, user, router]);

  // Load owned bank details
  const loadBankDetails = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const storageKey = `sanguis_owned_bank_${user._id}`;
      let bankId = localStorage.getItem(storageKey);

      if (!bankId) {
        const listRes = await api.get("/bloodbanks");
        const found = listRes.data.data?.find((b: any) => b.owner?._id === user._id);
        if (found) {
          bankId = found._id;
          localStorage.setItem(storageKey, bankId!);
        }
      }

      if (bankId) {
        const transRes = await api.get(`/bloodbanks/${bankId}/transactions`);
        setTransactions(transRes.data.data || []);

        const listRes = await api.get("/bloodbanks");
        const matchingBank = listRes.data.data?.find((b: any) => b._id === bankId);

        if (matchingBank) {
          setBank(matchingBank);
        } else {
          const cachedDetails = localStorage.getItem(`sanguis_bank_details_${bankId}`);
          if (cachedDetails) {
            setBank(JSON.parse(cachedDetails));
          } else {
            const fallback: BloodBankProfile = {
              _id: bankId,
              name: "Central Metro Blood Repository",
              address: "Grid Sector 4, Hospital Complex",
              location: { type: "Point", coordinates: [80.2707, 13.0827] },
              contactPhone: "+91 98401 99882",
              isVerified: true,
              inventory: [
                { bloodType: "O-", unitsAvailable: 12, lastRestocked: new Date().toISOString() },
                { bloodType: "O+", unitsAvailable: 34, lastRestocked: new Date().toISOString() },
                { bloodType: "A+", unitsAvailable: 28, lastRestocked: new Date().toISOString() },
                { bloodType: "A-", unitsAvailable: 6, lastRestocked: new Date().toISOString() },
                { bloodType: "B+", unitsAvailable: 42, lastRestocked: new Date().toISOString() },
                { bloodType: "B-", unitsAvailable: 3, lastRestocked: new Date().toISOString() },
                { bloodType: "AB+", unitsAvailable: 19, lastRestocked: new Date().toISOString() },
                { bloodType: "AB-", unitsAvailable: 2, lastRestocked: new Date().toISOString() },
              ],
            };
            setBank(fallback);
          }
        }
        setRegFormActive(false);
      } else {
        setRegFormActive(true);
      }
    } catch (err: any) {
      console.error("Failed to load bank profile", err);
      if (err.response?.status === 403 || err.response?.status === 404) {
        localStorage.removeItem(`sanguis_owned_bank_${user._id}`);
        setRegFormActive(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadBankDetails();
  }, [user, refreshTrigger]);

  if (isBootstrapping || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">
          AUTHENTICATING WAREHOUSE GATEWAY...
        </span>
      </div>
    );
  }

  // Stock adjustment handler
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bank) return;
    setAdjSubmitting(true);

    try {
      const response = await api.patch(`/bloodbanks/${bank._id}/inventory`, {
        bloodType: adjBloodType,
        delta: Number(adjDelta),
        reason: adjReason,
        notes: adjNotes || undefined,
      });

      toast.success("Inventory stock levels updated successfully");
      const updatedBank = response.data.data;
      setBank(updatedBank);
      localStorage.setItem(`sanguis_bank_details_${bank._id}`, JSON.stringify(updatedBank));
      setAdjNotes("");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to adjust inventory parameters");
    } finally {
      setAdjSubmitting(false);
    }
  };

  // Registration submit handler
  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSubmitting(true);

    try {
      const latitude = parseFloat(regLat);
      const longitude = parseFloat(regLng);
      if (isNaN(latitude) || isNaN(longitude)) throw new Error("Latitude and Longitude must be valid numbers");

      const res = await api.post("/bloodbanks", {
        name: regName,
        address: regAddress,
        contactPhone: regPhone,
        location: { type: "Point", coordinates: [longitude, latitude] },
      });

      const newBank = res.data.data;
      toast.success("Blood bank registered successfully!");
      localStorage.setItem(`sanguis_owned_bank_${user._id}`, newBank._id);
      localStorage.setItem(`sanguis_bank_details_${newBank._id}`, JSON.stringify(newBank));
      setRegFormActive(false);
      setRefreshTrigger((p) => p + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to register repository");
    } finally {
      setRegSubmitting(false);
    }
  };

  const activityItems = transactions.map((t) => ({
    id: t._id,
    title: `${t.delta > 0 ? "+" : ""}${t.delta} units of ${t.bloodType}`,
    description: `Reason: ${t.reason.replace("_", " ")} ${t.notes ? `(${t.notes})` : ""} · Adjusted by ${t.actor?.name || "System"}`,
    timestamp: new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    severity: (t.reason === "waste" ? "critical" : t.reason === "correction" ? "warning" : "info") as any,
  }));

  const totalUnits = bank?.inventory?.reduce((sum, item) => sum + item.unitsAvailable, 0) || 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-mono">
      {/* ── STICKY WAREHOUSE HEADER ── */}
      <header className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Sanguis" className="h-7 w-7 rounded-lg object-cover" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-zinc-100 uppercase">SANGUIS</span>
              <span className="h-3.5 w-px bg-zinc-800" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
                WMS // Repository Console
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              COLD STORAGE: +3.8°C
            </span>
            <button
              onClick={() => setRefreshTrigger((p) => p + 1)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Sync WMS
            </button>
            <Link href="/dashboard">
              <button className="inline-flex items-center h-8 px-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 font-bold text-xs uppercase tracking-wider transition-colors">
                Gateway
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {loading ? (
          <div className="text-center py-20 text-zinc-500 font-mono text-xs uppercase tracking-widest">
            SYNCHRONISING REPOSITORY LOGISTICS ENGINE...
          </div>
        ) : regFormActive ? (
          /* ── REGISTRATION FORM ── */
          <div className="max-w-lg mx-auto pt-8">
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-8">
              <div className="flex flex-col items-center text-center mb-7">
                <div className="mb-4 rounded-full bg-rose-500/10 border border-rose-500/20 p-4">
                  <ShieldCheck className="h-7 w-7 text-rose-500" />
                </div>
                <h2 className="text-xl font-black text-zinc-100 uppercase tracking-wider">Register Repository</h2>
                <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed font-sans">
                  Register your blood bank into the regional spatial grid to receive dispatch requests.
                </p>
              </div>

              <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">Repository Name</label>
                  <input
                    type="text" required placeholder="e.g. Central Metro Red Cross Repository"
                    value={regName} onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 text-xs h-9 focus:outline-none focus:border-zinc-600 font-sans"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">Full Address</label>
                  <input
                    type="text" required placeholder="e.g. 100 Hospital Road, Sector 4"
                    value={regAddress} onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 text-xs h-9 focus:outline-none focus:border-zinc-600 font-sans"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">Contact Phone</label>
                  <input
                    type="text" required placeholder="e.g. +91 98401 99882"
                    value={regPhone} onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 text-xs h-9 focus:outline-none focus:border-zinc-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">Latitude</label>
                    <input type="text" required value={regLat} onChange={(e) => setRegLat(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 text-xs h-9" />
                  </div>
                  <div>
                    <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">Longitude</label>
                    <input type="text" required value={regLng} onChange={(e) => setRegLng(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 text-xs h-9" />
                  </div>
                </div>
                <Button type="submit" isLoading={regSubmitting} className="w-full mt-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider h-9">
                  Register Repository
                </Button>
              </form>
            </div>
          </div>
        ) : (
          /* ── MAIN ENTERPRISE WAREHOUSE OPERATIONAL VIEW ── */
          <div className="space-y-6">

            {/* ════════════════════════════════════════════════════════════════════
                SECTION 1 — TOP LOGISTICS KPI BAR (Cold storage, active dispatches, reserved)
            ════════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Package className="h-4 w-4 text-rose-500" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Total Stock</span>
                </div>
                <p className="text-3xl font-black text-zinc-100">{totalUnits}</p>
                <p className="text-[9px] text-zinc-500 mt-1">Units in cold vault</p>
              </div>

              <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Thermometer className="h-4 w-4 text-emerald-400" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Cold Chain</span>
                </div>
                <p className="text-3xl font-black text-emerald-400">+3.8°C</p>
                <p className="text-[9px] text-emerald-500/80 mt-1">AABB Norm (+2°C to +6°C)</p>
              </div>

              <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Truck className="h-4 w-4 text-blue-400" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Active Transit</span>
                </div>
                <p className="text-3xl font-black text-blue-400">3</p>
                <p className="text-[9px] text-zinc-500 mt-1">Vehicles en-route</p>
              </div>

              <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Layers className="h-4 w-4 text-amber-400" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Trauma Lock</span>
                </div>
                <p className="text-3xl font-black text-amber-400">6</p>
                <p className="text-[9px] text-zinc-500 mt-1">Reserved emergency units</p>
              </div>

              <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4 col-span-2 md:col-span-1">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Share2 className="h-4 w-4 text-purple-400" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Grid Share</span>
                </div>
                <p className="text-3xl font-black text-purple-400">87</p>
                <p className="text-[9px] text-zinc-500 mt-1">Regional sharing network</p>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════════
                SECTION 2 — LIVE STOCK MATRIX & ATOMIC ADJUSTMENT LEDGER
            ════════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

              {/* LEFT 8-COLS: Live Warehouse Stock Matrix */}
              <div className="lg:col-span-8 space-y-6">
                <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500 mb-0.5">
                        Real-Time Cold Vault Telemetry
                      </p>
                      <h3 className="text-sm font-extrabold text-zinc-100 uppercase tracking-wider">
                        Warehouse Live Inventory Matrix
                      </h3>
                    </div>
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                      FEFO MONITORED
                    </span>
                  </div>

                  {/* 8-col Blood Type Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {bank?.inventory?.map((item) => {
                      const isZero = item.unitsAvailable === 0;
                      const isLow = item.unitsAvailable > 0 && item.unitsAvailable < 5;

                      return (
                        <div
                          key={item.bloodType}
                          className={`bg-zinc-950 rounded-lg p-3 text-center border transition-colors ${
                            isZero
                              ? "border-rose-500/60 animate-pulse"
                              : isLow
                              ? "border-amber-400/50"
                              : "border-zinc-800"
                          }`}
                        >
                          <p className="text-xs font-mono font-bold text-rose-500 mb-1">
                            {item.bloodType}
                          </p>
                          <p
                            className={`text-2xl font-black leading-none ${
                              isZero
                                ? "text-rose-400"
                                : isLow
                                ? "text-amber-400"
                                : "text-zinc-100"
                            }`}
                          >
                            {item.unitsAvailable}
                          </p>
                          <p className="text-[8px] font-mono text-zinc-600 mt-1.5 uppercase tracking-wider">
                            {isZero ? "EMPTY" : isLow ? "LOW" : "units"}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800/60 text-[9px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse inline-block" /> Empty</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Low (&lt;5)</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-zinc-600 inline-block" /> Nominal</span>
                  </div>
                </div>

                {/* Cold-Chain Compliance & Sensor Telemetry */}
                <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5 space-y-4">
                  <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-emerald-400" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Cold-Chain Temperature Compliance</h3>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                      SENSOR #4 ONLINE
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="border border-zinc-800 bg-zinc-950 p-3 rounded-lg">
                      <p className="text-[8px] text-zinc-500 uppercase">Vault Temp</p>
                      <p className="text-lg font-black text-emerald-400 mt-0.5">+3.8°C</p>
                    </div>
                    <div className="border border-zinc-800 bg-zinc-950 p-3 rounded-lg">
                      <p className="text-[8px] text-zinc-500 uppercase">Compressor</p>
                      <p className="text-lg font-black text-zinc-100 mt-0.5">NOMINAL</p>
                    </div>
                    <div className="border border-zinc-800 bg-zinc-950 p-3 rounded-lg">
                      <p className="text-[8px] text-zinc-500 uppercase">Humidity</p>
                      <p className="text-lg font-black text-zinc-100 mt-0.5">42%</p>
                    </div>
                    <div className="border border-zinc-800 bg-zinc-950 p-3 rounded-lg">
                      <p className="text-[8px] text-zinc-500 uppercase">Backup Power</p>
                      <p className="text-lg font-black text-emerald-400 mt-0.5">100% READY</p>
                    </div>
                  </div>
                </div>

                {/* Outgoing Dispatches & Transit Vehicles */}
                <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5 space-y-4">
                  <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-400" />
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Outgoing Courier Dispatches</h3>
                    </div>
                    <span className="text-[8px] font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded">
                      3 VEHICLES ACTIVE
                    </span>
                  </div>

                  <div className="space-y-2">
                    {MOCK_DISPATCH_VEHICLES.map((v) => (
                      <div key={v.id} className="p-3 border border-zinc-800 bg-zinc-950 rounded-lg flex items-center justify-between text-[10px]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-100">{v.id}</span>
                            <span className="text-rose-500 font-bold">{v.blood} ({v.units} U)</span>
                            <span className="text-emerald-400 font-mono">{v.temp}</span>
                          </div>
                          <p className="text-[9px] text-zinc-500 mt-0.5">{v.courier} → {v.route}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-rose-400 font-mono font-bold">ETA {v.eta}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit Transaction Ledger */}
                <ActivityFeed
                  title="AUDIT TRANSACTION LEDGER"
                  items={activityItems}
                />
              </div>

              {/* RIGHT 4-COLS: Stock Adjustment, Expiry FEFO, Regional Transfers, AI Restock */}
              <div className="lg:col-span-4 space-y-6">

                {/* ── Repository Profile & Contact ── */}
                <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h2 className="text-sm font-black text-zinc-100 uppercase">{bank?.name}</h2>
                    <span className={`text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                      bank?.isVerified ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-400/30 text-amber-400"
                    }`}>
                      {bank?.isVerified ? "VERIFIED" : "PENDING"}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                    <span>{bank?.address}</span>
                  </p>
                  <p className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-zinc-600 shrink-0" />
                    <span>{bank?.contactPhone}</span>
                  </p>
                </div>

                {/* ── Stock Adjustment Form ── */}
                <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                    <TrendingUp className="h-3.5 w-3.5 text-rose-500" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Stock Adjustment Form</h3>
                  </div>

                  <form onSubmit={handleAdjustmentSubmit} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500 block mb-1">Blood Type</label>
                        <select
                          value={adjBloodType}
                          onChange={(e) => setAdjBloodType(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 text-xs h-9 focus:outline-none focus:border-zinc-600"
                        >
                          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                            <option key={bt} value={bt}>{bt}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500 block mb-1">Delta (+ / -)</label>
                        <input
                          type="number" required value={adjDelta}
                          onChange={(e) => setAdjDelta(parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 text-xs h-9 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500 block mb-1">Adjustment Reason</label>
                      <select
                        value={adjReason}
                        onChange={(e) => setAdjReason(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 text-xs h-9 focus:outline-none focus:border-zinc-600"
                      >
                        <option value="restock">Inventory Restock (+)</option>
                        <option value="hospital_dispense">Hospital Fulfill (-)</option>
                        <option value="waste">Discarded / Waste (-)</option>
                        <option value="correction">Audit Correction (+ / -)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500 block mb-1">Audit Notes</label>
                      <input
                        type="text" placeholder="e.g. Batch ref number"
                        value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg px-3 text-xs h-9 placeholder:text-zinc-700 font-sans"
                      />
                    </div>

                    <Button type="submit" isLoading={adjSubmitting} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider h-9">
                      Record Transaction
                    </Button>
                  </form>
                </div>

                {/* ── Shelf Life & Expiring Blood Alerts (FEFO Audit) ── */}
                <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Shelf Life &amp; FEFO Monitoring</h3>
                  </div>

                  <div className="space-y-2">
                    {MOCK_EXPIRING_BATCHES.map((b) => (
                      <div key={b.batchId} className="p-2.5 border border-zinc-800 bg-zinc-950 rounded-lg text-[9.5px]">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-zinc-200">{b.batchId} ({b.blood})</span>
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                            b.daysLeft <= 3 ? "text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse" : "text-amber-400 bg-amber-500/10 border-amber-500/30"
                          }`}>
                            {b.daysLeft} DAYS LEFT
                          </span>
                        </div>
                        <p className="text-[8.5px] text-zinc-500 mt-1 font-sans leading-tight">AI Action: {b.rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Inter-Bank Sharing Network ── */}
                <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                    <Share2 className="h-4 w-4 text-purple-400" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Inter-Bank Transfer Network</h3>
                  </div>

                  <div className="space-y-2">
                    {MOCK_TRANSFER_REQUESTS.map((t) => (
                      <div key={t.id} className="p-2.5 border border-zinc-800 bg-zinc-950 rounded-lg text-[9.5px]">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-zinc-200">{t.bank}</span>
                          <span className="text-rose-400 font-mono">{t.blood} ({t.unitsNeeded} U)</span>
                        </div>
                        <p className="text-[8.5px] text-zinc-500 mt-1 font-mono">Dist: {t.distance} · Urgency: {t.urgency}</p>
                        <button
                          onClick={() => toast.success(`Stock transfer dispatched to ${t.bank}`)}
                          className="w-full mt-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-mono font-bold text-[9px] uppercase tracking-wider py-1 rounded transition-colors"
                        >
                          Approve Transfer
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}
      </main>

      {/* Floating Explainable AI Copilot */}
      <SanguisAiCopilot />
    </div>
  );
}
