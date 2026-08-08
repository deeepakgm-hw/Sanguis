/**
 * geo.ts — Sanguis Geo & GPS Validation Utilities
 */

export interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

export type GPSAccuracyCategory = "EXCELLENT" | "GOOD" | "ACCEPTABLE" | "POOR" | "VERY_POOR";

export const GPS_MAX_MATCHING_ACCURACY_METERS = 50;
export const LOCATION_FRESHNESS_LIVE_SEC = 30;
export const LOCATION_FRESHNESS_RECENT_SEC = 120;

/**
 * Validates GPS coordinate values and accuracy limits.
 */
export function isValidCoordinates(lat: unknown, lng: unknown, accuracy?: unknown): boolean {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    return false;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return false;
  }
  if (accuracy !== undefined && accuracy !== null) {
    if (typeof accuracy !== "number" || isNaN(accuracy) || accuracy < 0) {
      return false;
    }
  }
  return true;
}

/**
 * Classifies GPS accuracy into quality categories.
 */
export function getAccuracyCategory(accuracyMeters: number): GPSAccuracyCategory {
  if (accuracyMeters <= 10) return "EXCELLENT";
  if (accuracyMeters <= 30) return "GOOD";
  if (accuracyMeters <= 50) return "ACCEPTABLE";
  if (accuracyMeters <= 100) return "POOR";
  return "VERY_POOR";
}

/**
 * Computes Haversine distance in kilometers between two lat/lng coordinates.
 */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Computes distance in meters.
 */
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineKm(lat1, lng1, lat2, lng2) * 1000;
}
