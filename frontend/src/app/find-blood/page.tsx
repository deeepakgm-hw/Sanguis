"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { MapView, MapMarker } from "@/components/widgets/map-view";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Droplet,
  Search,
  Sparkles,
  MapPin,
  Phone,
  Navigation,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Filter,
  RefreshCw,
  Send,
  Trash2,
  X,
  Compass,
} from "lucide-react";
import { useLiveLocation } from "@/hooks/use-live-location";

export interface BloodBankSearchResult {
  id: string;
  name: string;
  address: string;
  contactPhone: string;
  location: {
    type: "Point";
    coordinates: [number, number];
  };
  bloodType: string;
  unitsAvailable: number;
  unitsRequested: number;
  distanceKm: number;
  availabilityStatus: "available" | "shortage" | "unknown";
  isVerified: boolean;
  urgencyLevel: string;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const URGENCY_OPTIONS = [
  { id: "normal", label: "Normal" },
  { id: "urgent", label: "Urgent" },
  { id: "critical", label: "Critical" },
];

export default function FindBloodPage() {
  // Device Live GPS hook
  const { lat: gpsLat, lng: gpsLng } = useLiveLocation(false);

  // Conversational Chat History State
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "model"; text: string }>>([
    { role: "model", text: "Hello! I am your Sanguis Blood Finder Assistant. Tell me what blood you need and where, or just say 'I need blood'." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  // Accumulated Parameter State (Gemini State of Truth)
  const [bloodGroup, setBloodGroup] = useState<string>("O+");
  const [quantity, setQuantity] = useState<number>(2);
  const [locationName, setLocationName] = useState<string>("Bengaluru");
  const [urgency, setUrgency] = useState<"normal" | "urgent" | "critical">("normal");
  const [readyToSearch, setReadyToSearch] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>(["bloodGroup", "quantity", "location", "urgency"]);

  // Search parameters
  const [userLat, setUserLat] = useState<number | null>(12.9716);
  const [userLng, setUserLng] = useState<number | null>(77.5946);
  const [searchRadius, setSearchRadius] = useState(50);

  // Results & UI State
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BloodBankSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  // Map center control state
  const [mapCenterLat, setMapCenterLat] = useState<number>(12.9716);
  const [mapCenterLng, setMapCenterLng] = useState<number>(77.5946);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Synchronize GPS coordinates
  useEffect(() => {
    if (gpsLat && gpsLng) {
      setUserLat(gpsLat);
      setUserLng(gpsLng);
      setMapCenterLat(gpsLat);
      setMapCenterLng(gpsLng);
    }
  }, [gpsLat, gpsLng]);

  // Execute Search Query against Sanguis Backend API
  const executeSearch = async (
    bGroup = bloodGroup,
    qty = quantity,
    loc = locationName,
    lat = userLat,
    lng = userLng,
    urg = urgency,
    rad = searchRadius
  ) => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const params: Record<string, any> = {
        bloodType: bGroup,
        quantity: qty,
        location: loc,
        radius: rad,
        urgency: urg,
      };
      if (lat && lng) {
        params.lat = lat;
        params.lng = lng;
      }

      const res = await api.get("/bloodbanks/search", { params });
      const banksData: BloodBankSearchResult[] = res.data?.data?.banks ?? [];
      setSearchResults(banksData);

      if (banksData.length > 0) {
        toast.success(`Found ${banksData.length} blood bank(s) matching your parameters!`);
      } else {
        toast.info(`No matching blood banks found. Try increasing search radius.`);
      }
    } catch (err: any) {
      console.error("Search error:", err);
      toast.error(err?.response?.data?.message || "Failed to search blood banks.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Submit Prompt to Backend parser (POST /api/v1/ai/parse-requirement)
  const handleSendPrompt = async (textToSend = chatInput) => {
    const trimmed = textToSend.trim();
    if (!trimmed) return;

    // Check manual reset
    if (trimmed.toLowerCase() === "start over" || trimmed.toLowerCase() === "clear") {
      handleStartOver();
      return;
    }

    setChatHistory((prev) => [...prev, { role: "user", text: trimmed }]);
    setChatInput("");
    setIsAiParsing(true);

    try {
      const payload = {
        prompt: trimmed,
        history: chatHistory,
        currentState: {
          bloodGroup: bloodGroup || null,
          quantity: quantity || null,
          location: locationName || null,
          urgency: urgency || null,
        },
      };

      const res = await api.post("/ai/parse-requirement", payload);
      const parsed = res.data?.data;

      if (parsed) {
        setIsFallbackMode(!!parsed.isFallback);

        // Update accumulated parameters
        if (parsed.bloodGroup) setBloodGroup(parsed.bloodGroup);
        if (parsed.quantity) setQuantity(parsed.quantity);
        if (parsed.location) setLocationName(parsed.location);
        if (parsed.urgency) setUrgency(parsed.urgency);

        setMissingFields(parsed.missingFields || []);
        setReadyToSearch(!!parsed.readyToSearch);

        // Append assistant's conversational response
        setChatHistory((prev) => [
          ...prev,
          { role: "model", text: parsed.assistantResponse || "Got it. Let me update your request details." },
        ]);

        // Auto-search if fully parsed
        if (parsed.readyToSearch) {
          toast.success("All parameters gathered! Ready to search.");
          await executeSearch(
            parsed.bloodGroup,
            parsed.quantity,
            parsed.location,
            userLat,
            userLng,
            parsed.urgency,
            searchRadius
          );
        }
      }
    } catch (err) {
      console.error("AI parse failure:", err);
      toast.error("AI Assistant experienced an error. Falling back to local parser.");
      setChatHistory((prev) => [
        ...prev,
        { role: "model", text: "I experienced a connection issue, but my local parser is active. What blood type do you need?" },
      ]);
    } finally {
      setIsAiParsing(false);
    }
  };

  // Start Over / Reset State Handler
  const handleStartOver = () => {
    setBloodGroup("O+");
    setQuantity(2);
    setLocationName("Bengaluru");
    setUrgency("normal");
    setReadyToSearch(false);
    setMissingFields(["bloodGroup", "quantity", "location", "urgency"]);
    setSearchResults([]);
    setHasSearched(false);
    setChatHistory([
      { role: "model", text: "New request started. What blood group is required? (e.g. O+, A-)" }
    ]);
    setChatInput("");
    setIsFallbackMode(false);
    toast.info("Conversational state cleared. Starting new search.");
  };

  // Map Markers Conversion
  const mapMarkers: MapMarker[] = searchResults.map((bank) => ({
    id: bank.id,
    lat: bank.location?.coordinates?.[1] ?? 12.9716,
    lng: bank.location?.coordinates?.[0] ?? 77.5946,
    layerType: "bank",
    label: bank.name,
    sublabel: `${bank.unitsAvailable} units of ${bank.bloodType} · ${bank.distanceKm} km`,
    address: bank.address,
    phone: bank.contactPhone,
  }));

  // Re-center Map on Selected Bank
  const handleViewOnMap = (bank: BloodBankSearchResult) => {
    const lat = bank.location?.coordinates?.[1] ?? 12.9716;
    const lng = bank.location?.coordinates?.[0] ?? 77.5946;
    setMapCenterLat(lat);
    setMapCenterLng(lng);
    setSelectedBankId(bank.id);
    toast.info(`Centered map on: ${bank.name}`);
  };

  // Use Current Device Location Handler
  const handleUseGps = () => {
    if (gpsLat && gpsLng) {
      setUserLat(gpsLat);
      setUserLng(gpsLng);
      setLocationName("Current GPS Location");
      setMapCenterLat(gpsLat);
      setMapCenterLng(gpsLng);
      toast.success("Updated center location to your device GPS!");
      executeSearch(bloodGroup, quantity, "Current GPS Location", gpsLat, gpsLng, urgency, searchRadius);
    } else {
      toast.info("Acquiring GPS location... Please ensure browser location permission is granted.");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 font-mono pb-12 text-slate-900 dark:text-zinc-100">
        {/* ── HEADER BANNER ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-rose-900/40 via-zinc-950 to-black p-6 rounded-3xl border border-rose-500/20 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-[#E5384D] font-bold text-xs uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>AI-Powered Emergency Blood Finder</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Find Available Blood Banks
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              Gemini AI will parse your request and verify Sanguis database inventory ledgers in real time.
            </p>
          </div>
          <button
            onClick={handleStartOver}
            className="h-10 px-4 rounded-2xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold text-xs border border-zinc-800 transition-all flex items-center gap-2 shadow-md shrink-0"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            Start Over
          </button>
        </div>

        {/* Fallback Warning Banner */}
        {isFallbackMode && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
              AI assistance is currently in offline rule-based fallback mode. You can still search manually or using simplified text.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── LEFT COLUMN: CONVERSATIONAL CHAT (5 cols) ── */}
          <div className="lg:col-span-5 flex flex-col h-[560px] bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-lg">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E5384D]" />
                <span className="text-xs font-black uppercase tracking-wider">Conversational AI Finder</span>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs font-bold leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-[#E5384D] text-white rounded-tr-none"
                        : "bg-slate-100 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAiParsing && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 rounded-2xl rounded-tl-none px-3.5 py-2 text-xs text-slate-500 font-bold flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#E5384D]" />
                    <span>Gemini is understanding your request...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Footer Input */}
            <div className="p-3 border-t border-slate-100 dark:border-zinc-900 bg-slate-50 dark:bg-zinc-900/30 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendPrompt()}
                placeholder="Type your blood requirement here..."
                disabled={isAiParsing}
                className="flex-1 h-11 px-3.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-bold focus:outline-none focus:border-[#E5384D] disabled:opacity-60"
              />
              <button
                onClick={() => handleSendPrompt()}
                disabled={isAiParsing}
                className="w-11 h-11 rounded-xl bg-[#E5384D] text-white flex items-center justify-center shadow-md shadow-rose-500/10 hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN: SUMMARY & PARAMETERS (7 cols) ── */}
          <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
            {/* Requirement Summary Card */}
            <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-2">
                <span className="text-xs font-black uppercase tracking-wider">Interpreted Blood Request</span>
                <span className="text-[10px] text-slate-400 font-extrabold">ACCUMULATED STATE</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80">
                  <p className="text-[9px] text-slate-500 uppercase font-black">Blood Group</p>
                  <p className="text-lg font-black text-[#E5384D] mt-1">{bloodGroup || "—"}</p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80">
                  <p className="text-[9px] text-slate-500 uppercase font-black">Quantity</p>
                  <p className="text-lg font-black text-slate-800 dark:text-zinc-200 mt-1">
                    {quantity ? `${quantity} Units` : "—"}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80">
                  <p className="text-[9px] text-slate-500 uppercase font-black">Location</p>
                  <p className="text-sm font-black text-slate-800 dark:text-zinc-200 mt-1.5 truncate">
                    {locationName || "—"}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/80">
                  <p className="text-[9px] text-slate-500 uppercase font-black">Urgency</p>
                  <p className="text-xs font-black text-amber-500 uppercase mt-2">{urgency || "—"}</p>
                </div>
              </div>

              {/* Ready to Search Confirmation Banner */}
              {readyToSearch ? (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      I understood your request. Ready to query verified Sanguis database records for{" "}
                      <span className="font-black text-[#E5384D]">{bloodGroup}</span> blood ({quantity} units) in{" "}
                      <span className="underline">{locationName}</span> with {urgency.toUpperCase()} priority.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => executeSearch()}
                      disabled={isSearching}
                      className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Search Database
                    </button>
                    <button
                      onClick={handleStartOver}
                      className="px-4 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-extrabold text-xs border border-slate-200 dark:border-zinc-850"
                    >
                      Reset AI
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/15 text-[11px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Missing details: {missingFields.map((f) => f === "bloodGroup" ? "Blood Group" : f).join(", ")}. Use AI chat or form below to complete.
                  </span>
                </div>
              )}
            </div>

            {/* Manual Structured Form (Alternative Flow) */}
            <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-900 pb-2">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-[#E5384D]" />
                  Manual Search Form Override
                </span>
                <span className="text-[9px] text-slate-400 font-bold">MANUAL OVERRIDE</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Blood Group</label>
                  <select
                    value={bloodGroup || "O+"}
                    onChange={(e) => {
                      setBloodGroup(e.target.value);
                      setMissingFields((prev) => prev.filter((f) => f !== "bloodGroup"));
                    }}
                    className="w-full h-10 px-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-black focus:outline-none"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={quantity || 2}
                    onChange={(e) => {
                      const q = Math.max(1, parseInt(e.target.value) || 1);
                      setQuantity(q);
                      setMissingFields((prev) => prev.filter((f) => f !== "quantity"));
                    }}
                    className="w-full h-10 px-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-black focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Location</label>
                    <button
                      onClick={handleUseGps}
                      className="text-[9px] font-bold text-[#E5384D] hover:underline"
                    >
                      GPS
                    </button>
                  </div>
                  <input
                    type="text"
                    value={locationName || ""}
                    onChange={(e) => {
                      setLocationName(e.target.value);
                      setMissingFields((prev) => prev.filter((f) => f !== "location"));
                    }}
                    placeholder="e.g. Chennai"
                    className="w-full h-10 px-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-bold focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Urgency</label>
                  <select
                    value={urgency || "normal"}
                    onChange={(e) => {
                      setUrgency(e.target.value as any);
                      setMissingFields((prev) => prev.filter((f) => f !== "urgency"));
                    }}
                    className="w-full h-10 px-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-black focus:outline-none"
                  >
                    {URGENCY_OPTIONS.map((urg) => (
                      <option key={urg.id} value={urg.id}>
                        {urg.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-slate-400">Radius:</span>
                  {[25, 50, 100].map((r) => (
                    <button
                      key={r}
                      onClick={() => setSearchRadius(r)}
                      className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border transition-all ${
                        searchRadius === r
                          ? "bg-[#E5384D] text-white border-[#E5384D]"
                          : "bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-855 text-slate-600 dark:text-zinc-400"
                      }`}
                    >
                      {r}km
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => executeSearch()}
                  disabled={isSearching}
                  className="h-10 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all border border-zinc-800"
                >
                  <Search className="w-3.5 h-3.5" />
                  Manual Search
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── SAFETY DISCLAIMER BANNER ── */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-600 dark:text-amber-400 space-y-1">
            <p className="font-extrabold uppercase tracking-wide">Medical Safety & Dispatch Notice</p>
            <p className="text-[11px] leading-relaxed opacity-95">
              Blood bank stock levels are synced directly with verified inventory ledgers.
              <b> Always contact the blood bank directly to confirm real-time dispatch status before traveling.</b>
            </p>
          </div>
        </div>

        {/* ── SECTION 3: MAP & RESULTS LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Search Result Cards List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <span>Verified Blood Banks</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                  {searchResults.length} Found
                </span>
              </h3>
              <p className="text-[9px] text-slate-400 font-bold">SORTED BY PROXIMITY & STOCK</p>
            </div>

            {isSearching ? (
              <div className="space-y-3 py-6">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 space-y-3 animate-pulse"
                  >
                    <div className="h-5 bg-slate-200 dark:bg-zinc-800 rounded-xl w-2/3" />
                    <div className="h-4 bg-slate-100 dark:bg-zinc-900 rounded-xl w-1/2" />
                    <div className="h-10 bg-slate-100 dark:bg-zinc-900 rounded-2xl w-full" />
                  </div>
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[#E5384D] flex items-center justify-center mx-auto">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-extrabold text-base text-slate-900 dark:text-zinc-100">
                    No matching blood banks found
                  </p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                    We could not locate verified blood banks with active stock matching {bloodGroup} within {searchRadius} km of {locationName}.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setSearchRadius(100);
                      executeSearch(bloodGroup, quantity, locationName, userLat, userLng, urgency, 100);
                    }}
                    className="px-4 h-9 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-extrabold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 transition-all"
                  >
                    Expand Search Radius (100 km)
                  </button>
                  <button
                    onClick={() => setBloodGroup("O-")}
                    className="px-4 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-extrabold text-[#E5384D] hover:bg-rose-500/20 transition-all"
                  >
                    Search Universal Donor (O-)
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((bank) => {
                  const isSelected = selectedBankId === bank.id;

                  return (
                    <div
                      key={bank.id}
                      onClick={() => setSelectedBankId(bank.id)}
                      className={`bg-white dark:bg-zinc-950 border rounded-3xl p-5 transition-all shadow-sm cursor-pointer ${
                        isSelected
                          ? "border-[#E5384D] ring-2 ring-[#E5384D]/20 shadow-md"
                          : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-sm text-slate-900 dark:text-zinc-100">
                                {bank.name}
                              </h4>
                              {bank.isVerified && (
                                <span className="flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 px-1.5 py-0.2 rounded-md">
                                  <CheckCircle2 className="w-3 h-3" /> VERIFIED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                              {bank.address}
                            </p>
                          </div>
                        </div>

                        {/* Availability Pill */}
                        <div className="shrink-0 text-right">
                          <span
                            className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase border flex items-center gap-1 ${
                              bank.availabilityStatus === "available"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                : bank.availabilityStatus === "shortage"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                : "bg-slate-100 dark:bg-zinc-900 text-slate-500 border-slate-200 dark:border-zinc-800"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                bank.availabilityStatus === "available"
                                  ? "bg-emerald-500 animate-pulse"
                                  : bank.availabilityStatus === "shortage"
                                  ? "bg-amber-500"
                                  : "bg-slate-400"
                              }`}
                            />
                            {bank.availabilityStatus === "available"
                              ? "Stock Available"
                              : bank.availabilityStatus === "shortage"
                              ? "Limited Stock"
                              : "Availability Unknown"}
                          </span>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">
                            {bank.distanceKm} km away
                          </p>
                        </div>
                      </div>

                      {/* Stock Info Bar */}
                      <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80 rounded-2xl p-3 flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-[#E5384D] font-black text-xs border border-rose-500/20">
                            {bank.bloodType}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 dark:text-zinc-100">
                              {bank.unitsAvailable} Units Available
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Requested: {bank.unitsRequested} unit(s)
                            </p>
                          </div>
                        </div>

                        {bank.contactPhone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300 font-bold">
                            <Phone className="w-3.5 h-3.5 text-[#E5384D]" />
                            <span>{bank.contactPhone}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {bank.contactPhone && (
                          <a
                            href={`tel:${bank.contactPhone}`}
                            className="flex-1 h-9 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-extrabold text-xs border border-slate-200 dark:border-zinc-850 flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-500" />
                            Call Bank
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleViewOnMap(bank)}
                          className="flex-1 h-9 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-extrabold text-xs border border-slate-200 dark:border-zinc-850 flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Compass className="w-3.5 h-3.5 text-[#E5384D]" />
                          View on Map
                        </button>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&origin=${userLat || 12.9716},${userLng || 77.5946}&destination=${bank.location?.coordinates?.[1] || 12.9716},${bank.location?.coordinates?.[0] || 77.5946}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-600 dark:text-blue-400 font-extrabold text-xs border border-blue-200 dark:border-blue-900 flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Get Directions
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: 3D Interactive Map (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#E5384D]" />
                <span>3D Blood Bank Radar</span>
              </h3>
              <span className="text-[10px] text-emerald-500 font-bold animate-pulse">● LIVE MAP</span>
            </div>

            <div className="h-[560px] rounded-3xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-xl bg-zinc-950">
              <MapView
                markers={mapMarkers}
                centerLat={mapCenterLat}
                centerLng={mapCenterLng}
                radiusKm={searchRadius}
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
