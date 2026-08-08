"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Droplet,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  ShieldCheck,
  Search,
  Filter,
  PlusCircle,
  QrCode,
  Download,
  ExternalLink,
  Users,
  AlertTriangle,
  FileCheck,
  ChevronRight,
  Sparkles,
  XCircle,
  Eye,
  Check,
} from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

export default function DonationPage() {
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<
    "discover" | "registrations" | "history" | "certificates" | "organize" | "staff"
  >("discover");

  // Stats
  const [stats, setStats] = useState({
    totalDonations: 0,
    verifiedDonations: 0,
    certificatesEarned: 0,
    upcomingRegistrations: 0,
    totalCampaigns: 0,
  });

  // Campaigns Discovery Data
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [bloodGroupFilter, setBloodGroupFilter] = useState("");

  // My Registrations Data
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [selectedQR, setSelectedQR] = useState<any | null>(null);

  // My Donations & Certificates
  const [donationsHistory, setDonationsHistory] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);

  // Registration Modal State
  const [selectedCampaign, setSelectedCampaign] = useState<any | null>(null);
  const [registerBloodGroup, setRegisterBloodGroup] = useState("O+");
  const [registering, setRegistering] = useState(false);

  // Organize Camp Form State
  const [campForm, setCampForm] = useState({
    title: "",
    description: "",
    organizerName: "",
    organizerType: "ngo",
    venue: "",
    address: "",
    city: "Bengaluru",
    date: "",
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    contactPhone: "",
    availableCapacity: 100,
  });
  const [submittingCamp, setSubmittingCamp] = useState(false);

  // Staff Verification Form State
  const [checkInCode, setCheckInCode] = useState("");
  const [checkedInRecord, setCheckedInRecord] = useState<any | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (activeTab === "registrations") fetchRegistrations();
    if (activeTab === "history") fetchDonationHistory();
    if (activeTab === "certificates") fetchCertificates();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/donations/stats");
      if (res.data?.data) {
        setStats(res.data.data);
      }
    } catch {}
  };

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const res = await api.get("/donations/campaigns", {
        params: {
          search: searchQuery || undefined,
          city: cityFilter || undefined,
          bloodGroup: bloodGroupFilter || undefined,
        },
      });
      setCampaigns(res.data?.data?.campaigns || []);
    } catch {
      toast.error("Failed to load blood donation camps");
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const fetchRegistrations = async () => {
    setLoadingRegistrations(true);
    try {
      const res = await api.get("/donations/my-registrations");
      setRegistrations(res.data?.data || []);
    } catch {
      toast.error("Failed to load your registrations");
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const fetchDonationHistory = async () => {
    try {
      const res = await api.get("/donations/my-donations");
      setDonationsHistory(res.data?.data || []);
    } catch {
      toast.error("Failed to load donation history");
    }
  };

  const fetchCertificates = async () => {
    setLoadingCertificates(true);
    try {
      const res = await api.get("/donations/my-certificates");
      setCertificates(res.data?.data || []);
    } catch {
      toast.error("Failed to load digital certificates");
    } finally {
      setLoadingCertificates(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    setRegistering(true);
    try {
      const res = await api.post(`/donations/campaigns/${selectedCampaign._id}/register`, {
        bloodGroup: registerBloodGroup,
      });
      toast.success(res.data?.message || "Registration confirmed!");
      setSelectedCampaign(null);
      fetchStats();
      fetchCampaigns();
      setActiveTab("registrations");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to register for camp");
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async (id: string) => {
    if (!confirm("Are you sure you want to cancel your registration for this camp?")) return;
    try {
      await api.delete(`/donations/registrations/${id}`);
      toast.success("Registration cancelled");
      fetchRegistrations();
      fetchStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to cancel registration");
    }
  };

  const handleCreateCampSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCamp(true);
    try {
      const res = await api.post("/donations/campaigns", campForm);
      toast.success(res.data?.message || "Camp submitted!");
      setCampForm({
        title: "",
        description: "",
        organizerName: "",
        organizerType: "ngo",
        venue: "",
        address: "",
        city: "Bengaluru",
        date: "",
        startTime: "09:00 AM",
        endTime: "05:00 PM",
        contactPhone: "",
        availableCapacity: 100,
      });
      fetchCampaigns();
      setActiveTab("discover");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create camp");
    } finally {
      setSubmittingCamp(false);
    }
  };

  const handleCheckInAndVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInCode) return;
    setVerifying(true);
    try {
      // 1. Check in
      const checkInRes = await api.post("/donations/registrations/check-in", {
        registrationCode: checkInCode,
      });
      const regRecord = checkInRes.data?.data;
      setCheckedInRecord(regRecord);

      // 2. Verify donation
      const verifyRes = await api.post("/donations/registrations/verify", {
        registrationId: regRecord._id,
        unitsDonated: 1,
      });

      toast.success("Donation VERIFIED! Digital certificate generated successfully!");
      setCheckInCode("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
      <Sidebar />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-[#E5384D]">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                  Blood Donation & Campaigns
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wider">
                  Verified Module
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">
                Browse authorized blood camps, register, check-in, and receive official digital certificates.
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("organize")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#E5384D] text-white hover:bg-rose-600 shadow-md shadow-rose-600/20 transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            Organize Blood Camp
          </button>
        </div>

        {/* Aggregate Statistics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Donations</span>
              <Droplet className="w-4 h-4 text-[#E5384D]" />
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-zinc-100">{stats.totalDonations}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Recorded on Sanguis</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Verified Donations</span>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.verifiedDonations}
            </p>
            <p className="text-[10px] text-emerald-600/80 mt-0.5">Medical Staff Approved</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Registered Camps</span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {stats.upcomingRegistrations}
            </p>
            <p className="text-[10px] text-blue-500/80 mt-0.5">Upcoming Passes</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Certificates Earned</span>
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.certificatesEarned}
            </p>
            <p className="text-[10px] text-amber-500/80 mt-0.5">With QR Verification</p>
          </div>
        </div>

        {/* Navigation Tabs Header */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 overflow-x-auto pb-2">
          {[
            { id: "discover", label: "Discover Camps", icon: <Search className="w-4 h-4" /> },
            { id: "registrations", label: "My Registrations", icon: <Calendar className="w-4 h-4" />, badge: stats.upcomingRegistrations },
            { id: "history", label: "Donation History", icon: <FileCheck className="w-4 h-4" /> },
            { id: "certificates", label: "My Certificates", icon: <Award className="w-4 h-4" />, badge: stats.certificatesEarned },
            { id: "organize", label: "Organize Camp", icon: <PlusCircle className="w-4 h-4" /> },
            { id: "staff", label: "Staff Verification Portal", icon: <ShieldCheck className="w-4 h-4 text-emerald-500" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-[#E5384D] text-white shadow-md shadow-rose-600/20"
                  : "text-slate-600 dark:text-zinc-400 hover:bg-slate-200/60 dark:hover:bg-zinc-900"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === tab.id ? "bg-white text-[#E5384D]" : "bg-rose-100 text-[#E5384D] dark:bg-rose-950/60"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB 1: DISCOVER CAMPS ────────────────────────────────────────── */}
        {activeTab === "discover" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search camp title, venue, or hospital..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20"
                />
              </div>

              <div>
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20"
                >
                  <option value="">All Cities (India)</option>
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="New Delhi">New Delhi</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Pune">Pune</option>
                  <option value="Kolkata">Kolkata</option>
                </select>
              </div>

              <button
                onClick={fetchCampaigns}
                className="h-10 px-4 rounded-xl text-xs font-bold bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Filter className="w-3.5 h-3.5" /> Filter Camps
              </button>
            </div>

            {/* Campaign Cards List */}
            {loadingCampaigns ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                <Droplet className="w-8 h-8 text-[#E5384D] animate-bounce mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">Loading authorized blood donation camps...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6">
                <Building2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">No campaigns found</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                  Try adjusting your search criteria or organize a new authorized blood camp.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaigns.map((c) => {
                  const slotsRemaining = c.availableCapacity - c.currentRegistrationsCount;
                  const isFull = slotsRemaining <= 0;

                  return (
                    <div
                      key={c._id}
                      className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-[#E5384D]/40 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100 leading-snug">
                            {c.title}
                          </h3>
                          {c.isVerifiedOrganizer && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1 shrink-0">
                              <ShieldCheck className="w-3 h-3" /> VERIFIED
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 mb-3">
                          {c.description}
                        </p>

                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300 font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.organizerName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.venue}, {c.city}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(c.date).toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              ({c.startTime} - {c.endTime})
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Required:</span>
                          {c.bloodGroupsRequired.map((bg: string) => (
                            <span
                              key={bg}
                              className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-50 text-[#E5384D] dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                            >
                              {bg}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 dark:text-zinc-100">{slotsRemaining}</span>
                          <span className="text-slate-400"> / {c.availableCapacity} slots left</span>
                        </div>

                        <button
                          disabled={isFull}
                          onClick={() => setSelectedCampaign(c)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            isFull
                              ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed"
                              : "bg-[#E5384D] text-white hover:bg-rose-600 shadow-md shadow-rose-600/20 active:scale-[0.98]"
                          }`}
                        >
                          {isFull ? "Camp Full" : "Register Now"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: MY REGISTRATIONS ──────────────────────────────────────── */}
        {activeTab === "registrations" && (
          <div className="space-y-4">
            {loadingRegistrations ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                <Clock className="w-8 h-8 text-[#E5384D] animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">Loading your registrations...</p>
              </div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6">
                <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">No active camp registrations</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto mb-4">
                  Browse authorized camps and register to receive your digital check-in pass.
                </p>
                <button
                  onClick={() => setActiveTab("discover")}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E5384D] text-white hover:bg-rose-600"
                >
                  Discover Camps
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {registrations.map((r) => {
                  const camp = r.campaign;
                  if (!camp) return null;

                  return (
                    <div
                      key={r._id}
                      className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                            ID: {r.registrationCode}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase">
                            {r.status}
                          </span>
                        </div>

                        <h3 className="font-black text-base text-slate-900 dark:text-zinc-100 mb-1">
                          {camp.title}
                        </h3>

                        <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-300 font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{camp.organizerName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{camp.venue}, {camp.city}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(camp.date).toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}{" "}
                              ({camp.startTime})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                        <button
                          onClick={() => setSelectedQR(r)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 hover:bg-slate-200"
                        >
                          <QrCode className="w-3.5 h-3.5" /> Show Check-in Ticket
                        </button>

                        {r.status !== "COMPLETED" && (
                          <button
                            onClick={() => handleCancelRegistration(r._id)}
                            className="text-xs font-bold text-rose-500 hover:underline"
                          >
                            Cancel Pass
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: DONATION HISTORY ──────────────────────────────────────── */}
        {activeTab === "history" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-sm text-slate-900 dark:text-zinc-100 uppercase tracking-wide">
                Verified Blood Donation History
              </h2>
              <span className="text-xs font-bold text-slate-400">{donationsHistory.length} Total Verified</span>
            </div>

            {donationsHistory.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8 font-medium">
                No verified blood donations recorded yet. Attend an authorized camp to receive your verified donation entry.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {donationsHistory.map((d) => (
                  <div key={d._id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                          {d.campaign?.title || "Blood Donation Camp"}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                          Verified by {d.verifierOrganization} ({d.verifierRole})
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Donation ID: {d.donationId} · Date: {new Date(d.donationDate).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>

                    {d.certificateId && (
                      <Link
                        href={`/donation/certificates/${d.certificateId}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900 flex items-center gap-1.5 shrink-0 self-start md:self-auto"
                      >
                        <Award className="w-3.5 h-3.5" /> View Certificate
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: MY CERTIFICATES ───────────────────────────────────────── */}
        {activeTab === "certificates" && (
          <div className="space-y-4">
            {loadingCertificates ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800">
                <Award className="w-8 h-8 text-amber-500 animate-bounce mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">Loading your digital certificates...</p>
              </div>
            ) : certificates.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6">
                <Award className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">No certificates earned yet</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
                  Digital certificates with QR verification are automatically generated once your blood donation is verified by medical staff.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certificates.map((cert) => (
                  <div
                    key={cert._id}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-black tracking-widest text-amber-600 dark:text-amber-400 uppercase">
                          ID: {cert.certificateId}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase">
                          {cert.status}
                        </span>
                      </div>

                      <h3 className="font-black text-base text-slate-900 dark:text-zinc-100 mb-1">
                        Certificate of Blood Donation
                      </h3>

                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        {cert.donorName}
                      </p>

                      <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-zinc-400 font-medium">
                        <p>Camp: {cert.campaignTitle}</p>
                        <p>Organization: {cert.authorizedOrganization}</p>
                        <p>Date: {new Date(cert.donationDate).toLocaleDateString("en-IN")}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                      <Link
                        href={`/donation/certificates/${cert.certificateId}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E5384D] text-white hover:bg-rose-600 shadow-sm flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> View & Print Certificate
                      </Link>

                      <Link
                        href={`/certificate/verify/${cert.certificateId}`}
                        target="_blank"
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Verify QR Link
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 5: ORGANIZE CAMP FORM ────────────────────────────────────── */}
        {activeTab === "organize" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 space-y-6 max-w-2xl mx-auto">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-zinc-100">
                Organize an Authorized Blood Donation Camp
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Submit camp details for official authorization. Approved camps will be listed for donor registration.
              </p>
            </div>

            <form onSubmit={handleCreateCampSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Campaign Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AIIMS Youth Lifesaving Blood Drive"
                  value={campForm.title}
                  onChange={(e) => setCampForm({ ...campForm, title: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Campaign Description *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the objective, venue guidelines, and instructions..."
                  value={campForm.description}
                  onChange={(e) => setCampForm({ ...campForm, description: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Organizer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apollo Hospitals / NSS Club"
                    value={campForm.organizerName}
                    onChange={(e) => setCampForm({ ...campForm, organizerName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Organizer Type *
                  </label>
                  <select
                    value={campForm.organizerType}
                    onChange={(e) => setCampForm({ ...campForm, organizerType: e.target.value as any })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium"
                  >
                    <option value="hospital">Hospital</option>
                    <option value="blood_bank">Blood Bank</option>
                    <option value="ngo">Authorized NGO</option>
                    <option value="college">College / NSS / NCC</option>
                    <option value="government">Government Body</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Auditorium Hall A"
                    value={campForm.venue}
                    onChange={(e) => setCampForm({ ...campForm, venue: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bengaluru / New Delhi / Mumbai"
                    value={campForm.city}
                    onChange={(e) => setCampForm({ ...campForm, city: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Full Address *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Street address, landmark, pin code..."
                  value={campForm.address}
                  onChange={(e) => setCampForm({ ...campForm, address: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={campForm.date}
                    onChange={(e) => setCampForm({ ...campForm, date: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={campForm.contactPhone}
                    onChange={(e) => setCampForm({ ...campForm, contactPhone: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Max Capacity Slots
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={campForm.availableCapacity}
                    onChange={(e) => setCampForm({ ...campForm, availableCapacity: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingCamp}
                className="w-full h-11 rounded-xl font-bold text-xs bg-[#E5384D] text-white hover:bg-rose-600 transition-all shadow-md shadow-rose-600/20"
              >
                {submittingCamp ? "Submitting Camp Application..." : "Submit Authorized Camp for Review"}
              </button>
            </form>
          </div>
        )}

        {/* ── TAB 6: STAFF VERIFICATION PORTAL ───────────────────────────── */}
        {activeTab === "staff" && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 space-y-6 max-w-xl mx-auto">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-black text-slate-900 dark:text-zinc-100">
                  Staff Check-in & Verification Portal
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Authorized medical personnel scan or enter participant Registration Code (`SDN-XXXXXXXX`) to verify blood donation.
              </p>
            </div>

            <form onSubmit={handleCheckInAndVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Enter Registration Code / Scan Pass *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SDN-84920412"
                  value={checkInCode}
                  onChange={(e) => setCheckInCode(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-sm font-bold tracking-widest font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full h-11 rounded-xl font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20"
              >
                {verifying ? "Processing Check-in & Verification..." : "Check In Donor & Verify Donation"}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Campaign Registration Confirmation Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 max-w-md w-full space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplet className="w-5 h-5 text-[#E5384D]" />
                <h3 className="font-black text-base text-slate-900 dark:text-zinc-100">
                  Register for Blood Donation
                </h3>
              </div>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-2 text-xs">
              <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                {selectedCampaign.title}
              </h4>
              <p className="text-slate-500 font-medium">Venue: {selectedCampaign.venue}, {selectedCampaign.city}</p>
              <p className="text-slate-500 font-medium">
                Date: {new Date(selectedCampaign.date).toLocaleDateString("en-IN")} ({selectedCampaign.startTime})
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                Select Your Blood Group
              </label>
              <select
                value={registerBloodGroup}
                onChange={(e) => setRegisterBloodGroup(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-bold"
              >
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Eligibility Disclaimer
              </p>
              <p>
                Please ensure you are between 18-65 years old, weigh at least 45kg, and have not donated whole blood in the last 90 days. Final decision rests with medical staff.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleRegisterSubmit}
                disabled={registering}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#E5384D] text-white hover:bg-rose-600 shadow-md shadow-rose-600/20"
              >
                {registering ? "Confirming..." : "Confirm Registration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Ticket Modal */}
      {selectedQR && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">
                Official Check-in Pass
              </span>
              <button onClick={() => setSelectedQR(null)} className="text-slate-400">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-900 inline-block">
              <QrCode className="w-32 h-32 text-[#E5384D] mx-auto" />
            </div>

            <div>
              <p className="font-mono text-sm font-black text-slate-900 dark:text-zinc-100">
                {selectedQR.registrationCode}
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">
                Show this code or QR pass to authorized staff at the camp entry desk.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
