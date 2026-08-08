"use client";

import { useState, useEffect, useCallback } from "react";
import { locationService, LocationCoordinates, GPSQuality } from "@/services/location.service";
import { toast } from "sonner";

export function useLiveLocation(socket: any, bloodType?: string) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<LocationCoordinates | null>(null);
  const [qualityCategory, setQualityCategory] = useState<GPSQuality | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [emergencyMode, setEmergencyMode] = useState(false);

  const startTracking = useCallback(() => {
    setPermissionError(null);

    const started = locationService.startTracking({
      mode: emergencyMode ? "EMERGENCY" : "NORMAL",
      onLocation: (coords, quality) => {
        setCurrentCoords(coords);
        setQualityCategory(quality);
        setIsTracking(true);

        // Emit location via Socket.IO transport
        if (socket) {
          socket.emit("donor:location:update", {
            latitude: coords.latitude,
            longitude: coords.longitude,
            lat: coords.latitude,
            lng: coords.longitude,
            accuracy: coords.accuracy,
            heading: coords.heading,
            speed: coords.speed,
            timestamp: coords.timestamp,
            bloodType,
          });
        }
      },
      onError: (errorMsg) => {
        setPermissionError(errorMsg);
        toast.error(errorMsg);
        setIsTracking(false);
      },
    });

    if (started) {
      setIsTracking(true);
      if (socket) {
        socket.emit("donor:location:start", { bloodType });
      }
      toast.success("Live GPS Location Sharing Enabled");
    }
  }, [socket, bloodType, emergencyMode]);

  const stopTracking = useCallback(() => {
    locationService.stopTracking();
    setIsTracking(false);

    if (socket) {
      socket.emit("donor:location:stop");
    }
    toast.info("Live Location Sharing Stopped");
  }, [socket]);

  useEffect(() => {
    if (isTracking) {
      // Re-initialize tracking with updated emergency mode settings
      locationService.stopTracking();
      startTracking();
    }
  }, [emergencyMode]);

  useEffect(() => {
    return () => {
      locationService.stopTracking();
    };
  }, []);

  return {
    isTracking,
    currentCoords,
    qualityCategory,
    permissionError,
    emergencyMode,
    setEmergencyMode,
    startTracking,
    stopTracking,
  };
}
