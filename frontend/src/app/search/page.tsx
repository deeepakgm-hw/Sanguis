"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { toast } from "sonner";
import Link from "next/link";
import {
  Search,
  MapPin,
  Filter,
  Clock,
  Building2,
  Star,
  Heart,
  CheckCircle2,
  XCircle,
  Users,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useLiveLocation, calculateHaversineKm } from "@/hooks/use-live-location";

const BLOOD_CHIPS = ["All", "O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"] as const;

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getUrgencyBadge(level: string) {
  const map: Record<string, string> = {
    critical: "bg-rose-100 text-rose-700 border-rose-200",
    high:     "bg-orange-100 text-orange-700 border-orange-200",
    medium:   "bg-amber-100 text-amber-700 border-amber-200",
    low:      "bg-gray-100 text-gray-600 border-gray-200",
  };
  return map[level] ?? map.low;
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const { lat: userLat, lng: userLng } = useLiveLocation();
  const [activeTab, setActiveTab] = useState<"donors" | "requests" | "hospitals">("donors");
  const [selectedBlood, setSelectedBlood] = useState<string>("All");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [donors, setDonors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, hospRes] = await Promise.all([
        api.get("/blood-requests", { params: { status: "open", limit: 50 } }),
        api.get("/hospitals", { params: { limit: 50 } }).catch(() => ({ data: { data: [] } })),
      ]);
      setRequests(reqRes.data?.data ?? []);
      setHospitals(hospRes.data?.data ?? []);
      // Donors endpoint requires admin — show graceful empty state
      try {
        const dRes = await api.get("/donors", { params: { limit: 50 } });
        setDonors(dRes.data?.data ?? []);
      } catch {
        setDonors([]);
      }
    } catch (err) {
      console.error("Search fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter helpers
  const filterDonors = (list: any[]) =>
    list.filter((d) => {
      const bt = d.bloodType ?? "";
      const matchBT = selectedBlood === "All" || bt === selectedBlood;
      const matchQ = !query || d.user?.name?.toLowerCase().includes(query.toLowerCase()) || bt.toLowerCase().includes(query.toLowerCase());
      return matchBT && matchQ;
    });

  const filterRequests = (list: any[]) =>
    list.filter((r) => {
      const bt = r.bloodType ?? "";
      const matchBT = selectedBlood === "All" || bt === selectedBlood;
      const matchQ = !query ||
        r.hospitalName?.toLowerCase().includes(query.toLowerCase()) ||
        r.description?.toLowerCase().includes(query.toLowerCase()) ||
        bt.toLowerCase().includes(query.toLowerCase());
      return matchBT && matchQ;
    });

  const filterHospitals = (list: any[]) =>
    list.filter((h) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        h.name?.toLowerCase().includes(q) ||
        h.city?.toLowerCase().includes(q) ||
        h.state?.toLowerCase().includes(q) ||
        h.address?.toLowerCase().includes(q)
      );
    });

  const visibleDonors = filterDonors(donors);
  const visibleRequests = filterRequests(requests);
  const visibleHospitals = filterHospitals(hospitals);

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Search</h1>
          <p className="text-sm text-slate-500 mt-0.5">Find compatible donors, emergency requests, and accredited hospitals near you</p>
        </div>

        {/* Search Bar + Filter Button */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, blood type, hospital or city…"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all shadow-sm"
            />
          </div>
          <button className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={fetchData}
            className="h-11 px-5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 shadow-md shadow-rose-500/20"
            style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}
          >
            Search
          </button>
        </div>

        {/* Blood Type Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {BLOOD_CHIPS.map((bt) => (
            <button
              key={bt}
              onClick={() => setSelectedBlood(bt)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 border ${
                selectedBlood === bt
                  ? "bg-[#E5384D] text-white border-[#E5384D] shadow-md shadow-rose-500/20"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {bt}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-slate-200">
          {([
            ["donors", "Blood Donors", visibleDonors.length],
            ["requests", "Recent Requests", visibleRequests.length],
            ["hospitals", "Accredited Hospitals (RapidAPI)", visibleHospitals.length],
          ] as const).map(([tab, label, count]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-3 px-1 mr-6 text-sm font-bold transition-all border-b-2 ${
                activeTab === tab
                  ? "text-[#E5384D] border-[#E5384D]"
                  : "text-slate-400 border-transparent hover:text-slate-600"
              }`}
            >
              {label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? "bg-rose-100 text-[#E5384D]" : "bg-slate-100 text-slate-500"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 text-[#E5384D] animate-spin" />
          </div>
        ) : activeTab === "donors" ? (
          /* ── BLOOD DONORS GRID ── */
          visibleDonors.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">No donors found</p>
              <p className="text-xs mt-1">Try a different blood type or location</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleDonors.map((donor) => {
                const isAvailable = donor.isAvailable !== false;
                const name = donor.user?.name ?? "Unknown Donor";
                const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

                return (
                  <div key={donor._id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-sm font-black text-slate-700">
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#E5384D]" />
                            {donor.location?.coordinates
                              ? `${calculateHaversineKm(userLat, userLng, donor.location.coordinates[1], donor.location.coordinates[0])} km away`
                              : "Location active"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!isAvailable && (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-1.5 py-0.5">
                            Busy
                          </span>
                        )}
                        <span className="text-xs font-bold text-[#E5384D] bg-rose-50 border border-rose-100 rounded-lg px-2 py-0.5">
                          {donor.bloodType ?? "?"}
                        </span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="text-center">
                        <p className="text-lg font-black text-purple-600">{donor.trustScore ?? "—"}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Trust Score</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-black text-blue-600">{donor.totalDonations ?? 0}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Donations</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-xs font-bold ${isAvailable ? "text-emerald-600" : "text-amber-500"}`}>
                          {isAvailable ? "✓ Free" : "● Busy"}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">Status</p>
                      </div>
                    </div>

                    <button
                      disabled={!isAvailable}
                      className={`w-full h-9 rounded-xl text-xs font-bold transition-all duration-200 ${
                        isAvailable
                          ? "text-white shadow-sm shadow-rose-500/20 hover:opacity-90"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                      style={isAvailable ? { background: "linear-gradient(135deg, #E5384D, #C8102E)" } : {}}
                      onClick={() => {
                        if (isAvailable) toast.info("Go to Create Request to request this donor");
                      }}
                    >
                      {isAvailable ? "Request Donation" : "Currently Unavailable"}
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === "requests" ? (
          /* ── RECENT REQUESTS LIST ── */
          visibleRequests.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">No open requests</p>
              <p className="text-xs mt-1">All caught up — no emergency requests right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleRequests.map((req) => (
                <Link href={`/requests/${req._id}`} key={req._id}>
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md hover:border-[#E5384D]/20 transition-all duration-200 cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{req.hospitalName ?? "Hospital"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />{timeAgo(req.createdAt)}
                            </span>
                            <span className="text-xs text-slate-400">·</span>
                            <span className="text-xs text-slate-500">{req.unitsNeeded} units needed</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border capitalize ${getUrgencyBadge(req.urgencyLevel)}`}>
                          {req.urgencyLevel}
                        </span>
                        <span className="text-xs font-bold text-[#E5384D] bg-rose-50 border border-rose-100 rounded-lg px-2 py-0.5">
                          {req.bloodType}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    {req.description && (
                      <p className="text-xs text-slate-500 mt-3 leading-relaxed line-clamp-2">{req.description}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          /* ── ACCREDITED HOSPITALS (RAPIDAPI) LIST ── */
          visibleHospitals.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-bold text-sm">No accredited hospitals found</p>
              <p className="text-xs mt-1">Try a different city or search query</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleHospitals.map((hosp, idx) => (
                <div
                  key={hosp.id || idx}
                  className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-[#E5384D]/30 transition-all duration-200 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center font-bold">
                        🏥
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 leading-snug">{hosp.name}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{hosp.category || "Emergency & Trauma Center"}</p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      RapidAPI Verified
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#E5384D] shrink-0" />
                      <span>{hosp.address || `${hosp.city}, ${hosp.state}`}</span>
                    </p>
                    {hosp.phoneNumber && (
                      <p className="flex items-center gap-1.5 text-slate-500">
                        <span className="font-bold">📞 Phone:</span> {hosp.phoneNumber}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                      🟢 24/7 Emergency Transfusion Ready
                    </span>
                    <Link
                      href="/requests/new"
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E5384D] text-white hover:bg-rose-600 shadow-sm transition-all flex items-center gap-1"
                    >
                      Request Blood
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </AppLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center font-mono text-xs text-slate-500">
        Loading search portal...
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
