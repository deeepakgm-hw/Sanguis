/**
 * location.service.ts — Sanguis Donor Location & Redis GEO Service
 */

import { Types } from "mongoose";
import { Donor, IDonor } from "../models/Donor";
import { redis } from "../config/redis";
import { logger } from "../utils/logger";
import {
  isValidCoordinates,
  GPS_MAX_MATCHING_ACCURACY_METERS,
  LOCATION_FRESHNESS_RECENT_SEC,
  LocationPayload,
  getAccuracyCategory,
} from "../utils/geo";

export const REDIS_GEO_KEY = "sanguis:donors:locations";
export const REDIS_META_PREFIX = "sanguis:donors:meta:";

export interface LocationUpdateInput {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
  bloodType?: string;
}

export interface LiveDonorLocationRecord {
  donorId: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number | null;
  speed?: number | null;
  bloodType?: string;
  lastUpdatedAt: string;
  isLive: boolean;
  qualityCategory: string;
}

export class LocationService {
  /**
   * Updates a donor's live GPS location in Redis GEO and MongoDB.
   */
  static async updateDonorLocation(
    userId: string,
    payload: LocationUpdateInput
  ): Promise<LiveDonorLocationRecord> {
    const { latitude, longitude, accuracy, heading, speed, timestamp, bloodType } = payload;

    // 1. Validate coordinates and accuracy
    if (!isValidCoordinates(latitude, longitude, accuracy)) {
      throw new Error(`Invalid GPS coordinates: lat=${latitude}, lng=${longitude}, accuracy=${accuracy}`);
    }

    // 2. Find donor profile for authenticated user
    const donor = await Donor.findOne({ userId });
    if (!donor) {
      throw new Error(`No donor profile found for user ${userId}`);
    }

    const donorId = donor._id.toString();
    const nowIso = new Date().toISOString();
    const qualityCategory = getAccuracyCategory(accuracy);

    // 3. Store in Redis GEO (longitude, latitude, member)
    try {
      if (typeof redis.geoadd === "function") {
        await redis.geoadd(REDIS_GEO_KEY, longitude, latitude, donorId);
      } else if (typeof redis.call === "function") {
        await redis.call("GEOADD", REDIS_GEO_KEY, longitude, latitude, donorId);
      }

      // Store metadata hash in Redis with TTL (120 seconds freshness window)
      const metaKey = `${REDIS_META_PREFIX}${donorId}`;
      const metaObj: Record<string, string> = {
        donorId,
        userId,
        latitude: String(latitude),
        longitude: String(longitude),
        accuracy: String(accuracy),
        heading: heading !== undefined && heading !== null ? String(heading) : "",
        speed: speed !== undefined && speed !== null ? String(speed) : "",
        bloodType: bloodType || donor.bloodType || "",
        lastUpdatedAt: nowIso,
        qualityCategory,
      };

      if (typeof redis.hset === "function") {
        await redis.hset(metaKey, metaObj);
        await redis.expire(metaKey, LOCATION_FRESHNESS_RECENT_SEC);
      } else if (typeof redis.call === "function") {
        await redis.call("HSET", metaKey, ...Object.entries(metaObj).flat());
        await redis.call("EXPIRE", metaKey, LOCATION_FRESHNESS_RECENT_SEC);
      }
    } catch (redisErr) {
      logger.warn({ err: redisErr, donorId }, "Failed to update Redis GEO; continuing with DB update");
    }

    // 4. Update MongoDB Donor document asynchronously
    donor.location = { type: "Point", coordinates: [longitude, latitude] };
    donor.isLiveTracking = true;
    donor.shareLiveLocation = true;
    donor.lastLocationUpdate = new Date();
    if (bloodType) donor.bloodType = bloodType as any;
    await donor.save();

    return {
      donorId,
      userId,
      latitude,
      longitude,
      accuracy,
      heading: heading ?? null,
      speed: speed ?? null,
      bloodType: donor.bloodType,
      lastUpdatedAt: nowIso,
      isLive: true,
      qualityCategory,
    };
  }

  /**
   * Stops live location sharing for a donor and removes location from Redis GEO.
   */
  static async stopDonorLocation(userId: string): Promise<void> {
    const donor = await Donor.findOne({ userId });
    if (!donor) return;

    const donorId = donor._id.toString();

    // 1. Remove from Redis GEO
    try {
      if (typeof redis.zrem === "function") {
        await redis.zrem(REDIS_GEO_KEY, donorId);
      } else if (typeof redis.call === "function") {
        await redis.call("ZREM", REDIS_GEO_KEY, donorId);
      }

      // Delete metadata hash
      const metaKey = `${REDIS_META_PREFIX}${donorId}`;
      if (typeof redis.del === "function") {
        await redis.del(metaKey);
      }
    } catch (err) {
      logger.warn({ err, donorId }, "Failed to remove donor from Redis GEO");
    }

    // 2. Update MongoDB Donor document
    donor.isLiveTracking = false;
    await donor.save();
  }

  /**
   * Queries nearby live donors from Redis GEO filtered by radius, freshness, and accuracy threshold.
   */
  static async findNearbyLiveDonors(
    lat: number,
    lng: number,
    radiusKm: number,
    maxAccuracyMeters: number = GPS_MAX_MATCHING_ACCURACY_METERS
  ): Promise<LiveDonorLocationRecord[]> {
    let memberIds: string[] = [];

    try {
      if (typeof redis.geosearch === "function") {
        memberIds = await redis.geosearch(REDIS_GEO_KEY, lng, lat, radiusKm, "km");
      } else if (typeof redis.georadius === "function") {
        memberIds = await redis.georadius(REDIS_GEO_KEY, lng, lat, radiusKm, "km");
      } else if (typeof redis.call === "function") {
        const raw = await redis.call("GEORADIUS", REDIS_GEO_KEY, lng, lat, radiusKm, "km");
        if (Array.isArray(raw)) memberIds = raw.map(String);
      }
    } catch (err) {
      logger.warn({ err, lat, lng, radiusKm }, "Redis GEO search failed; falling back to MongoDB");
      memberIds = [];
    }

    const results: LiveDonorLocationRecord[] = [];
    const now = Date.now();

    for (const id of memberIds) {
      try {
        const metaKey = `${REDIS_META_PREFIX}${id}`;
        let meta: Record<string, string> = {};

        if (typeof redis.hgetall === "function") {
          meta = await redis.hgetall(metaKey);
        } else if (typeof redis.call === "function") {
          const raw = await redis.call("HGETALL", metaKey);
          if (Array.isArray(raw)) {
            for (let i = 0; i < raw.length; i += 2) {
              meta[raw[i]] = raw[i + 1];
            }
          }
        }

        if (!meta || !meta.lastUpdatedAt) continue;

        const ageMs = now - new Date(meta.lastUpdatedAt).getTime();
        if (ageMs > LOCATION_FRESHNESS_RECENT_SEC * 1000) {
          // Stale location (>120s) -> Exclude from emergency matching
          continue;
        }

        const accuracy = parseFloat(meta.accuracy || "100");
        if (accuracy > maxAccuracyMeters) {
          // Exclude poor accuracy readings from high-confidence matching
          continue;
        }

        results.push({
          donorId: id,
          userId: meta.userId,
          latitude: parseFloat(meta.latitude),
          longitude: parseFloat(meta.longitude),
          accuracy,
          heading: meta.heading ? parseFloat(meta.heading) : null,
          speed: meta.speed ? parseFloat(meta.speed) : null,
          bloodType: meta.bloodType,
          lastUpdatedAt: meta.lastUpdatedAt,
          isLive: ageMs <= 30000,
          qualityCategory: meta.qualityCategory || getAccuracyCategory(accuracy),
        });
      } catch (e) {
        // Ignore parsing error for individual item
      }
    }

    return results;
  }
}
