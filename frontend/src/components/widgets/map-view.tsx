"use client";

import React from "react";
import { Building, Heart, Activity, Radio, ShieldAlert } from "lucide-react";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  layerType: "donor" | "bank" | "hospital" | "dispatch";
  label: string;
  sublabel?: string;
}

interface MapViewProps {
  markers: MapMarker[];
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
}

export function MapView({
  markers,
  centerLat = 13.0827,
  centerLng = 80.2707,
  radiusKm = 15,
}: MapViewProps) {
  
  // Project GPS coordinates [lng, lat] onto a 2D radar grid viewport.
  // Center is mapped to (50%, 50%).
  // We use a simple degree-to-coordinate mapping. 1 degree is roughly 111km.
  const degreeRadius = radiusKm / 111.0;

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-background/25">
      
      {/* Concentric circular range rings */}
      <div className="absolute h-[90%] w-[90%] rounded-full border border-border/15 flex items-center justify-center pointer-events-none">
        <div className="absolute h-[65%] w-[65%] rounded-full border border-border/15 flex items-center justify-center">
          <div className="absolute h-[35%] w-[35%] rounded-full border border-border/15" />
        </div>
      </div>

      {/* Sweeping radar beam */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div 
          className="h-[85%] w-[85%] rounded-full relative animate-[spin_10s_linear_infinite]" 
          style={{ background: "conic-gradient(from 0deg, rgba(239, 68, 68, 0.08) 0deg, transparent 90deg)" }}
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 w-0.5 bg-destructive/20" />
        </div>
      </div>

      {/* Center coordinate (Hospitals/Hub center) */}
      <div className="absolute z-20 flex items-center justify-center bg-destructive/20 border border-destructive/40 text-destructive h-8 w-8 rounded-full shadow-lg">
        <Radio className="h-4.5 w-4.5 animate-pulse" />
      </div>

      {/* Render Markers dynamically on the SVG coordinate space */}
      {markers.map((marker) => {
        // Calculate offsets in degrees
        const latOffset = marker.lat - centerLat;
        const lngOffset = marker.lng - centerLng;

        // Map to percentages (-degreeRadius to +degreeRadius maps to 10% to 90%)
        const scale = 40 / degreeRadius; // max 40% offset from center (50%)
        
        let leftPercent = 50 + lngOffset * scale;
        let topPercent = 50 - latOffset * scale; // invert Y axis for screen space

        // Keep inside bounds (10% to 90%)
        leftPercent = Math.max(10, Math.min(90, leftPercent));
        topPercent = Math.max(10, Math.min(90, topPercent));

        // Colors per Layer Type
        const colors = {
          bank: "bg-blue-500 border-white text-white shadow-blue-500/50 hover:bg-blue-600",
          donor: "bg-destructive border-white text-white shadow-destructive/50 hover:bg-destructive/90",
          hospital: "bg-emerald-500 border-white text-white shadow-emerald-500/50 hover:bg-emerald-600",
          dispatch: "bg-amber-500 border-white text-white shadow-amber-500/50 hover:bg-amber-600 animate-ping",
        };

        return (
          <div
            key={marker.id}
            className={`absolute z-10 p-1.5 rounded-full border border-background shadow-lg cursor-pointer transition-all duration-200 hover:scale-125 ${colors[marker.layerType]}`}
            style={{ 
              left: `${leftPercent}%`, 
              top: `${topPercent}%`,
              transform: "translate(-50%, -50%)"
            }}
            title={`${marker.label} (${marker.sublabel || ""})`}
          >
            {marker.layerType === "bank" && <Building className="h-3 w-3" />}
            {marker.layerType === "donor" && <Heart className="h-3 w-3" />}
            {marker.layerType === "hospital" && <ShieldAlert className="h-3 w-3" />}
            {marker.layerType === "dispatch" && <Activity className="h-3 w-3" />}
          </div>
        );
      })}

      {/* Compass grid overlay */}
      <div className="absolute top-4 left-4 text-[9px] font-mono text-muted-foreground bg-background/80 px-2 py-0.5 rounded border border-border/40">
        RANGE: {radiusKm} KM
      </div>
    </div>
  );
}
