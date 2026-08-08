"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  MapPin,
  Award,
  ExternalLink,
  Droplet,
} from "lucide-react";
import { api } from "@/lib/api";

export default function PublicCertificateVerificationPage() {
  const params = useParams();
  const certId = params.certificateId as string;

  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (certId) verifyCertificate();
  }, [certId]);

  const verifyCertificate = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/donations/certificates/verify/${certId}`);
      setVerificationResult(res.data);
    } catch (err: any) {
      setVerificationResult({
        success: false,
        status: "INVALID",
        message: err?.response?.data?.message || "Certificate record not found in official registry.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 md:p-8 max-w-lg w-full space-y-6 relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Sanguis Logo" className="w-10 h-10 rounded-2xl object-cover border border-slate-200" />
            <div>
              <h1 className="font-black text-base text-slate-900 dark:text-zinc-100 uppercase tracking-wide">
                Sanguis Verification
              </h1>
              <p className="text-[10px] font-bold text-[#E5384D] tracking-widest uppercase">
                Digital Registry Portal
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-slate-400">
            ID: {certId}
          </span>
        </div>

        {/* Verification Status Output */}
        {loading ? (
          <div className="text-center py-10">
            <ShieldCheck className="w-10 h-10 text-[#E5384D] animate-bounce mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-500">Verifying digital certificate against registry...</p>
          </div>
        ) : verificationResult?.status === "VALID" ? (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 border-2 border-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-widest inline-block mb-2">
                ✓ CERTIFICATE VERIFIED & VALID
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-zinc-100">
                Official Blood Donation Record
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">
                Issued by Sanguis Emergency Blood & Plasma Network
              </p>
            </div>

            {/* Certificate Meta Details */}
            <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 text-left space-y-2.5 text-xs font-medium">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Donor Name</span>
                <span className="font-bold text-slate-900 dark:text-zinc-100">
                  {verificationResult.data.donorName}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Campaign</span>
                <span className="font-bold text-slate-900 dark:text-zinc-100 text-right max-w-[220px]">
                  {verificationResult.data.campaignTitle}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Organization</span>
                <span className="font-bold text-slate-900 dark:text-zinc-100">
                  {verificationResult.data.authorizedOrganization}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Venue</span>
                <span className="font-bold text-slate-900 dark:text-zinc-100">
                  {verificationResult.data.venue}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Donation Date</span>
                <span className="font-bold text-slate-900 dark:text-zinc-100">
                  {new Date(verificationResult.data.donationDate).toLocaleDateString("en-IN")}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 text-[11px] text-slate-500 text-left">
              <p className="font-bold text-slate-700 dark:text-zinc-300 mb-0.5">
                Institutional Verification Disclaimer
              </p>
              <p>
                This digital verification confirms that the specified blood donation was completed and verified by accredited medical personnel on the Sanguis network. Acceptance for academic or community service points is subject to institutional rules.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-600 border-2 border-rose-500 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <XCircle className="w-9 h-9" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 uppercase tracking-widest inline-block mb-2">
                ❌ CERTIFICATE {verificationResult?.status || "INVALID"}
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-zinc-100">
                Verification Failed
              </h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">
                {verificationResult?.message || "Invalid or unverified certificate ID."}
              </p>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 text-center">
          <Link
            href="/"
            className="text-xs font-bold text-[#E5384D] hover:underline"
          >
            Go to Sanguis Platform Home
          </Link>
        </div>
      </div>
    </div>
  );
}
