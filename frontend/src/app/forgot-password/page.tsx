"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import Link from "next/link";
import { Droplet, MailCheck, ArrowLeft, Loader2 } from "lucide-react";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});
type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) });

  async function onSubmit(values: ForgotForm) {
    try {
      // Wire to backend forgot-password endpoint
      await api.post("/auth/forgot-password", values);
      setSentEmail(values.email);
      setSent(true);
      toast.success("Reset link sent! Check your inbox.");
    } catch (err: any) {
      // Show success anyway to prevent email enumeration
      setSentEmail(values.email);
      setSent(true);
      toast.success("If this email exists, a reset link has been sent.");
    }
  }

  return (
    <div className="min-h-screen flex bg-white font-sans" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ── LEFT RED PANEL ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[44%] relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #C8102E 0%, #E5384D 55%, #ff6b6b 100%)" }}
      >
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 rounded-full opacity-10 border-4 border-white" />
        <div className="absolute bottom-[-80px] right-[-80px] w-96 h-96 rounded-full opacity-10 border-4 border-white" />

        <div className="relative z-10 p-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center border border-white/30 shadow-xl">
            <Droplet className="w-6 h-6 text-white fill-white" />
          </div>
          <span className="text-white font-black text-lg tracking-wide">Sanguis</span>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-10 text-center">
          <div className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center mb-8 shadow-2xl">
            <MailCheck className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-white font-black text-2xl tracking-tight mb-3">
            Forgot your password?
          </h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-xs">
            No worries! Enter your email address and we'll send you a secure link to reset your password.
          </p>

          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/15 text-left w-full max-w-xs">
            <p className="text-white/60 text-[11px] font-medium leading-relaxed">
              🔒 The reset link is valid for <span className="text-white font-bold">15 minutes</span> and can only be used once. If you don't receive it, check your spam folder.
            </p>
          </div>
        </div>

        <div className="relative z-10 p-10">
          <p className="text-white/40 text-xs text-center">© 2026 Sanguis · Emergency Blood Network</p>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-10">
        <div className="max-w-sm w-full mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <Droplet className="w-5 h-5 text-[#E5384D] fill-[#E5384D]" />
            <span className="text-[#E5384D] font-black text-sm tracking-wide">Sanguis</span>
          </div>

          {!sent ? (
            <>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">Reset Password</h2>
              <p className="text-gray-500 text-sm mb-7">
                Enter your email address and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="marcus@email.com"
                    className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                  />
                  {errors.email && (
                    <p className="text-xs text-[#E5384D] mt-1">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30"
                  style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {isSubmitting ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-5">
                <MailCheck className="w-8 h-8 text-[#E5384D]" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Check Your Email</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-1">
                We sent a reset link to
              </p>
              <p className="font-bold text-gray-900 text-sm mb-6">{sentEmail}</p>
              <div className="bg-gray-50 rounded-xl p-4 text-left mb-6 border border-gray-100">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Didn't receive it? Check your spam folder or{" "}
                  <button
                    onClick={() => setSent(false)}
                    className="text-[#E5384D] font-semibold hover:underline"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
            </div>
          )}

          {/* Back to sign in */}
          <Link
            href="/login"
            className="flex items-center justify-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium mt-6 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
