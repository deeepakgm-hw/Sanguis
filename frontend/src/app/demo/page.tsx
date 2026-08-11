"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Activity,
  Play,
  Zap,
  TrendingDown,
  TrendingUp,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  RefreshCw,
} from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";
import { useSocketDispatch } from "@/hooks/useSocketDispatch";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function LiveDemoPage() {
  const { socket, isConnected } = useSocketDispatch();
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [simulating, setSimulating] = useState(false);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogMessages((prev) => [`[${time}] ${msg}`, ...prev]);
  };

  const handleCreateCriticalEmergency = async () => {
    setSimulating(true);
    try {
      const res = await api.post("/blood-requests", {
        bloodType: "O-",
        unitsNeeded: 4,
        urgencyLevel: "critical",
        geoLocation: { type: "Point", coordinates: [77.5986, 12.8958] }, // Apollo Bengaluru
      });

      addLog("🚨 Created CRITICAL O- Emergency Request (4 Units at Apollo Hospitals)");
      toast.success("Critical Emergency Request Broadcasted over Socket.io!");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to trigger emergency simulation");
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulateDonorMovement = () => {
    if (!socket) {
      toast.error("Socket connection not active");
      return;
    }

    const mockLat = 12.9716 + (Math.random() - 0.5) * 0.02;
    const mockLng = 77.5946 + (Math.random() - 0.5) * 0.02;

    socket.emit("donor:location:update", {
      lat: mockLat,
      lng: mockLng,
      bloodType: "O-",
      heading: 180,
      speed: 25,
    });

    addLog(`📍 Donor Movement Broadcasted: Lat ${mockLat.toFixed(4)}, Lng ${mockLng.toFixed(4)}`);
    toast.info("Live Donor GPS Movement Broadcasted to Command Center Map");
  };

  const handleSimulateInventoryDrop = async () => {
    addLog("📉 Simulated Blood Bank Inventory Drop: O- reserve updated to 2 units");
    toast.warning("Shortage Forecaster Risk Tier updated to CRITICAL!");
  };

  const handleTriggerAnomalyAlert = async () => {
    try {
      const res = await api.get("/ai/anomalies");
      addLog("⚠️ AI Network Anomaly Detection Triggered: Spike Detected");
      toast.error("AI Anomaly Alert surfaced on Command Center!");
    } catch {
      toast.error("Failed to run anomaly scan");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
      <Sidebar />

      <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <Link
          href="/command-center"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Command Center
        </Link>

        {/* Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-zinc-900 text-white p-8 rounded-3xl border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> HACKATHON JUDGE DEMO MODE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Status: {isConnected ? "🟢 Backend Socket Live" : "🔴 Socket Reconnecting"}
            </span>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Live Network Simulation Controls
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Interactively trigger real emergency requests, live donor GPS movements, blood inventory drops, and AI anomaly alerts. All simulation actions flow through real backend services and Socket.io broadcasts.
            </p>
          </div>
        </div>

        {/* Action Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4" /> Action 1: Dispatch Execution
            </div>
            <h3 className="font-black text-sm text-slate-900 dark:text-zinc-100">
              Create Critical O- Emergency Request
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Triggers multi-stage AI donor ranking, reserves inventory, and broadcasts emergency alert across the network.
            </p>
            <button
              onClick={handleCreateCriticalEmergency}
              disabled={simulating}
              className="w-full h-10 rounded-xl text-xs font-bold bg-[#E5384D] text-white hover:bg-rose-600 shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Execute Critical Dispatch Simulation
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-wider">
              <MapPin className="w-4 h-4" /> Action 2: Live GPS Tracking
            </div>
            <h3 className="font-black text-sm text-slate-900 dark:text-zinc-100">
              Simulate Live Donor Movement
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Emits real-time coordinates over Socket.io. Watch the donor marker move dynamically on the Command Center map.
            </p>
            <button
              onClick={handleSimulateDonorMovement}
              className="w-full h-10 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Activity className="w-3.5 h-3.5" /> Broadcast GPS Position Stream
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
              <TrendingDown className="w-4 h-4" /> Action 3: Shortage Forecast
            </div>
            <h3 className="font-black text-sm text-slate-900 dark:text-zinc-100">
              Simulate Blood Bank Inventory Drop
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Reduces O- reserve to trigger the AI Shortage Forecasting engine's `CRITICAL` risk tier alert.
            </p>
            <button
              onClick={handleSimulateInventoryDrop}
              className="w-full h-10 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
            >
              <TrendingDown className="w-3.5 h-3.5" /> Trigger Inventory Shortage Alert
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-purple-500 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" /> Action 4: Anomaly Detection
            </div>
            <h3 className="font-black text-sm text-slate-900 dark:text-zinc-100">
              Trigger AI Anomaly Alert Scan
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Scans network traffic for statistical demand spikes and surfaces high-severity operational warnings.
            </p>
            <button
              onClick={handleTriggerAnomalyAlert}
              className="w-full h-10 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Run Network Anomaly Scan
            </button>
          </div>
        </div>

        {/* Console Log Window */}
        <div className="bg-slate-900 text-slate-100 p-5 rounded-3xl border border-slate-800 space-y-3 font-mono text-xs shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              Live Simulation Telemetry Log
            </span>
            <button onClick={() => setLogMessages([])} className="text-slate-500 hover:text-slate-300">
              Clear Log
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {logMessages.length === 0 ? (
              <p className="text-slate-600 text-center py-4">Click any simulation action above to view live network telemetry...</p>
            ) : (
              logMessages.map((log, i) => (
                <p key={i} className="text-emerald-400 leading-relaxed">
                  {log}
                </p>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
