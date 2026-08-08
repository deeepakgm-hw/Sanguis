"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";
import { toast } from "sonner";

interface LocationCoords {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export function useLiveLocation(socket: any, bloodType?: string) {
  const user = useAuthStore((s) => s.user);
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<LocationCoords | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastEmittedCoords = useRef<{ lat: number; lng: number } | null>(null);

  // Haversine distance calculator in metres
  const getDistanceMetres = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      const err = "Geolocation is not supported by your browser.";
      setPermissionError(err);
      toast.error(err);
      return;
    }

    setPermissionError(null);
    setIsTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: LocationCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading ?? undefined,
          speed: pos.coords.speed ?? undefined,
        };

        setCurrentCoords(coords);

        // Throttle emission: only emit if moved > 20 meters or first time
        if (
          !lastEmittedCoords.current ||
          getDistanceMetres(
            lastEmittedCoords.current.lat,
            lastEmittedCoords.current.lng,
            coords.lat,
            coords.lng
          ) > 20
        ) {
          lastEmittedCoords.current = { lat: coords.lat, lng: coords.lng };

          if (socket) {
            socket.emit("donor:location:update", {
              lat: coords.lat,
              lng: coords.lng,
              bloodType,
              heading: coords.heading,
              speed: coords.speed,
            });
          }
        }
      },
      (err) => {
        let msg = "Failed to access device location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied. Please allow location access for real-time dispatch.";
        }
        setPermissionError(msg);
        toast.error(msg);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    if (socket) {
      socket.emit("donor:location:start", { bloodType });
    }
    toast.success("Live Emergency Location Sharing Enabled");
  }, [socket, bloodType]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    lastEmittedCoords.current = null;

    if (socket) {
      socket.emit("donor:location:stop");
    }
    toast.info("Live Location Sharing Stopped");
  }, [socket]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    currentCoords,
    permissionError,
    startTracking,
    stopTracking,
  };
}
