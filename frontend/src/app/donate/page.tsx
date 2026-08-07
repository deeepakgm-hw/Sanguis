"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { ProfileSubNav } from "@/components/layout/profile-sub-nav";
import { Droplet, Heart, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

const AMOUNTS = [500, 1000, 5000, 10000] as const;

const IMPACT_STATS = [
  { value: "₦1,000", desc: "Matches 5 blood donors with recipients" },
  { value: "₦5,000", desc: "Funds 3 months of emergency SMS alerts" },
  { value: "₦10,000", desc: "Sponsors a new hospital partnership" },
];

export default function DonatePage() {
  const [selected, setSelected] = useState<number>(1000);
  const [custom, setCustom]     = useState<string>("");
  const [donating, setDonating] = useState(false);
  const [success, setSuccess]   = useState(false);

  const finalAmount = custom ? parseInt(custom) || 0 : selected;

  const handleDonate = async () => {
    if (!finalAmount || finalAmount < 100) {
      toast.error("Minimum donation is ₦100");
      return;
    }
    setDonating(true);
    try {
      const { api } = await import("@/lib/api");
      await api.post("/donations", { amount: finalAmount });
      setSuccess(true);
      toast.success(`Thank you! ₦${finalAmount.toLocaleString()} donated to Sanguis 💙`);
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setDonating(false);
    }
  };

  if (success) {
    return (
      <AppLayout>
        <div className="flex gap-5">
          <ProfileSubNav />
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-5">
                <Heart className="w-10 h-10 text-[#E5384D] fill-[#E5384D]" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Thank You!</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-1">
                Your donation of <strong className="text-[#E5384D]">₦{finalAmount.toLocaleString()}</strong> helps us
                match more donors with patients in need.
              </p>
              <p className="text-xs text-slate-400 mt-3">A receipt has been sent to your email.</p>
              <button
                onClick={() => setSuccess(false)}
                className="mt-6 h-10 px-6 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all shadow-md shadow-rose-500/20"
                style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}
              >
                Donate Again
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex gap-5">
        <ProfileSubNav />

        <div className="flex-1 min-w-0">
          {/* Page Header */}
          <div className="text-center mb-8 max-w-lg mx-auto">
            <h1 className="text-2xl font-black text-slate-900">Support Sanguis</h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Sanguis is a community-funded platform. Your contribution helps us expand to more cities, improve our matching algorithm, and save more lives.
            </p>
          </div>

          {/* Red Donation Card */}
          <div
            className="max-w-lg mx-auto rounded-3xl p-7 text-white text-center mb-6 shadow-2xl shadow-rose-500/30 relative overflow-hidden"
            style={{ background: "linear-gradient(145deg, #C8102E 0%, #E5384D 60%, #ff6b6b 100%)" }}
          >
            {/* Decorative rings */}
            <div className="absolute top-[-50px] right-[-50px] w-40 h-40 rounded-full border-4 border-white/10" />
            <div className="absolute bottom-[-30px] left-[-30px] w-32 h-32 rounded-full border-4 border-white/10" />

            {/* Droplet icon */}
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center mx-auto mb-4">
              <Droplet className="w-6 h-6 text-white fill-white" />
            </div>

            <h2 className="text-xl font-black mb-1">Every Donation Counts</h2>
            <p className="text-white/80 text-sm mb-6">
              ₦1,000 helps us match 5 blood donors with recipients. Join 840 monthly supporters.
            </p>

            {/* Amount chips */}
            <div className="flex items-center justify-center gap-3 flex-wrap mb-5">
              {AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => { setSelected(amt); setCustom(""); }}
                  className={`px-4 py-2 rounded-xl text-sm font-black transition-all duration-200 ${
                    selected === amt && !custom
                      ? "bg-white text-[#E5384D] shadow-lg shadow-black/20"
                      : "bg-white/15 border border-white/20 text-white hover:bg-white/25"
                  }`}
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#E5384D] font-bold text-sm">₦</span>
              <input
                type="number"
                min="100"
                value={custom}
                onChange={(e) => { setCustom(e.target.value); setSelected(0); }}
                placeholder="Enter custom amount"
                className="w-full h-11 rounded-xl bg-white pl-7 pr-4 text-sm text-slate-900 font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>

          {/* Donate Now Button */}
          <div className="max-w-lg mx-auto mb-6">
            <button
              onClick={handleDonate}
              disabled={donating || !finalAmount}
              className="w-full h-12 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-xl shadow-rose-500/30"
              style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}
            >
              {donating ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
              ) : (
                <><Heart className="w-4 h-4" />Donate {finalAmount ? `₦${finalAmount.toLocaleString()}` : "Now"}</>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">
              Secured by Paystack · Your data is protected
            </p>
          </div>

          {/* Impact breakdown */}
          <div className="max-w-lg mx-auto grid grid-cols-3 gap-3">
            {IMPACT_STATS.map((s) => (
              <div key={s.value} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
                <p className="font-black text-[#E5384D] text-base">{s.value}</p>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
