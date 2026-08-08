"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Users,
  ChevronLeft,
  Droplet,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Sidebar } from "@/components/ui/sidebar";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function CampaignDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<any | null>(null);
  const [myRegistration, setMyRegistration] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedBloodGroup, setSelectedBloodGroup] = useState("O+");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (campaignId) fetchCampaignDetails();
  }, [campaignId]);

  const fetchCampaignDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/donations/campaigns/${campaignId}`);
      setCampaign(res.data?.data?.campaign);
      setMyRegistration(res.data?.data?.myRegistration);
    } catch {
      toast.error("Failed to load campaign details");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!campaign) return;
    setRegistering(true);
    try {
      const res = await api.post(`/donations/campaigns/${campaign._id}/register`, {
        bloodGroup: selectedBloodGroup,
      });
      toast.success(res.data?.message || "Registration confirmed!");
      fetchCampaignDetails();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
        <Sidebar />
        <main className="flex-1 p-8 text-center py-24">
          <Droplet className="w-8 h-8 text-[#E5384D] animate-bounce mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Loading campaign information...</p>
        </main>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
        <Sidebar />
        <main className="flex-1 p-8 text-center py-24">
          <p className="text-sm font-bold text-slate-700">Campaign not found.</p>
          <Link href="/donation" className="text-xs font-bold text-[#E5384D] hover:underline mt-2 inline-block">
            ← Back to Donation Dashboard
          </Link>
        </main>
      </div>
    );
  }

  const slotsRemaining = campaign.availableCapacity - campaign.currentRegistrationsCount;
  const isFull = slotsRemaining <= 0;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 font-sans">
      <Sidebar />

      <main className="flex-1 p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Link
          href="/donation"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Donation Portal
        </Link>

        {/* Campaign Header Card */}
        <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-6 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/10 text-[#E5384D] border border-rose-500/20 uppercase tracking-wider">
              {campaign.status} CAMPAIGN
            </span>
            {campaign.isVerifiedOrganizer && (
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> OFFICIAL AUTHORIZED CAMP
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-zinc-100 leading-tight">
              {campaign.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">
              {campaign.description}
            </p>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-zinc-800 text-xs font-medium text-slate-700 dark:text-zinc-300">
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Organizer: <strong>{campaign.organizerName}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Venue: <strong>{campaign.venue}, {campaign.address}, {campaign.city}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Date: <strong>{new Date(campaign.date).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Time: <strong>{campaign.startTime} - {campaign.endTime}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Contact: <strong>{campaign.contactPhone}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Email: <strong>{campaign.contactEmail}</strong></span>
            </div>
          </div>

          {/* Capacity Progress Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-500">Registration Capacity</span>
              <span className="text-slate-900 dark:text-zinc-100">{campaign.currentRegistrationsCount} / {campaign.availableCapacity} slots booked</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-[#E5384D] transition-all"
                style={{ width: `${Math.min((campaign.currentRegistrationsCount / campaign.availableCapacity) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Required Blood Groups */}
          <div className="pt-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Required Blood Types</p>
            <div className="flex flex-wrap gap-2">
              {campaign.bloodGroupsRequired.map((bg: string) => (
                <span
                  key={bg}
                  className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-50 text-[#E5384D] border border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900"
                >
                  {bg}
                </span>
              ))}
            </div>
          </div>

          {/* Registration Section */}
          <div className="pt-6 border-t border-slate-100 dark:border-zinc-800">
            {myRegistration ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-300">
                      You are registered for this camp!
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Registration Pass ID: {myRegistration.registrationCode}
                    </p>
                  </div>
                </div>
                <Link
                  href="/donation"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  View Digital Pass
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    Please confirm that you meet standard AABB eligibility rules (Age 18-65, Weight $\ge$ 45kg, 90 days since last donation). Medical staff will perform on-site screening prior to donation.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-48">
                    <select
                      value={selectedBloodGroup}
                      onChange={(e) => setSelectedBloodGroup(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-bold"
                    >
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    disabled={isFull || registering}
                    onClick={handleRegister}
                    className={`w-full sm:flex-1 h-11 rounded-xl font-bold text-xs transition-all ${
                      isFull
                        ? "bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed"
                        : "bg-[#E5384D] text-white hover:bg-rose-600 shadow-md shadow-rose-600/20 active:scale-[0.98]"
                    }`}
                  >
                    {isFull ? "Camp Full" : registering ? "Processing Registration..." : "Register for Donation"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
