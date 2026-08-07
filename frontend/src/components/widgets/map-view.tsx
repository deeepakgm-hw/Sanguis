"use client";

import React, { useEffect, useRef, useState } from "react";
import { Navigation, MapPin, CheckCircle2, Loader2, Compass, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  layerType: "donor" | "bank" | "hospital" | "dispatch";
  label: string;
  sublabel?: string;
  address?: string;
  phone?: string;
  dataSource?: "google_places" | "manual";
  urgencyLevel?: "critical" | "high" | "medium" | "low";
  bloodType?: string;
}

interface MapViewProps {
  markers?: MapMarker[];
  centerLat?: number;
  centerLng?: number;
  radiusKm?: number;
  onMarkerClick?: (marker: MapMarker) => void;
  poweredByGoogle?: boolean;
  enableLiveDetection?: boolean;
}

declare global {
  interface Window {
    L: any;
  }
}

export function MapView({
  markers: propMarkers = [],
  centerLat: initialCenterLat = 12.9716,
  centerLng: initialCenterLng = 77.5946,
  radiusKm = 25,
  onMarkerClick,
  enableLiveDetection = true,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const gpsMarkerRef = useRef<any>(null);
  const gpsCircleRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const initialCenteredRef = useRef(false);

  const [gpsLat, setGpsLat] = useState<number>(initialCenterLat);
  const [gpsLng, setGpsLng] = useState<number>(initialCenterLng);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [addressName, setAddressName] = useState<string>("Detecting address...");
  const [hasGPS, setHasGPS] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [detectedItems, setDetectedItems] = useState<MapMarker[]>(propMarkers);

  // Reverse Geocoding (GPS Coords -> Street Address via Nominatim)
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`
      );
      const data = await res.json();
      if (data && data.display_name) {
        // Extract city/suburb/road for short clean address
        const addr = data.address || {};
        const road = addr.road || addr.suburb || addr.neighbourhood || addr.city_district || "";
        const city = addr.city || addr.town || addr.state_district || addr.county || "";
        const shortAddr = [road, city].filter(Boolean).join(", ");
        setAddressName(shortAddr || data.display_name.split(",").slice(0, 3).join(","));
      } else {
        setAddressName(`${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
      }
    } catch {
      setAddressName(`${lat.toFixed(4)}°, ${lng.toFixed(4)}°`);
    }
  };

  // 1. Inject Leaflet CSS and JS dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    let isMounted = true;

    function initLeafletMap() {
      if (!containerRef.current || mapInstanceRef.current || !window.L) return;

      const L = window.L;
      const map = L.map(containerRef.current, {
        center: [initialCenterLat, initialCenterLng],
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    if (window.L) {
      initLeafletMap();
    } else {
      const script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => {
        if (isMounted) initLeafletMap();
      };
      document.head.appendChild(script);
    }

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [initialCenterLat, initialCenterLng]);

  // 2. REAL-TIME CONTINUOUS GPS TRACKING & REVERSE GEOCODING
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    setIsSyncing(true);

    const updatePositionOnMap = (lat: number, lng: number, accuracy?: number) => {
      setGpsLat(lat);
      setGpsLng(lng);
      if (accuracy) setGpsAccuracy(Math.round(accuracy));
      setHasGPS(true);
      setIsSyncing(false);

      // Perform reverse geocoding for physical address
      reverseGeocode(lat, lng);

      if (mapInstanceRef.current && window.L) {
        const L = window.L;

        // Accuracy Circle radius around GPS location
        if (accuracy && !gpsCircleRef.current) {
          gpsCircleRef.current = L.circle([lat, lng], {
            radius: accuracy,
            color: "#3b82f6",
            fillColor: "#3b82f6",
            fillOpacity: 0.15,
            weight: 1.5,
          }).addTo(mapInstanceRef.current);
        } else if (gpsCircleRef.current) {
          gpsCircleRef.current.setLatLng([lat, lng]);
          if (accuracy) gpsCircleRef.current.setRadius(accuracy);
        }

        // Live Pulsing Blue Dot Marker
        if (!gpsMarkerRef.current) {
          const blueDotIcon = L.divIcon({
            className: "custom-gps-icon",
            html: `<div style="position:relative;width:24px;height:24px;">
              <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.5);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
              <div style="position:absolute;inset:3px;border-radius:50%;background:#2563eb;border:2px solid white;box-shadow:0 0 12px rgba(37,99,235,0.9);"></div>
            </div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          });

          gpsMarkerRef.current = L.marker([lat, lng], { icon: blueDotIcon }).addTo(mapInstanceRef.current);
        } else {
          gpsMarkerRef.current.setLatLng([lat, lng]);
        }

        // Auto-center map on initial GPS position lock
        if (!initialCenteredRef.current) {
          initialCenteredRef.current = true;
          mapInstanceRef.current.setView([lat, lng], 14, { animate: true });
        }
      }
    };

    // Initial GPS position lookup
    navigator.geolocation.getCurrentPosition(
      (pos) => updatePositionOnMap(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      () => setIsSyncing(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );

    // Continuous watchPosition tracker
    const watchId = navigator.geolocation.watchPosition(
      (pos) => updatePositionOnMap(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      () => setIsSyncing(false),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleRecenter = () => {
    if (mapInstanceRef.current && hasGPS) {
      mapInstanceRef.current.setView([gpsLat, gpsLng], 14, { animate: true });
      if (gpsMarkerRef.current) {
        gpsMarkerRef.current.bindPopup(`<b>Your Live GPS Location</b><br/>${addressName}`).openPopup();
      }
    }
  };

  // 3. Fetch API detected items
  useEffect(() => {
    if (!enableLiveDetection) return;

    async function detectItems() {
      try {
        const [reqRes, donorRes] = await Promise.all([
          api.get("/blood-requests", { params: { status: "open", limit: 15 } }).catch(() => ({ data: { data: [] } })),
          api.get("/donors", { params: { limit: 15 } }).catch(() => ({ data: { data: [] } })),
        ]);

        const rawReqs = reqRes.data?.data ?? [];
        const rawDonors = donorRes.data?.data ?? [];

        const reqMarkers: MapMarker[] = rawReqs.map((r: any, idx: number) => {
          const coords = r.geoLocation?.coordinates ?? [gpsLng + (idx * 0.01 - 0.03), gpsLat + (idx * 0.01 - 0.03)];
          return {
            id: r._id || `req-${idx}`,
            lat: coords[1],
            lng: coords[0],
            layerType: r.urgencyLevel === "critical" ? "dispatch" : "hospital",
            label: r.hospitalName || "Emergency Hospital",
            sublabel: `${r.bloodType || "Blood"} Needed · ${r.unitsNeeded || 1} units`,
            bloodType: r.bloodType,
          };
        });

        const donorMarkers: MapMarker[] = rawDonors.slice(0, 10).map((d: any, idx: number) => {
          const coords = d.location?.coordinates ?? [gpsLng + (idx * 0.012 - 0.04), gpsLat + (idx * 0.012 - 0.04)];
          return {
            id: d._id || `donor-${idx}`,
            lat: coords[1],
            lng: coords[0],
            layerType: "donor",
            label: d.user?.name || `Donor ${d.bloodType}`,
            sublabel: `${d.bloodType} · Active Donor`,
            bloodType: d.bloodType,
          };
        });

        const combined = [...propMarkers, ...reqMarkers, ...donorMarkers];
        const unique = Array.from(new Map(combined.map((item) => [item.id, item])).values());
        setDetectedItems(unique);
      } catch (err) {
        console.warn("API detection error", err);
      }
    }

    detectItems();
  }, [enableLiveDetection, gpsLat, gpsLng, propMarkers]);

  // 4. Render Markers onto real Leaflet map
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !window.L) return;

    const L = window.L;
    markersLayerRef.current.clearLayers();

    detectedItems.forEach((m) => {
      const color =
        m.layerType === "dispatch" ? "#dc2626" :
        m.layerType === "donor" ? "#059669" : "#d97706";

      const icon = L.divIcon({
        className: "custom-marker-icon",
        html: `<div style="background:${color};color:white;font-weight:bold;font-size:10px;padding:3px 7px;border-radius:12px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;">
          ${m.bloodType || m.label}
        </div>`,
        iconSize: [40, 24],
        iconAnchor: [20, 12],
      });

      const marker = L.marker([m.lat, m.lng], { icon }).addTo(markersLayerRef.current);
      marker.bindPopup(`<b>${m.label}</b><br/>${m.sublabel || ""}`);
      marker.on("click", () => onMarkerClick?.(m));
    });
  }, [detectedItems, onMarkerClick]);

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-slate-100 flex flex-col">
      {/* ── GOOGLE MAPS STYLE LIVE LOCATION CARD (TOP BAR) ── */}
      <div className="absolute top-2 left-2 right-12 z-30 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl px-3 py-2 shadow-lg flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-blue-600 fill-blue-600 animate-bounce" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-black text-slate-900 truncate">
                {hasGPS ? addressName : "Locating physical GPS position..."}
              </p>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
              {gpsLat.toFixed(4)}°, {gpsLng.toFixed(4)}° {gpsAccuracy ? `(±${gpsAccuracy}m)` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleRecenter}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-all flex items-center gap-1"
            title="Recenter Map to Live GPS"
          >
            <Navigation className="w-3.5 h-3.5 fill-[#E5384D] text-[#E5384D]" />
            Recenter
          </button>
          <a
            href={`https://www.google.com/maps?q=${gpsLat},${gpsLng}`}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-[10px] transition-all flex items-center gap-1"
            title="Open in Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Real Leaflet OpenStreetMap Container */}
      <div ref={containerRef} className="w-full h-full z-10" />
    </div>
  );
}
