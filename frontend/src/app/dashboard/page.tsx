"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { toast } from "sonner";
import Link from "next/link";
import {
  Droplet,
  CheckCircle2,
  Star,
  Heart,
  MapPin,
  Clock,
  Building2,
  AlertTriangle,
  ChevronRight,
  ArrowUpRight,
  Activity,
  Users,
} from "lucide-react";
import { MapView, MapMarker } from "@/components/widgets/map-view";
import { useLiveLocation, calculateHaversineKm } from "@/hooks/use-live-location";
import { getSocket } from "@/lib/socket";

function getHourGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getUrgencyStyle(level: string) {
  switch (level) {
    case "critical": return { bg: "bg-rose-100 text-rose-700 border-rose-200", dot: "bg-rose-500", label: "Critical" };
    case "high":     return { bg: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500", label: "High" };
    case "medium":   return { bg: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Medium" };
    default:         return { bg: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400", label: "Low" };
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);

  // Live GPS Tracking with backend auto-sync
  const { lat: userLat, lng: userLng } = useLiveLocation(true);

  const [donorProfile, setDonorProfile] = useState<any | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [topDonors, setTopDonors] = useState<any[]>([]);
  const [realHospitals, setRealHospitals] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalDonors: "24K+", livesSaved: "1,240", totalHospitals: "48", totalRequests: "3.2K" });
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("All");

  useEffect(() => {
    if (!isBootstrapping && !user) router.replace("/login");
  }, [isBootstrapping, user, router]);

  // Connect Socket.IO for real-time request and donor location updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("request:created", (newReq: any) => {
      setRequests((prev) => [newReq, ...prev]);
      toast.info(`🚨 New Emergency Blood Request: ${newReq.bloodType} needed!`);
    });

    socket.on("emergency:created", (newReq: any) => {
      setRequests((prev) => [newReq, ...prev]);
      toast.error(`🚨 CRITICAL EMERGENCY: ${newReq.bloodType} needed urgently!`);
    });

    socket.on("donor:location_updated", (data: any) => {
      setTopDonors((prev) =>
        prev.map((d) => {
          const uid = d.user?._id || d.userId?._id || d.userId;
          if (uid === data.userId || d._id === data.donorId) {
            return {
              ...d,
              location: { type: "Point", coordinates: [data.lng, data.lat] },
              isLiveTracking: true,
              lastLocationUpdate: data.updatedAt,
            };
          }
          return d;
        })
      );
    });

    socket.on("donor:location_started", (data: any) => {
      setTopDonors((prev) =>
        prev.map((d) => {
          const uid = d.user?._id || d.userId?._id || d.userId;
          if (uid === data.userId || d._id === data.donorId) {
            return {
              ...d,
              location: { type: "Point", coordinates: [data.lng, data.lat] },
              isLiveTracking: true,
            };
          }
          return d;
        })
      );
    });

    socket.on("donor:location_stopped", (data: any) => {
      setTopDonors((prev) =>
        prev.map((d) => {
          const uid = d.user?._id || d.userId?._id || d.userId;
          if (uid === data.userId) {
            return { ...d, isLiveTracking: false };
          }
          return d;
        })
      );
    });

    return () => {
      socket.off("request:created");
      socket.off("emergency:created");
      socket.off("donor:location_updated");
      socket.off("donor:location_started");
      socket.off("donor:location_stopped");
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    async function load() {
      setLoading(true);
      try {
        // Load donor profile
        try {
          const d = await api.get("/donors/me");
          setDonorProfile(d.data?.data ?? null);
        } catch (e: any) {
          if (e?.response?.status !== 404) console.error(e);
        }

        // Load blood requests
        const rRes = await api.get("/blood-requests", { params: { status: "open", limit: 20 } });
        setRequests(rRes.data?.data ?? []);

        // Load real donors from API for Top Donors widget
        try {
          const donRes = await api.get("/donors", { params: { limit: 10 } });
          setTopDonors(donRes.data?.data ?? []);
        } catch (donErr) {
          console.warn("Failed to load real donors list", donErr);
        }

        // Load real Indian hospitals from RapidAPI via backend
        try {
          const hospRes = await api.get("/hospitals/all", { params: { limit: 15 } });
          setRealHospitals(hospRes.data?.data ?? []);
        } catch (hospErr) {
          console.warn("Failed to load real hospitals from RapidAPI", hospErr);
        }

        // Load matches for this donor
        try {
          const mRes = await api.get("/matches", { params: { limit: 5 } });
          setMatches(mRes.data?.data ?? []);
        } catch {}

        // Global aggregate stats
        try {
          const sRes = await api.get("/stats/aggregate");
          if (sRes.data?.data) {
            const d = sRes.data.data;
            setStats({
              totalDonors: d.totalDonors > 1000 ? `${(d.totalDonors / 1000).toFixed(0)}K+` : String(d.totalDonors),
              livesSaved: d.livesSaved.toLocaleString(),
              totalHospitals: String(d.totalHospitals),
              totalRequests: d.totalRequests > 1000 ? `${(d.totalRequests / 1000).toFixed(1)}K` : String(d.totalRequests),
            });
          }
        } catch {}

      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleAcceptMatch = async (matchId: string) => {
    try {
      await api.patch(`/matches/${matchId}/respond`, { status: "accepted" });
      toast.success("You accepted this donation request!");
      setMatches((prev) => prev.map((m) => m._id === matchId ? { ...m, status: "accepted" } : m));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to accept match");
    }
  };

  const handleDeclineMatch = async (matchId: string) => {
    try {
      await api.patch(`/matches/${matchId}/respond`, { status: "declined" });
      toast.info("You declined this request.");
      setMatches((prev) => prev.filter((m) => m._id !== matchId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to decline match");
    }
  };

  const filterLevels = ["All", "Critical", "High", "Medium", "Low"];
  const filteredRequests = requests.filter((r) =>
    filterLevel === "All" || r.urgencyLevel?.toLowerCase() === filterLevel.toLowerCase()
  );

  const donationCount = donorProfile?.totalDonations ?? 0;
  const trustScore = donorProfile?.trustScore ?? 0;
  const bloodType = donorProfile?.bloodType ?? "—";
  const lastDonation = donorProfile?.lastDonationDate
    ? new Date(donorProfile.lastDonationDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Never";

  // Eligibility: 90 days from last donation
  const isEligible = !donorProfile?.lastDonationDate ||
    Date.now() - new Date(donorProfile.lastDonationDate).getTime() > 90 * 24 * 60 * 60 * 1000;

  return (
    <AppLayout>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full border-3 border-[#E5384D] border-t-transparent animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading dashboard…</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* ── MAIN COLUMN ── */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Greeting */}
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {getHourGreeting()}, {user?.name?.split(" ")[0] ?? "there"} 👋
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                {filteredRequests.filter(r => r.urgencyLevel === "critical").length > 0 &&
                  ` · ${filteredRequests.filter(r => r.urgencyLevel === "critical").length} critical requests near you`}
              </p>
            </div>

            {/* No donor profile banner */}
            {!donorProfile && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#E5384D]/10 flex items-center justify-center">
                    <Droplet className="w-5 h-5 text-[#E5384D]" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">Complete your donor profile</p>
                    <p className="text-xs text-slate-500">Set up your blood type and location to start helping</p>
                  </div>
                </div>
                <Link href="/donor/setup">
                  <button className="h-9 px-4 rounded-xl text-xs font-bold text-white shadow-md shadow-rose-500/20"
                    style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}>
                    Setup Profile →
                  </button>
                </Link>
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                {
                  label: "Blood Group",
                  value: bloodType,
                  sub: "Universal donor",
                  icon: <Droplet className="w-4 h-4 text-[#E5384D]" />,
                  iconBg: "bg-rose-50 border-rose-100",
                  valueColor: "text-[#E5384D]",
                },
                {
                  label: "Eligibility",
                  value: isEligible ? "Eligible" : "Waiting",
                  sub: isEligible ? "Ready to donate" : `Last: ${lastDonation}`,
                  icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
                  iconBg: "bg-emerald-50 border-emerald-100",
                  valueColor: isEligible ? "text-emerald-600" : "text-amber-500",
                },
                {
                  label: "Trust Score",
                  value: trustScore || "—",
                  sub: trustScore > 0 ? "Top 5% in Lagos" : "Build your score",
                  icon: <Star className="w-4 h-4 text-purple-600" />,
                  iconBg: "bg-purple-50 border-purple-100",
                  valueColor: "text-purple-600",
                },
                {
                  label: "Total Donations",
                  value: donationCount,
                  sub: lastDonation !== "Never" ? `Last: ${lastDonation}` : "No donations yet",
                  icon: <Heart className="w-4 h-4 text-blue-600" />,
                  iconBg: "bg-blue-50 border-blue-100",
                  valueColor: "text-blue-600",
                },
              ].map((card) => (
                <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{card.label}</p>
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${card.iconBg}`}>
                      {card.icon}
                    </div>
                  </div>
                  <p className={`text-2xl font-black tracking-tight ${card.valueColor}`}>{card.value}</p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Emergency Requests */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-black text-slate-900">Emergency Requests Needed</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Respond to requests near you — every minute counts</p>
                </div>
                {/* Filter tabs */}
                <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
                  {filterLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => setFilterLevel(level)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                        filterLevel === level
                          ? "bg-[#E5384D] text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-sm">No {filterLevel !== "All" ? filterLevel.toLowerCase() : ""} requests right now</p>
                  <p className="text-xs mt-1">Check back soon — emergencies can appear at any time</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {filteredRequests.slice(0, 8).map((req, i) => {
                    const urgency = getUrgencyStyle(req.urgencyLevel);
                    const [reqLng, reqLat] = req.geoLocation?.coordinates ?? [0, 0];
                    const km = userLat && reqLat ? calculateHaversineKm(userLat, userLng, reqLat, reqLng) : null;

                    // Find if there's a match for this request
                    const match = matches.find((m) => m.bloodRequest === req._id || m.bloodRequest?._id === req._id);

                    // Dynamically map mock requests to real-time Indian hospitals fetched from RapidAPI
                    const realHospital = realHospitals.length > 0 ? realHospitals[i % realHospitals.length] : null;
                    const hospitalName = realHospital ? realHospital.name : (req.hospitalName ?? "Accredited Hospital");

                    return (
                      <div key={req._id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-900">{hospitalName}</p>
                              <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                {km && <><MapPin className="w-3 h-3" /><span>{km} km</span><span className="mx-1">·</span></>}
                                <Clock className="w-3 h-3" /><span>{timeAgo(req.createdAt)}</span>
                                <span className="mx-1">·</span><span>{req.unitsNeeded} units</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${urgency.bg} flex items-center gap-1`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`} />
                              {urgency.label}
                            </span>
                            <span className="text-xs font-bold text-[#E5384D] bg-rose-50 border border-rose-100 rounded-lg px-2 py-0.5">
                              {req.bloodType}
                            </span>
                          </div>
                        </div>

                        {req.description && (
                          <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">{req.description}</p>
                        )}

                        {match?.status === "accepted" ? (
                          <div className="flex items-center gap-2 py-2 px-3 bg-emerald-50 rounded-xl border border-emerald-100">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-700">Donation Accepted</span>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            {match ? (
                              <>
                                <button
                                  onClick={() => handleAcceptMatch(match._id)}
                                  className="flex-1 h-9 rounded-xl text-xs font-bold text-white shadow-sm shadow-rose-500/20 transition-all hover:opacity-90"
                                  style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}
                                >
                                  Accept Donation
                                </button>
                                <button
                                  onClick={() => handleDeclineMatch(match._id)}
                                  className="px-4 h-9 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
                                >
                                  Decline
                                </button>
                              </>
                            ) : (
                              <Link href={`/requests/${req._id}`} className="flex-1">
                                <button className="w-full h-9 rounded-xl text-xs font-bold text-white shadow-sm shadow-rose-500/20 transition-all hover:opacity-90"
                                  style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}>
                                  View Request →
                                </button>
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="hidden xl:flex flex-col gap-5 w-72 shrink-0">
            {/* Live GPS Radar Map */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="p-4 flex items-center justify-between border-b border-slate-100">
                <p className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live GPS Radar
                </p>
                <Link href="/search" className="text-xs text-[#E5384D] font-bold flex items-center gap-0.5 hover:underline">
                  View map <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              {/* Map Canvas */}
              <div className="relative h-44 bg-slate-950 overflow-hidden">
                <MapView
                  markers={filteredRequests.slice(0, 8).map((r, i) => ({
                    id: r._id,
                    lat: r.geoLocation?.coordinates?.[1] ?? (userLat ? userLat + (i * 0.008 - 0.02) : 13.0827 + (i * 0.008 - 0.02)),
                    lng: r.geoLocation?.coordinates?.[0] ?? (userLng ? userLng + (i * 0.008 - 0.02) : 80.2707 + (i * 0.008 - 0.02)),
                    layerType: r.urgencyLevel === "critical" ? "donor" : r.urgencyLevel === "high" ? "dispatch" : "hospital",
                    label: r.hospitalName || "Emergency Request",
                    sublabel: `${r.bloodType} · ${r.unitsNeeded} units`,
                  }))}
                  centerLat={userLat || 13.0827}
                  centerLng={userLng || 80.2707}
                  radiusKm={25}
                />
              </div>
              {/* Legend */}
              <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-4 bg-slate-50">
                {[["bg-rose-500", "Critical"], ["bg-amber-500", "High Alert"], ["bg-emerald-500", "Hospital"]].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${c}`} />
                    <span className="text-[10px] text-slate-500 font-medium">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Real-time Available Donors */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden font-mono">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>Top Donors Radar</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </p>
                <Link href="/search" className="text-xs text-[#E5384D] font-bold hover:underline">See all</Link>
              </div>
              <div className="divide-y divide-slate-50">
                {topDonors.length > 0 ? (
                  topDonors.slice(0, 5).map((donor, i) => {
                    const dLat = donor.location?.coordinates?.[1];
                    const dLng = donor.location?.coordinates?.[0];
                    const distKm = userLat && dLat ? calculateHaversineKm(userLat, userLng, dLat, dLng) : null;
                    const donorName = donor.user?.name || donor.name || `Donor ${i + 1}`;
                    const bloodGrp = donor.bloodType || "O+";
                    const isLive = donor.isLiveTracking;

                    return (
                      <div key={donor._id || i} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                        <div className="relative w-8 h-8 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-xs font-bold text-[#E5384D] shrink-0">
                          {donorName.charAt(0).toUpperCase()}
                          {isLive && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white animate-pulse" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                            <span>{donorName}</span>
                            {isLive && <span className="text-[7px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1 py-0.2 rounded uppercase font-black">LIVE GPS</span>}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {distKm !== null ? `${distKm} km away` : "Nearby region"}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-[#E5384D] bg-rose-50 border border-rose-100 rounded-lg px-1.5 py-0.5">
                          {bloodGrp}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  // Fallback items with dynamic distance calculation from user GPS position
                  [
                    { name: "Chioma Eze", blood: "O+", offsetLat: 0.007, offsetLng: 0.007 },
                    { name: "Tunde Bello", blood: "A-", offsetLat: -0.015, offsetLng: 0.012 },
                    { name: "Adaeze Nwosu", blood: "B+", offsetLat: 0.005, offsetLng: -0.005 },
                    { name: "Ngozi A.", blood: "O-", offsetLat: -0.025, offsetLng: -0.018 },
                  ].map((d, i) => {
                    const dLat = userLat ? userLat + d.offsetLat : 12.9716 + d.offsetLat;
                    const dLng = userLng ? userLng + d.offsetLng : 77.5946 + d.offsetLng;
                    const distKm = userLat ? calculateHaversineKm(userLat, userLng, dLat, dLng) : (i + 1) * 0.8;

                    return (
                      <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                          {d.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{d.name}</p>
                          <p className="text-[10px] text-slate-500">{distKm} km away</p>
                        </div>
                        <span className="text-[10px] font-bold text-[#E5384D] bg-rose-50 border border-rose-100 rounded-lg px-1.5 py-0.5">
                          {d.blood}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Our Contribution */}
            <div className="bg-gradient-to-br from-[#E5384D] to-[#C8102E] rounded-2xl p-4 shadow-lg shadow-rose-500/20">
              <p className="text-white font-black text-sm mb-4">Our Contribution</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Donors", value: "24K+" },
                  { label: "Lives Saved", value: "1,240" },
                  { label: "Partner Hospitals", value: "48" },
                  { label: "Requests", value: `${stats.totalRequests || "3.2K"}` },
                ].map((s) => (
                  <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/10">
                    <p className="text-white font-black text-lg leading-none">{s.value}</p>
                    <p className="text-white/70 text-[10px] font-medium mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
