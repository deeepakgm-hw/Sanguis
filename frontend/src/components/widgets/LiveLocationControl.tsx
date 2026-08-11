"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { LocationAccuracyIndicator } from "./LocationAccuracyIndicator";
import { GPSQuality } from "@/services/location.service";
import { Navigation, Radio, Shield, AlertCircle, RefreshCw, Zap } from "lucide-react";

interface LiveLocationControlProps {
  isTracking: boolean;
  accuracyMeters?: number | null;
  qualityCategory?: GPSQuality | null;
  permissionError?: string | null;
  emergencyMode?: boolean;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onRecenter?: () => void;
  onToggleEmergencyMode?: (enabled: boolean) => void;
}

export function LiveLocationControl({
  isTracking,
  accuracyMeters,
  qualityCategory,
  permissionError,
  emergencyMode = false,
  onStartTracking,
  onStopTracking,
  onRecenter,
  onToggleEmergencyMode,
}: LiveLocationControlProps) {
  const [consentAcknowledged, setConsentAcknowledged] = useState(false);

  return (
    <div className="border border-zinc-800 bg-zinc-900/40 backdrop-blur-md rounded-2xl p-5 space-y-4 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl border ${isTracking ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-800/50 border-zinc-700 text-zinc-400"}`}>
            <Radio className={`h-4 w-4 ${isTracking ? "animate-pulse text-emerald-400" : ""}`} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-100 flex items-center gap-2">
              REAL-TIME DONOR GPS RADAR
              {isTracking && (
                <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded uppercase">
                  ACTIVE
                </span>
              )}
            </h3>
            <p className="text-[9px] text-zinc-400 font-sans mt-0.5">
              Direct device GPS telemetry for real-time emergency dispatch matching.
            </p>
          </div>
        </div>

        {/* Live Accuracy Indicator */}
        <LocationAccuracyIndicator
          accuracyMeters={accuracyMeters}
          qualityCategory={qualityCategory}
          isLiveTracking={isTracking}
        />
      </div>

      {/* Permission Error / Warning Banner */}
      {permissionError && (
        <div className="flex items-start gap-2.5 bg-rose-950/30 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-[10px] font-sans">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold font-mono uppercase block text-rose-400">Location Access Issue</span>
            <span>{permissionError}</span>
          </div>
        </div>
      )}

      {/* Opt-In Consent Notice */}
      <div className="bg-zinc-950/60 border border-zinc-850 p-3 rounded-xl text-[10px] text-zinc-400 font-sans leading-relaxed">
        <p className="flex items-start gap-2">
          <Shield className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
          <span>
            <strong>Consent &amp; Privacy:</strong> Your location is used strictly to find nearby blood donation opportunities and emergency requests. You can stop sharing at any time. Coordinates are protected under Sanguis medical security rules.
          </span>
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          {!isTracking ? (
            <Button
              id="cta-start-location-sharing"
              onClick={onStartTracking}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 transition-all flex items-center gap-2"
            >
              <Radio className="h-4 w-4 animate-pulse" />
              <span>Share Live Location</span>
            </Button>
          ) : (
            <Button
              onClick={onStopTracking}
              variant="outline"
              className="border-rose-500/40 bg-rose-950/20 hover:bg-rose-900/40 text-rose-300 font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl transition-all flex items-center gap-2"
            >
              <Radio className="h-4 w-4 text-rose-400" />
              <span>Stop Sharing</span>
            </Button>
          )}

          {onRecenter && (
            <Button
              onClick={onRecenter}
              variant="outline"
              size="sm"
              className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider"
            >
              <Navigation className="h-3.5 w-3.5 mr-1 text-rose-500" /> Recenter
            </Button>
          )}
        </div>

        {/* Emergency Mode Toggle */}
        {onToggleEmergencyMode && isTracking && (
          <button
            onClick={() => onToggleEmergencyMode(!emergencyMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-bold uppercase transition-all ${
              emergencyMode
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
            }`}
          >
            <Zap className={`h-3 w-3 ${emergencyMode ? "text-rose-400" : "text-zinc-500"}`} />
            <span>Emergency Mode ({emergencyMode ? "3s / 5m" : "15s / 25m"})</span>
          </button>
        )}
      </div>
    </div>
  );
}
