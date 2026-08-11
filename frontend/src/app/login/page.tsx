"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import Link from "next/link";
import { Droplet, Users, Building2, Zap, Eye, EyeOff, Loader2 } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:5000";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const statsFeatures = [
  { icon: <Users className="w-4 h-4" />, text: "24,000+ verified donors nationwide" },
  { icon: <Building2 className="w-4 h-4" />, text: "48 partner hospitals and clinics" },
  { icon: <Zap className="w-4 h-4" />, text: "Average 18-min emergency response" },
];

export default function LoginPage() {
  const router = useRouter();
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    try {
      const { data } = await api.post("/auth/login", values);
      setAccessToken(data.data.accessToken);
      setUser(data.data.user);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Invalid credentials. Please try again.";
      toast.error(msg);
    }
  }

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/v1/auth/google`;
  };

  const handleGithubLogin = () => {
    window.location.href = `${BACKEND_URL}/api/v1/auth/github`;
  };

  return (
    <div className="min-h-screen flex bg-white font-sans" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ── LEFT RED PANEL ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[44%] relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #C8102E 0%, #E5384D 55%, #ff6b6b 100%)" }}
      >
        {/* Decorative rings */}
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 rounded-full opacity-10 border-4 border-white" />
        <div className="absolute bottom-[-80px] right-[-80px] w-96 h-96 rounded-full opacity-10 border-4 border-white" />
        <div className="absolute top-1/2 -translate-y-1/2 right-[-60px] w-48 h-48 rounded-full opacity-5 bg-white" />

        {/* Top logo */}
        <div className="relative z-10 p-10 flex items-center gap-3">
          <img src="/logo.jpg" alt="Sanguis Logo" className="w-11 h-11 rounded-2xl object-cover border border-white/40 shadow-xl" />
          <span className="text-white font-black text-lg tracking-wide">Sanguis</span>
        </div>

        {/* Center hero */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-10 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center mb-8 shadow-2xl overflow-hidden p-2">
            <img src="/logo.jpg" alt="Sanguis Logo" className="w-full h-full rounded-2xl object-cover" />
          </div>
          <h1 className="text-white font-black text-3xl tracking-tight mb-3">Sanguis</h1>
          <p className="text-white/80 text-sm leading-relaxed max-w-xs">
            Connecting blood donors with patients in real-time across India.
          </p>

          {/* Feature pills */}
          <div className="mt-10 space-y-3 w-full max-w-xs">
            {statsFeatures.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 text-left"
              >
                <div className="text-white/70 shrink-0">{f.icon}</div>
                <p className="text-white text-xs font-medium">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 p-10">
          <p className="text-white/40 text-xs text-center">© 2026 Sanguis · Emergency Blood Network</p>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-10 overflow-y-auto">
        <div className="max-w-sm w-full mx-auto">
          {/* Brand mark */}
          <div className="flex items-center gap-2.5 mb-8">
            <img src="/logo.jpg" alt="Sanguis Logo" className="w-7 h-7 rounded-lg object-cover border border-gray-200 shadow-sm" />
            <span className="text-[#E5384D] font-black text-sm tracking-wide">Sanguis</span>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-1">Welcome Back</h2>
          <p className="text-gray-500 text-sm mb-7">Sign in to your Sanguis account</p>

          {/* OAuth Buttons */}
          <div className="space-y-2.5 mb-5">
            <button
              id="google-oauth-btn"
              onClick={handleGoogleLogin}
              className="w-full h-11 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-3 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <button
              id="github-oauth-btn"
              onClick={handleGithubLogin}
              className="w-full h-11 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-3 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-gray-400">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address</label>
              <input
                {...register("email")}
                type="email"
                placeholder="marcus@email.com"
                className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
              />
              {errors.email && <p className="text-xs text-[#E5384D] mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-700">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#E5384D] font-semibold hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Your password"
                  className="w-full h-11 rounded-xl border border-gray-200 bg-gray-50 px-3.5 pr-11 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E5384D]/20 focus:border-[#E5384D] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-[#E5384D] mt-1">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 mt-1"
              style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-6">
            Don't have an account?{" "}
            <Link href="/register" className="text-[#E5384D] font-bold hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
