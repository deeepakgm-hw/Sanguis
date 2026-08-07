"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  Compass,
  Heart,
  MapPin,
  Navigation,
  Phone,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { MapView, MapMarker } from "@/components/widgets/map-view";

interface EmergencyRequest {
  id: string;
  patientName: string;
  bloodType: string;
  unitsNeeded: number;
  urgencyLevel: "critical" | "high" | "medium" | "low";
  hospital: string;
  doctor: string;
  status: "routing_cascade" | "sms_broadcast" | "match_secured" | "courier_transit" | "completed";
  countdownSeconds: number;
  latitude: number;
  longitude: number;
  createdAt: string;
  aiRationale: string;
}

interface DonorCandidate {
  id: string;
  name: string;
  bloodType: string;
  trustScore: number;
  etaMinutes: number;
  status: "accepted" | "declined" | "pending_response" | "en_route";
  lat: number;
  lng: number;
  phone: string;
}

interface BankStock {
  id: string;
  name: string;
  unitsAvailable: number;
  distanceKm: number;
  lat: number;
  lng: number;
}

export default function HospitalCommandCenterPage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);

  // --- Command Center State (pre-populated for demonstration) ---
  const [emergencies, setEmergencies] = useState<EmergencyRequest[]>([
    {
      id: "req-101",
      patientName: "Patient A",
      bloodType: "O-",
      unitsNeeded: 4,
      urgencyLevel: "critical",
      hospital: "General Hospital — Emergency Wing",
      doctor: "Attending Physician (Cardiology)",
      status: "courier_transit",
      countdownSeconds: 680,
      latitude: 13.0827,
      longitude: 80.2707,
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      aiRationale: "O- critical emergency. Local inventories depleted. Spatial Cascade automatically escalated request to nearby O- donors and dispatched courier to the closest verified blood bank.",
    },
    {
      id: "req-102",
      patientName: "Patient B",
      bloodType: "AB-",
      unitsNeeded: 2,
      urgencyLevel: "high",
      hospital: "Regional Medical Center — Trauma",
      doctor: "Attending Physician (Trauma Care)",
      status: "sms_broadcast",
      countdownSeconds: 1440,
      latitude: 13.0067,
      longitude: 80.2206,
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      aiRationale: "AB- rare group shortage. Regional bank matching fails. Triggered auto cross-referral routing to nearby sub-districts.",
    },
    {
      id: "req-103",
      patientName: "Patient C",
      bloodType: "B+",
      unitsNeeded: 5,
      urgencyLevel: "medium",
      hospital: "City Blood Coordination Hub",
      doctor: "Attending Physician (Hematology)",
      status: "match_secured",
      countdownSeconds: 2400,
      latitude: 13.0475,
      longitude: 80.2089,
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      aiRationale: "B+ request secured. Donor match confirmed and en-route. Transit telemetry active.",
    },
    {
      id: "req-104",
      patientName: "Patient D",
      bloodType: "O+",
      unitsNeeded: 3,
      urgencyLevel: "low",
      hospital: "District Clinic — Scheduled Procedure",
      doctor: "Attending Physician (Surgery)",
      status: "routing_cascade",
      countdownSeconds: 3600,
      latitude: 13.1147,
      longitude: 80.2878,
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      aiRationale: "Monitoring regional replenishment index. Satisfying locally via scheduled blood bank pickup.",
    },
  ]);

  const [selectedReqId, setSelectedReqId] = useState<string>("req-101");
  const [selectedReq, setSelectedReq] = useState<EmergencyRequest | null>(null);

  // Donor telemetry
  const [donors, setDonors] = useState<DonorCandidate[]>([
    { id: "don-1", name: "Donor A", bloodType: "O-", trustScore: 98, etaMinutes: 12, status: "en_route", lat: 13.0910, lng: 80.2550, phone: "—" },
    { id: "don-2", name: "Donor B", bloodType: "O-", trustScore: 95, etaMinutes: 15, status: "accepted", lat: 13.0720, lng: 80.2810, phone: "—" },
    { id: "don-3", name: "Donor C", bloodType: "O-", trustScore: 89, etaMinutes: 18, status: "pending_response", lat: 13.1020, lng: 80.2600, phone: "—" },
    { id: "don-4", name: "Donor D", bloodType: "AB-", trustScore: 99, etaMinutes: 9, status: "declined", lat: 13.0200, lng: 80.2100, phone: "—" },
    { id: "don-5", name: "Donor E", bloodType: "B+", trustScore: 92, etaMinutes: 22, status: "accepted", lat: 13.0410, lng: 80.1990, phone: "—" },
  ]);

  // Blood banks
  const [bloodBanks, setBloodBanks] = useState<BankStock[]>([
    { id: "bank-1", name: "Central Metro Red Cross", unitsAvailable: 18, distanceKm: 4.2, lat: 13.0750, lng: 80.2650 },
    { id: "bank-2", name: "Adyar Regional Repository", unitsAvailable: 7, distanceKm: 8.5, lat: 13.0010, lng: 80.2520 },
    { id: "bank-3", name: "North Chennai Blood Hub", unitsAvailable: 2, distanceKm: 12.1, lat: 13.1420, lng: 80.2910 },
  ]);

  // Real hospital data sourced from Google Places API / DB lookup
  const [realHospitals, setRealHospitals] = useState<any[]>([]);
  const [poweredByGoogle, setPoweredByGoogle] = useState(true);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  // Telemetry loop for live moving donors & countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Decrement countdown timers
      setEmergencies((prev) =>
        prev.map((e) => ({
          ...e,
          countdownSeconds: Math.max(0, e.countdownSeconds - 1),
        }))
      );

      // 2. Simulate live donor movement
      setDonors((prev) =>
        prev.map((d) => {
          if (d.status === "en_route") {
            // Move slightly towards the active request coordinates (13.0827, 80.2707)
            const targetLat = 13.0827;
            const targetLng = 80.2707;
            const latDiff = targetLat - d.lat;
            const lngDiff = targetLng - d.lng;
            return {
              ...d,
              lat: d.lat + latDiff * 0.05,
              lng: d.lng + lngDiff * 0.05,
              etaMinutes: Math.max(1, Math.round(d.etaMinutes - 0.1)),
            };
          }
          return d;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update selected request cache
  useEffect(() => {
    const req = emergencies.find((e) => e.id === selectedReqId) || null;
    setSelectedReqId(req?.id || "req-101");
  }, [selectedReqId, emergencies]);

  // Center coordinates for spatial map
  const centerLat = emergencies.find(e => e.id === selectedReqId)?.latitude ?? 13.0827;
  const centerLng = emergencies.find(e => e.id === selectedReqId)?.longitude ?? 80.2707;

  // Fetch real nearby hospital data from backend Google Places API route
  useEffect(() => {
    async function fetchHospitals() {
      try {
        const res = await api.get("/hospitals/nearby", {
          params: { lat: centerLat, lng: centerLng, radius: 15000 },
        });
        if (res.data?.data?.hospitals) {
          setRealHospitals(res.data.data.hospitals);
          setPoweredByGoogle(res.data.data.poweredByGoogle ?? true);
        }
      } catch (err) {
        console.warn("Real hospital lookup failed — falling back to local markers", err);
      }
    }
    fetchHospitals();
  }, [centerLat, centerLng]);

  // Route auth guard
  useEffect(() => {
    if (!isBootstrapping && !user) {
      router.replace("/login");
      return;
    }
  }, [isBootstrapping, user, router]);

  if (isBootstrapping || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center font-mono">
          <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping mx-auto mb-4" />
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Verifying Dispatch Clearance…</p>
        </div>
      </div>
    );
  }

  // Format seconds to MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Convert markers for MapView component
  const mapMarkers: MapMarker[] = [];

  // Add center selected emergency hospital
  mapMarkers.push({
    id: selectedReq?.id ?? "hospital-center",
    lat: centerLat,
    lng: centerLng,
    layerType: "hospital",
    label: selectedReq?.hospital ?? "General Hospital — Emergency Wing",
    sublabel: "Active Clinical Dispatch Center",
    dataSource: "manual",
  });

  // Add real Google Places hospitals if loaded
  realHospitals.forEach((h: any, idx: number) => {
    const hLat = h.location?.coordinates?.[1];
    const hLng = h.location?.coordinates?.[0];
    if (hLat && hLng) {
      mapMarkers.push({
        id: h.googlePlaceId || `real-hosp-${idx}`,
        lat: hLat,
        lng: hLng,
        layerType: "hospital",
        label: h.name,
        sublabel: h.formattedAddress,
        address: h.formattedAddress,
        phone: h.phoneNumber,
        dataSource: h.dataSource || "google_places",
      });
    }
  });

  // Add nearby blood banks
  bloodBanks.forEach((b) => {
    mapMarkers.push({
      id: b.id,
      lat: b.lat,
      lng: b.lng,
      layerType: "bank",
      label: b.name,
      sublabel: `${b.unitsAvailable} Units Available (${b.distanceKm}km)`,
    });
  });

  // Add nearby donors
  donors.forEach((d) => {
    mapMarkers.push({
      id: d.id,
      lat: d.lat,
      lng: d.lng,
      layerType: d.status === "en_route" ? "dispatch" : "donor",
      label: d.name,
      sublabel: `ABO: ${d.bloodType} · Trust: ${d.trustScore}% · Status: ${d.status}`,
    });
  });

  const getUrgencyClass = (urgency: string) => {
    if (urgency === "critical") return "text-rose-400 border-rose-500/30 bg-rose-500/10 animate-pulse";
    if (urgency === "high") return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    if (urgency === "medium") return "text-blue-400 border-blue-500/30 bg-blue-500/10";
    return "text-zinc-400 border-zinc-800 bg-zinc-900/50";
  };

  const getStatusLabel = (status: string) => {
    return status.replace("_", " ").toUpperCase();
  };

  return (
    <main className="relative mx-auto max-w-7xl px-4 py-8 min-h-screen bg-zinc-950 text-zinc-50 font-mono">
      <div className="absolute top-[-10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />

      {/* --- Top Controller Header --- */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
            <Radio className="h-4.5 w-4.5 text-rose-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-zinc-100 flex items-center gap-2">
              SANGUIS EMERGENCY DISPATCH CENTER
              <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded uppercase tracking-widest font-mono animate-pulse">ATC MODE</span>
            </h1>
            <p className="text-[10px] text-zinc-500 mt-0.5 uppercase tracking-widest">Tactical operations · Spatial cascade router · telemetry</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[9px] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
            TELEMETRY ACTIVE
          </div>
          <ThemeToggle />
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="font-bold text-[10px] uppercase border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 h-8">
              Gateway
            </Button>
          </Link>
        </div>
      </div>

      {/* --- Main 3-Column Air Traffic Control grid --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ── COLUMN 1: Active Emergency Queue (col-span-3) ── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="border-b border-zinc-900 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Active Queue</span>
            <span className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{emergencies.length} ACTIVE</span>
          </div>

          <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
            {emergencies.map((req) => {
              const isSelected = req.id === selectedReqId;
              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedReqId(req.id)}
                  className={`border p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-rose-500 bg-rose-500/5 shadow-lg shadow-rose-950/20"
                      : "border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 hover:bg-zinc-900/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold bg-zinc-950 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{req.id}</span>
                    <span className={`text-[8px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getUrgencyClass(req.urgencyLevel)}`}>
                      {req.urgencyLevel}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-sm font-extrabold text-zinc-100">{req.patientName}</span>
                    <span className="text-xl font-black text-rose-500">{req.bloodType}</span>
                  </div>

                  <div className="text-[9px] text-zinc-400 space-y-1">
                    <p className="truncate"><span className="text-zinc-500">HOSP:</span> {req.hospital}</p>
                    <p className="truncate"><span className="text-zinc-500">PHYS:</span> {req.doctor}</p>
                    <p className="font-mono text-zinc-500"><span className="text-zinc-500">REQ:</span> {req.unitsNeeded} Units</p>
                  </div>

                  <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500 uppercase tracking-wider">{getStatusLabel(req.status)}</span>
                    <span className="font-mono font-bold text-rose-400 flex items-center gap-1 animate-pulse">
                      <Clock className="h-3 w-3" /> {formatTime(req.countdownSeconds)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COLUMN 2: Center Interactive Dispatch Map (col-span-5) ── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl overflow-hidden relative">
            <div className="p-3 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                <Compass className="h-4 w-4 text-rose-500 animate-spin" style={{ animationDuration: "12s" }} /> Live ATC Radar Telemetry
              </span>
              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                RADAR ONLINE
              </span>
            </div>
            
            {/* Live radar map window */}
            <div className="h-96 relative">
              <MapView
                markers={mapMarkers}
                centerLat={centerLat}
                centerLng={centerLng}
                radiusKm={10}
                onMarkerClick={(m) => setSelectedMarker(m)}
                poweredByGoogle={poweredByGoogle}
              />
            </div>

            {/* Selected Marker Detail Card with Attribution */}
            {selectedMarker && (
              <div className="p-3 border-t border-zinc-800 bg-zinc-950/90 text-xs space-y-1 relative">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-100 uppercase flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-emerald-400" />
                    {selectedMarker.label}
                  </span>
                  <button onClick={() => setSelectedMarker(null)} className="text-[10px] text-zinc-500 hover:text-zinc-300 font-mono">✕ Close</button>
                </div>
                {selectedMarker.address && (
                  <p className="text-[10px] text-zinc-400 font-sans">{selectedMarker.address}</p>
                )}
                {selectedMarker.phone && (
                  <p className="text-[9.5px] text-zinc-500 font-mono flex items-center gap-1">
                    <Phone className="h-3 w-3 text-emerald-500" /> {selectedMarker.phone}
                  </p>
                )}
                <div className="pt-1 flex items-center justify-between text-[8px] font-mono text-zinc-500 uppercase">
                  <span>LAT/LNG: {selectedMarker.lat.toFixed(4)}, {selectedMarker.lng.toFixed(4)}</span>
                  <span className="text-blue-400 font-bold">Data via Google Places</span>
                </div>
              </div>
            )}

            {/* Traffic & Map Metadata Overlay */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950/60 grid grid-cols-3 gap-2 text-center text-[9px] font-mono text-zinc-500 uppercase">
              <div>
                <p className="text-zinc-300 font-bold">TRAFFIC</p>
                <p className="text-emerald-400 mt-0.5">MODERATE (1.1x)</p>
              </div>
              <div className="border-x border-zinc-800">
                <p className="text-zinc-300 font-bold">RADIUS</p>
                <p className="text-zinc-400 mt-0.5">10.0 KM ZONE</p>
              </div>
              <div>
                <p className="text-zinc-300 font-bold">BEST ETA</p>
                <p className="text-rose-400 font-bold mt-0.5">12 MINS</p>
              </div>
            </div>
          </div>

          {/* AI Recommendation panel */}
          {selectedReq && (
            <div className="border border-rose-900/30 bg-rose-950/5 rounded-xl p-4 space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-12 w-12 bg-rose-500/5 blur-lg pointer-events-none" />
              <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 mb-2">
                <Sparkles className="h-4 w-4 text-rose-500" />
                <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">AI Cascade Pre-Flight Analysis</h3>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">{selectedReq.aiRationale}</p>
            </div>
          )}
        </div>

        {/* ── COLUMN 3: Telemetry, Donors & Inventories (col-span-4) ── */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Dispatch Progress Tracker */}
          {selectedReq && (
            <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4">
              <div className="border-b border-zinc-800 pb-2 mb-3">
                <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Dispatch Status Telemetry</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="border border-zinc-800 bg-zinc-950 p-2.5 rounded-lg">
                  <p className="text-[8px] text-zinc-500 uppercase tracking-widest">EST. DELIVERY ETA</p>
                  <p className="text-base font-black text-rose-400 font-mono mt-0.5">12 Min</p>
                </div>
                <div className="border border-zinc-800 bg-zinc-950 p-2.5 rounded-lg">
                  <p className="text-[8px] text-zinc-500 uppercase tracking-widest">STATUS TIER</p>
                  <p className="text-xs font-black text-zinc-200 uppercase mt-1">{getStatusLabel(selectedReq.status)}</p>
                </div>
              </div>

              {/* Progress steps */}
              <div className="space-y-2.5">
                {[
                  { step: "CASCADE", label: "AI Cascade Scan", done: true },
                  { step: "BROADCAST", label: "SMS Alerts Dispatched", done: selectedReq.status !== "routing_cascade" },
                  { step: "MATCHED", label: "Donor Acceptance Secured", done: ["match_secured", "courier_transit", "completed"].includes(selectedReq.status) },
                  { step: "TRANSIT", label: "Courier Transit En-Route", done: ["courier_transit", "completed"].includes(selectedReq.status) },
                ].map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-500 uppercase tracking-wider">{s.label}</span>
                    <span className={`font-bold ${s.done ? "text-emerald-400" : "text-zinc-600"}`}>
                      {s.done ? "✓ COMPLETE" : "● PENDING"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compatible Donor Rankings */}
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4">
            <div className="border-b border-zinc-800 pb-2 mb-3">
              <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Compatible Donor Network</h3>
            </div>

            <div className="space-y-2.5">
              {donors.map((d) => {
                const statusStyles: Record<string, string> = {
                  en_route: "text-rose-400 bg-rose-500/15 border-rose-500/20 animate-pulse",
                  accepted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                  pending_response: "text-amber-400 bg-amber-500/10 border-amber-500/20",
                  declined: "text-zinc-500 bg-zinc-950 border border-zinc-800",
                };
                return (
                  <div key={d.id} className="p-2.5 border border-zinc-800/80 bg-zinc-950 rounded-lg flex items-center justify-between gap-3 text-[10px]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-zinc-200">{d.name}</span>
                        <span className="text-rose-500 font-extrabold">{d.bloodType}</span>
                      </div>
                      <p className="text-[9px] text-zinc-500 font-mono mt-0.5">Trust: {d.trustScore}% · {d.phone}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded border inline-block ${statusStyles[d.status]}`}>
                        {d.status === "en_route" ? `En Route · ${d.etaMinutes}m` : d.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Blood Bank Inventory Panel */}
          <div className="border border-zinc-800 bg-zinc-900/10 rounded-xl p-4">
            <div className="border-b border-zinc-800 pb-2 mb-3">
              <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Regional Repository Reserves</h3>
            </div>

            <div className="space-y-2">
              {bloodBanks.map((b) => (
                <div key={b.id} className="p-2.5 border border-zinc-800 bg-zinc-950 rounded-lg flex items-center justify-between gap-2 text-[10px] font-mono">
                  <div>
                    <p className="font-bold text-zinc-200 truncate max-w-[180px]">{b.name}</p>
                    <p className="text-[9px] text-zinc-500 mt-0.5">Dist: {b.distanceKm} KM · GPS coords active</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-zinc-100">{b.unitsAvailable} Units</p>
                    <p className="text-[8px] text-zinc-500 uppercase">Available</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
