"use client";

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";

export interface LiveLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  hasGPS: boolean;
  error?: string;
}

const DEFAULT_LAT = 12.9716;
const DEFAULT_LNG = 77.5946;

export function useLiveLocation(syncToBackend = false) {
  const [location, setLocation] = useState<LiveLocation>({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
    hasGPS: false,
  });

  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, hasGPS: false, error: "Geolocation unsupported" });
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;

        setLocation({
          lat: newLat,
          lng: newLng,
          accuracy: pos.coords.accuracy,
          hasGPS: true,
        });

        // Throttle backend GPS sync to once every 20 seconds
        const now = Date.now();
        if (syncToBackend && now - lastSyncRef.current > 20000) {
          lastSyncRef.current = now;
          api.patch("/donors/me/location", { lat: newLat, lng: newLng }).catch(() => {});
        }
      },
      (err) => {
        setLocation((prev) => ({
          ...prev,
          hasGPS: false,
          error: err.message,
        }));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [syncToBackend]);

  const updateManualAddress = async (addressQuery: string) => {
    if (!addressQuery.trim()) return;
    try {
      // Nominatim free OSM geocoding API
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setLocation({ lat: newLat, lng: newLng, hasGPS: true });
        if (syncToBackend) {
          api.patch("/donors/me/location", { lat: newLat, lng: newLng }).catch(() => {});
        }
        return { lat: newLat, lng: newLng };
      }
    } catch (e) {
      console.warn("Geocoding failed, using manual fallback coordinates", e);
    }
    return { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
  };

  return { ...location, updateManualAddress };
}

// Haversine formula for exact distance calculation in KM
export function calculateHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (!lat1 || !lng1 || !lat2 || !lng2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
