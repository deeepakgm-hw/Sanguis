"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Award,
  ShieldCheck,
  QrCode,
  Printer,
  ChevronLeft,
  ExternalLink,
  Droplet,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function CertificateViewPage() {
  const params = useParams();
  const certId = params.id as string;

  const [certificate, setCertificate] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (certId) fetchCertificate();
  }, [certId]);

  const fetchCertificate = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/donations/certificates/${certId}`);
      setCertificate(res.data?.data);
    } catch {
      toast.error("Failed to load digital certificate");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 flex items-center justify-center p-6 font-sans">
        <div className="text-center">
          <Award className="w-10 h-10 text-amber-500 animate-bounce mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Retrieving digital certificate...</p>
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 flex items-center justify-center p-6 font-sans">
        <div className="text-center bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-slate-200 dark:border-zinc-800 max-w-sm">
          <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">Certificate not found.</p>
          <Link href="/donation" className="text-xs font-bold text-[#E5384D] hover:underline mt-3 inline-block">
            ← Back to Donation Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/certificate/verify/${certificate.certificateId}`;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 p-4 md:p-8 font-sans">
      {/* Top Controls Bar (hidden during printing) */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-6 print:hidden">
        <Link
          href="/donation"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Certificates
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/certificate/verify/${certificate.certificateId}`}
            target="_blank"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Verify Link
          </Link>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E5384D] text-white hover:bg-rose-600 shadow-md shadow-rose-600/20 flex items-center gap-2 active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* PRINTABLE DIGITAL CERTIFICATE CONTAINER */}
      <div className="max-w-4xl mx-auto bg-white text-slate-900 rounded-3xl border-4 border-slate-900 shadow-2xl p-8 md:p-12 relative overflow-hidden print:border-2 print:shadow-none print:p-8">
        {/* Certificate Decorative Border Lines */}
        <div className="absolute inset-2 border-2 border-rose-500/20 rounded-2xl pointer-events-none" />

        {/* Certificate Header Branding */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-6 mb-8">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Sanguis Logo" className="w-12 h-12 rounded-2xl object-cover border border-slate-300 shadow-sm" />
            <div>
              <h1 className="font-black text-xl tracking-tight text-slate-900 uppercase">Sanguis</h1>
              <p className="text-[10px] font-bold text-[#E5384D] tracking-widest uppercase">
                Emergency Blood & Plasma Network
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase tracking-widest inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> OFFICIAL VERIFIED
            </span>
            <p className="text-[10px] font-mono font-bold text-slate-500 mt-1">
              ID: {certificate.certificateId}
            </p>
          </div>
        </div>

        {/* Certificate Body Text */}
        <div className="text-center space-y-6 my-8">
          <div className="space-y-1">
            <p className="text-xs font-black tracking-widest text-[#E5384D] uppercase">
              Official Certificate of Appreciation
            </p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              CERTIFICATE OF BLOOD DONATION
            </h2>
          </div>

          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            This is to certify that
          </p>

          <div className="py-2 border-b-2 border-slate-900 inline-block px-8">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {certificate.donorName}
            </h3>
          </div>

          <p className="text-xs text-slate-600 max-w-xl mx-auto leading-relaxed font-medium">
            has successfully completed a voluntary & medically verified blood donation at the authorized campaign
          </p>

          <div className="space-y-1 bg-rose-50/60 p-4 rounded-2xl border border-rose-100 max-w-lg mx-auto">
            <h4 className="font-black text-base text-[#E5384D]">
              {certificate.campaignTitle}
            </h4>
            <p className="text-xs text-slate-700 font-bold">
              Organized by: {certificate.authorizedOrganization}
            </p>
            <p className="text-xs text-slate-500">
              Venue: {certificate.venue}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-xl mx-auto text-left pt-2 text-xs font-medium">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Donation Date</span>
              <span className="font-bold text-slate-800">
                {new Date(certificate.donationDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Issue Date</span>
              <span className="font-bold text-slate-800">
                {new Date(certificate.issueDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Status</span>
              <span className="font-black text-emerald-700">VERIFIED</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Certificate ID</span>
              <span className="font-mono font-bold text-slate-800 text-[11px]">
                {certificate.certificateId}
              </span>
            </div>
          </div>
        </div>

        {/* Certificate Bottom Section with QR Verification & AICTE Disclaimer */}
        <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* QR Verification Box */}
          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="bg-white p-2 rounded-xl border border-slate-200 shrink-0">
              <QrCode className="w-14 h-14 text-slate-900" />
            </div>
            <div className="text-left text-[10px] font-medium text-slate-500 space-y-0.5">
              <p className="font-bold text-slate-800 text-xs">Scan to Verify</p>
              <p>Official digital verification registry token.</p>
              <p className="font-mono text-[9px] text-[#E5384D] truncate max-w-[140px]">
                {certificate.verificationToken.slice(0, 18)}...
              </p>
            </div>
          </div>

          {/* Institutional / AICTE Activity Disclaimer */}
          <div className="md:col-span-2 text-left text-[10px] text-slate-500 leading-relaxed font-medium bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <p className="font-bold text-slate-800 mb-1 uppercase tracking-wider text-[9px]">
              Institutional & Community Activity Supporting Evidence
            </p>
            <p>
              This certificate confirms a verified blood donation recorded through the Sanguis platform. It may be submitted as supporting documentation for institutional, college, NSS, NCC, or AICTE-related activity claims where applicable. Acceptance and allocation of activity points are subject to the rules and approval of the relevant institution or authority.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
