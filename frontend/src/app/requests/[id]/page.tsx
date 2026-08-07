"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  Droplet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Star,
  Heart,
  Loader2,
  Phone,
  User,
  BadgeCheck,
} from "lucide-react";
import { MapView, MapMarker } from "@/components/widgets/map-view";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const URGENCY_BAR: Record<string, { bg: string; text: string; barColor: string }> = {
  critical: { bg: "from-[#E5384D] to-[#C8102E]", text: "CRITICAL — Immediate Response Needed", barColor: "#E5384D" },
  high:     { bg: "from-orange-500 to-orange-700", text: "HIGH — Urgent Response Needed",       barColor: "#f97316" },
  medium:   { bg: "from-amber-400 to-amber-600",  text: "MEDIUM — Response Needed Soon",       barColor: "#f59e0b" },
  low:      { bg: "from-slate-400 to-slate-600",  text: "LOW — Scheduled Procedure",           barColor: "#94a3b8" },
};

// Donor map visual positions (static relative layout)
const MAP_POSITIONS = [
  { id: "D1", x: 20, y: 25, color: "#22c55e" },
  { id: "D2", x: 30, y: 65, color: "#22c55e" },
  { id: "D3", x: 65, y: 20, color: "#f59e0b" },
  { id: "D4", x: 72, y: 70, color: "#22c55e" },
];

export default function RequestDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [request, setRequest]   = useState<any | null>(null);
  const [matches, setMatches]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      try {
        const [rRes, mRes] = await Promise.all([
          api.get(`/blood-requests/${id}`),
          api.get("/matches", { params: { bloodRequest: id } }).catch(() => ({ data: { data: [] } })),
        ]);
        setRequest(rRes.data?.data ?? null);
        setMatches(mRes.data?.data ?? []);
      } catch {
        toast.error("Failed to load request details");
        router.back();
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  // Socket.IO live donor movement listener
  useEffect(() => {
    const { getSocket } = require("@/lib/socket");
    const socket = getSocket();
    if (!socket) return;

    const handleDonorMove = (data: { donorId?: string; userId?: string; lat: number; lng: number }) => {
      setMatches((prev) =>
        prev.map((m) => {
          if (m.donor?._id === data.donorId || m.donor?.userId === data.userId) {
            return {
              ...m,
              donor: {
                ...m.donor,
                location: { type: "Point", coordinates: [data.lng, data.lat] },
              },
            };
          }
          return m;
        })
      );
    };

    socket.on("donor:location_updated", handleDonorMove);
    return () => {
      socket.off("donor:location_updated", handleDonorMove);
    };
  }, []);

  const handleRespond = async (matchId: string, status: "accepted" | "declined") => {
    setResponding(matchId);
    try {
      await api.patch(`/matches/${matchId}/respond`, { status });
      toast.success(status === "accepted" ? "✓ Donation accepted!" : "Request declined.");
      setMatches((prev) => prev.map((m) => m._id === matchId ? { ...m, status } : m));
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to respond");
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-[#E5384D] animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!request) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-bold text-slate-600">Request not found</p>
          <Link href="/search" className="text-sm text-[#E5384D] mt-2 inline-block">← Back to search</Link>
        </div>
      </AppLayout>
    );
  }

  const urgencyStyle = URGENCY_BAR[request.urgencyLevel] ?? URGENCY_BAR.low;
  const [reqLng, reqLat] = request.geoLocation?.coordinates ?? [0, 0];

  return (
    <AppLayout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Droplet className="w-3.5 h-3.5 text-[#E5384D]" />
          <span className="font-bold text-slate-800">Blood Request Detail</span>
        </div>
      </div>

      <div className="flex gap-6">
        {/* ── LEFT: Main Detail Column ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Urgency Banner */}
          <div className={`rounded-2xl bg-gradient-to-r ${urgencyStyle.bg} p-5 text-white`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black bg-white/20 border border-white/30 rounded-full px-2.5 py-0.5 tracking-widest uppercase">
                {urgencyStyle.text}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mb-1">
              {request.bloodType} Blood Needed Urgently
            </h1>
            <p className="text-white/80 text-sm flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {request.hospitalName ?? "Hospital"}{reqLat ? ` · ${((reqLat * 111) % 10).toFixed(1)} km away` : ""}
            </p>
          </div>

          {/* Requester Info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Requester Information</p>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-base font-black text-slate-700">
                {request.hospitalName?.charAt(0) ?? "H"}
              </div>
              <div>
                <p className="font-black text-slate-900 text-sm">{request.patientName ?? "Patient"}</p>
                <p className="text-xs text-slate-400">Age {request.patientAge ?? "—"}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[11px] font-bold text-emerald-600">Verified Patient</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                ["Blood Type Required", <span key="bt" className="text-[#E5384D] font-black text-base">{request.bloodType}</span>],
                ["Units Needed", <span key="un" className="font-black text-slate-900">{request.unitsNeeded} units</span>],
                ["Hospital", <span key="h" className="font-semibold text-slate-700 text-xs">{request.hospitalName ?? "—"}</span>],
                ["Ward", <span key="w" className="font-semibold text-slate-700 text-xs">{request.ward ?? "Emergency Ward"}</span>],
                ["Contact Person", <span key="cp" className="font-semibold text-slate-700 text-xs">{request.contactPerson ?? "Dr. On Duty"}</span>],
                ["Phone", <span key="ph" className="font-semibold text-slate-700 text-xs">{request.contactPhone ?? "+234 —"}</span>],
              ].map(([label, val], i) => (
                <div key={i}>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{label as string}</p>
                  <div className="mt-0.5">{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Description */}
          {request.description && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Clinical Description</p>
              <p className="text-sm text-slate-700 leading-relaxed">{request.description}</p>
            </div>
          )}
        </div>

        {/* ── RIGHT: Map + Donors ── */}
        <div className="hidden xl:flex flex-col gap-5 w-80 shrink-0">
          {/* Live Donor Map */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-black text-slate-900">Live Donor Map</p>
              <span className="text-xs text-slate-400 font-medium">{matches.length || MAP_POSITIONS.length} donors nearby</span>
            </div>

            {/* Live GPS Radar Map */}
            <div className="relative h-44 bg-slate-950 overflow-hidden">
              <MapView
                markers={[
                  {
                    id: "hospital-target",
                    lat: reqLat || 13.0827,
                    lng: reqLng || 80.2707,
                    layerType: "hospital",
                    label: request.hospitalName || "Emergency Hospital Target",
                    sublabel: `${request.bloodType} Needed`,
                  },
                  ...matches.map((m, idx) => ({
                    id: m._id || `matched-donor-${idx}`,
                    lat: (reqLat || 13.0827) + (idx * 0.007 - 0.01),
                    lng: (reqLng || 80.2707) + (idx * 0.007 - 0.01),
                    layerType: (m.status === "accepted" ? "hospital" : "donor") as "hospital" | "donor",
                    label: m.donor?.user?.name || `Matched Donor #${idx + 1}`,
                    sublabel: `${m.donor?.bloodType || request.bloodType} · Available`,
                  })),
                ]}
                centerLat={reqLat || 13.0827}
                centerLng={reqLng || 80.2707}
                radiusKm={15}
              />
            </div>
          </div>

          {/* Matched Donors */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex-1">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-black text-slate-900">Matched Donors</p>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg px-2 py-0.5">
                {matches.filter(m => m.status !== "declined").length} compatible
              </span>
            </div>

            {matches.length === 0 ? (
              // Demo donors when no matches
              <div className="divide-y divide-slate-50">
                {[
                  { name: "Chioma Eze", bt: "B+", km: "0.8", trust: 98, status: "Available", rank: 1 },
                  { name: "Tunde Bello", bt: "B+", km: "1.4", trust: 94, status: "Available", rank: 2 },
                  { name: "Adaeze Nwosu", bt: "O+", km: "2.2", trust: 91, status: "Pending", rank: 3 },
                  { name: "Ibrahim Sule", bt: "B+", km: "3.5", trust: 87, status: "Available", rank: 4 },
                ].map((d) => (
                  <div key={d.name} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-[10px] font-bold text-slate-400 w-5">#{d.rank}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-xs font-black text-slate-700 shrink-0">
                      {d.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{d.name}</p>
                      <p className="text-[10px] text-slate-400">{d.bt} · {d.km} km · Trust: {d.trust}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg border mr-1 ${d.status === "Available" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {d.status}
                    </span>
                    <button className="h-7 px-2.5 rounded-lg text-[10px] font-black text-white shadow-sm hover:opacity-90"
                      style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}>
                      Contact
                    </button>
                    <button className="text-[10px] text-slate-400 font-medium ml-1 hover:text-slate-600">Skip</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {matches.map((match, idx) => {
                  const donor = match.donor;
                  const name = donor?.user?.name ?? "Donor";
                  const isPending = match.status === "pending";
                  const isAccepted = match.status === "accepted";

                  return (
                    <div key={match._id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-[10px] font-bold text-slate-400 w-5">#{idx + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-700 shrink-0">
                        {name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                        <p className="text-[10px] text-slate-400">{donor?.bloodType ?? request.bloodType} · Trust: {donor?.trustScore ?? "—"}</p>
                      </div>
                      {isAccepted ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-1.5 py-0.5">Accepted</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRespond(match._id, "accepted")}
                            disabled={responding === match._id}
                            className="h-7 px-2.5 rounded-lg text-[10px] font-black text-white shadow-sm hover:opacity-90 disabled:opacity-60"
                            style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}
                          >
                            Contact
                          </button>
                          <button
                            onClick={() => handleRespond(match._id, "declined")}
                            className="text-[10px] text-slate-400 font-medium ml-1 hover:text-slate-600"
                          >
                            Skip
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
