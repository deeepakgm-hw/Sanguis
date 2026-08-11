import { Application } from "express";
import { redis } from "../config/redis";
import { BloodRequest } from "../models/BloodRequest";
import { sendUrgentBroadcastNotification } from "./notification.service";
import { logger } from "../utils/logger";

const KEY_PENDING_PREFIX = "pending:bloodrequest:";

/**
 * Updates a donor's geographical location index in Redis.
 *
 * @param donorId The unique identifier of the donor.
 * @param lat The latitude of the donor's location.
 * @param lng The longitude of the donor's location.
 */
export async function updateDonorLocation(donorId: string, lat: number, lng: number): Promise<void> {
  try {
    await redis.geoadd("donor:locations", lng, lat, donorId);
    logger.debug({ donorId, lat, lng }, "Updated donor location index in Redis");
  } catch (err) {
    logger.error({ err, donorId }, "Failed to update donor location index in Redis");
  }
}

/**
 * Finds all donor IDs located within the specified geo-radius.
 *
 * @param lat Central latitude.
 * @param lng Central longitude.
 * @param radiusKm Search radius in kilometers.
 * @returns Array of matching donor user IDs.
 */
export async function findNearbyDonors(lat: number, lng: number, radiusKm: number): Promise<string[]> {
  try {
    // ioredis GEORADIUS syntax: GEORADIUS key longitude latitude radius m|km|ft|mi
    const results = await redis.georadius("donor:locations", lng, lat, radiusKm, "km");
    return results as string[];
  } catch (err) {
    logger.error({ err, lat, lng, radiusKm }, "Failed to find nearby donors via GEORADIUS");
    return [];
  }
}

/**
 * Broadcasts an urgent blood request to matching eligible donors within a geo-radius.
 *
 * @param app Express Application instance (to retrieve the socket.io context).
 * @param bloodRequestId The unique identifier of the BloodRequest.
 * @param lat The latitude of the request (hospital location).
 * @param lng The longitude of the request (hospital location).
 * @param radiusKm The radius to search and broadcast within.
 */
export async function broadcastUrgentRequest(
  app: Application,
  bloodRequestId: string,
  lat: number,
  lng: number,
  radiusKm: number
): Promise<void> {
  try {
    // 1. Fetch details of the blood request
    const request = await BloodRequest.findById(bloodRequestId);
    if (!request) {
      logger.warn({ bloodRequestId }, "Broadcast aborted: BloodRequest not found");
      return;
    }

    // 2. Query nearby donor IDs
    const nearbyDonorIds = await findNearbyDonors(lat, lng, radiusKm);
    if (nearbyDonorIds.length === 0) {
      logger.info({ bloodRequestId, radiusKm }, "No donors found in range for broadcast");
    } else {
      // 3. Send WebSocket alerts and database notifications
      await sendUrgentBroadcastNotification({
        app,
        donorIds: nearbyDonorIds,
        requestDetails: {
          bloodRequestId,
          bloodType: request.bloodType,
          urgencyLevel: request.urgencyLevel,
          unitsNeeded: request.unitsNeeded,
        },
      });
      logger.info({ bloodRequestId, count: nearbyDonorIds.length, radiusKm }, "Urgent request broadcasted to donors");
    }

    // 4. Set Redis state representing the pending acceptance with a 5-minute TTL (300 seconds)
    const key = `${KEY_PENDING_PREFIX}${bloodRequestId}`;
    await redis.set(key, String(radiusKm), "EX", 300);
  } catch (err) {
    logger.error({ err, bloodRequestId, radiusKm }, "Error in broadcastUrgentRequest");
  }
}
