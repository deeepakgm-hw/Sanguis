"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Building2,
  Clock,
  Droplet,
  MapPin,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";
import { LiveDispatchMap } from "@/components/map/LiveDispatchMap";
import { useSocketDispatch } from "@/hooks/useSocketDispatch";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function CommandCenterPage() {
  const { socket, isConnected } = useSocketDispatch();

  // State
  const [emergencies, setEmergencies] = useState<any[]>([]);
  const [liveDonors, setLiveDonors] = useState<any[]>([]);
  const [rankedCandidates, setRankedCandidates] = useState<any[]>([]);
  const [selectedBloodType, setSelectedBloodType] = useState("O-");

  // AI Copilot state
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotMessages, setCopilotMessages] = useState<
    Array<{ sender: "user" | "ai"; text: string; actions?: string[] }>
  >([
    {
      sender: "ai",
      text: "Emergency Operations AI Copilot online. How can I assist your dispatch team today?",
      actions: [
        "Will we have enough O- blood tomorrow?",
        "Who should I contact first for emergency transfusion?",
        "Are there any active demand spikes?",
      ],
    },
  ]);
  const [copilotLoading, setCopilotLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [selectedBloodType]);

  useEffect(() => {
    if (!socket) return;

    socket.on("emergency:created", (data: any) => {
      toast.error(`🚨 CRITICAL EMERGENCY: ${data.bloodType} Blood Required!`);
      setEmergencies((prev) => [data, ...prev]);
    });

    socket.on("donor:location_updated", (data: any) => {
      setLiveDonors((prev) => {
        const filtered = prev.filter((d) => d.userId !== data.userId);
        return [
          {
            userId: data.userId,
            bloodType: data.bloodType || "O+",
            lat: data.lat,
            lng: data.lng,
            isLiveTracking: true,
          },
          ...filtered,
        ];
      });
    });

    return () => {
      socket.off("emergency:created");
      socket.off("donor:location_updated");
    };
  }, [socket]);

  const fetchInitialData = async () => {
    try {
      // Fetch AI Ranked candidates
      const rankRes = await api.get("/ai/ranking", {
        params: { bloodType: selectedBloodType, lat: 12.9716, lng: 77.5946 },
      });
      setRankedCandidates(rankRes.data?.data || []);

      // Fetch active emergencies
      const reqRes = await api.get("/blood-requests", {
        params: { status: "open", limit: 5 },
      });
      const reqList = reqRes.data?.data || [];
      setEmergencies(
        reqList.map((r: any) => ({
          id: r._id,
          bloodType: r.bloodType,
          unitsNeeded: r.unitsNeeded,
          urgencyLevel: r.urgencyLevel,
          lat: r.geoLocation?.coordinates[1] || 12.9716,
          lng: r.geoLocation?.coordinates[0] || 77.5946,
        }))
      );
    } catch {}
  };

  const handleCopilotSubmit = async (queryText?: string) => {
    const q = queryText || copilotQuery;
    if (!q.trim()) return;

    setCopilotMessages((prev) => [...prev, { sender: "user", text: q }]);
    if (!queryText) setCopilotQuery("");
    setCopilotLoading(true);

    try {
      const res = await api.post("/ai/copilot", { query: q, city: "Bengaluru" });
      const reply = res.data?.data;
      setCopilotMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: reply.answer,
          actions: reply.suggestedActions,
        },
      ]);
    } catch {
      toast.error("Copilot response failed");
    } finally {
      setCopilotLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
      <Sidebar />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-[#E5384D]">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                  Emergency Command Center
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 ${
                    isConnected
                      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? "bg-emerald-500 animate-ping" : "bg-amber-500"
                    }`}
                  />
                  {isConnected ? "SOCKET LIVE NETWORK ACTIVE" : "RECONNECTING..."}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">
                Real-time GPS tracking, multi-tier emergency dispatch execution, and AI donor ranking.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Open Judge Demo Controls
            </Link>
            <Link
              href="/requests/new"
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#E5384D] text-white hover:bg-rose-600 shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Create Emergency Request
            </Link>
          </div>
        </div>

        {/* Live Map & AI Dispatch Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Map */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#E5384D]" />
                <h3 className="font-bold text-xs text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                  Live Dispatch Intelligence Map
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {liveDonors.length} Live GPS Stream(s) Connected
              </span>
            </div>

            <LiveDispatchMap
              donors={[
                ...liveDonors,
                { userId: "d1", name: "Aarav Sharma", bloodType: "O-", lat: 12.978, lng: 77.599, isLiveTracking: true },
                { userId: "d2", name: "Priya Patel", bloodType: "A+", lat: 12.965, lng: 77.612, isLiveTracking: true },
              ]}
              hospitals={[
                { id: "h1", name: "Apollo Emergency Hub", lat: 12.8958, lng: 77.5986, city: "Bengaluru" },
                { id: "h2", name: "AIIMS Trauma Center", lat: 12.9582, lng: 77.6482, city: "Bengaluru" },
              ]}
              emergencies={emergencies}
              showShortageHeatmap={true}
            />
          </div>

          {/* Right Column: AI Donor Ranking Engine */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-500" />
                  <h3 className="font-black text-sm text-slate-900 dark:text-zinc-100">
                    AI Donor Dispatch Ranking
                  </h3>
                </div>

                <select
                  value={selectedBloodType}
                  onChange={(e) => setSelectedBloodType(e.target.value)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-bold"
                >
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                {rankedCandidates.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    Searching for AI ranked donors...
                  </p>
                ) : (
                  rankedCandidates.slice(0, 3).map((candidate, idx) => (
                    <div
                      key={candidate.donorId}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 space-y-2 hover:border-[#E5384D]/40 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#E5384D] text-white font-black text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-zinc-100">
                            {candidate.name}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500/10 text-[#E5384D]">
                            {candidate.bloodType}
                          </span>
                        </div>

                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          {candidate.responseProbabilityPercent}% Response Prob.
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Distance: {candidate.distanceKm} km</span>
                        <span>Est. ETA: {candidate.estimatedMinutes} min</span>
                      </div>

                      {/* Explainability Bullets */}
                      <div className="pt-2 border-t border-slate-200/60 dark:border-zinc-800 space-y-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Why this donor? (AI Explanation)
                        </p>
                        {candidate.explanations?.map((exp: string, i: number) => (
                          <p key={i} className="text-[10px] text-slate-600 dark:text-zinc-300 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span>{exp}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Operations Copilot Drawer Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#E5384D]" />
            <h3 className="font-black text-base text-slate-900 dark:text-zinc-100">
              Emergency Operations AI Copilot
            </h3>
          </div>

          <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 max-h-64 overflow-y-auto space-y-3">
            {copilotMessages.map((msg, index) => (
              <div
                key={index}
                className={`p-3.5 rounded-2xl text-xs max-w-2xl ${
                  msg.sender === "user"
                    ? "bg-[#E5384D] text-white ml-auto font-medium"
                    : "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-800 space-y-2"
                }`}
              >
                <p className="leading-relaxed font-medium">{msg.text}</p>

                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.actions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => handleCopilotSubmit(act)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition-all"
                      >
                        {act}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCopilotSubmit();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              placeholder="Ask AI Copilot: e.g. Will we have enough O- blood tomorrow?"
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              className="flex-1 h-11 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20"
            />
            <button
              type="submit"
              disabled={copilotLoading}
              className="h-11 px-5 rounded-xl font-bold text-xs bg-[#E5384D] text-white hover:bg-rose-600 transition-all shadow-md shadow-rose-600/20 flex items-center gap-2"
            >
              <Send className="w-4 h-4" /> Ask AI
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
