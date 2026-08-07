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
  AlertTriangle, 
  ChevronDown, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  Activity,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

interface PriorityRequest {
  _id: string;
  bloodType: string;
  unitsNeeded: number;
  urgencyLevel: string;
  status: string;
  hospital: string;
  hospitalName: string | null;
  createdAt: string;
  priorityScore: number;
  priorityBreakdown: {
    urgencyScore: number;
    waitScore: number;
    shortfallScore: number;
    verificationBonus: number;
    totalScore: number;
    hoursWaiting: number;
    urgencyLevel: string;
    unitsNeeded: number;
    hospitalVerified: boolean;
  };
}

export default function PriorityQueuePage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);

  const [queue, setQueue] = useState<PriorityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [verifyingMap, setVerifyingMap] = useState<Record<string, boolean>>({});

  // Route protection
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

  // Load Priority Queue data
  const loadQueue = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get("/blood-requests/priority-queue");
      setQueue(res.data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch priority queue");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "moderator")) {
      loadQueue();
    }
  }, [user, refreshTrigger]);

  // 10s silent periodic polling
  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "moderator")) {
      const interval = setInterval(() => {
        loadQueue(true);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Handle hospital verification toggling
  const handleToggleVerification = async (hospitalId: string, currentStatus: boolean) => {
    setVerifyingMap((prev) => ({ ...prev, [hospitalId]: true }));
    try {
      await api.patch(`/users/${hospitalId}/verify`, {
        isEmailVerified: !currentStatus,
      });
      toast.success(currentStatus ? "Hospital verification revoked." : "Hospital verified successfully!");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update hospital verification status");
    } finally {
      setVerifyingMap((prev) => ({ ...prev, [hospitalId]: false }));
    }
  };

  if (isBootstrapping || !user || (user.role !== "admin" && user.role !== "moderator")) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground bg-background">
        Authenticating clearance…
      </div>
    );
  }

  return (
    <main className="relative mx-auto max-w-5xl px-6 py-12 min-h-screen bg-background">
      {/* Background gradients */}
      <div className="absolute top-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-destructive/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between border-b border-border/40 pb-5">
        <div className="flex items-center gap-2.5">
          <Activity className="h-7 w-7 text-destructive animate-pulse" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-glow">Emergency Priority Dispatch Queue</h1>
            <p className="text-xs text-muted-foreground">Explainable scoring of active requests based on live wait-times and shortages</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => setRefreshTrigger((p) => p + 1)} className="font-semibold glass hover:bg-muted">
            <RefreshCw className="h-4 w-4 mr-2" /> Live Reload
          </Button>
          <Link href="/command-center">
            <Button variant="outline" size="sm" className="font-semibold glass hover:bg-muted">Tactical Map</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="font-semibold glass hover:bg-muted">Gateway</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Computing priority scores...</div>
      ) : (
        <div className="space-y-6">
          <Card className="border border-border/40 bg-card/30">
            <CardHeader className="pb-3 border-b border-border/20">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Active Queue Overview</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/30">
                  {queue.length} REQUESTS OPEN
                </span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Formula weights: Urgency (max 100) + Wait Time (3 pts/hr, max 50) + Shortfall Size (4 pts/unit, max 40) + Hospital Verification Bonus (15).
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {queue.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">No active emergency requests in the queue.</div>
              ) : (
                <div className="space-y-4">
                  {queue.map((req, idx) => {
                    const isExpanded = expandedRequest === req._id;
                    const isHospitalVerified = req.priorityBreakdown.hospitalVerified;
                    const isVerifying = verifyingMap[req.hospital] || false;
                    
                    const urgencyColors: Record<string, string> = {
                      critical: 'text-destructive bg-destructive/10 border-destructive/30',
                      high: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
                      medium: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
                      low: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
                    };

                    return (
                      <div 
                        key={req._id}
                        className={`rounded-xl border transition-all duration-200 ${
                          idx === 0 ? 'border-destructive/40 bg-destructive/5' : 'border-border/30 bg-muted/20'
                        }`}
                      >
                        {/* Summary Header bar */}
                        <div 
                          className="flex items-center justify-between p-4 cursor-pointer"
                          onClick={() => setExpandedRequest(isExpanded ? null : req._id)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`text-xs font-black px-2.5 py-1 rounded-full border ${
                              idx === 0 ? 'bg-destructive text-white border-destructive shadow-lg shadow-destructive/25' : 'bg-muted/60 text-muted-foreground border-border/40'
                            }`}>
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-foreground">{req.bloodType}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${urgencyColors[req.urgencyLevel] || ''}`}>
                                  {req.urgencyLevel}
                                </span>
                                <span className="text-xs text-muted-foreground">{req.unitsNeeded} units requested</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-foreground">{req.hospitalName || 'Unknown Hospital'}</span>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" /> {req.priorityBreakdown.hoursWaiting.toFixed(1)}h elapsed
                                </span>
                                <span>·</span>
                                <span className="font-mono text-[10px] bg-background/50 px-1 py-0.2 rounded border border-border/20">ID: {req._id.slice(-6).toUpperCase()}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className={`text-xl font-black tracking-tight ${idx === 0 ? 'text-destructive text-glow' : 'text-foreground'}`}>
                                {req.priorityScore}
                              </p>
                              <p className="text-[9px] text-muted-foreground uppercase font-semibold">Score</p>
                            </div>
                            <ChevronDown className={`h-4.5 w-4.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </div>

                        {/* Detailed Score Explainer dropdown */}
                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-border/20 pt-4 space-y-4 bg-background/10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left parameters */}
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Parameters & Audit</h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div className="p-2.5 rounded-lg border border-border/30 bg-background/40">
                                    <p className="text-muted-foreground text-[10px] uppercase font-bold">Status</p>
                                    <p className="font-bold capitalize text-primary mt-0.5">{req.status}</p>
                                  </div>
                                  <div className="p-2.5 rounded-lg border border-border/30 bg-background/40">
                                    <p className="text-muted-foreground text-[10px] uppercase font-bold">Time raised</p>
                                    <p className="font-bold mt-0.5">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                                </div>

                                {/* Hospital verification action */}
                                <div className="p-3 rounded-lg border border-border/30 bg-background/40 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {isHospitalVerified ? (
                                      <ShieldCheck className="h-5 w-5 text-emerald-500" />
                                    ) : (
                                      <ShieldAlert className="h-5 w-5 text-amber-500" />
                                    )}
                                    <div>
                                      <p className="text-xs font-bold">Hospital verification</p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {isHospitalVerified ? "Verification active (+15 bonus applied)" : "Pending admin verification"}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => handleToggleVerification(req.hospital, isHospitalVerified)}
                                    isLoading={isVerifying}
                                    className={`text-[10px] font-bold h-7 px-3 ${
                                      isHospitalVerified 
                                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20'
                                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                                    }`}
                                  >
                                    {isHospitalVerified ? "Revoke Verification" : "Verify Hospital"}
                                  </Button>
                                </div>
                              </div>

                              {/* Right Weights Chart */}
                              <div className="space-y-2.5">
                                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Priority Weight breakdown</h4>
                                <div className="space-y-2">
                                  {[
                                    { label: 'Urgency tier weight', value: req.priorityBreakdown.urgencyScore, max: 100, color: 'bg-destructive' },
                                    { label: 'Wait starvation correction', value: req.priorityBreakdown.waitScore, max: 50, color: 'bg-amber-500' },
                                    { label: 'Shortfall volume weight', value: req.priorityBreakdown.shortfallScore, max: 40, color: 'bg-blue-500' },
                                    { label: 'Verified hospital bonus', value: req.priorityBreakdown.verificationBonus, max: 15, color: 'bg-emerald-500' },
                                  ].map((factor) => (
                                    <div key={factor.label} className="space-y-1">
                                      <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>{factor.label}</span>
                                        <span className="font-bold text-foreground">{factor.value} / {factor.max}</span>
                                      </div>
                                      <div className="h-1.5 w-full rounded-full bg-border/40 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all ${factor.color}`}
                                          style={{ width: `${(factor.value / factor.max) * 100}%` }}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-end pt-2">
                              <Link href={`/requests/${req._id}`}>
                                <Button size="sm" className="bg-destructive hover:bg-destructive/90 text-white font-semibold text-[10px] h-7">
                                  Launch Dispatch Panel <ArrowRight className="h-3 w-3 ml-1" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
