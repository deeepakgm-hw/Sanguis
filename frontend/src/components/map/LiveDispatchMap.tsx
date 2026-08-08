"use client";

import React, { useEffect, useRef } from "react";
import { Droplet, MapPin, Building2, ShieldCheck, Activity, Users } from "lucide-react";

interface LiveDonorMarker {
  userId: string;
  donorId?: string;
  name?: string;
  bloodType: string;
  lat: number;
  lng: number;
  isLiveTracking?: boolean;
  updatedAt?: string;
}

interface HospitalMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
}

interface EmergencyMarker {
  id: string;
  bloodType: string;
  unitsNeeded: number;
  urgencyLevel: string;
  lat: number;
  lng: number;
}

interface LiveDispatchMapProps {
  donors?: LiveDonorMarker[];
  hospitals?: HospitalMarker[];
  emergencies?: EmergencyMarker[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  showShortageHeatmap?: boolean;
}

export function LiveDispatchMap({
  donors = [],
  hospitals = [],
  emergencies = [],
  centerLat = 12.9716,
  centerLng = 77.5946,
  zoom = 12,
  showShortageHeatmap = false,
}: LiveDispatchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    // Dynamically inject Leaflet CSS & JS if not loaded
    const existingScript = document.getElementById("leaflet-js");
    if (!existingScript) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => initLeafletMap();
      document.head.appendChild(script);
    } else {
      initLeafletMap();
    }

    function initLeafletMap() {
      const L = (window as any).L;
      if (!L || !mapContainerRef.current) return;

      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
      }

      const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], zoom);
      leafletMapRef.current = map;

      // Add CartoDB Dark Matter / OpenStreetMap tiles
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Render Hospital Markers
      hospitals.forEach((h) => {
        const icon = L.divIcon({
          className: "custom-hospital-marker",
          html: `<div style="background-color: #0284c7; color: white; padding: 6px 10px; border-radius: 12px; font-weight: 900; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px;">🏥 ${h.name}</div>`,
          iconSize: [120, 30],
        });
        L.marker([h.lat, h.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${h.name}</b><br/>Hospital Hub (${h.city})`);
      });

      // Render Emergency Markers
      emergencies.forEach((e) => {
        const icon = L.divIcon({
          className: "custom-emergency-marker",
          html: `<div style="background-color: #e5384d; color: white; padding: 6px 10px; border-radius: 12px; font-weight: 900; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 12px rgba(229,56,77,0.5); animation: pulse 1.5s infinite;">🚨 ${e.bloodType} (${e.unitsNeeded} Units)</div>`,
          iconSize: [130, 30],
        });
        L.marker([e.lat, e.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>CRITICAL EMERGENCY</b><br/>Blood Type: ${e.bloodType}<br/>Units Needed: ${e.unitsNeeded}`);
      });

      // Render Live Donor Markers
      donors.forEach((d) => {
        const isLive = d.isLiveTracking;
        const icon = L.divIcon({
          className: "custom-donor-marker",
          html: `<div style="background-color: ${isLive ? '#10b981' : '#64748b'}; color: white; padding: 4px 8px; border-radius: 10px; font-weight: 800; font-size: 10px; border: 1.5px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 3px;">
            <span style="height: 6px; width: 6px; border-radius: 9999px; background-color: white; display: inline-block;"></span>
            ${d.bloodType} ${d.name ? `· ${d.name}` : ''}
          </div>`,
          iconSize: [100, 24],
        });

        L.marker([d.lat, d.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${d.name || 'Available Donor'}</b><br/>Blood Group: ${d.bloodType}<br/>Status: ${isLive ? '🟢 Live GPS Active' : '⚪ Static Location'}`);
      });

      // Render Shortage Heatmap Circle Overlay if enabled
      if (showShortageHeatmap) {
        L.circle([centerLat, centerLng], {
          color: "#ef4444",
          fillColor: "#f87171",
          fillOpacity: 0.15,
          radius: 15000,
        }).addTo(map);
      }
    }
  }, [donors, hospitals, emergencies, centerLat, centerLng, zoom, showShortageHeatmap]);

  return (
    <div className="relative w-full h-[480px] rounded-3xl overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-md">
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-lg text-[10px] space-y-1.5 font-semibold text-slate-700 dark:text-zinc-300">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live GPS Donor</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E5384D]" />
          <span>Active Emergency</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
          <span>Hospital / Blood Hub</span>
        </div>
      </div>
    </div>
  );
}
