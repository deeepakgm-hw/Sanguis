"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { ProfileSubNav } from "@/components/layout/profile-sub-nav";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import {
  User,
  Droplet,
  CheckCircle2,
  Edit,
  BadgeCheck,
  Phone,
  Mail,
  Calendar,
} from "lucide-react";

export default function MyProfilePage() {
  const user      = useAuthStore((s) => s.user);
  const [donorProfile, setDonorProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get("/donors/me");
        setDonorProfile(res.data?.data ?? null);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  const isEligible = !donorProfile?.lastDonationDate ||
    Date.now() - new Date(donorProfile.lastDonationDate).getTime() > 90 * 24 * 60 * 60 * 1000;

  return (
    <AppLayout>
      <div className="flex gap-5">
        <ProfileSubNav />

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 min-w-0 space-y-5">
          <h1 className="text-xl font-black text-slate-900">My Profile</h1>

          {/* Hero Banner */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Red top bar */}
            <div className="h-28 bg-gradient-to-r from-[#E5384D] to-[#C8102E] relative">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-[-30px] right-[-30px] w-40 h-40 rounded-full border-4 border-white" />
                <div className="absolute bottom-[-20px] left-[30%] w-24 h-24 rounded-full border-4 border-white" />
              </div>
            </div>

            {/* Avatar + Info */}
            <div className="px-6 pb-5 relative">
              <div className="flex items-end justify-between">
                <div className="-mt-8 flex items-end gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border-4 border-white shadow-lg flex items-center justify-center text-2xl font-black text-slate-700">
                    {user?.name?.charAt(0) ?? "U"}
                  </div>
                  <div className="pb-1">
                    <h2 className="text-lg font-black text-slate-900 mt-1">{user?.name ?? "User"}</h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-500">{donorProfile?.location ? "Lagos, Nigeria" : "Location not set"}</span>
                      {donorProfile?.bloodType && (
                        <span className="text-[10px] font-black text-[#E5384D] bg-rose-50 border border-rose-100 rounded-lg px-1.5 py-0.5">
                          {donorProfile.bloodType}
                        </span>
                      )}
                      {user?.isEmailVerified && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Link href="/donor/setup">
                  <button className="h-9 px-4 rounded-xl text-xs font-bold text-white shadow-md shadow-rose-500/20 flex items-center gap-1.5 hover:opacity-90 transition-all"
                    style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}>
                    <Edit className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                </Link>
              </div>
            </div>

            {/* Stats row */}
            <div className="border-t border-slate-100 grid grid-cols-4 divide-x divide-slate-100">
              {[
                { value: donorProfile?.totalDonations ?? 0,  label: "Donations",    color: "text-[#E5384D]" },
                { value: donorProfile?.trustScore ?? "—",    label: "Trust Score",  color: "text-blue-600" },
                { value: donorProfile?.livesSaved ?? "—",    label: "Lives Saved",  color: "text-purple-600" },
                { value: isEligible ? "✓" : "○",              label: "Eligibility",  color: isEligible ? "text-emerald-600" : "text-amber-500" },
              ].map((s) => (
                <div key={s.label} className="py-4 text-center">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: "Full Name",    value: user?.name,               icon: <User className="w-3.5 h-3.5" /> },
                { label: "Email",        value: user?.email,              icon: <Mail className="w-3.5 h-3.5" /> },
                { label: "Phone",        value: user?.phone ?? "—",       icon: <Phone className="w-3.5 h-3.5" /> },
                { label: "Blood Group",  value: donorProfile?.bloodType ?? "—", icon: <Droplet className="w-3.5 h-3.5 text-[#E5384D]" /> },
                { label: "Date of Birth",value: donorProfile?.dateOfBirth
                    ? new Date(donorProfile.dateOfBirth).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                    : "—",
                  icon: <Calendar className="w-3.5 h-3.5" /> },
                { label: "Gender",       value: donorProfile?.gender ?? "—", icon: <User className="w-3.5 h-3.5" /> },
              ].map((row) => (
                <div key={row.label} className="flex items-center py-2.5 border-b border-slate-50 last:border-0">
                  <div className="w-36 flex items-center gap-2 text-xs font-semibold text-slate-400 shrink-0">
                    <span className="text-slate-300">{row.icon}</span>
                    {row.label}
                  </div>
                  <p className="text-sm text-slate-800 font-medium">{row.value || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
