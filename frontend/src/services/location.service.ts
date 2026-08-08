/**
 * location.service.ts — Sanguis Frontend Real-Time Device GPS Service
 */

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export type GPSQuality = "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "POOR" | "VERY_POOR";

export const GPS_MAX_MATCHING_ACCURACY_METERS = 50;

export interface TrackingOptions {
  mode: "NORMAL" | "EMERGENCY";
  onLocation: (location: LocationCoordinates, quality: GPSQuality) => void;
  onError: (error: string, code?: number) => void;
}

export class FrontendLocationService {
  private watchId: number | null = null;
  private lastEmitted: LocationCoordinates | null = null;
  private lastEmitTime: number = 0;

  /**
   * Calculates Haversine distance in meters between two lat/lng points.
   */
  static getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Classifies accuracy into quality levels.
   */
  static getQualityCategory(accuracyMeters: number): GPSQuality {
    if (accuracyMeters <= 10) return "EXCELLENT";
    if (accuracyMeters <= 30) return "GOOD";
    if (accuracyMeters <= 50) return "ACCEPTABLE";
    if (accuracyMeters <= 100) return "POOR";
    return "VERY_POOR";
  }

  /**
   * Validates coordinate payload.
   */
  static isValid(lat: number, lng: number, accuracy: number): boolean {
    if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) return false;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
    if (typeof accuracy !== "number" || isNaN(accuracy) || accuracy < 0) return false;
    return true;
  }

  /**
   * Starts continuous device GPS tracking via navigator.geolocation.watchPosition
   */
  startTracking(options: TrackingOptions): boolean {
    if (typeof window === "undefined" || !navigator.geolocation) {
      options.onError("Geolocation is not supported by your browser or device.");
      return false;
    }

    if (window.location.protocol !== "https:" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      options.onError("Geolocation requires a secure context (HTTPS) in production.");
    }

    this.stopTracking();

    const isEmergency = options.mode === "EMERGENCY";
    const minDistanceMeters = isEmergency ? 5 : 25;
    const maxIntervalMs = isEmergency ? 3000 : 15000;

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 10000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: LocationCoordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          altitudeAccuracy: pos.coords.altitudeAccuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp || Date.now(),
        };

        if (!FrontendLocationService.isValid(coords.latitude, coords.longitude, coords.accuracy)) {
          return;
        }

        const quality = FrontendLocationService.getQualityCategory(coords.accuracy);
        const now = Date.now();

        // Check throttled movement criteria:
        // 1. First emission
        // 2. Elapsed max interval time
        // 3. Moved > minDistanceMeters
        const timeElapsed = now - this.lastEmitTime;
        let distanceMoved = 0;
        if (this.lastEmitted) {
          distanceMoved = FrontendLocationService.getDistanceMeters(
            this.lastEmitted.latitude,
            this.lastEmitted.longitude,
            coords.latitude,
            coords.longitude
          );
        }

        if (!this.lastEmitted || timeElapsed >= maxIntervalMs || distanceMoved >= minDistanceMeters) {
          this.lastEmitted = coords;
          this.lastEmitTime = now;
          options.onLocation(coords, quality);
        }
      },
      (err) => {
        let errorMsg = "Unable to access device location.";
        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMsg = "Location permission denied. Please allow location access in browser settings to share your live donor location.";
            break;
          case err.POSITION_UNAVAILABLE:
            errorMsg = "Location information is unavailable. Check your GPS / location settings.";
            break;
          case err.TIMEOUT:
            errorMsg = "Location request timed out. Please check signal and retry.";
            break;
        }
        options.onError(errorMsg, err.code);
      },
      geoOptions
    );

    return true;
  }

  /**
   * Stops position tracking.
   */
  stopTracking(): void {
    if (this.watchId !== null && typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.lastEmitted = null;
    this.lastEmitTime = 0;
  }

  /**
   * Fetches single current location reading.
   */
  getCurrentLocation(): Promise<LocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        reject(new Error("Geolocation unsupported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp || Date.now(),
          });
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
      );
    });
  }
}

export const locationService = new FrontendLocationService();
