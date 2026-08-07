"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ActivityFeed } from "@/components/widgets/activity-feed";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  MapPin, 
  Phone, 
  Plus, 
  TrendingUp, 
  History, 
  FileText,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Info
} from "lucide-react";
import Link from "next/link";

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

export default function BloodBankPortalPage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);

  const [bank, setBank] = useState<BloodBankProfile | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [regFormActive, setRegFormActive] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form States for Registration
  const [regName, setRegName] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regLat, setRegLat] = useState("13.0827");
  const [regLng, setRegLng] = useState("80.2707");
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Form States for Adjustments
  const [adjBloodType, setAdjBloodType] = useState("O-");
  const [adjDelta, setAdjDelta] = useState(5);
  const [adjReason, setAdjReason] = useState("restock");
  const [adjNotes, setAdjNotes] = useState("");
  const [adjSubmitting, setAdjSubmitting] = useState(false);

  // Page Authenticate Gate
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

      // If no ID in storage, check verified banks to see if we can find one we own
      if (!bankId) {
        const listRes = await api.get("/bloodbanks");
        const found = listRes.data.data?.find((b: any) => b.owner?._id === user._id);
        if (found) {
          bankId = found._id;
          localStorage.setItem(storageKey, bankId!);
        }
      }

      if (bankId) {
        // Fetch transactions ledger to verify ownership and load logs
        const transRes = await api.get(`/bloodbanks/${bankId}/transactions`);
        setTransactions(transRes.data.data || []);

        // Load the bank profile from the verified list if verified, or fallback to mock/cache
        const listRes = await api.get("/bloodbanks");
        const matchingBank = listRes.data.data?.find((b: any) => b._id === bankId);

        if (matchingBank) {
          setBank(matchingBank);
        } else {
          // If not in verified list, it's still unverified. Get cached values or set default
          const cachedDetails = localStorage.getItem(`sanguis_bank_details_${bankId}`);
          if (cachedDetails) {
            setBank(JSON.parse(cachedDetails));
          } else {
            // Setup a fallback base structure so the user can interact
            const fallback: BloodBankProfile = {
              _id: bankId,
              name: "Registered Blood Bank Repository",
              address: "Coordinates registered in grid",
              location: { type: "Point", coordinates: [80.2707, 13.0827] },
              contactPhone: "+91-XXXXXXXXXX",
              isVerified: false,
              inventory: [
                { bloodType: "O-", unitsAvailable: 0, lastRestocked: new Date().toISOString() },
                { bloodType: "O+", unitsAvailable: 0, lastRestocked: new Date().toISOString() },
                { bloodType: "A+", unitsAvailable: 0, lastRestocked: new Date().toISOString() },
                { bloodType: "A-", unitsAvailable: 0, lastRestocked: new Date().toISOString() },
                { bloodType: "B+", unitsAvailable: 0, lastRestocked: new Date().toISOString() },
                { bloodType: "B-", unitsAvailable: 0, lastRestocked: new Date().toISOString() },
                { bloodType: "AB+", unitsAvailable: 0, lastRestocked: new Date().toISOString() },
                { bloodType: "AB-", unitsAvailable: 0, lastRestocked: new Date().toISOString() },
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
      // If unauthorized, clear invalid bank ID cache and force registration screen
      if (err.response?.status === 403 || err.response?.status === 404) {
        localStorage.removeItem(`sanguis_owned_bank_${user._id}`);
        setRegFormActive(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadBankDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshTrigger]);

  if (isBootstrapping || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground bg-background">Loading gateway…</div>;
  }

  // Handle stock adjustment submit
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
      
      // Update states
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

  // Handle blood bank registration submit
  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSubmitting(true);

    try {
      const latitude = parseFloat(regLat);
      const longitude = parseFloat(regLng);

      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error("Latitude and Longitude must be valid numbers");
      }

      const res = await api.post("/bloodbanks", {
        name: regName,
        address: regAddress,
        contactPhone: regPhone,
        location: {
          type: "Point",
          coordinates: [longitude, latitude], // GeoJSON order
        },
      });

      const newBank = res.data.data;
      toast.success("Blood bank registered successfully! Awaiting verification.");

      // Cache ID and profile locally
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

  // Activity feed items formatting
  const activityItems = transactions.map((t) => ({
    id: t._id,
    title: `${t.delta > 0 ? "+" : ""}${t.delta} units of ${t.bloodType}`,
    description: `Reason: ${t.reason.replace("_", " ")} ${t.notes ? `(${t.notes})` : ""} · Adjusted by ${t.actor?.name || "System"}`,
    timestamp: new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    severity: (t.reason === "waste" ? "critical" : (t.reason === "correction" ? "warning" : "info")) as any,
  }));

  return (
    <main className="relative mx-auto max-w-5xl px-6 py-12 min-h-screen bg-background">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-destructive/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="Sanguis Logo" className="h-9 w-9 rounded-xl object-cover shadow-md" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-glow">Blood Bank Portal</h1>
            <p className="text-xs text-muted-foreground">Manage inventory repositories and tracking matrices</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => setRefreshTrigger((p) => p + 1)} className="font-semibold glass hover:bg-muted">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Reload
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="font-semibold glass hover:bg-muted">Gateway</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Syncing repository parameters...</div>
      ) : regFormActive ? (
        /* ================= REGISTRATION FORM ================= */
        <div className="max-w-lg mx-auto">
          <Card className="glass-card border border-border/40 relative z-10 shadow-2xl">
            <CardHeader className="text-center pb-2">
              <div className="mb-3 mx-auto rounded-full bg-destructive/10 p-3.5 text-destructive w-fit shadow-inner">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-glow">Register Blood Bank</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Connect your repository to the coordinate grid so it can participate in cascade dispatch routing.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Repository Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. City General Blood Bank"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Full Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 100 Hospital Ave, Building C"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contact Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91-9876543210"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Latitude Coordinate</label>
                    <input
                      type="text"
                      required
                      value={regLat}
                      onChange={(e) => setRegLat(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Longitude Coordinate</label>
                    <input
                      type="text"
                      required
                      value={regLng}
                      onChange={(e) => setRegLng(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                    />
                  </div>
                </div>

                <Button type="submit" isLoading={regSubmitting} className="w-full mt-4 bg-destructive hover:bg-destructive/90 text-white font-semibold shadow-lg">
                  Register Repository
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* ================= OWNER DASHBOARD ================= */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Repository Profile Card & Stats */}
          <div className="md:col-span-4 space-y-6">
            <Card className="glass-card border border-border/40 relative overflow-hidden bg-card/40">
              <div className="absolute top-[-10px] right-[-10px] h-20 w-20 rounded-full bg-destructive/10 blur-xl pointer-events-none" />
              
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="text-lg font-extrabold text-glow">{bank?.name}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3 inline text-destructive" /> {bank?.address}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-4 text-xs">
                {/* Verification Badge */}
                <div className={`p-3 rounded-lg border ${
                  bank?.isVerified 
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500'
                    : 'border-amber-500/30 bg-amber-500/5 text-amber-500'
                }`}>
                  <div className="flex gap-2.5 items-start">
                    <ShieldCheck className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${bank?.isVerified ? "text-emerald-500" : "text-amber-500"}`} />
                    <div>
                      <p className="font-bold uppercase text-[10px] tracking-wider">
                        {bank?.isVerified ? "Verified Repository" : "Pending Verification"}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                        {bank?.isVerified 
                          ? "This repository is active. Verified stock is indexable for emergency cascade routing matching."
                          : "This repository is pending admin verification. Inventory parameters will not be targeted during emergency dispatches."
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-border/20">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Contact Phone</span>
                  <span className="font-semibold flex items-center gap-1.5"><Phone className="h-3 w-3" /> {bank?.contactPhone}</span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase">Repository GPS</span>
                  <span className="font-mono text-muted-foreground">
                    {bank?.location.coordinates[1].toFixed(4)}, {bank?.location.coordinates[0].toFixed(4)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Stock Adjustment Form */}
            <Card className="glass-card border border-border/40 bg-card/40">
              <CardHeader className="pb-3 border-b border-border/20">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-destructive" /> Stock Adjustment
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Adjust volume ledger parameters atomically</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Blood Type</label>
                      <select
                        value={adjBloodType}
                        onChange={(e) => setAdjBloodType(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs"
                      >
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                          <option key={bt} value={bt}>{bt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quantity (+ / -)</label>
                      <input
                        type="number"
                        required
                        value={adjDelta}
                        onChange={(e) => setAdjDelta(parseInt(e.target.value, 10) || 0)}
                        className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Adjustment Reason</label>
                    <select
                      value={adjReason}
                      onChange={(e) => setAdjReason(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs"
                    >
                      <option value="restock">Inventory Restock (+)</option>
                      <option value="hospital_dispense">Hospital Fulfill (-)</option>
                      <option value="waste">Discarded / Waste (-)</option>
                      <option value="correction">Audit correction (+ / -)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Audit Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Batch ref number"
                      value={adjNotes}
                      onChange={(e) => setAdjNotes(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                    />
                  </div>

                  <Button type="submit" isLoading={adjSubmitting} className="w-full bg-destructive hover:bg-destructive/90 text-white font-semibold shadow-lg">
                    Record Transaction
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Live Inventory matrix & Transaction timeline */}
          <div className="md:col-span-8 space-y-6">
            
            {/* Live Inventory Matrix */}
            <Card className="border border-border/40 bg-card/30">
              <CardHeader className="pb-3 border-b border-border/20">
                <CardTitle className="text-base font-bold flex items-center justify-between">
                  <span>Current Inventory Balance</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    TOTAL UNITS: {bank?.inventory?.reduce((sum, item) => sum + item.unitsAvailable, 0) || 0}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {bank?.inventory?.map((item) => (
                    <div key={item.bloodType} className="p-4 rounded-xl border border-border/30 bg-muted/20 text-center space-y-1">
                      <p className="text-sm font-bold text-muted-foreground">{item.bloodType}</p>
                      <p className="text-3xl font-black text-glow tracking-tight">{item.unitsAvailable}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">
                        Updated {new Date(item.lastRestocked).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Transaction Ledger */}
            <ActivityFeed 
              title="Audit Transaction Ledger" 
              items={activityItems} 
            />
          </div>

        </div>
      )}
    </main>
  );
}
