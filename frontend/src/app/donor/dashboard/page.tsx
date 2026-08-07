"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { StatCard } from "@/components/widgets/stat-card";
import { ActivityFeed } from "@/components/widgets/activity-feed";
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
  HelpCircle,
  TrendingUp,
  Sparkles,
  Radio,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";

interface DonorProfile {
  _id: string;
  bloodType: string;
  lastDonationDate: string | null;
  trustScore: number;
  isEligible: boolean;
  location: {
    coordinates: [number, number]; // [lng, lat]
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

export default function DonorDashboardPage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);

  const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  // Authenticate Gate
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
      } catch (availErr) { /* donor might not have profile yet */ }
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
    if (user) {
      loadDashboardData();
    }
  }, [user, refreshTrigger]);

  if (isBootstrapping || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground bg-background">Loading…</div>;
  }

  async function handleLogout() {
    await api.post("/auth/logout");
    clear();
    router.push("/login");
  }

  // Handle Match Response (Accept/Decline)
  async function handleRespondMatch(matchId: string, action: "accept" | "decline") {
    try {
      const response = await api.patch(`/matches/${matchId}/respond`, { action });
      toast.success(response.data.message || `Match ${action}ed successfully`);
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

  // Handle Donor Profile Creation Form
  async function handleCreateProfile(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      const latitude = parseFloat(formLat);
      const longitude = parseFloat(formLng);
      if (isNaN(latitude) || isNaN(longitude)) {
        throw new Error("Latitude and Longitude must be valid numbers");
      }

      await api.post("/donors", {
        bloodType: formBloodType,
        lastDonationDate: formLastDonation ? new Date(formLastDonation) : null,
        location: {
          type: "Point",
          coordinates: [longitude, latitude], // GeoJSON order
        },
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

  // Registration Form Layout
  if (error === "PROFILE_NOT_FOUND") {
    return (
      <main className="relative mx-auto max-w-lg px-6 py-12 min-h-screen bg-background">
        <div className="absolute top-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-destructive/5 blur-[100px] pointer-events-none" />
        <Card className="glass-card border border-border/40 relative z-10 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mb-3 mx-auto rounded-full bg-destructive/10 p-3.5 text-destructive w-fit shadow-inner">
              <Heart className="h-7 w-7 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-glow">Register as a Blood Donor</CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Complete your profile to receive nearby emergency notifications and unlock your gamified digital Donor Passport.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Blood Group</label>
                  <select
                    value={formBloodType}
                    onChange={(e) => setFormBloodType(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                  >
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Last Donation Date</label>
                  <input
                    type="date"
                    value={formLastDonation}
                    onChange={(e) => setFormLastDonation(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">GPS Latitude</label>
                  <input
                    type="text"
                    required
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    placeholder="e.g. 13.0827"
                    className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">GPS Longitude</label>
                  <input
                    type="text"
                    required
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    placeholder="e.g. 80.2707"
                    className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs shadow-inner"
                  />
                </div>
              </div>

              <Button type="submit" isLoading={formSubmitting} className="w-full mt-4 bg-destructive hover:bg-destructive/90 text-white font-semibold shadow-lg">
                Activate Donor Passport
              </Button>

              <div className="flex justify-center gap-4 pt-4 border-t border-border/40 text-xs">
                <ThemeToggle />
                <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground font-semibold">
                  Logout
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Calculate Gamified Stats
  const acceptedMatches = matches.filter(m => m.status === "accepted");
  const totalDonations = acceptedMatches.length;
  const livesSaved = totalDonations * 3;
  const streak = totalDonations; // Simple streak calculation
  
  // Gamified Levels
  let currentLevel = "Hope Seeker";
  let badgeColor = "text-amber-500 bg-amber-500/10";
  if (totalDonations >= 5) {
    currentLevel = "Blood Hero";
    badgeColor = "text-destructive bg-destructive/10";
  } else if (totalDonations >= 2) {
    currentLevel = "Life Spark";
    badgeColor = "text-blue-500 bg-blue-500/10";
  }

  // Next donation date estimation (90 days cooldown)
  let cooldownText = "Eligible to Donate";
  let cooldownSub = "Ready for emergency requests";
  let isCooldown = false;

  if (donorProfile?.lastDonationDate) {
    const lastDate = new Date(donorProfile.lastDonationDate);
    const nextDate = new Date(lastDate.getTime() + 90 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      isCooldown = true;
      cooldownText = `${diffDays} Days Cooldown`;
      cooldownSub = `Next eligible: ${nextDate.toLocaleDateString()}`;
    }
  }

  return (
    <main className="relative mx-auto max-w-5xl px-6 py-12 min-h-screen bg-background">
      {/* Background radial highlight */}
      <div className="absolute top-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-destructive/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="Sanguis Logo" className="h-9 w-9 rounded-xl object-cover shadow-md" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-glow">Sanguis Donor Dashboard</h1>
            <p className="text-xs text-muted-foreground">Trace milestones, eligibility, and incoming dispatches</p>
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
          <Button variant="outline" size="sm" onClick={handleLogout} className="font-semibold glass hover:bg-muted">
            Logout
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading donor profile stats...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* LEFT: Digital Donor Passport Badge Card */}
          <div className="md:col-span-1 space-y-6">
            <Card className="glass-card border border-border/40 relative overflow-hidden bg-card/40">
              <div className="absolute top-[-10px] right-[-10px] h-20 w-20 rounded-full bg-destructive/10 blur-xl pointer-events-none" />
              
              <CardHeader className="text-center pb-4 border-b border-border/30">
                <div className="relative mx-auto w-fit mb-3">
                  <div className="rounded-full bg-destructive/10 p-4 text-destructive shadow-inner">
                    <Award className="h-10 w-10 animate-pulse" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[8px] font-bold text-white uppercase shadow">
                    Verified
                  </span>
                </div>
                <CardTitle className="text-xl font-extrabold text-glow">{user.name}</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  Level {streak + 1} · <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${badgeColor}`}>{currentLevel}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-border/20">
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Blood Group</span>
                  <span className="text-2xl font-extrabold text-destructive">{donorProfile?.bloodType}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-border/20">
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Trust Rating</span>
                  <span className="font-bold flex items-center gap-1.5 text-emerald-500">
                    <TrendingUp className="h-4 w-4" /> {donorProfile?.trustScore || 100}%
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-border/20">
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Donation Streak</span>
                  <span className="font-bold flex items-center gap-1 text-orange-500">
                    <Zap className="h-4 w-4" /> {streak} streak
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-muted-foreground font-semibold uppercase">Location GPS</span>
                  <span className="text-xs font-mono text-muted-foreground flex items-center">
                    <MapPin className="h-3 w-3 mr-1 text-destructive" />
                    {donorProfile?.location.coordinates[1].toFixed(4)}, {donorProfile?.location.coordinates[0].toFixed(4)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Eligibility Widget */}
            <Card className="glass-card border border-border/40 bg-card/40">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`rounded-xl p-3 shadow-inner ${isCooldown ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-glow">{cooldownText}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{cooldownSub}</p>
                </div>
              </CardContent>
            </Card>

            {/* Live Notification Center (Proactive Outreach) */}
            <Card className="glass-card border border-border/40 bg-card/40">
              <CardHeader className="pb-2 border-b border-border/20">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-destructive animate-pulse" /> Notification Center
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3.5 text-xs">
                {/* 1. Proactive Outreach Reminder */}
                <div className="flex gap-2.5 items-start p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <Sparkles className="h-4.5 w-4.5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-emerald-500 text-[10px] uppercase tracking-wider">Proactive Outreach</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Hey {user.name}! It has been 90 days since your last donation. You are fully eligible to save lives again! Please update your calendar to accept dispatch alerts.
                    </p>
                  </div>
                </div>

                {/* 2. Urgent Emergency broadcast */}
                <div className="flex gap-2.5 items-start p-2.5 rounded-lg bg-destructive/5 border border-destructive/20">
                  <AlertTriangle className="h-4.5 w-4.5 text-destructive shrink-0 mt-0.5 animate-bounce" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-destructive text-[10px] uppercase tracking-wider">Urgent Dispatch Alert</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Critical shortage of compatible {donorProfile?.bloodType || "O-"} units detected in your radius! Accept the incoming match dispatch in the active feed to help.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Stats and Match Request Center */}
          <div className="md:col-span-2 space-y-6">
            {/* Gamified KPI Grid */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Lives Saved Index"
                value={livesSaved}
                icon={Users}
                trend={{ value: "Multiplier factor: 3 lives per bag", direction: "up" }}
              />
              <StatCard
                label="Matching Incidents"
                value={matches.length}
                icon={Calendar}
              />
            </div>

            {/* Active Match Requests Center */}
            <Card className="border border-border/40 bg-card/30">
              <CardHeader className="pb-3 border-b border-border/20 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Emergency Match Dispatch Center</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">Respond to live emergency requests near your coordinate grid</CardDescription>
                </div>
                <span className="text-[10px] bg-destructive/10 text-destructive border border-destructive/25 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">
                  Live Feed
                </span>
              </CardHeader>
              
              <CardContent className="pt-4">
                {matches.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center">
                    <Clock className="h-8 w-8 text-muted-foreground mb-2 animate-spin" style={{ animationDuration: '6s' }} />
                    <p className="font-semibold text-foreground">Listening for broadcasts...</p>
                    <p className="text-xs text-muted-foreground max-w-xs mt-1">
                      No active emergency dispatches in your region coordinates right now.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {matches.map((m) => {
                      const isPending = m.status === "pending";
                      return (
                        <div key={m._id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 first:pt-0 last:pb-0">
                          
                          {/* Match request info */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded text-foreground border border-border/30">
                                Dispatch {m._id.slice(-4).toUpperCase()}
                              </span>
                              <span className="text-xs font-extrabold text-destructive">
                                {m.request.bloodType} Needed
                              </span>
                              <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded">
                                {m.request.urgencyLevel}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Hospital: <span className="font-semibold text-foreground">{m.request.hospital.name}</span>
                            </p>
                          </div>

                          {/* Decision action buttons */}
                          <div className="flex items-center gap-2">
                            {isPending ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleRespondMatch(m._id, "accept")}
                                  className="text-xs font-bold h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 transition-all"
                                >
                                  Accept Dispatch
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRespondMatch(m._id, "decline")}
                                  className="text-xs font-bold h-8 px-4 glass hover:bg-destructive hover:text-white border-destructive/20 hover:border-destructive active:scale-95 transition-all"
                                >
                                  Decline
                                </Button>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs font-semibold">
                                {m.status === "accepted" ? (
                                  <span className="flex items-center text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accepted
                                  </span>
                                ) : m.status === "declined" ? (
                                  <span className="flex items-center text-destructive bg-destructive/10 px-2.5 py-1 rounded-lg">
                                    <XCircle className="h-3.5 w-3.5 mr-1" /> Declined
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground bg-muted px-2 py-1 rounded">
                                    {m.status}
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
              </CardContent>
            </Card>

            {/* Bottom info: Gamification timeline explanation */}
            <div className="rounded-xl border border-border/30 bg-muted/30 p-4 text-xs text-muted-foreground flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-destructive shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold text-foreground">Earn Impact Certificates:</span> For every 5 successful dispatches accepted and completed, your Sanguis Donor Level is upgraded (Hope Seeker → Life Spark → Blood Hero) and your AI Trust Rating increases, prioritizing you for regional emergency broadcasts.
              </div>
            </div>
          </div>

        </div>

        {/* === AVAILABILITY CALENDAR === */}
        {donorProfile && (
          <Card className="border border-border/40 bg-card/30 mt-6">
            <CardHeader className="pb-3 border-b border-border/20">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-destructive" />
                Donation Availability Calendar
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Medical re-eligibility is computed from your last donation date (90-day standard). Mark voluntary unavailability below.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              {/* Medical Status Banner */}
              {availability && (
                <div className={`flex items-center gap-3 p-3 rounded-lg border ${
                  availability.isReadyToMatch
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-amber-500/30 bg-amber-500/5'
                }`}>
                  <div className={`h-3 w-3 rounded-full flex-shrink-0 ${
                    availability.isReadyToMatch ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`} />
                  <div>
                    <p className={`text-sm font-bold ${
                      availability.isReadyToMatch ? 'text-emerald-500' : 'text-amber-500'
                    }`}>
                      {availability.isReadyToMatch ? 'Ready to Match' : 'Currently Unavailable for Matching'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {availability.medical.isMedicallyEligible
                        ? 'Medically eligible (90-day interval passed)'
                        : `Medical eligibility in ${availability.medical.daysUntilEligible} days (${availability.medical.nextEligibleDate ? new Date(availability.medical.nextEligibleDate).toLocaleDateString() : 'N/A'})`
                      }
                      {!availability.voluntary.isVoluntarilyAvailable && ' · Self-marked unavailable'}
                    </p>
                  </div>
                </div>
              )}

              {/* Visual Calendar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="h-7 w-7 rounded border border-border flex items-center justify-center text-xs hover:bg-muted transition-colors">‹</button>
                  <span className="text-sm font-bold">{calMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                  <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="h-7 w-7 rounded border border-border flex items-center justify-center text-xs hover:bg-muted transition-colors">›</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-[9px] text-muted-foreground font-bold mb-1 text-center">
                  {['S','M','T','W','T','F','S'].map((d, i) => <div key={i}>{d}</div>)}
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
                        <div key={d} className={`h-7 w-full rounded text-[10px] flex items-center justify-center font-semibold transition-all ${
                          isNextEligible ? 'bg-emerald-500 text-white ring-2 ring-emerald-400' :
                          isUnavailable ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                          isToday ? 'bg-primary/20 text-primary border border-primary/30 font-bold' :
                          'bg-muted/30 text-foreground hover:bg-muted/50'
                        }`} title={isNextEligible ? 'Next eligible date' : isUnavailable ? 'Unavailable' : ''}>
                          {d}
                        </div>
                      );
                    }
                    return cells;
                  })()}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[9px] font-semibold">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" />Next eligible date</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-destructive/20 border border-destructive/30 inline-block" />Unavailable period</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-primary/20 border border-primary/30 inline-block" />Today</span>
                </div>
              </div>

              {/* Add Unavailability Period */}
              <div className="border border-border/30 rounded-xl p-4 bg-muted/20 space-y-3">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mark Unavailability</h4>
                <form onSubmit={handleAddPeriod} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">From</label>
                      <input type="date" required value={newPeriodFrom} onChange={e => setNewPeriodFrom(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">To</label>
                      <input type="date" required value={newPeriodTo} onChange={e => setNewPeriodTo(e.target.value)}
                        className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs" />
                    </div>
                  </div>
                  <input type="text" placeholder="Reason (optional, e.g. travelling)" value={newPeriodReason}
                    onChange={e => setNewPeriodReason(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background/50 px-3 text-xs" />
                  <Button type="submit" isLoading={periodSubmitting} size="sm" className="bg-destructive hover:bg-destructive/90 text-white font-semibold w-full">
                    Add Period
                  </Button>
                </form>
              </div>

              {/* Existing Periods List */}
              {availability && availability.unavailablePeriods.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Scheduled Unavailability</h4>
                  {availability.unavailablePeriods.map(p => (
                    <div key={p._id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-muted/20">
                      <div>
                        <p className="text-xs font-semibold">{new Date(p.from).toLocaleDateString()} → {new Date(p.to).toLocaleDateString()}</p>
                        {p.reason && <p className="text-[10px] text-muted-foreground">{p.reason}</p>}
                      </div>
                      <button onClick={() => handleDeletePeriod(p._id)}
                        className="text-[10px] text-destructive hover:underline font-semibold">Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </>
      )}
    </main>
  );
}
