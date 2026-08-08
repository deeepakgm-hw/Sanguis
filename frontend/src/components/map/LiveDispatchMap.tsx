"use client";

import React, { useEffect, useRef, useState } from "react";
import { Navigation, Compass, Layers, Plus, Minus, RotateCcw, MapPin, Radio } from "lucide-react";

export interface LiveDonorMarker {
  userId: string;
  donorId?: string;
  name?: string;
  bloodType: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  isLiveTracking?: boolean;
  updatedAt?: string;
}

export interface HospitalMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
}

export interface EmergencyMarker {
  id: string;
  bloodType: string;
  unitsNeeded: number;
  urgencyLevel: string;
  lat: number;
  lng: number;
}

export interface LiveDispatchMapProps {
  donors?: LiveDonorMarker[];
  hospitals?: HospitalMarker[];
  emergencies?: EmergencyMarker[];
  currentUserLocation?: { lat: number; lng: number; accuracy?: number } | null;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  showShortageHeatmap?: boolean;
  onRecenterRequest?: () => void;
}

export function LiveDispatchMap({
  donors = [],
  hospitals = [],
  emergencies = [],
  currentUserLocation,
  centerLat = 12.9716,
  centerLng = 77.5946,
  zoom = 12,
  showShortageHeatmap = false,
  onRecenterRequest,
}: LiveDispatchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const donorMarkersRef = useRef<Map<string, any>>(new Map());

  const [is3DView, setIs3DView] = useState(true);
  const [pitchDeg, setPitchDeg] = useState(45);
  const [bearingDeg, setBearingDeg] = useState(0);

  // Initialize Leaflet map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

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
        donorMarkersRef.current.clear();
      }

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView([centerLat, centerLng], zoom);

      leafletMapRef.current = map;

      // CartoDB Dark Matter / Voyager Map Tiles
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> & OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Hospital Markers
      hospitals.forEach((h) => {
        const icon = L.divIcon({
          className: "custom-hospital-marker",
          html: `<div style="background-color: #0284c7; color: white; padding: 6px 10px; border-radius: 12px; font-weight: 900; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px;">🏥 ${h.name}</div>`,
          iconSize: [120, 30],
        });
        L.marker([h.lat, h.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>🏥 ${h.name}</b><br/>Hospital Emergency Hub<br/>City: ${h.city}`);
      });

      // Emergency Markers
      emergencies.forEach((e) => {
        const icon = L.divIcon({
          className: "custom-emergency-marker",
          html: `<div style="background-color: #e5384d; color: white; padding: 6px 10px; border-radius: 12px; font-weight: 900; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 12px rgba(229,56,77,0.5); animation: pulse 1.5s infinite;">🚨 ${e.bloodType} (${e.unitsNeeded} Units)</div>`,
          iconSize: [130, 30],
        });
        L.marker([e.lat, e.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>🚨 CRITICAL BLOOD EMERGENCY</b><br/>Blood Group: ${e.bloodType}<br/>Units Needed: ${e.unitsNeeded}<br/>Urgency: ${e.urgencyLevel.toUpperCase()}`);
      });

      // Heatmap Overlay
      if (showShortageHeatmap) {
        L.circle([centerLat, centerLng], {
          color: "#ef4444",
          fillColor: "#f87171",
          fillOpacity: 0.15,
          radius: 15000,
        }).addTo(map);
      }
    }
  }, [hospitals, emergencies, centerLat, centerLng, zoom, showShortageHeatmap]);

  // Update donor markers without full map teardown (Smooth marker movement)
  useEffect(() => {
    const map = leafletMapRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    const currentDonorIds = new Set<string>();

    donors.forEach((d) => {
      const key = d.donorId || d.userId;
      currentDonorIds.add(key);

      const isLive = d.isLiveTracking;
      const accuracyStr = d.accuracy ? `${Math.round(d.accuracy)}m` : "15m";

      const icon = L.divIcon({
        className: "custom-donor-marker",
        html: `<div style="background-color: ${isLive ? '#10b981' : '#64748b'}; color: white; padding: 5px 9px; border-radius: 10px; font-weight: 800; font-size: 10px; border: 1.5px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px;">
          <span style="height: 7px; width: 7px; border-radius: 9999px; background-color: white; display: inline-block;"></span>
          🩸 ${d.bloodType} ${d.name ? `· ${d.name}` : ''}
        </div>`,
        iconSize: [110, 26],
      });

      const popupContent = `
        <div style="font-family: monospace; font-size: 11px;">
          <b>🩸 Donor Status: ${isLive ? '🟢 Live GPS Active' : '⚪ Static'}</b><br/>
          Blood Group: <b>${d.bloodType}</b><br/>
          GPS Accuracy: <b>${accuracyStr}</b><br/>
          Updated: ${d.updatedAt ? new Date(d.updatedAt).toLocaleTimeString() : 'Just now'}
        </div>
      `;

      if (donorMarkersRef.current.has(key)) {
        // Smoothly update position of existing marker
        const existing = donorMarkersRef.current.get(key);
        existing.setLatLng([d.lat, d.lng]);
        existing.setIcon(icon);
        existing.getPopup()?.setContent(popupContent);
      } else {
        // Create new marker
        const marker = L.marker([d.lat, d.lng], { icon })
          .addTo(map)
          .bindPopup(popupContent);
        donorMarkersRef.current.set(key, marker);
      }
    });

    // Remove markers for donors who stopped sharing
    for (const [key, marker] of donorMarkersRef.current.entries()) {
      if (!currentDonorIds.has(key)) {
        map.removeLayer(marker);
        donorMarkersRef.current.delete(key);
      }
    }
  }, [donors]);

  // Current User Marker
  useEffect(() => {
    const map = leafletMapRef.current;
    const L = (window as any).L;
    if (!map || !L || !currentUserLocation) return;

    const userIcon = L.divIcon({
      className: "custom-user-marker",
      html: `<div style="background-color: #ec4899; color: white; padding: 5px 9px; border-radius: 12px; font-weight: 900; font-size: 10px; border: 2px solid white; box-shadow: 0 4px 14px rgba(236,72,153,0.6); display: flex; align-items: center; gap: 4px;">
        📍 YOUR GPS LOCATION (${Math.round(currentUserLocation.accuracy || 10)}m)
      </div>`,
      iconSize: [150, 28],
    });

    const userMarker = L.marker([currentUserLocation.lat, currentUserLocation.lng], { icon: userIcon })
      .addTo(map)
      .bindPopup("<b>📍 Current Device Location</b>");

    return () => {
      map.removeLayer(userMarker);
    };
  }, [currentUserLocation]);

  // Handle Zoom & Camera actions
  const handleZoomIn = () => leafletMapRef.current?.zoomIn();
  const handleZoomOut = () => leafletMapRef.current?.zoomOut();

  const handleRecenter = () => {
    if (currentUserLocation) {
      leafletMapRef.current?.setView([currentUserLocation.lat, currentUserLocation.lng], 14);
    } else {
      leafletMapRef.current?.setView([centerLat, centerLng], zoom);
    }
    if (onRecenterRequest) onRecenterRequest();
  };

  const handleRotateBearing = () => {
    setBearingDeg((prev) => (prev + 45) % 360);
  };

  const resetBearing = () => setBearingDeg(0);

  return (
    <div className="relative w-full h-[520px] rounded-3xl overflow-hidden border border-zinc-800 shadow-xl bg-zinc-950 font-mono">
      {/* 3D Perspective Map Transform Wrapper */}
      <div
        className="w-full h-full transition-transform duration-500 ease-out"
        style={{
          transform: is3DView
            ? `perspective(1000px) rotateX(${pitchDeg}deg) rotateZ(${bearingDeg}deg) scale(1.08)`
            : "none",
          transformOrigin: "center center",
        }}
      >
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Top Controls Overlay */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setIs3DView(!is3DView)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase transition-all backdrop-blur-md shadow-lg ${
            is3DView
              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
              : "bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:bg-zinc-800"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>{is3DView ? "3D Perspective View (45°)" : "2D Flat View"}</span>
        </button>

        {is3DView && (
          <>
            <button
              onClick={handleRotateBearing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 text-[10px] font-bold uppercase backdrop-blur-md shadow-lg"
              title="Rotate Bearing"
            >
              <Compass className="h-3.5 w-3.5 text-rose-400" />
              <span>Rotate ({bearingDeg}°)</span>
            </button>
            {bearingDeg !== 0 && (
              <button
                onClick={resetBearing}
                className="p-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 text-[10px] backdrop-blur-md"
                title="Reset Bearing"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Right Camera Navigation Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <button
          onClick={handleRecenter}
          className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 backdrop-blur-md shadow-lg transition-all"
          title="Recenter Camera"
        >
          <Navigation className="h-4 w-4 text-rose-500" />
        </button>
        <button
          onClick={handleZoomIn}
          className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 backdrop-blur-md shadow-lg transition-all"
          title="Zoom In"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 backdrop-blur-md shadow-lg transition-all"
          title="Zoom Out"
        >
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-20 bg-zinc-900/90 backdrop-blur-md p-3 rounded-2xl border border-zinc-800 shadow-xl text-[10px] space-y-1.5 font-bold text-zinc-300">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live GPS Donor (🩸)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E5384D]" />
          <span>Active Emergency (🚨)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
          <span>Hospital Hub (🏥)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
          <span>Your Device Location (📍)</span>
        </div>
      </div>
    </div>
  );
}
