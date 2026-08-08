/**
 * ETA & Travel Time Calculation Service
 * Estimates travel duration using Haversine distance, urban speed limits,
 * and traffic-adjusted speed heuristics.
 */

export interface ETAResult {
  distanceKm: number;
  estimatedMinutes: number;
  trafficLevel: "LOW" | "MODERATE" | "HEAVY";
  formattedETA: string;
}

export function computeTravelETA(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): ETAResult {
  // Haversine formula
  const R = 6371; // km
  const dLat = ((destLat - originLat) * Math.PI) / 180;
  const dLng = ((destLng - originLng) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((originLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = Math.round(R * c * 10) / 10;

  // Determine urban speed heuristic (25 km/h in peak, 35 km/h off-peak)
  const hour = new Date().getHours();
  const isPeakHour = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20);

  const averageSpeedKmH = isPeakHour ? 22 : 32;
  const trafficLevel: "LOW" | "MODERATE" | "HEAVY" = isPeakHour
    ? "HEAVY"
    : distanceKm > 10
    ? "MODERATE"
    : "LOW";

  // Base travel time in minutes + 3 min mobilization overhead
  const travelTimeMinutes = (distanceKm / averageSpeedKmH) * 60;
  const estimatedMinutes = Math.max(Math.round(travelTimeMinutes + 3), 4);

  return {
    distanceKm,
    estimatedMinutes,
    trafficLevel,
    formattedETA: `${estimatedMinutes} min (${distanceKm} km)`,
  };
}
