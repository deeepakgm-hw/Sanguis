"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Droplet, Heart, Users, Building2, Zap, ChevronRight, Star, Quote } from "lucide-react";

const slides = [
  {
    icon: (
      <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none">
        <circle cx="60" cy="60" r="50" fill="rgba(255,255,255,0.1)" />
        <path d="M60 25 C40 25, 20 42, 20 58 C20 80, 45 95, 60 105 C75 95, 100 80, 100 58 C100 42, 80 25, 60 25Z" fill="white" opacity="0.9" />
        <path d="M60 35 L60 85 M40 58 L80 58" stroke="#E5384D" strokeWidth="5" strokeLinecap="round" />
        <circle cx="48" cy="42" r="4" fill="#E5384D" opacity="0.7" />
        <circle cx="72" cy="42" r="3" fill="#E5384D" opacity="0.5" />
        <circle cx="38" cy="65" r="3" fill="#E5384D" opacity="0.6" />
        <circle cx="82" cy="68" r="4" fill="#E5384D" opacity="0.5" />
      </svg>
    ),
    title: "Donate Blood,\nSave Lives",
    subtitle: "Connect with donors in your community and respond to emergency blood requests in real time.",
  },
  {
    icon: (
      <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none">
        <circle cx="60" cy="60" r="50" fill="rgba(255,255,255,0.1)" />
        <circle cx="60" cy="42" r="18" fill="white" opacity="0.9" />
        <path d="M28 95 C28 75, 40 65, 60 65 C80 65, 92 75, 92 95" fill="white" opacity="0.9" />
        <circle cx="32" cy="48" r="13" fill="white" opacity="0.7" />
        <circle cx="88" cy="48" r="13" fill="white" opacity="0.7" />
        <path d="M14 95 C14 80, 22 71, 32 68" fill="white" opacity="0.7" />
        <path d="M106 95 C106 80, 98 71, 88 68" fill="white" opacity="0.7" />
        <circle cx="60" cy="30" r="3" fill="#E5384D" opacity="0.8" />
        <path d="M50 30 L70 30" stroke="#E5384D" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Save Lives",
    subtitle: "Respond to real-time emergency requests and help save a life — right from your browser.",
  },
  {
    icon: (
      <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none">
        <circle cx="60" cy="60" r="50" fill="rgba(255,255,255,0.1)" />
        <circle cx="60" cy="40" r="16" fill="white" opacity="0.9" />
        <path d="M30 90 C30 72, 43 62, 60 62 C77 62, 90 72, 90 90" fill="white" opacity="0.9" />
        <circle cx="28" cy="44" r="12" fill="white" opacity="0.65" />
        <circle cx="92" cy="44" r="12" fill="white" opacity="0.65" />
        <path d="M12 90 C12 77, 19 69, 28 66" fill="white" opacity="0.65" />
        <path d="M108 90 C108 77, 101 69, 92 66" fill="white" opacity="0.65" />
        <circle cx="60" cy="28" r="3" fill="#E5384D" opacity="0.85" />
        <circle cx="48" cy="33" r="2" fill="#E5384D" opacity="0.6" />
        <circle cx="72" cy="33" r="2" fill="#E5384D" opacity="0.6" />
      </svg>
    ),
    title: "Get Connect\nCommunity",
    subtitle: "Join thousands of donors building a stronger blood supply network across Africa and beyond.",
  },
];

const stats = [
  { value: "24K+", label: "Donors" },
  { value: "1.2K", label: "Lives Saved" },
  { value: "48", label: "Hospitals" },
];

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") ?? "http://localhost:5000";

export default function OnboardingPage() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [liveStats, setLiveStats] = useState({ totalDonors: "24K+", livesSaved: "1.2K", totalHospitals: "48" });

  const handleGoogleLogin = () => {
    window.location.href = `${BACKEND_URL}/api/v1/auth/google`;
  };

  const handleGithubLogin = () => {
    window.location.href = `${BACKEND_URL}/api/v1/auth/github`;
  };

  useEffect(() => {
    async function loadStats() {
      try {
        const { api } = await import("@/lib/api");
        const res = await api.get("/stats/aggregate");
        if (res.data?.data) {
          const d = res.data.data;
          setLiveStats({
            totalDonors: d.totalDonors > 1000 ? `${(d.totalDonors / 1000).toFixed(0)}K+` : String(d.totalDonors),
            livesSaved: d.livesSaved > 1000 ? `${(d.livesSaved / 1000).toFixed(1)}K` : String(d.livesSaved),
            totalHospitals: String(d.totalHospitals),
          });
        }
      } catch {}
    }
    loadStats();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveSlide((s) => (s + 1) % slides.length);
        setIsTransitioning(false);
      }, 300);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const goToSlide = (idx: number) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveSlide(idx);
      setIsTransitioning(false);
    }, 200);
  };

  const slide = slides[activeSlide];

  return (
    <div className="min-h-screen flex bg-white font-sans" style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* ── LEFT RED PANEL ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[58%] relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #C8102E 0%, #E5384D 50%, #ff6b6b 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full opacity-10 border-4 border-white" />
        <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 rounded-full opacity-10 border-4 border-white" />
        <div className="absolute top-1/3 right-[-30px] w-48 h-48 rounded-full opacity-5 bg-white" />

        {/* Blood Care logo */}
        <div className="relative z-10 p-8 flex items-center gap-3">
          <img src="/logo.jpg" alt="Sanguis Logo" className="w-10 h-10 rounded-xl object-cover border border-white/40 shadow-xl" />
          <div>
            <p className="text-white font-bold text-sm tracking-wide">Sanguis</p>
          </div>
        </div>

        {/* Main Slide Content */}
        <div className={`relative z-10 flex-1 flex flex-col items-center justify-center px-12 pb-8 transition-all duration-300 ${isTransitioning ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}>
          <div className="mb-8 flex items-center justify-center">
            {slide.icon}
          </div>
          <h1 className="text-white font-black text-4xl text-center leading-tight whitespace-pre-line mb-4 tracking-tight">
            {slide.title}
          </h1>
          <p className="text-white/80 text-center text-sm leading-relaxed max-w-xs font-medium">
            {slide.subtitle}
          </p>
        </div>

        {/* Bottom: slide dots + stats */}
        <div className="relative z-10 px-12 pb-8 space-y-6">
          {/* Slide dots */}
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`rounded-full transition-all duration-300 ${
                  activeSlide === idx
                    ? "w-8 h-2.5 bg-white"
                    : "w-2.5 h-2.5 bg-white/40 hover:bg-white/60"
                }`}
              />
            ))}
          </div>

          {/* Testimonial card */}
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <Quote className="w-4 h-4 text-white/60 mb-2" />
            <p className="text-white text-xs leading-relaxed italic font-medium">
              "Sanguis connected me with a B+ donor within 20 minutes during my mother's surgery. This platform saved her life."
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[10px] text-white font-bold">S</div>
              <div>
                <p className="text-white text-[11px] font-bold">Sarah Okafor</p>
                <p className="text-white/60 text-[10px]">Lagos, Nigeria</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT WHITE PANEL ── */}
      <div className="flex-1 flex flex-col justify-between p-8 lg:p-12 overflow-y-auto">
        {/* Top: Sanguis brand */}
        <div className="flex items-center gap-2.5 mb-8">
          <img src="/logo.jpg" alt="Sanguis Logo" className="w-7 h-7 rounded-lg object-cover border border-gray-200 shadow-sm" />
          <span className="text-[#E5384D] font-black text-base tracking-wide">Sanguis</span>
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col justify-center max-w-sm">
          <div className="mb-8">
            <div className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-1">Blood Donor Network</div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Welcome!</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Join the community of donors and recipients saving lives across Africa.
            </p>
          </div>

          {/* Primary CTA Buttons */}
          <div className="space-y-3 mb-6">
            <Link href="/register" className="block">
              <button className="w-full h-12 rounded-xl font-bold text-sm text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] shadow-lg shadow-rose-500/30"
                style={{ background: "linear-gradient(135deg, #E5384D, #C8102E)" }}>
                Create an Account
              </button>
            </Link>
            <Link href="/login" className="block">
              <button className="w-full h-12 rounded-xl font-bold text-sm text-[#E5384D] border-2 border-[#E5384D] bg-white hover:bg-rose-50 transition-all duration-200 active:scale-[0.98]">
                Sign In
              </button>
            </Link>
          </div>

          {/* Social Login */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400 bg-white px-3">
              or continue with
            </div>
          </div>

          <div className="space-y-2.5 mb-6">
            <button
              id="google-oauth-btn-landing"
              type="button"
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
              id="github-oauth-btn-landing"
              type="button"
              onClick={handleGithubLogin}
              className="w-full h-11 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-3 shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-black text-[#E5384D] tracking-tight">{s.value}</p>
                <p className="text-xs text-gray-500 font-medium mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-400 text-center mt-6 leading-relaxed">
          By continuing, you agree to Sanguis{" "}
          <Link href="#" className="text-[#E5384D] hover:underline">Terms of Service</Link>
          {" "}and{" "}
          <Link href="#" className="text-[#E5384D] hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
