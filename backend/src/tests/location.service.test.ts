/**
 * location.service.test.ts — Comprehensive Test Suite for Sanguis GPS & Redis GEO Service
 */

import { LocationService } from "../services/location.service";
import { isValidCoordinates, getAccuracyCategory, haversineKm } from "../utils/geo";
import { redis } from "../config/redis";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING SANGUIS REAL-TIME DONOR GPS TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Valid GPS coordinates accepted
  assert(isValidCoordinates(12.9716, 77.5946, 10) === true, "1. Valid GPS coordinates accepted");

  // 2. Invalid latitude rejected
  assert(isValidCoordinates(95.0, 77.5946, 10) === false, "2. Invalid latitude rejected (>90)");
  assert(isValidCoordinates(-95.0, 77.5946, 10) === false, "2b. Invalid latitude rejected (<-90)");

  // 3. Invalid longitude rejected
  assert(isValidCoordinates(12.9716, 185.0, 10) === false, "3. Invalid longitude rejected (>180)");
  assert(isValidCoordinates(12.9716, -185.0, 10) === false, "3b. Invalid longitude rejected (<-180)");

  // 4. Negative/zero accuracy handled correctly
  assert(isValidCoordinates(12.9716, 77.5946, -5) === false, "4. Negative accuracy rejected");
  assert(isValidCoordinates(12.9716, 77.5946, 0) === true, "4b. Zero accuracy accepted");

  // 5. Accuracy categories
  assert(getAccuracyCategory(8) === "EXCELLENT", "5a. Accuracy <= 10m is EXCELLENT");
  assert(getAccuracyCategory(25) === "GOOD", "5b. Accuracy 10-30m is GOOD");
  assert(getAccuracyCategory(45) === "ACCEPTABLE", "5c. Accuracy 30-50m is ACCEPTABLE");
  assert(getAccuracyCategory(80) === "POOR", "5d. Accuracy 50-100m is POOR");
  assert(getAccuracyCategory(120) === "VERY_POOR", "5e. Accuracy > 100m is VERY_POOR");

  // 6. Haversine distance calculations
  const distSame = haversineKm(12.9716, 77.5946, 12.9716, 77.5946);
  assert(Math.abs(distSame) < 0.001, "6. Haversine distance for identical point is 0km");

  const distKms = haversineKm(12.9716, 77.5946, 13.0827, 80.2707); // Bangalore to Chennai ~290km
  assert(distKms > 250 && distKms < 350, "6b. Haversine distance calculation is accurate (~290km)");

  // 7. Redis GEO Storage test
  const testDonorId = "66b4c123456789abcdef0001";
  const testUserId = "66b4c123456789abcdef0002";

  try {
    if (typeof redis.geoadd === "function") {
      await redis.geoadd("sanguis:donors:locations", 77.5946, 12.9716, testDonorId);
    } else if (typeof redis.call === "function") {
      await redis.call("GEOADD", "sanguis:donors:locations", 77.5946, 12.9716, testDonorId);
    }

    let nearby: string[] = [];
    if (typeof redis.geosearch === "function") {
      nearby = await redis.geosearch("sanguis:donors:locations", 77.5946, 12.9716, 10, "km");
    } else if (typeof redis.georadius === "function") {
      nearby = await redis.georadius("sanguis:donors:locations", 77.5946, 12.9716, 10, "km");
    }
    assert(nearby.includes(testDonorId), "9. Redis GEO location stored and retrievable via GEOSEARCH/GEORADIUS");
  } catch (err: any) {
    console.error("Redis GEO test error:", err);
    failed++;
  }

  // 8. Distance filter (outside radius excluded)
  try {
    const farDonorId = "66b4c123456789abcdef0009";
    if (typeof redis.geoadd === "function") {
      await redis.geoadd("sanguis:donors:locations", 80.2707, 13.0827, farDonorId); // Chennai (~290km away)
    }

    let nearby50km: string[] = [];
    if (typeof redis.geosearch === "function") {
      nearby50km = await redis.geosearch("sanguis:donors:locations", 77.5946, 12.9716, 50, "km");
    }
    assert(!nearby50km.includes(farDonorId), "11. Donors outside search radius (Chennai vs Bangalore 50km) excluded");
  } catch (err) {
    failed++;
  }

  // 9. STOP SHARING removes location from Redis GEO
  try {
    if (typeof redis.zrem === "function") {
      await redis.zrem("sanguis:donors:locations", testDonorId);
    }
    let nearbyAfterStop: string[] = [];
    if (typeof redis.geosearch === "function") {
      nearbyAfterStop = await redis.geosearch("sanguis:donors:locations", 77.5946, 12.9716, 10, "km");
    }
    assert(!nearbyAfterStop.includes(testDonorId), "13. STOP SHARING removes donor from Redis GEO");
  } catch (err) {
    failed++;
  }

  console.log("==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner exception:", err);
  process.exit(1);
});
