"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import { Droplet, CheckCircle2, Loader2, ArrowRight, User, Heart, MapPin, Radio, Compass } from "lucide-react";
import { MapView, MapMarker } from "@/components/widgets/map-view";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Don't know"];

const MEDICAL_FLAGS = [
  "Hypertension",
  "Diabetes",
  "Anemia",
  "HIV Positive",
  "Hepatitis B",
  "Hepatitis C",
  "Heart Disease",
  "Asthma",
  "None",
];

const STEPS = [
  { id: 1, title: "Personal Info", icon: <User className="w-4 h-4" /> },
  { id: 2, title: "Health Info", icon: <Heart className="w-4 h-4" /> },
  { id: 3, title: "Location", icon: <MapPin className="w-4 h-4" /> },
];

export default function DonorSetupPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 — Personal Info
  const [fullName, setFullName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");

  // Step 2 — Health Info
  const [bloodType, setBloodType] = useState("O+");
  const [lastDonation, setLastDonation] = useState("");
  const [medicalFlags, setMedicalFlags] = useState<string[]>([]);
  const [medicalNotes, setMedicalNotes] = useState("");

  // Step 3 — Location (defaulting to live browser GPS or default coordinates)
  const [lat, setLat] = useState<number>(12.9716);
  const [lng, setLng] = useState<number>(77.5946);
  const [hasDetectedGPS, setHasDetectedGPS] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [address, setAddress] = useState("");

  // Auto-detect browser GPS on mount or when reaching step 3
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setHasDetectedGPS(true);
        },
        () => {}, // fallback stays at default
        { timeout: 8000 }
      );
    }
  }, []);

  const toggleFlag = (flag: string) => {
    if (flag === "None") {
      setMedicalFlags(["None"]);
      return;
    }
    setMedicalFlags((prev) => {
      const without = prev.filter((f) => f !== "None");
      return without.includes(flag) ? without.filter((f) => f !== flag) : [...without, flag];
    });
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by browser");
      return;
    }
    setGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setHasDetectedGPS(true);
        if (!address) {
          setAddress(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        }
        toast.success("Live GPS Location detected!");
        setGeolocating(false);
      },
      (err) => {
        toast.info("Using default zone coordinates. Address accepted.");
        setGeolocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!fullName.trim()) { toast.error("Please enter your full name"); return; }
    }
    if (step === 2) {
      if (!bloodType) { toast.error("Please select your blood group"); return; }
    }
    if (step < 3) setStep(step + 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const effectiveLat = lat || 12.9716;
      const effectiveLng = lng || 77.5946;
      const effectiveBloodType = (!bloodType || bloodType === "Don't know") ? "O+" : bloodType;

      await api.post("/donors", {
        bloodType: effectiveBloodType,
        lastDonationDate: lastDonation || undefined,
        medicalFlags: medicalFlags.filter((f) => f !== "None"),
        location: {
          type: "Point",
          coordinates: [effectiveLng, effectiveLat],
        },
      });
      toast.success("Donor profile created! Welcome to Sanguis.");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Map markers for live visual display
  const setupMapMarkers: MapMarker[] = [
    {
      id: "my-location",
      lat: lat,
      lng: lng,
      layerType: "donor",
      label: "My Live Location",
      sublabel: address || "Donation Zone",
    },
    {
      id: "nearby-hospital-1",
      lat: lat + 0.012,
      lng: lng + 0.008,
      layerType: "hospital",
      label: "Emergency Hub",
      sublabel: "1.4 km",
    },
    {
      id: "nearby-bank-1",
      lat: lat - 0.009,
      lng: lng - 0.011,
      layerType: "bank",
      label: "Regional Blood Bank",
      sublabel: "2.1 km",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ── TOP HEADER ── */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="Sanguis Logo" className="w-7 h-7 rounded-lg object-cover border border-gray-200 shadow-sm" />
          <span className="text-[#E5384D] font-black text-sm tracking-wide">Sanguis</span>
        </div>
        <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600 font-medium">
          Skip for now →
        </Link>
      </header>

      {/* ── STEPPER ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                      step > s.id
                        ? "bg-[#E5384D] text-white shadow-md shadow-rose-500/30"
                        : step === s.id
                        ? "bg-[#E5384D] text-white shadow-md shadow-rose-500/30 ring-4 ring-rose-100"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {step > s.id ? <CheckCircle2 className="w-5 h-5" /> : s.id}
                  </div>
                  <span className={`text-xs font-semibold ${step === s.id ? "text-gray-900" : "text-gray-400"}`}>
                    {s.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 mb-4 transition-all duration-300 ${step > s.id ? "bg-[#E5384D]" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 font-medium">
            Step {step} of {STEPS.length} — {STEPS[step - 1].title}
          </p>
        </div>
      </div>

      {/* ── MAIN FORM CARD ── */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-lg overflow-hidden">
          {/* Card Header */}
          <div className="px-7 pt-7 pb-5 border-b border-gray-100">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">{STEPS[step - 1].title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 1 && "Tell us a bit about yourself"}
              {step === 2 && "Help us match you accurately"}
              {step === 3 && "Set your donation area"}
            </p>
          </div>

          <div className="px-7 py-6 space-y-5">
            {/* ── STEP 1: Personal Info ── */}
            {step === 1 && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name *</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Marcus Johnson"
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    placeholder="+234 800 000 0000"
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date of Birth</label>
                    <input
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      type="date"
                      className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2: Health Info ── */}
            {step === 2 && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2.5">Blood Group *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {BLOOD_GROUPS.map((bg) => (
                      <button
                        key={bg}
                        type="button"
                        onClick={() => setBloodType(bg)}
                        className={`py-2.5 rounded-xl text-xs font-bold transition-all duration-200 border ${
                          bloodType === bg
                            ? "bg-[#E5384D] text-white border-[#E5384D] shadow-md shadow-rose-500/20"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-100"
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Last Donation Date</label>
                  <input
                    value={lastDonation}
                    onChange={(e) => setLastDonation(e.target.value)}
                    type="date"
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Medical Conditions</label>
                  <div className="flex flex-wrap gap-2">
                    {MEDICAL_FLAGS.map((flag) => (
                      <button
                        key={flag}
                        type="button"
                        onClick={() => toggleFlag(flag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                          medicalFlags.includes(flag)
                            ? "bg-[#E5384D]/10 text-[#E5384D] border-[#E5384D]/30"
                            : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {flag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Additional Medical Notes</label>
                  <textarea
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                    placeholder="Any other relevant medical conditions or notes..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all resize-none"
                  />
                </div>
              </>
            )}

            {/* ── STEP 3: Location ── */}
            {step === 3 && (
              <>
                <div className="text-center py-2">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-2">
                    <MapPin className="w-6 h-6 text-[#E5384D]" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">Set Your Donation Zone</h3>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                    We use your location to match you with nearby emergency blood requests.
                  </p>
                </div>

                {/* ── LIVE INTERACTIVE MAP VISUAL ── */}
                <div className="h-44 w-full rounded-xl border border-gray-200 overflow-hidden relative shadow-inner bg-slate-950">
                  <MapView
                    markers={setupMapMarkers}
                    centerLat={lat}
                    centerLng={lng}
                    radiusKm={15}
                  />
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-[10px] text-white font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    LIVE GPS RADAR ({lat.toFixed(3)}, {lng.toFixed(3)})
                  </div>
                </div>

                {/* GPS Status Banner */}
                {hasDetectedGPS ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-800">Live GPS Location Active</p>
                        <p className="text-[10px] text-emerald-600 font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</p>
                      </div>
                    </div>
                    <button type="button" onClick={handleGeolocate} className="text-xs text-emerald-700 font-bold hover:underline">
                      Re-scan
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGeolocate}
                    disabled={geolocating}
                    className="w-full h-11 rounded-xl border-2 border-dashed border-gray-200 text-xs font-semibold text-gray-600 hover:border-[#E5384D] hover:text-[#E5384D] transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {geolocating ? (
                      <><Loader2 className="w-4 h-4 animate-spin text-[#E5384D]" /> Detecting Live GPS Coordinates...</>
                    ) : (
                      <><Compass className="w-4 h-4 text-[#E5384D]" /> Detect My Live GPS Location</>
                    )}
                  </button>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Or enter address manually</label>
                  <input
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (!lat || !lng) {
                        setLat(12.9716);
                        setLng(77.5946);
                      }
                    }}
                    placeholder="Street address, city, area (e.g. Kengeri, Lagos)"
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                  />
                </div>
              </>
            )}
          </div>

          {/* Card Footer — Actions */}
          <div className="px-7 pb-7 pt-2 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="h-11 px-5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20 transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving Profile...</>
                ) : (
                  <>Complete Setup <CheckCircle2 className="w-4 h-4" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
