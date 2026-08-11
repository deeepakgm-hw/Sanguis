"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Droplet, Mail, KeyRound, CheckCircle2, ShieldCheck, RefreshCw, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const urlToken = searchParams.get("token");
  const urlEmail = searchParams.get("email");
  const urlRole = searchParams.get("role");

  useEffect(() => {
    if (urlEmail) {
      setEmailInput(urlEmail);
    }
  }, [urlEmail]);

  // 60-second resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Auto-verify if token query param exists in URL
  useEffect(() => {
    if (!urlToken) return;

    async function autoVerifyToken() {
      setLoading(true);
      try {
        const res = await api.post("/auth/verify-otp", { token: urlToken });
        toast.success("Account verified successfully!");
        setVerifiedSuccess(true);
        if (res.data?.data?.user) {
          setUser(res.data.data.user);
        }
        if (res.data?.data?.accessToken) {
          setAccessToken(res.data.data.accessToken);
        }
        const targetRoute = urlRole === "donor" || res.data?.data?.user?.role === "donor" ? "/donor/setup" : "/dashboard";
        setTimeout(() => router.push(targetRoute), 1200);
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Verification link is invalid or expired.");
      } finally {
        setLoading(false);
      }
    }
    autoVerifyToken();
  }, [urlToken, urlRole, router, setUser, setAccessToken]);

  // Submit 6-digit OTP code
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetEmail = user?.email || emailInput.trim();
    const cleanOtp = otpCode.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP verification code");
      return;
    }
    if (!targetEmail) {
      toast.error("Registered email address not found. Please re-register.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", {
        email: targetEmail,
        otp: cleanOtp,
        code: cleanOtp,
      });
      toast.success("Account verified successfully! Welcome to Sanguis.");
      setVerifiedSuccess(true);
      if (res.data?.data?.user) {
        setUser(res.data.data.user);
      }
      if (res.data?.data?.accessToken) {
        setAccessToken(res.data.data.accessToken);
      }
      const targetRoute = urlRole === "donor" || res.data?.data?.user?.role === "donor" ? "/donor/setup" : "/dashboard";
      setTimeout(() => router.push(targetRoute), 1200);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid or expired verification OTP code");
    } finally {
      setLoading(false);
    }
  };

  // Handle Paste OTP
  const handlePasteOtp = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtpCode(pasted);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    const targetEmail = user?.email || emailInput.trim();
    if (!targetEmail) {
      toast.error("Email address not found to resend OTP code");
      return;
    }
    if (cooldown > 0) return;

    setResending(true);
    try {
      await api.post("/auth/resend-otp", { email: targetEmail });
      toast.success(`New 6-digit OTP code sent to ${targetEmail}`);
      setCooldown(60);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend verification OTP");
    } finally {
      setResending(false);
    }
  };

  const targetEmailDisplay = user?.email || emailInput || "your registered email";

  return (
    <div className="min-h-screen flex bg-white font-sans" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ── LEFT HERO PANEL (MATCHING REGISTER & LOGIN UI) ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[44%] relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #C8102E 0%, #E5384D 55%, #ff6b6b 100%)" }}
      >
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 rounded-full opacity-10 border-4 border-white" />
        <div className="absolute bottom-[-80px] right-[-80px] w-96 h-96 rounded-full opacity-10 border-4 border-white" />

        <div className="relative z-10 p-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Sanguis Logo" className="w-11 h-11 rounded-2xl object-cover border border-white/40 shadow-xl" />
            <div>
              <span className="text-white font-black text-lg tracking-wide block">Sanguis</span>
              <span className="text-white/70 text-[10px] font-bold uppercase tracking-wider block">Security & Authentication</span>
            </div>
          </div>
          <span className="text-xs font-extrabold bg-white/15 text-white px-2.5 py-1 rounded-full border border-white/20">
            🇮🇳 India Network
          </span>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-10 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center mb-6 shadow-2xl overflow-hidden p-2">
            <img src="/logo.jpg" alt="Sanguis Logo" className="w-full h-full rounded-2xl object-cover" />
          </div>
          <h1 className="text-white font-black text-3xl tracking-tight mb-3">Email OTP Verification</h1>
          <p className="text-white/90 text-sm leading-relaxed max-w-sm">
            Confirm your account identity with the 6-digit SMTP verification OTP sent to your registered email address.
          </p>

          <div className="mt-8 space-y-3 w-full max-w-sm">
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 text-left shadow-md">
              <ShieldCheck className="w-5 h-5 text-white shrink-0" />
              <p className="text-white text-xs font-semibold">5-Minute Cryptographic Expiry Protection</p>
            </div>
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 text-left shadow-md">
              <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
              <p className="text-white text-xs font-semibold">Instant Account Activation & Donor Profile Access</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 p-10">
          <p className="text-white/60 text-xs text-center font-medium">© 2026 Sanguis India · National Emergency Lifesaving Network</p>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL (MATCHING REGISTER & LOGIN UI) ── */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-10 overflow-y-auto">
        <div className="max-w-md w-full mx-auto">
          <div className="flex items-center gap-2.5 mb-8">
            <img src="/logo.jpg" alt="Sanguis Logo" className="w-7 h-7 rounded-lg object-cover border border-gray-200 shadow-sm" />
            <div>
              <span className="text-[#E5384D] font-black text-base tracking-wide block">Sanguis</span>
              <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Account Verification Gateway</span>
            </div>
          </div>

          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 text-[#E5384D]">
            {verifiedSuccess ? <CheckCircle2 className="w-7 h-7 text-emerald-500" /> : <Mail className="w-7 h-7" />}
          </div>

          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
            {verifiedSuccess ? "Account Verified!" : "Verify Email OTP"}
          </h2>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            {verifiedSuccess
              ? "Your account credentials have been authenticated successfully. Redirecting…"
              : `Enter the 6-digit SMTP verification OTP code sent to `}
            {!verifiedSuccess && <strong className="text-gray-900 font-bold">{targetEmailDisplay}</strong>}
          </p>

          {verifiedSuccess ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm font-semibold flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Redirecting to Sanguis Network Command Center…</span>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider text-center">
                  6-Digit Verification OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onPaste={handlePasteOtp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtpCode(val);
                  }}
                  placeholder="482913"
                  className="w-full h-14 rounded-2xl border border-gray-200 bg-gray-50 text-center font-mono text-3xl font-black tracking-[0.4em] text-[#E5384D] placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all shadow-inner"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6}
                className="w-full h-12 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30"
                style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {loading ? "Verifying OTP Code..." : "Verify Account OTP"}
              </button>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500">Didn't receive the OTP code?</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || cooldown > 0}
                  className="text-[#E5384D] font-bold hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-1.5"
                >
                  {resending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP Code"}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-gray-500 mt-8">
            Need to change email?{" "}
            <Link href="/register" className="text-[#E5384D] font-bold hover:underline">Re-register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center font-sans text-xs">
        Loading verification gateway…
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
