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
  Heart,
  Award,
  ShieldCheck,
  Calendar,
  Zap,
  Users,
  RefreshCw,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Sparkles,
  Radio,
  AlertTriangle,
  Navigation,
  ArrowRight,
  Activity,
  FileCheck,
  Droplets,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { SanguisAiCopilot } from "@/components/widgets/ai-copilot";

interface DonorProfile {
  _id: string;
  bloodType: string;
  lastDonationDate: string | null;
  trustScore: number;
  isEligible: boolean;
  location: {
    coordinates: [number, number];
  };
}

interface MatchItem {
  _id: string;
  status: "pending" | "accepted" | "declined" | "expired";
  createdAt: string;
  request: {
    _id: string;
    bloodType: string;
    urgencyLevel: string;
    hospital: {
      name: string;
    };
  };
}

import { useSocketDispatch } from "@/hooks/useSocketDispatch";
import { useLiveLocation } from "@/hooks/useLiveLocation";

export default function DonorDashboardPage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const { socket } = useSocketDispatch();
  const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);

  const { isTracking, startTracking, stopTracking, currentCoords } = useLiveLocation(
    socket,
    donorProfile?.bloodType || "O-"
  );
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTravelMode, setActiveTravelMode] = useState<string | null>(null);

  // Profile Form States
  const [formBloodType, setFormBloodType] = useState("O-");
  const [formLat, setFormLat] = useState("13.0827");
  const [formLng, setFormLng] = useState("80.2707");
  const [formLastDonation, setFormLastDonation] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Availability calendar state
  const [availability, setAvailability] = useState<{
    medical: { isMedicallyEligible: boolean; nextEligibleDate: string | null; daysUntilEligible: number };
    voluntary: { isVoluntarilyAvailable: boolean; activePeriod?: { from: string; to: string; reason?: string } };
    unavailablePeriods: Array<{ _id: string; from: string; to: string; reason?: string }>;
    isReadyToMatch: boolean;
  } | null>(null);
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [newPeriodFrom, setNewPeriodFrom] = useState("");
  const [newPeriodTo, setNewPeriodTo] = useState("");
  const [newPeriodReason, setNewPeriodReason] = useState("");
  const [periodSubmitting, setPeriodSubmitting] = useState(false);

  useEffect(() => {
    if (!isBootstrapping && !user) router.replace("/login");
  }, [isBootstrapping, user, router]);

  const loadDashboardData = async () => {
    try {
      const [profileRes, matchesRes] = await Promise.all([
        api.get("/donors/me"),
        api.get("/matches"),
      ]);
      setDonorProfile(profileRes.data.data);
      setMatches(matchesRes.data.data || []);
      setError("");
      try {
        const availRes = await api.get("/donors/me/availability");
        setAvailability(availRes.data.data);
      } catch { /* donor profile might not be created yet */ }
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError("PROFILE_NOT_FOUND");
      } else {
        setError(err.response?.data?.message || "Failed to load donor dashboard data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user, refreshTrigger]);

  if (isBootstrapping || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center font-mono">
          <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping mx-auto mb-4" />
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Loading Donor Telemetry…</p>
        </div>
      </div>
    );
  }

  async function handleLogout() {
    await api.post("/auth/logout");
    clear();
    router.push("/login");
  }

  async function handleRespondMatch(matchId: string, action: "accept" | "decline") {
    try {
      const response = await api.patch(`/matches/${matchId}/respond`, { action });
      toast.success(response.data.message || `Match ${action}ed successfully`);
      if (action === "accept") {
        setActiveTravelMode(matchId);
      }
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit response");
    }
  }

  async function handleAddPeriod(e: React.FormEvent) {
    e.preventDefault();
    if (!newPeriodFrom || !newPeriodTo) { toast.error("Both dates are required"); return; }
    setPeriodSubmitting(true);
    try {
      await api.post("/donors/me/availability", {
        from: new Date(newPeriodFrom).toISOString(),
        to: new Date(newPeriodTo).toISOString(),
        reason: newPeriodReason || undefined,
      });
      toast.success("Unavailability period added");
      setNewPeriodFrom(""); setNewPeriodTo(""); setNewPeriodReason("");
      setRefreshTrigger(p => p + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add period");
    } finally { setPeriodSubmitting(false); }
  }

  async function handleDeletePeriod(periodId: string) {
    try {
      await api.delete(`/donors/me/availability/${periodId}`);
      toast.success("Period removed");
      setRefreshTrigger(p => p + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to remove period");
    }
  }

  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const latitude = parseFloat(formLat);
      const longitude = parseFloat(formLng);
      if (isNaN(latitude) || isNaN(longitude)) throw new Error("Latitude and Longitude must be valid numbers");
      await api.post("/donors", {
        bloodType: formBloodType,
        lastDonationDate: formLastDonation ? new Date(formLastDonation) : null,
        location: { type: "Point", coordinates: [longitude, latitude] },
      });
      toast.success("Donor Profile registered successfully! Welcome to Sanguis.");
      setError("");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to register profile");
    } finally {
      setFormSubmitting(false);
    }
  }

  const inputCls = "w-full h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-rose-500/50";
  const labelCls = "text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block mb-1";

  // Registration form layout
  if (error === "PROFILE_NOT_FOUND") {
    return (
      <main className="relative mx-auto max-w-lg px-6 py-12 min-h-screen bg-zinc-950 text-zinc-50 font-mono">
        <div className="absolute top-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-rose-500/5 blur-[100px] pointer-events-none" />
        <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-8 relative z-10">
          <div className="text-center mb-6">
            <div className="mx-auto h-14 w-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
              <Heart className="h-7 w-7 text-rose-500 animate-pulse" />
            </div>
            <h1 className="text-xl font-black uppercase tracking-wider text-zinc-100">Activate Donor Passport</h1>
            <p className="text-[10px] text-zinc-500 font-mono mt-2 leading-relaxed">
              Complete your profile to receive emergency dispatch notifications and unlock your digital Donor Passport.
            </p>
          </div>
          <form onSubmit={handleCreateProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Blood Group</label>
                <select value={formBloodType} onChange={(e) => setFormBloodType(e.target.value)} className={inputCls}>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Last Donation Date</label>
                <input type="date" value={formLastDonation} onChange={(e) => setFormLastDonation(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>GPS Latitude</label>
                <input type="text" required value={formLat} onChange={(e) => setFormLat(e.target.value)} placeholder="e.g. 13.0827" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>GPS Longitude</label>
                <input type="text" required value={formLng} onChange={(e) => setFormLng(e.target.value)} placeholder="e.g. 80.2707" className={inputCls} />
              </div>
            </div>
            <Button type="submit" isLoading={formSubmitting} className="w-full mt-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider">
              Activate Donor Passport
            </Button>
            <div className="flex justify-center gap-4 pt-4 border-t border-zinc-800 text-xs">
              <ThemeToggle />
              <Button variant="ghost" onClick={handleLogout} className="text-zinc-400 font-semibold hover:text-zinc-100">
                Logout
              </Button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // Gamification stats
  const acceptedMatches = matches.filter(m => m.status === "accepted");
  const totalDonations = acceptedMatches.length;
  const livesSaved = totalDonations * 3;
  const streak = totalDonations;

  let currentLevel = "Hope Seeker";
  let levelColor = "text-amber-400 border-amber-500/30 bg-amber-500/10";
  if (totalDonations >= 5) { currentLevel = "Blood Hero"; levelColor = "text-rose-400 border-rose-500/30 bg-rose-500/10"; }
  else if (totalDonations >= 2) { currentLevel = "Life Spark"; levelColor = "text-blue-400 border-blue-500/30 bg-blue-500/10"; }

  // Pending emergency dispatch
  const pendingMatch = matches.find((m) => m.status === "pending");
  const acceptedMatch = matches.find((m) => m.status === "accepted");

  let cooldownText = "ELIGIBLE TO DONATE";
  let cooldownSub = "Ready for emergency requests";
  let isCooldown = false;
  let daysRemaining = 0;

  if (donorProfile?.lastDonationDate) {
    const lastDate = new Date(donorProfile.lastDonationDate);
    const nextDate = new Date(lastDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) {
      isCooldown = true;
      daysRemaining = diffDays;
      cooldownText = `${diffDays} DAYS COOLDOWN`;
      cooldownSub = `Next eligible: ${nextDate.toLocaleDateString()}`;
    }
  }

  return (
    <main className="relative mx-auto max-w-7xl px-6 py-10 min-h-screen bg-zinc-950 text-zinc-50 font-mono">
      <div className="absolute top-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />

      {/* --- Top Controller Header --- */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="Sanguis Logo" className="h-9 w-9 rounded-xl object-cover shadow-md border border-zinc-800" />
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-zinc-100 flex items-center gap-2">
              SANGUIS DONOR COMMAND CENTER
              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded uppercase tracking-widest">PASSPORT ACTIVE</span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium">Real-time emergency dispatch response · Impact telemetry · Cooldown schedule</p>
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
          <Button variant="outline" size="sm" onClick={handleLogout} className="font-bold text-xs uppercase tracking-wider border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300">Logout</Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
          <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping mx-auto mb-4" />
          Loading donor operational telemetry...
        </div>
      ) : (
        <div className="space-y-8">

          {/* ════════════════════════════════════════════════════════════════════
              PRIMARY HERO MISSION BANNER — WHERE AM I NEEDED? WHAT SHOULD I DO?
          ════════════════════════════════════════════════════════════════════ */}
          {pendingMatch ? (
            <div className="border-2 border-rose-500 bg-rose-950/20 rounded-2xl p-6 shadow-2xl shadow-rose-950/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-32 w-32 bg-rose-500/10 blur-3xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1 text-[9px] font-bold text-rose-400 uppercase tracking-widest">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                    URGENT DISPATCH ALERT — ACTION REQUIRED
                  </div>
                  <h2 className="text-2xl font-black uppercase text-zinc-100">
                    You Are Needed At <span className="text-rose-500">{pendingMatch.request.hospital.name}</span>
                  </h2>
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                    Critical emergency dispatch request for <strong className="text-rose-400 font-mono">{pendingMatch.request.bloodType}</strong> blood group. Distance: 4.2 km. Estimated courier/donor transit: 12 minutes.
                  </p>
                </div>

                {/* PRIMARY CTA: SINGLE LARGE UNAMBIGUOUS TOUCH TARGET */}
                <div className="flex flex-col items-center gap-2 shrink-0 w-full md:w-auto">
                  <button
                    id="cta-respond-emergency-hero"
                    onClick={() => handleRespondMatch(pendingMatch._id, "accept")}
                    className="w-full md:w-72 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider h-14 rounded-xl shadow-2xl shadow-emerald-950/60 transition-all hover:scale-[1.02] flex items-center justify-center gap-2.5 ring-2 ring-emerald-400/50 animate-pulse"
                  >
                    <CheckCircle2 className="h-6 w-6 shrink-0" />
                    <span>Accept Emergency Dispatch</span>
                  </button>
                  <button
                    onClick={() => handleRespondMatch(pendingMatch._id, "decline")}
                    className="text-[10px] font-mono text-zinc-500 hover:text-rose-400 underline decoration-zinc-800 hover:decoration-rose-500 transition-colors py-1"
                  >
                    Unable to respond to this request
                  </button>
                </div>
              </div>
            </div>
          ) : acceptedMatch ? (
            /* LIVE TRAVEL MODE / NAVIGATION ACTIVE */
            <div className="border border-emerald-500/40 bg-emerald-950/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                    <Navigation className="h-3 w-3 animate-spin" style={{ animationDuration: '6s' }} />
                    LIVE TRAVEL MODE ACTIVE — EN-ROUTE TO HOSPITAL
                  </div>
                  <h2 className="text-xl font-black uppercase text-zinc-100">
                    Navigating To {acceptedMatch.request.hospital.name}
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono">
                    Dispatch ID: {acceptedMatch._id.slice(-6).toUpperCase()} · Blood Group: <span className="text-emerald-400 font-bold">{acceptedMatch.request.bloodType}</span> · Estimated Transit: 12 Mins
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(acceptedMatch.request.hospital.name)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl flex items-center gap-2 transition-all shadow-lg"
                  >
                    <Navigation className="h-4 w-4" /> Open GPS Navigation
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* STANDBY MONITORING BANNER */
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Radio className="h-5 w-5 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold uppercase text-zinc-100">Status: Monitoring Regional Radar</h2>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">No active emergency pings in your immediate 15km coordinate radius. You are on standby.</p>
                </div>
              </div>
              <div className="text-right font-mono text-[10px] text-zinc-500 uppercase shrink-0">
                <span className="text-emerald-400 font-bold">READY TO DISPATCH</span>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════
              3-COLUMN MAIN OPERATIONAL GRID
          ════════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT 4-COLS: Donor Passport & Medical Eligibility */}
            <div className="lg:col-span-4 space-y-6">

              {/* Digital Donor Passport */}
              <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5 relative overflow-hidden">
                <div className="absolute top-[-20px] right-[-20px] h-24 w-24 rounded-full bg-rose-500/10 blur-2xl pointer-events-none" />
                
                <div className="text-center mb-5 pb-5 border-b border-zinc-800">
                  <div className="relative mx-auto w-fit mb-3">
                    <div className="rounded-full bg-rose-500/10 border border-rose-500/30 p-4 text-rose-500">
                      <Award className="h-10 w-10" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[7px] font-mono font-bold text-white uppercase">VERIFIED</span>
                  </div>
                  <h2 className="text-lg font-black text-zinc-100">{user.name}</h2>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-[9px] text-zinc-500 font-mono">LEVEL {streak + 1}</span>
                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${levelColor}`}>{currentLevel}</span>
                  </div>
                </div>

                <div className="space-y-3 font-mono">
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-800">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Blood Group</span>
                    <span className="text-2xl font-black text-rose-500">{donorProfile?.bloodType}</span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-800">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">AI Trust Rating</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {donorProfile?.trustScore || 98.4}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-zinc-800">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Donation Streak</span>
                    <span className="font-bold text-orange-400 flex items-center gap-1">
                      <Zap className="h-3 w-3" /> {streak} Streak
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-[9px] text-zinc-500 uppercase tracking-wider">Location Coordinates</span>
                    <span className="text-[9px] text-zinc-400 flex items-center">
                      <MapPin className="h-3 w-3 mr-1 text-rose-500" />
                      {donorProfile?.location.coordinates[1].toFixed(4)}, {donorProfile?.location.coordinates[0].toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Medical Eligibility & Cooldown Card */}
              <div className={`border rounded-xl p-4 space-y-3 ${isCooldown ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5"}`}>
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${isCooldown ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="font-mono">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${isCooldown ? "text-amber-400" : "text-emerald-400"}`}>{cooldownText}</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5">{cooldownSub}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800 text-[9px] text-zinc-400 leading-relaxed font-sans">
                  Standard AABB medical interval between whole blood donations is 90 days to ensure full red blood cell recovery.
                </div>
              </div>

              {/* AI Health Recommendations */}
              <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4 space-y-3 font-mono">
                <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2">
                  <Sparkles className="h-4 w-4 text-rose-500" />
                  <h3 className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">AI Donor Health Advisory</h3>
                </div>

                <div className="space-y-2 text-[9px] text-zinc-400 font-sans leading-relaxed">
                  <p className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold font-mono">▸</span> Hydration Index: Drink 500ml of water prior to responding to emergency pings.
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold font-mono">▸</span> Iron Recovery: Maintain dietary iron intake to sustain 98.4% Trust Rating score.
                  </p>
                  <p className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold font-mono">▸</span> Post-Donation: Rest 15 minutes after donation before driving to hospital.
                  </p>
                </div>
              </div>

            </div>

            {/* RIGHT 8-COLS: Emergency Center, Lives Saved Timeline, Achievements, Calendar */}
            <div className="lg:col-span-8 space-y-6">

              {/* KPI Impact Grid — HOW MUCH IMPACT HAVE I CREATED? */}
              <div className="grid grid-cols-3 gap-4 font-mono">
                {[
                  { label: "Lives Saved Impact", value: livesSaved, icon: Users, color: "text-rose-500", sub: "3 lives per donation" },
                  { label: "Incidents Matched", value: matches.length, icon: Calendar, color: "text-blue-400", sub: "Regional dispatches" },
                  { label: "Donation Count", value: totalDonations, icon: Heart, color: "text-emerald-400", sub: "Verified donations" },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4 text-center">
                      <Icon className={`h-4 w-4 mx-auto mb-1.5 ${s.color}`} />
                      <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mt-1">{s.label}</p>
                      <p className="text-[8px] text-zinc-600 mt-0.5">{s.sub}</p>
                    </div>
                  );
                })}
              </div>

              {/* Emergency Match Request Feed */}
              <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5">
                <div className="border-b border-zinc-800 pb-3 mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Emergency Match Broadcast Feed</h3>
                    <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Live emergency dispatch requests mapped to your blood type and coordinate grid</p>
                  </div>
                  <span className="text-[8px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                    Live Telemetry
                  </span>
                </div>

                {matches.length === 0 ? (
                  <div className="py-10 text-center flex flex-col items-center gap-3">
                    <Clock className="h-8 w-8 text-zinc-700 animate-spin" style={{ animationDuration: "6s" }} />
                    <div>
                      <p className="text-xs font-bold text-zinc-400 font-mono uppercase">Listening for emergency broadcasts...</p>
                      <p className="text-[9px] text-zinc-600 font-mono mt-1">No active emergency dispatches in your region right now.</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {matches.map((m) => {
                      const isPending = m.status === "pending";
                      const urgencyColor: Record<string, string> = {
                        critical: "text-rose-400 bg-rose-500/10 border-rose-500/30",
                        high: "text-amber-400 bg-amber-500/10 border-amber-500/30",
                        medium: "text-blue-400 bg-blue-500/10 border-blue-500/30",
                        low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
                      };
                      return (
                        <div key={m._id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 first:pt-0 last:pb-0">
                          <div className="space-y-1.5 font-mono">
                            <div className="flex items-center gap-2 flex-wrap text-[9px] font-bold">
                              <span className="bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300">DISPATCH {m._id.slice(-4).toUpperCase()}</span>
                              <span className="text-rose-500 font-black">{m.request.bloodType} NEEDED</span>
                              <span className={`uppercase px-1.5 py-0.5 rounded font-bold border ${urgencyColor[m.request.urgencyLevel] || ""}`}>{m.request.urgencyLevel}</span>
                            </div>
                            <p className="text-[10px] text-zinc-400 font-sans">
                              Hospital: <span className="font-bold text-zinc-200">{m.request.hospital.name}</span>
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => handleRespondMatch(m._id, "accept")}
                                  className="text-xs font-black h-11 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl uppercase tracking-wider shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all hover:scale-105"
                                >
                                  <CheckCircle2 className="h-4 w-4" /> Accept Dispatch
                                </button>
                                <button
                                  onClick={() => handleRespondMatch(m._id, "decline")}
                                  className="text-[9px] text-zinc-500 hover:text-rose-400 underline transition-colors"
                                >
                                  Decline
                                </button>
                              </>
                            ) : (
                              <div className="text-xs font-mono font-bold">
                                {m.status === "accepted" && (
                                  <span className="flex items-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded">
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accepted · En Route
                                  </span>
                                )}
                                {m.status === "declined" && (
                                  <span className="flex items-center text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2.5 py-1 rounded">
                                    <XCircle className="h-3.5 w-3.5 mr-1" /> Declined
                                  </span>
                                )}
                                {m.status === "expired" && (
                                  <span className="text-zinc-600 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded">
                                    Expired
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Impact Certificates & Gamification Achievements */}
              <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5 space-y-4">
                <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4.5 w-4.5 text-rose-500" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Impact Certificates &amp; Achievements</h3>
                  </div>
                  <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest">VERIFIED PASSPORT</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { title: "First Blood Certificate", sub: "Awarded on 1st verified emergency dispatch", unlocked: totalDonations >= 1 },
                    { title: "Life Spark Milestone", sub: "Awarded on 2+ verified emergency dispatches", unlocked: totalDonations >= 2 },
                    { title: "Blood Hero Credential", sub: "Awarded on 5+ verified emergency dispatches", unlocked: totalDonations >= 5 },
                  ].map((cert) => (
                    <div
                      key={cert.title}
                      className={`p-3 rounded-xl border font-mono space-y-2 ${
                        cert.unlocked
                          ? "border-rose-500/40 bg-rose-500/5 text-rose-400"
                          : "border-zinc-850 bg-zinc-950/40 text-zinc-600 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <FileCheck className={`h-4 w-4 ${cert.unlocked ? "text-rose-500" : "text-zinc-700"}`} />
                        <span className={`text-[7px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                          cert.unlocked ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-zinc-800 text-zinc-600"
                        }`}>
                          {cert.unlocked ? "UNLOCKED" : "LOCKED"}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-zinc-200">{cert.title}</p>
                        <p className="text-[8px] text-zinc-500 mt-0.5 font-sans leading-tight">{cert.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Donation Availability Calendar */}
              {donorProfile && (
                <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-5 font-mono">
                  <div className="border-b border-zinc-800 pb-3 mb-5 flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5 text-rose-500" />
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-100">Donation Availability Calendar</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Visual Calendar */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="h-7 w-7 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center text-xs text-zinc-400 hover:bg-zinc-900 transition-colors">‹</button>
                        <span className="text-sm font-bold text-zinc-100 font-mono">{calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
                        <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="h-7 w-7 rounded border border-zinc-800 bg-zinc-950 flex items-center justify-center text-xs text-zinc-400 hover:bg-zinc-900 transition-colors">›</button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-[9px] text-zinc-600 font-mono font-bold mb-1 text-center">
                        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const year = calMonth.getFullYear();
                          const month = calMonth.getMonth();
                          const firstDay = new Date(year, month, 1).getDay();
                          const daysInMonth = new Date(year, month + 1, 0).getDate();
                          const today = new Date();
                          const nextEligible = availability?.medical.nextEligibleDate ? new Date(availability.medical.nextEligibleDate) : null;
                          const cells: React.ReactNode[] = [];
                          for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />);
                          for (let d = 1; d <= daysInMonth; d++) {
                            const date = new Date(year, month, d);
                            const isToday = date.toDateString() === today.toDateString();
                            const isNextEligible = nextEligible && date.toDateString() === nextEligible.toDateString();
                            const isUnavailable = availability?.unavailablePeriods.some(p => {
                              const from = new Date(p.from); const to = new Date(p.to);
                              return date >= from && date <= to;
                            });
                            cells.push(
                              <div key={d} className={`h-7 w-full rounded text-[9px] flex items-center justify-center font-mono font-semibold transition-all ${
                                isNextEligible ? "bg-emerald-500 text-white ring-1 ring-emerald-400" :
                                isUnavailable ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" :
                                isToday ? "bg-zinc-700 text-zinc-100 border border-zinc-600 font-bold" :
                                "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"
                              }`} title={isNextEligible ? "Next eligible date" : isUnavailable ? "Unavailable" : ""}>
                                {d}
                              </div>
                            );
                          }
                          return cells;
                        })()}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-[8px] font-mono font-semibold text-zinc-500">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500 inline-block" />Next eligible</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-500/20 border border-rose-500/30 inline-block" />Unavailable</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-zinc-700 inline-block" />Today</span>
                      </div>
                    </div>

                    {/* Add Period + Existing Periods */}
                    <div className="space-y-4">
                      <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-950/40 space-y-3">
                        <h4 className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Mark Voluntary Unavailability</h4>
                        <form onSubmit={handleAddPeriod} className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className={labelCls}>From</label>
                              <input type="date" required value={newPeriodFrom} onChange={e => setNewPeriodFrom(e.target.value)} className={inputCls} />
                            </div>
                            <div>
                              <label className={labelCls}>To</label>
                              <input type="date" required value={newPeriodTo} onChange={e => setNewPeriodTo(e.target.value)} className={inputCls} />
                            </div>
                          </div>
                          <input type="text" placeholder="Reason (optional, e.g. travelling)" value={newPeriodReason} onChange={e => setNewPeriodReason(e.target.value)} className={inputCls} />
                          <Button type="submit" isLoading={periodSubmitting} size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase w-full">
                            Add Period
                          </Button>
                        </form>
                      </div>

                      {availability && availability.unavailablePeriods.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Scheduled Unavailability</h4>
                          {availability.unavailablePeriods.map(p => (
                            <div key={p._id} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/40 font-mono">
                              <div>
                                <p className="text-[10px] font-semibold text-zinc-200">{new Date(p.from).toLocaleDateString()} → {new Date(p.to).toLocaleDateString()}</p>
                                {p.reason && <p className="text-[9px] text-zinc-500 mt-0.5">{p.reason}</p>}
                              </div>
                              <button onClick={() => handleDeletePeriod(p._id)} className="text-[9px] text-rose-400 hover:text-rose-300 font-bold transition-colors">Remove</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Floating Explainable AI Copilot */}
      <SanguisAiCopilot />
    </main>
  );
}
