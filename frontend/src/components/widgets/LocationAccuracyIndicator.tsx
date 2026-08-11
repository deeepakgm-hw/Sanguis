"use client";

import React from "react";
import { GPSQuality, GPS_MAX_MATCHING_ACCURACY_METERS } from "@/services/location.service";
import { ShieldCheck, AlertTriangle, Radio } from "lucide-react";

interface LocationAccuracyIndicatorProps {
  accuracyMeters?: number | null;
  qualityCategory?: GPSQuality | null;
  isLiveTracking?: boolean;
}

export function LocationAccuracyIndicator({
  accuracyMeters,
  qualityCategory = "GOOD",
  isLiveTracking = false,
}: LocationAccuracyIndicatorProps) {
  if (accuracyMeters === undefined || accuracyMeters === null) {
    return (
      <div className="inline-flex items-center gap-2 bg-zinc-900/80 border border-zinc-800 text-zinc-400 px-3 py-1.5 rounded-xl font-mono text-[10px]">
        <Radio className="h-3 w-3 text-zinc-500 animate-pulse" />
        <span>GPS Standby</span>
      </div>
    );
  }

  const rounded = Math.round(accuracyMeters);
  const isHighQuality = rounded <= GPS_MAX_MATCHING_ACCURACY_METERS;

  const qualityStyles: Record<GPSQuality, { label: string; badge: string; icon: any }> = {
    EXCELLENT: { label: "Excellent Signal", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: ShieldCheck },
    GOOD: { label: "Good Signal", badge: "bg-sky-500/10 text-sky-400 border-sky-500/30", icon: ShieldCheck },
    ACCEPTABLE: { label: "Acceptable", badge: "bg-amber-500/10 text-amber-400 border-amber-500/30", icon: ShieldCheck },
    POOR: { label: "Poor GPS", badge: "bg-orange-500/10 text-orange-400 border-orange-500/30", icon: AlertTriangle },
    VERY_POOR: { label: "Very Poor GPS", badge: "bg-rose-500/10 text-rose-400 border-rose-500/30", icon: AlertTriangle },
  };

  const cat = qualityCategory || "GOOD";
  const style = qualityStyles[cat] || qualityStyles.GOOD;
  const Icon = style.icon;

  return (
    <div className="inline-flex flex-wrap items-center gap-2 font-mono text-[10px]">
      {/* Live Badge */}
      <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-xl text-zinc-200">
        <span className={`h-2 w-2 rounded-full ${isLiveTracking ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
        <span className="font-bold">{isLiveTracking ? "LIVE GPS" : "STATIC"}</span>
      </div>

      {/* Accuracy Value */}
      <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-xl text-zinc-300">
        <span className="text-zinc-500">Accuracy:</span>
        <span className="font-bold text-zinc-100">{rounded}m</span>
      </div>

      {/* Quality Badge */}
      <div className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-xl font-bold uppercase ${style.badge}`}>
        <Icon className="h-3 w-3" />
        <span>{style.label}</span>
      </div>

      {/* Warning for Poor Accuracy */}
      {!isHighQuality && (
        <span className="text-[9px] text-amber-400/90 font-medium">
          (Approximate location — &gt;50m excluded from high-confidence matching)
        </span>
      )}
    </div>
  );
}
