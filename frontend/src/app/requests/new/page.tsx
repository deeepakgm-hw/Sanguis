"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/app-layout";
import { toast } from "sonner";
import {
  Droplet,
  MapPin,
  CheckCircle2,
  Loader2,
  Activity,
  Zap,
  Info,
  Phone,
  User,
} from "lucide-react";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
type BloodType = (typeof BLOOD_TYPES)[number];

const URGENCY_OPTIONS = [
  { value: "critical", label: "Critical",  desc: "Life-threatening, immediate" },
  { value: "high",     label: "High",      desc: "Urgent, within hours" },
  { value: "medium",   label: "Medium",    desc: "Needed within 24 hrs" },
  { value: "low",      label: "Low",       desc: "Scheduled procedure" },
];

const HOW_IT_WORKS = [
  { num: 1, title: "Submit Request",    desc: "Fill in the blood type, units needed, and hospital info." },
  { num: 2, title: "Donors Notified",   desc: "Compatible donors within 10 km receive an instant alert." },
  { num: 3, title: "Match & Connect",   desc: "Donors accept and coordinate directly with your contact." },
  { num: 4, title: "Donation Complete", desc: "Blood is delivered, trust scores updated for both parties." },
];

export default function CreateRequestPage() {
  const router = useRouter();
  const { isBootstrapping } = useAuth();
  const user = useAuthStore((s) => s.user);

  const [bloodType, setBloodType]         = useState<BloodType>("O+");
  const [unitsNeeded, setUnitsNeeded]     = useState<string>("3");
  const [urgencyLevel, setUrgencyLevel]   = useState("critical");
  const [hospitalName, setHospitalName]   = useState("");
  const [hospitalLocation, setHospitalLocation] = useState("");
  const [patientName, setPatientName]     = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone]   = useState("");
  const [description, setDescription]     = useState("");
  const [lat, setLat]   = useState("13.0827");
  const [lng, setLng]   = useState("80.2707");
  const [geolocating, setGeolocating]     = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [forecast, setForecast] = useState<any | null>(null);

  useEffect(() => {
    if (!isBootstrapping && !user) router.replace("/login");
  }, [isBootstrapping, user, router]);

  // Auto-detect location silently on mount
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
      setLocationDetected(true);
    });
  }, []);

  // Forecast banner
  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get("/forecast", {
          params: { lat: parseFloat(lat), lng: parseFloat(lng), radiusKm: 50, bloodType },
        });
        setForecast(res.data?.data ?? null);
      } catch { setForecast(null); }
    };
    run();
  }, [bloodType, lat, lng]);

  const handleGeolocate = () => {
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocationDetected(true);
        setHospitalLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        toast.success("Location detected!");
        setGeolocating(false);
      },
      () => { toast.error("Unable to detect location"); setGeolocating(false); }
    );
  };

  const handleAddressGeocode = async (addressQuery: string) => {
    setHospitalLocation(addressQuery);
    if (!addressQuery.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setLat(parseFloat(data[0].lat).toFixed(6));
        setLng(parseFloat(data[0].lon).toFixed(6));
        setLocationDetected(true);
      }
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalName.trim()) { toast.error("Hospital name is required"); return; }
    if (!unitsNeeded || parseInt(unitsNeeded) < 1) { toast.error("Enter a valid unit count"); return; }
    setLoading(true);
    try {
      await api.post("/blood-requests", {
        bloodType,
        unitsNeeded: parseInt(unitsNeeded),
        urgencyLevel,
        description: description.trim() || undefined,
        hospitalName: hospitalName.trim(),
        geoLocation: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
      });
      setSuccess(true);
      toast.success("Request submitted! Matching donors now…");
      setTimeout(() => router.push("/dashboard"), 2200);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Request Submitted!</h2>
            <p className="text-slate-500 text-sm">Matching you with nearby donors now…</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const tierColor: Record<string, string> = {
    healthy: "text-emerald-700 bg-emerald-50 border-emerald-200",
    watch:   "text-amber-700 bg-amber-50 border-amber-200",
    critical:"text-rose-700 bg-rose-50 border-rose-200",
  };

  return (
    <AppLayout>
      <div className="flex gap-6">
        {/* ── MAIN FORM COLUMN ── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Header */}
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Create Blood Request</h1>
            <p className="text-sm text-slate-500 mt-0.5">Submit an emergency blood request to connect with nearby donors.</p>
          </div>

          {/* Forecast Banner */}
          {forecast && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-semibold ${tierColor[forecast.tier] ?? "text-slate-600 bg-slate-50 border-slate-200"}`}>
              <Zap className="w-4 h-4 shrink-0" />
              <span>Regional <strong>{bloodType}</strong> supply is <strong className="capitalize">{forecast.tier}</strong>
                {forecast.breakdown?.eligibleDonorCount != null && ` — ${forecast.breakdown.eligibleDonorCount} eligible donors near you`}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Blood Type */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-sm font-black text-slate-900 mb-1">Blood Type Required <span className="text-[#E5384D]">*</span></p>
              <p className="text-xs text-slate-400 mb-3">Select the blood type needed</p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {BLOOD_TYPES.map((bt) => (
                  <button key={bt} type="button" onClick={() => setBloodType(bt)}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all duration-200 border ${
                      bloodType === bt
                        ? "bg-[#E5384D] text-white border-[#E5384D] shadow-md shadow-rose-500/25"
                        : "bg-gray-50 text-slate-600 border-slate-200 hover:border-slate-300"
                    }`}>
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Units + Hospital Name */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">Units Needed <span className="text-[#E5384D]">*</span></label>
                  <input
                    value={unitsNeeded}
                    onChange={(e) => setUnitsNeeded(e.target.value)}
                    type="number" min="1" max="20" placeholder="e.g. 3"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">Hospital Name <span className="text-[#E5384D]">*</span></label>
                  <input
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="Lagos University Teaching Hospital"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Hospital Location */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <label className="block text-sm font-black text-slate-900 mb-1.5">Hospital Location <span className="text-[#E5384D]">*</span></label>
              <div className="relative">
                <input
                  value={hospitalLocation}
                  onChange={(e) => handleAddressGeocode(e.target.value)}
                  placeholder="Enter hospital address or search (e.g. Surulere, Lagos)…"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 pr-28 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                />
                <button
                  type="button"
                  onClick={handleGeolocate}
                  disabled={geolocating}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs font-bold text-[#E5384D] hover:opacity-70 transition-opacity pr-1"
                >
                  {geolocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                  Use GPS
                </button>
              </div>
              {locationDetected && (
                <p className="text-xs text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Location auto-detected
                </p>
              )}
            </div>

            {/* Urgency Level */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <p className="text-sm font-black text-slate-900 mb-3">Urgency Level <span className="text-[#E5384D]">*</span></p>
              <div className="grid grid-cols-2 gap-3">
                {URGENCY_OPTIONS.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    onClick={() => setUrgencyLevel(u.value)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                      urgencyLevel === u.value
                        ? u.value === "critical" ? "bg-rose-50 border-[#E5384D]"
                          : u.value === "high" ? "bg-orange-50 border-orange-400"
                          : u.value === "medium" ? "bg-amber-50 border-amber-400"
                          : "bg-gray-50 border-gray-400"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className={`text-sm font-black ${urgencyLevel === u.value
                      ? u.value === "critical" ? "text-[#E5384D]"
                        : u.value === "high" ? "text-orange-700"
                        : u.value === "medium" ? "text-amber-700"
                        : "text-gray-700"
                      : "text-slate-800"}`}>
                      {u.label}
                    </p>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">{u.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Patient + Contact */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">Patient Name</label>
                  <input
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Full name of patient"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-900 mb-1.5">Contact Person</label>
                  <input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Doctor or family contact"
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-black text-slate-900 mb-1.5">Contact Phone <span className="text-[#E5384D]">*</span></label>
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  type="tel"
                  placeholder="+234 802 345 6789"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                />
              </div>
            </div>

            {/* Clinical Description */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <label className="block text-sm font-black text-slate-900 mb-1.5">Clinical Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Patient Amara Osei underwent emergency abdominal surgery following trauma from a road accident..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all resize-none"
              />
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-2xl font-black text-sm text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-xl shadow-rose-500/25"
              style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}>
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : <><Activity className="w-4 h-4" />Submit Emergency Request</>}
            </button>
          </form>
        </div>

        {/* ── RIGHT SIDEBAR ── */}
        <div className="hidden xl:flex flex-col gap-5 w-72 shrink-0">
          {/* How it Works card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Red droplet hero */}
            <div className="flex flex-col items-center py-8 px-5 bg-rose-50 border-b border-rose-100">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E5384D] to-[#C8102E] flex items-center justify-center shadow-xl shadow-rose-500/30 mb-3">
                <Droplet className="w-10 h-10 text-white fill-white" />
              </div>
              <h3 className="font-black text-slate-900 text-base">How It Works</h3>
              <p className="text-xs text-slate-500 text-center mt-1 leading-relaxed">
                Your request is instantly broadcast to compatible donors in your area.
              </p>
            </div>

            {/* Steps */}
            <div className="p-5 space-y-4">
              {HOW_IT_WORKS.map((step) => (
                <div key={step.num} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#E5384D] text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm shadow-rose-500/30">
                    {step.num}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">{step.title}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Average response time */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Average Response Time</p>
            <p className="text-4xl font-black text-[#E5384D]">18 min</p>
            <p className="text-xs text-slate-400 mt-1">For Critical requests in Lagos</p>
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {[["Critical", "18 min"], ["High", "32 min"], ["Medium", "1.5 hrs"]].map(([level, time]) => (
                <div key={level} className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{level}</span>
                  <span className="text-xs font-bold text-slate-700">{time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-[#E5384D]" />
              <p className="text-xs font-black text-[#E5384D]">Pro Tips</p>
            </div>
            <ul className="text-xs text-rose-800/80 space-y-1.5 leading-relaxed">
              <li>• Include ward/room number in description</li>
              <li>• Add contact phone for faster coordination</li>
              <li>• Mark as Critical only for ER cases</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
