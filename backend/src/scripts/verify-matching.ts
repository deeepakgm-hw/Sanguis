/**
 * verify-matching.ts — Throwaway verification script for matching.service.ts
 *
 * Run with:  npx tsx src/scripts/verify-matching.ts
 *
 * Proves the matching engine works correctly with:
 *   - zero AI dependency  (trustScore = 0 for all donors)
 *   - zero real geo dependency (in-memory stub GeoQueryStrategy)
 *   - no external DB connection required for the pure-function tests
 *   - real MongoDB via mongodb-memory-server for the integration path
 *
 * Expected ranking (all trustScore=0, so distance is tiebreaker):
 *   1. Farida  — 2.1 km  (closest)
 *   2. Rajan   — 8.5 km
 *   3. Mei     — 19.0 km (furthest)
 *
 * Delete this file once you've confirmed the output looks correct.
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";

// ── Import the functions under test ──────────────────────────────────────────
import {
  getCompatibleDonorTypes,
  haversineKm,
  rankCandidates,
  findMatchesForRequest,
  mongoNearFallback,
  GeoQueryStrategy,
  MatchCandidate,
  DonorDoc,
} from "../services/matching.service";

import { BloodRequest } from "../models/BloodRequest";
import { Donor } from "../models/Donor";
import { User } from "../models/User";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: Pure-function tests (zero DB, zero network)
// ─────────────────────────────────────────────────────────────────────────────

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ ${message}`);
  }
}

function assertDeepEqual<T>(actual: T[], expected: T[], message: string): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    console.error(`  ✗ FAIL: ${message}`);
    console.error(`    actual:   ${JSON.stringify(actual)}`);
    console.error(`    expected: ${JSON.stringify(expected)}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ ${message}`);
  }
}

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  SECTION 1 — Pure function tests (no DB)");
console.log("═══════════════════════════════════════════════════════════\n");

// getCompatibleDonorTypes
assertDeepEqual(
  getCompatibleDonorTypes("O-"),
  ["O-"],
  'O- recipient → only O- donors (most restrictive)'
);
assertDeepEqual(
  getCompatibleDonorTypes("AB+"),
  ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  'AB+ recipient → all 8 types (universal recipient)'
);
assertDeepEqual(
  getCompatibleDonorTypes("A+"),
  ["A+", "A-", "O+", "O-"],
  'A+ recipient → A+, A-, O+, O-'
);
assertDeepEqual(
  getCompatibleDonorTypes("B-"),
  ["B-", "O-"],
  'B- recipient → B-, O- only'
);

try {
  getCompatibleDonorTypes("Z+");
  assert(false, 'Unknown blood type should throw');
} catch {
  assert(true, 'Unknown blood type "Z+" throws an error');
}

// haversineKm — same point should be 0
assert(haversineKm(0, 0, 0, 0) === 0, "haversine: same point = 0 km");

// Known distance: Chennai to Bangalore ~290 km
const chennaiLat = 13.0827, chennaiLng = 80.2707;
const bangaloreLat = 12.9716, bangaloreLng = 77.5946;
const chbg = haversineKm(chennaiLat, chennaiLng, bangaloreLat, bangaloreLng);
assert(
  chbg > 280 && chbg < 310,
  `haversine: Chennai→Bangalore ≈ ${chbg.toFixed(1)} km (expected 280–310)`
);

// rankCandidates — pure sort, no DB
console.log("\n─── rankCandidates tests ───\n");

const makeMockCandidate = (trustScore: number, distanceKm: number): MatchCandidate => ({
  donor: { trustScore } as unknown as DonorDoc,
  distanceKm,
  trustScore,
  finalScore: trustScore - (distanceKm * 0.5),
  fatigueShield: {
    recentPings30d: 0,
    fatigueLevel: "low",
    fatiguePenalty: 0,
    tradeoffScore: {
      etaCostMinutes: 0,
      sustainabilityRatingPct: 100,
      explanation: "No fatigue penalty",
    },
  },
});

const unranked = [
  makeMockCandidate(0,  19.0),  // Mei     — furthest, trustScore 0
  makeMockCandidate(0,   2.1),  // Farida  — closest,  trustScore 0
  makeMockCandidate(0,   8.5),  // Rajan   — middle,   trustScore 0
];

const ranked = rankCandidates(unranked);
assert(ranked[0].distanceKm === 2.1,  "rankCandidates: closest first when all trustScore=0 (slot 0 = 2.1 km)");
assert(ranked[1].distanceKm === 8.5,  "rankCandidates: closest first when all trustScore=0 (slot 1 = 8.5 km)");
assert(ranked[2].distanceKm === 19.0, "rankCandidates: closest first when all trustScore=0 (slot 2 = 19.0 km)");

// trustScore takes priority over distance
const mixedTrust = [
  makeMockCandidate(0,   1.0),  // nearest but untrusted
  makeMockCandidate(80, 50.0),  // far but high trust
  makeMockCandidate(40, 10.0),  // mid trust, mid distance
];
const rankedMixed = rankCandidates(mixedTrust);
assert(rankedMixed[0].trustScore === 80, "rankCandidates: trustScore 80 ranks first regardless of distance");
assert(rankedMixed[1].trustScore === 40, "rankCandidates: trustScore 40 ranks second");
assert(rankedMixed[2].trustScore === 0,  "rankCandidates: trustScore 0 ranks last");

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: Integration test — findMatchesForRequest with in-memory MongoDB
//            and a custom (stub) GeoQueryStrategy
// ─────────────────────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  SECTION 2 — Integration test (mongodb-memory-server + stub geo)");
console.log("═══════════════════════════════════════════════════════════\n");

async function runIntegrationTest(): Promise<void> {
  // Start in-memory MongoDB
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log("  [setup] mongodb-memory-server started");

  try {
    // --- Hospital user (required by BloodRequest.hospital ref) ---------------
    const hospital = await User.create({
      name: "City Hospital",
      email: "hospital@sanguis.test",
      password: "Hospital@1234!", // hashed by pre-save hook
      role: "user",
      authProvider: "local",
    });

    // --- Three donor documents at different distances from the request --------
    // Request origin: Chennai (13.0827° N, 80.2707° E)
    // Farida  →  2.1 km  →  ~13.1005° N, 80.2707° E
    // Rajan   →  8.5 km  →  ~13.1592° N, 80.2707° E
    // Mei     → 19.0 km  →  ~13.2537° N, 80.2707° E
    // (Simplified: moving north only, lng constant)

    const donorUser = async (name: string, email: string) =>
      User.create({ name, email, password: "Donor@1234!", role: "user", authProvider: "local" });

    const [uFarida, uRajan, uMei] = await Promise.all([
      donorUser("Farida Khan", "farida@sanguis.test"),
      donorUser("Rajan Pillai", "rajan@sanguis.test"),
      donorUser("Mei Lin", "mei@sanguis.test"),
    ]);

    const [farida, rajan, mei] = await Promise.all([
      Donor.create({
        userId: uFarida._id,
        bloodType: "O-",  // compatible with O- recipient
        lastDonationDate: null,
        trustScore: 0,    // AI not yet scored — still eligible and rankable
        location: { type: "Point", coordinates: [80.2707, 13.1005] }, // ~2.1 km N
      }),
      Donor.create({
        userId: uRajan._id,
        bloodType: "O-",
        lastDonationDate: null,
        trustScore: 0,
        location: { type: "Point", coordinates: [80.2707, 13.1592] }, // ~8.5 km N
      }),
      Donor.create({
        userId: uMei._id,
        bloodType: "O-",
        lastDonationDate: null,
        trustScore: 0,
        location: { type: "Point", coordinates: [80.2707, 13.2537] }, // ~19.0 km N
      }),
    ]);

    // --- BloodRequest at the origin ------------------------------------------
    const request = await BloodRequest.create({
      bloodType: "O-",
      unitsNeeded: 2,
      urgencyLevel: "critical",
      hospital: hospital._id,
      status: "open",
      geoLocation: { type: "Point", coordinates: [80.2707, 13.0827] }, // Chennai
    });

    console.log(`  [setup] Created request ${request._id} and 3 donors`);

    // --- Custom in-memory stub strategy (no $near, no geo index needed) ------
    // Returns all 3 donors sorted closest-first (simulating what $near would do).
    const stubStrategy: GeoQueryStrategy = {
      async findNearby(_lat, _lng, _radiusKm) {
        // Return in "closest-first" order the way $near would — the ranking
        // step should preserve this order when all trustScores are equal.
        return [farida, rajan, mei];
      },
    };

    // --- Run the engine ------------------------------------------------------
    const results = await findMatchesForRequest(
      request._id.toString(),
      stubStrategy,
      50
    );

    console.log("\n  Results:");
    results.forEach((r, i) => {
      console.log(
        `    [${i + 1}] donor=${r.donor._id} bloodType=${r.donor.bloodType} ` +
        `distanceKm=${r.distanceKm.toFixed(2)} trustScore=${r.trustScore}`
      );
    });

    // --- Assertions ----------------------------------------------------------
    assert(results.length === 3, "All 3 compatible donors returned");

    // All trustScore=0, so ranking falls back to distanceKm ASC
    assert(results[0].donor._id.toString() === farida._id.toString(),
      "Rank 1 = Farida (closest, 2.1 km)");
    assert(results[1].donor._id.toString() === rajan._id.toString(),
      "Rank 2 = Rajan (8.5 km)");
    assert(results[2].donor._id.toString() === mei._id.toString(),
      "Rank 3 = Mei (furthest, 19.0 km)");

    assert(results[0].distanceKm < results[1].distanceKm, "distanceKm strictly ascending");
    assert(results[1].distanceKm < results[2].distanceKm, "distanceKm strictly ascending");

    // trustScore defaults should all be 0
    assert(results.every(r => r.trustScore === 0),
      "All trustScores = 0 (AI not yet scored — donors never excluded)");

    // --- Verify non-compatible blood type is excluded ------------------------
    // Add an A+ donor — should NOT appear for an O- request
    const uExtra = await donorUser("Extra User", "extra@sanguis.test");
    const incompatibleDonor = await Donor.create({
      userId: uExtra._id,
      bloodType: "A+",
      lastDonationDate: null,
      trustScore: 99, // even max trust doesn't override incompatibility
      location: { type: "Point", coordinates: [80.2707, 13.0900] },
    });

    const stubWithIncompatible: GeoQueryStrategy = {
      async findNearby() {
        return [incompatibleDonor, farida, rajan, mei];
      },
    };
    const results2 = await findMatchesForRequest(
      request._id.toString(),
      stubWithIncompatible,
      50
    );
    assert(results2.length === 3,
      "Incompatible A+ donor excluded even with trustScore=99");
    assert(
      results2.every(r => r.donor._id.toString() !== incompatibleDonor._id.toString()),
      "Incompatible donor not present in any ranked slot"
    );

    // --- Verify non-open request returns empty --------------------------------
    await BloodRequest.findByIdAndUpdate(request._id, { status: "cancelled" });
    const results3 = await findMatchesForRequest(
      request._id.toString(),
      stubStrategy,
      50
    );
    assert(results3.length === 0, "Cancelled request returns empty array");

  } finally {
    await mongoose.disconnect();
    await mongod.stop();
    console.log("\n  [teardown] mongodb-memory-server stopped");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────────────────────────────────────

runIntegrationTest()
  .then(() => {
    const code = process.exitCode ?? 0;
    console.log("\n═══════════════════════════════════════════════════════════");
    if (code === 0) {
      console.log("  ALL TESTS PASSED ✓");
    } else {
      console.log("  SOME TESTS FAILED ✗  — see output above");
    }
    console.log("═══════════════════════════════════════════════════════════\n");
    process.exit(code);
  })
  .catch((err) => {
    console.error("\n  UNHANDLED ERROR:", err);
    process.exit(1);
  });
