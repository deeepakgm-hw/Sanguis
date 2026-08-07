import { BloodRequest } from '../models/BloodRequest';
import { Donor } from '../models/Donor';
import { BloodType } from '../models/Donor';
import { getRegionalSupplyIndex } from './inventory.service';
import { getUnavailableDonorIds } from './eligibility.service';
import { WHOLE_BLOOD_ELIGIBILITY_DAYS } from './eligibility.service';
import { haversineKm } from './matching.service';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// FORECAST CONSTANTS
// ---------------------------------------------------------------------------

/** Days of historical request data to look back when computing demand trend. */
export const FORECAST_WINDOW_DAYS = 14;

/**
 * Risk tier thresholds.
 * ratio = combinedSupply / projectedWeeklyDemand
 *   >= 3.0 → healthy  (supply covers 3× projected week)
 *   >= 1.5 → watch    (adequate but tightening)
 *   <  1.5 → critical (shortage likely this week)
 */
const TIER_HEALTHY  = 3.0;
const TIER_WATCH    = 1.5;

const ELIGIBILITY_MS = WHOLE_BLOOD_ELIGIBILITY_DAYS * 24 * 60 * 60 * 1000;

export type ForecastTier = 'healthy' | 'watch' | 'critical' | 'monitoring';

export interface ForecastBreakdown {
  recentRequests: number;
  projectedWeeklyDemand: number;
  bankInventoryUnits: number;
  eligibleDonorCount: number;
  combinedSupply: number;
  ratio: number;
}

export interface ForecastResult {
  bloodType: BloodType;
  tier: ForecastTier;
  tierLabel: string;
  demandIndex: number;   // 0-100 for UI bar — normalized demand
  supplyIndex: number;   // 0-100 for UI bar — normalized supply
  ratio: number;
  breakdown: ForecastBreakdown;
  windowDays: number;
  computedAt: string;
}

/**
 * Computes a regional blood shortage forecast.
 *
 * Formula:
 *   recentRequests  = BloodRequest count in last FORECAST_WINDOW_DAYS days for (bloodType, region)
 *   dailyDemandRate = recentRequests / FORECAST_WINDOW_DAYS
 *   projectedWeeklyDemand = dailyDemandRate × 7
 *   bankInventory   = sum of unitsAvailable across verified banks in radius (from inventory.service)
 *   eligibleDonors  = count of donors medically eligible AND not voluntarily unavailable in region
 *   combinedSupply  = bankInventory + eligibleDonorCount
 *   ratio           = combinedSupply / max(projectedWeeklyDemand, 1)
 *
 * Tiers: ratio >= 3 → healthy | >= 1.5 → watch | < 1.5 → critical
 */
export async function computeRegionalForecast(
  bloodType: BloodType,
  centerLat: number,
  centerLng: number,
  radiusKm = 50
): Promise<ForecastResult> {
  const windowStart = new Date(Date.now() - FORECAST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - ELIGIBILITY_MS);

  // ── 1. Recent demand in region ────────────────────────────────────────────
  // Count BloodRequests for this bloodType created within the geo radius and time window.
  // We use $geoWithin with $centerSphere because countDocuments does not support $near,
  // and it avoids requiring a 2dsphere index in testing environments.
  const recentRequests = await BloodRequest.countDocuments({
    bloodType,
    createdAt: { $gte: windowStart },
    geoLocation: {
      $geoWithin: {
        $centerSphere: [[centerLng, centerLat], radiusKm / 6378.1],
      },
    },
  });

  const dailyDemandRate = recentRequests / FORECAST_WINDOW_DAYS;
  const projectedWeeklyDemand = dailyDemandRate * 7;

  // ── 2. Current bank inventory in region ───────────────────────────────────
  let bankInventoryUnits = 0;
  try {
    const supply = await getRegionalSupplyIndex(bloodType, centerLat, centerLng, radiusKm);
    bankInventoryUnits = supply.totalUnits;
  } catch (err) {
    logger.warn({ err }, 'forecast: bank supply lookup failed — using 0');
  }

  // ── 3. Eligible donor count in region ────────────────────────────────────
  // Compatible blood types can donate to this blood type — but for forecasting
  // we count only exact-type donors to keep the signal tight.
  const nearbyDonors = await Donor.find({
    bloodType,
    $or: [
      { lastDonationDate: null },
      { lastDonationDate: { $lte: ninetyDaysAgo } },
    ],
    location: {
      $geoWithin: {
        $centerSphere: [[centerLng, centerLat], radiusKm / 6378.1],
      },
    },
  }).select('_id');

  // Filter out voluntarily unavailable donors
  const donorIds = nearbyDonors.map((d) => d._id);
  const unavailableIds = await getUnavailableDonorIds(donorIds);
  const eligibleDonorCount = nearbyDonors.filter(
    (d) => !unavailableIds.has(d._id.toString())
  ).length;

  // ── 4. Compute ratio and tier ─────────────────────────────────────────────
  const combinedSupply = bankInventoryUnits + eligibleDonorCount;
  const ratio = combinedSupply / Math.max(projectedWeeklyDemand, 1);

  let tier: ForecastTier;
  let tierLabel: string;
  
  if (recentRequests === 0) {
    tier = 'monitoring';
    tierLabel = 'Insufficient Data';
  } else if (ratio >= TIER_HEALTHY) {
    tier = 'healthy';
    tierLabel = 'Stable Supply';
  } else if (ratio >= TIER_WATCH) {
    tier = 'watch';
    tierLabel = 'Monitor Closely';
  } else {
    tier = 'critical';
    tierLabel = 'Critical Shortage';
  }

  // ── 5. Normalize to 0-100 for UI bars ────────────────────────────────────
  // demandIndex: how high is demand relative to supply? High demand = high bar
  // supplyIndex: how well does supply cover demand?
  const demandIndex = Math.min(Math.round((projectedWeeklyDemand / Math.max(combinedSupply, 1)) * 50), 100);
  const supplyIndex = Math.min(Math.round((combinedSupply / Math.max(projectedWeeklyDemand * 2, 1)) * 100), 100);

  return {
    bloodType,
    tier,
    tierLabel,
    demandIndex,
    supplyIndex,
    ratio: Math.round(ratio * 100) / 100,
    breakdown: {
      recentRequests,
      projectedWeeklyDemand: Math.round(projectedWeeklyDemand * 10) / 10,
      bankInventoryUnits,
      eligibleDonorCount,
      combinedSupply,
      ratio: Math.round(ratio * 100) / 100,
    },
    windowDays: FORECAST_WINDOW_DAYS,
    computedAt: new Date().toISOString(),
  };
}
