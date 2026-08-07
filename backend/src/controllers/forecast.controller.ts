import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { computeRegionalForecast } from "../services/forecast.service";
import { BloodType } from "../models/Donor";

const BLOOD_TYPES: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

// ---------------------------------------------------------------------------
// GET /api/v1/forecast
//
// Computes a real, data-backed blood shortage forecast for a specific region
// and blood type.  All inputs must be provided in the query string.
//
// Query params:
//   lat       {number}  Centre latitude of the region to forecast
//   lng       {number}  Centre longitude of the region to forecast
//   radiusKm  {number}  Search radius (default 50km)
//   bloodType {string}  Specific blood type (optional — if omitted, forecasts
//                       all 8 types and returns the array)
//
// Authorization: public — the landing page uses this without auth so potential
// donors can see the current shortage situation before registering.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// 30-second in-memory cache for regional forecast aggregates
// ---------------------------------------------------------------------------
interface CacheEntry {
  timestamp: number;
  data: any;
}
const forecastCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

export const getForecast = asyncHandler(async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : 50;
  const bloodType = req.query.bloodType as BloodType | undefined;

  const cacheKey = `${lat.toFixed(2)}_${lng.toFixed(2)}_${radiusKm}_${bloodType || "ALL"}`;
  const now = Date.now();
  const cached = forecastCache.get(cacheKey);

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return ApiResponse.success(res, cached.data, "Forecast fetched (cached 30s)");
  }

  let responseData: any;

  if (bloodType) {
    // Single blood type forecast
    responseData = await computeRegionalForecast(bloodType, lat, lng, radiusKm);
  } else {
    // All 8 blood types — run in parallel for speed
    const results = await Promise.all(
      BLOOD_TYPES.map((bt) => computeRegionalForecast(bt, lat, lng, radiusKm))
    );

    // Sort by severity: critical first, then watch, then healthy
    const tierOrder = { critical: 0, watch: 1, healthy: 2, monitoring: 3 };
    results.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
    responseData = results;
  }

  // Store in 30s cache
  forecastCache.set(cacheKey, { timestamp: now, data: responseData });

  return ApiResponse.success(res, responseData, "Regional forecast computed");
});
