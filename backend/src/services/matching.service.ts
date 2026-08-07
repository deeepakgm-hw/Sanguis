/**
 * matching.service.ts — Sanguis Blood Donor Matching Engine
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  TEAMMATE SWAP POINTS — read before editing the core loop               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║                                                                          ║
 * ║  Teammate B (AI / Trust Score):                                          ║
 * ║    • urgencyLevel  → see resolveUrgencyLevel() below (marked TODO-B).   ║
 * ║      Drop your AI call in the one marked spot; the 2-second timeout and  ║
 * ║      automatic fallback to the stored value are already wired.           ║
 * ║    • trustScore    → already read from Donor.trustScore in the ranking   ║
 * ║      step.  Populate it via PATCH /api/v1/ai/trust-score on the Donor   ║
 * ║      document and ranking updates automatically — no code change needed. ║
 * ║                                                                          ║
 * ║  Teammate C (Redis Geo):                                                 ║
 * ║    • Replace the body of redisGeoStrategy.findNearby() (marked TODO-C). ║
 * ║      The try/catch fallback to mongoNearFallback is already in place;   ║
 * ║      a missing or empty Redis geo key will never break the demo.         ║
 * ║    • When ready, flip the exported activeGeoStrategy (bottom of file)   ║
 * ║      from mongoNearFallback to redisGeoStrategy — one-line change.       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

import { Types } from "mongoose";
import { BloodRequest, UrgencyLevel } from "../models/BloodRequest";
import { Donor, IDonor, BloodType } from "../models/Donor";
import { redis } from "../config/redis";
import { logger } from "../utils/logger";
import { getUnavailableDonorIds } from "./eligibility.service";

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const DEFAULT_RADIUS_KM = 50;
/**
 * Search radius for blood bank proximity queries in the cascade routing engine.
 * Defined as a named constant (not inline) so it can be tuned in one place.
 * 15 km reflects urban ambulance transfer range; raise for rural deployments.
 */
const BANK_SEARCH_RADIUS_KM = 15;
/**
 * Max candidates fetched from the geo layer before blood-type filtering and
 * ranking.  Bounds DB/network work per request.
 */
const MAX_GEO_CANDIDATES = 200;
const AI_TIMEOUT_MS = 2_000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// GEO QUERY STRATEGY INTERFACE
//
// The matching core never calls the DB directly for geo — it always goes
// through GeoQueryStrategy.  Swap strategies without touching the ranking loop.
// ---------------------------------------------------------------------------

/** Type alias used in the interface to match the spec — same as IDonor. */
export type DonorDoc = IDonor;

export interface GeoQueryStrategy {
  /** Returns eligible donors within radiusKm of (lat, lng), any blood type. */
  findNearby(lat: number, lng: number, radiusKm: number): Promise<DonorDoc[]>;
}

// ---------------------------------------------------------------------------
// STRATEGY 1: mongoNearFallback  ← DEFAULT, works standalone today
//
// Uses MongoDB $near on Donor.location (2dsphere index).
// Enforces the 90-day eligibility rule server-side (isEligible is a virtual
// and does not run inside Mongoose .find() calls).
// ---------------------------------------------------------------------------
export const mongoNearFallback: GeoQueryStrategy = {
  async findNearby(lat, lng, radiusKm) {
    const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS);
    return Donor.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] }, // GeoJSON: [lng, lat]
          $maxDistance: radiusKm * 1000, // metres
        },
      },
      // isEligible virtual replicated as a DB filter:
      $or: [
        { lastDonationDate: null },
        { lastDonationDate: { $lte: ninetyDaysAgo } },
      ],
    }).limit(MAX_GEO_CANDIDATES);
  },
};

// ---------------------------------------------------------------------------
// STRATEGY 2: redisGeoStrategy  ← STUB — wire once Teammate C's index lands
//
// Uses Redis GEORADIUS to find donor IDs within radius, then fetches full
// Donor docs from Mongo.  Falls back to mongoNearFallback automatically if
// the Redis geo key doesn't exist or the command throws for any reason.
// Never let a missing Redis index break the demo.
// ---------------------------------------------------------------------------
export const redisGeoStrategy: GeoQueryStrategy = {
  async findNearby(lat, lng, radiusKm) {
    // ── TODO-C ────────────────────────────────────────────────────────────
    // Wire up once Teammate C's geo indexing lands.
    // Falls back to mongoNearFallback if Redis key doesn't exist or throws.
    //
    // Expected Redis data structure:
    //   Key:   "geo:donors"
    //   Type:  GEO (populated by Teammate C's indexer when a Donor is saved)
    //   Value: donor ObjectId strings as member names
    //
    // Uncomment and adapt this block when the Redis index is live:
    //
    //   const members = await redis.call(
    //     "GEORADIUS", "geo:donors",
    //     lng, lat, radiusKm, "km",
    //     "ASC", "COUNT", MAX_GEO_CANDIDATES
    //   ) as string[];
    //   if (!members || members.length === 0) return [];
    //   const ninetyDaysAgo = new Date(Date.now() - NINETY_DAYS_MS);
    //   return Donor.find({
    //     _id: { $in: members.map(id => new Types.ObjectId(id)) },
    //     $or: [
    //       { lastDonationDate: null },
    //       { lastDonationDate: { $lte: ninetyDaysAgo } },
    //     ],
    //   });
    //
    // ─────────────────────────────────────────────────────────────────────
    try {
      // Intentional: throws until TODO-C is implemented, triggering fallback.
      const testKey = await redis.call("EXISTS", "geo:donors");
      if (!testKey) throw new Error("Redis geo:donors key does not exist");

      // ← Replace this throw with the GEORADIUS block above when ready.
      throw new Error("redisGeoStrategy: geo index not yet populated (TODO-C)");
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : err },
        "redisGeoStrategy: falling back to mongoNearFallback"
      );
      return mongoNearFallback.findNearby(lat, lng, radiusKm);
    }
  },
};

// ---------------------------------------------------------------------------
// ACTIVE STRATEGY
//
// Flip this export from mongoNearFallback → redisGeoStrategy once Teammate C's
// geo index is live and tested.  One line, zero core-logic changes.
// ---------------------------------------------------------------------------
export const activeGeoStrategy: GeoQueryStrategy = mongoNearFallback;

// ---------------------------------------------------------------------------
// ABO / RH COMPATIBILITY MATRIX
//
// Standard whole-blood donor compatibility (not plasma/platelets/apheresis).
// Source: American Red Cross / AABB compatibility table.
// Reading direction: "which blood types can DONATE TO a recipient of type X?"
//
// Exported as a pure function — unit-testable with zero DB or service setup.
// ---------------------------------------------------------------------------

/**
 * Returns the donor blood types whose whole blood is ABO/Rh-compatible with
 * a recipient of `recipientBloodType`.
 *
 * @example
 *   getCompatibleDonorTypes("AB+") // → all 8 types (universal recipient)
 *   getCompatibleDonorTypes("O-")  // → ["O-"]          (universal donor)
 */
export function getCompatibleDonorTypes(recipientBloodType: string): BloodType[] {
  const matrix: Record<string, BloodType[]> = {
    "A+":  ["A+", "A-", "O+", "O-"],
    "A-":  ["A-", "O-"],
    "B+":  ["B+", "B-", "O+", "O-"],
    "B-":  ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], // universal recipient
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+":  ["O+", "O-"],
    "O-":  ["O-"],                                               // universal donor
  };

  const compatible = matrix[recipientBloodType];
  if (!compatible) {
    throw new Error(
      `Unknown blood type "${recipientBloodType}". Valid values: ${Object.keys(matrix).join(", ")}`
    );
  }
  return compatible;
}

// ---------------------------------------------------------------------------
// HAVERSINE DISTANCE HELPER (internal)
//
// Used to compute distanceKm for ranking.  $near returns docs sorted by
// proximity but does not expose the distance value; we recompute it cheaply
// in Node for the small candidate set.
// ---------------------------------------------------------------------------

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lat/lng points in kilometres. */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius, km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// AI URGENCY LEVEL RESOLVER  ← SWAP POINT FOR TEAMMATE B
//
// Wraps the (not-yet-live) AI urgency-score call in a 2-second Promise.race
// timeout.  If the call times out OR is not yet wired, the function silently
// falls back to the urgencyLevel already stored on the BloodRequest.
// Matching is NEVER blocked by Teammate B's AI service being unavailable.
// ---------------------------------------------------------------------------
async function resolveUrgencyLevel(
  requestId: string,
  storedLevel: UrgencyLevel
): Promise<UrgencyLevel> {
  // ── TODO-B ────────────────────────────────────────────────────────────────
  // Replace the stub rejection below with the real AI urgency-score call:
  //
  //   const aiCall = fetchAIUrgencyScore(requestId); // your SDK call here
  //
  // The Promise.race timeout and fallback are already wired — no other
  // changes needed in this function.
  // ─────────────────────────────────────────────────────────────────────────
  const aiCall = Promise.reject<UrgencyLevel>(
    new Error("AI urgency service not yet wired (TODO-B)")
  );

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`AI urgency score timed out after ${AI_TIMEOUT_MS}ms`)),
      AI_TIMEOUT_MS
    )
  );

  try {
    return await Promise.race([aiCall, timeout]);
  } catch {
    logger.debug(
      { requestId, fallback: storedLevel },
      "resolveUrgencyLevel: AI unavailable or timed out — using stored urgencyLevel"
    );
    return storedLevel;
  }
}

// ---------------------------------------------------------------------------
// RETURN TYPE
// ---------------------------------------------------------------------------

export interface MatchCandidate {
  donor: DonorDoc;
  distanceKm: number;
  // trustScore populated by Teammate B's AI service; defaults to 0 if not yet
  // scored — donors with trustScore 0 simply rank lower, they are never excluded.
  trustScore: number;
}

// ---------------------------------------------------------------------------
// RANKING HELPER (exported for unit tests)
//
// Pure sort — no DB calls, no side effects.
// Primary:   trustScore DESC  (higher trust = earlier in list)
// Tiebreak:  distanceKm ASC   (closer = earlier when trust is equal)
// ---------------------------------------------------------------------------

export function rankCandidates(candidates: MatchCandidate[]): MatchCandidate[] {
  return [...candidates].sort((a, b) => {
    // trustScore populated by Teammate B's AI service; defaults to 0 if not yet
    // scored — donors with trustScore 0 simply rank lower, they are never excluded.
    if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore; // DESC
    return a.distanceKm - b.distanceKm; // ASC tiebreaker
  });
}

// ---------------------------------------------------------------------------
// MAIN SERVICE FUNCTION
// ---------------------------------------------------------------------------

/**
 * Finds, ranks, and returns eligible blood-type-compatible donors for a
 * BloodRequest.  Does NOT create Match documents — that is the controller's
 * responsibility (see matching.controller.ts).
 *
 * @param requestId   - string ObjectId of the BloodRequest.
 * @param strategy    - geo query strategy (default: activeGeoStrategy = mongoNearFallback).
 * @param radiusKm    - search radius in km (default: 50 km).
 * @returns           - ranked MatchCandidate[], closest/highest-trust first.
 */
export async function findMatchesForRequest(
  requestId: string,
  strategy: GeoQueryStrategy = activeGeoStrategy,
  radiusKm: number = DEFAULT_RADIUS_KM
): Promise<MatchCandidate[]> {

  // ── 1. Validate and load BloodRequest ────────────────────────────────────
  if (!Types.ObjectId.isValid(requestId)) {
    throw new Error(`Invalid requestId: "${requestId}" is not a valid ObjectId.`);
  }

  const bloodRequest = await BloodRequest.findById(requestId);
  if (!bloodRequest) {
    throw new Error(`BloodRequest not found: ${requestId}`);
  }

  if (bloodRequest.status !== "open") {
    logger.warn(
      { requestId, status: bloodRequest.status },
      "matching: request is not open — returning empty candidate list"
    );
    return [];
  }

  // ── 2. Resolve urgency level (AI swap point — see resolveUrgencyLevel) ───
  const urgencyLevel = await resolveUrgencyLevel(requestId, bloodRequest.urgencyLevel);
  // urgencyLevel is available here for future priority-queue / dispatch logic.
  // Not used in the ranking sort today; ranking is trust + distance only.
  logger.debug({ requestId, urgencyLevel }, "matching: urgency level resolved");

  // ── 3. Derive compatible blood types ─────────────────────────────────────
  const compatibleTypes = getCompatibleDonorTypes(bloodRequest.bloodType);
  logger.debug({ requestId, recipientType: bloodRequest.bloodType, compatibleTypes },
    "matching: compatibility matrix resolved");

  // ── 4. Geo query (strategy-pluggable) ────────────────────────────────────
  // GeoJSON coordinates are [lng, lat]; findNearby signature is (lat, lng).
  const [reqLng, reqLat] = bloodRequest.geoLocation.coordinates;
  const geoCandidates = await strategy.findNearby(reqLat, reqLng, radiusKm);

  logger.info({ requestId, geoCandidates: geoCandidates.length, radiusKm },
    "matching: geo query complete");

  // ── 5. Filter by blood-type compatibility (“medically eligible by type”) ─────
  const eligible = geoCandidates.filter((d) => compatibleTypes.includes(d.bloodType));

  // ── 5b. Filter out voluntarily unavailable donors ───────────────────────────────
  // A donor can be medically eligible (past the 90-day interval) but have
  // voluntarily marked themselves as unavailable (traveling, unwell, etc.).
  // These are two independent signals and both must be clear for a donor
  // to appear as a match candidate. Broadcasting to an unavailable donor
  // wastes the exact response-time budget we're trying to protect.
  //
  // This is a single batch DB query — not N queries per donor.
  let availableEligible = eligible;
  try {
    const unavailableIds = await getUnavailableDonorIds(eligible.map((d) => d._id));
    if (unavailableIds.size > 0) {
      availableEligible = eligible.filter((d) => !unavailableIds.has(d._id.toString()));
      logger.debug(
        { requestId, excluded: unavailableIds.size, remaining: availableEligible.length },
        "matching: voluntary unavailability filter applied"
      );
    }
  } catch (availErr) {
    // Availability check failure must never block matching — degrade gracefully.
    logger.warn(
      { requestId, err: availErr instanceof Error ? availErr.message : availErr },
      "matching: availability filter failed — proceeding with full eligible list"
    );
  }

  // ── 6. Compute distances + build candidate list ────────────────────────────
  const candidates: MatchCandidate[] = availableEligible.map((donor) => {
    const [dLng, dLat] = donor.location.coordinates; // GeoJSON: [lng, lat]
    return {
      donor,
      distanceKm: haversineKm(reqLat, reqLng, dLat, dLng),
      trustScore: donor.trustScore,
    };
  });

  // ── 7. Rank: trustScore DESC, distanceKm ASC ─────────────────────────────
  const ranked = rankCandidates(candidates);

  logger.info(
    { requestId, eligible: ranked.length, geoCandidates: geoCandidates.length, voluntarilyExcluded: eligible.length - availableEligible.length },
    "matching: findMatchesForRequest complete"
  );

  return ranked;
}

/**
 * Cascade Routing Engine — bank-first, donor-fallback.
 *
 * Step 1: Check verified blood banks within BANK_SEARCH_RADIUS_KM for stock.
 * Step 2: If sufficient → return bank recommendation (no inventory decrement —
 *         this is a RECOMMENDATION only; a future confirmation endpoint will
 *         call adjustInventory with reason "dispatch_fulfilled" once the
 *         hospital confirms the pickup actually happened).
 * Step 3: If insufficient → fall through to donor broadcast.
 *
 * Fail-safe: if the bank-lookup throws for any reason (network, geo index
 * unavailable, etc.), the error is logged and we fall straight through to
 * donor broadcast rather than failing the entire request.  A bank-lookup
 * failure must NEVER block the existing working donor-matching path.
 */
export async function routeBloodRequest(requestId: string): Promise<
  | {
      stage: "bank_fulfillable";
      recommendedBanks: ReturnType<typeof Array.prototype.sort>;
      totalAvailableUnits: number;
    }
  | {
      stage: "donor_broadcast";
      donorMatches: MatchCandidate[];
      partialBankSupply: number;
      shortfallUnits: number;
    }
> {
  const request = await BloodRequest.findById(requestId);
  if (!request) {
    throw new Error(`BloodRequest not found: ${requestId}`);
  }

  // GPS coordinates in GeoJSON are [lng, lat]
  const [reqLng, reqLat] = request.geoLocation.coordinates;

  // ── Stage 1: check verified blood banks within radius ─────────────────────
  // Dynamic import to prevent circular dependency with inventory.service
  // (inventory.service imports haversineKm from this file).
  let supply: { totalUnits: number; banks: any[] } = { totalUnits: 0, banks: [] };
  try {
    const { getRegionalSupplyIndex } = await import("./inventory.service");
    supply = await getRegionalSupplyIndex(
      request.bloodType,
      reqLat,
      reqLng,
      BANK_SEARCH_RADIUS_KM
    );
  } catch (bankErr) {
    // Fail-safe: a bank-lookup failure (geo index down, network, etc.) must
    // never block donor broadcast.  Log loudly and fall through.
    logger.error(
      { requestId, err: bankErr instanceof Error ? bankErr.message : bankErr },
      "routeBloodRequest: bank supply lookup failed — falling through to donor broadcast"
    );
  }

  // ── Stage 2: sufficient bank supply ─────────────────────────────────────
  if (supply.totalUnits >= request.unitsNeeded) {
    // IMPORTANT: do NOT call adjustInventory here.  This is a recommendation
    // only.  Auto-decrementing stock without confirmation that the transfer
    // actually happened would create false inventory data.  The hospital
    // must confirm pickup via a future /confirm-pickup endpoint, which will
    // then call adjustInventory({ reason: "dispatch_fulfilled" }).
    return {
      stage: "bank_fulfillable",
      // banks already sorted by distanceKm ascending inside getRegionalSupplyIndex
      recommendedBanks: supply.banks,
      totalAvailableUnits: supply.totalUnits,
    };
  }

  // ── Stage 3: insufficient stock → donor broadcast ────────────────────────
  const donorMatches = await findMatchesForRequest(requestId);
  return {
    stage: "donor_broadcast",
    donorMatches,
    partialBankSupply: supply.totalUnits,
    shortfallUnits: request.unitsNeeded - supply.totalUnits,
  };
}
