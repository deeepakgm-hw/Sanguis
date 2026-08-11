import { Application } from "express";
import { redis } from "../config/redis";
import { BloodRequest } from "../models/BloodRequest";
import { broadcastUrgentRequest } from "../services/geoBroadcast.service";
import { logger } from "../utils/logger";

const KEY_PENDING_PREFIX = "pending:bloodrequest:";
const KEY_ESCALATED_PREFIX = "pending:bloodrequest:escalated:";
const ESCALATION_RADIUS_KM = 25;

/**
 * Sweep job that runs periodically to check for pending urgent broadcasts
 * that have not been accepted within 5 minutes, and escalates them to a wider radius.
 *
 * @param app Express Application instance (passed to socket/notification actions).
 */
export async function runRebroadcastSweep(app: Application): Promise<void> {
  try {
    // 1. Fetch all critical, open blood requests from database
    const openCriticalRequests = await BloodRequest.find({
      urgencyLevel: "critical",
      status: "open",
    });

    for (const request of openCriticalRequests) {
      const requestId = request._id.toString();
      const pendingKey = `${KEY_PENDING_PREFIX}${requestId}`;
      const escalatedKey = `${KEY_ESCALATED_PREFIX}${requestId}`;

      // 2. Check if the initial 5-minute pending window has expired
      const isPending = await redis.exists(pendingKey);
      if (!isPending) {
        // 3. Check if we have already escalated this request
        const isAlreadyEscated = await redis.exists(escalatedKey);
        if (!isAlreadyEscated) {
          logger.info({ requestId }, "Escalating urgent broadcast to wider radius due to lack of acceptance");

          // 4. Trigger re-broadcast at wider radius (25 km)
          const [lng, lat] = request.geoLocation.coordinates;
          await broadcastUrgentRequest(app, requestId, lat, lng, ESCALATION_RADIUS_KM);

          // 5. Mark as escalated in Redis (expires in 24 hours to keep Redis clean)
          await redis.set(escalatedKey, "1", "EX", 24 * 60 * 60);
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Error running rebroadcast sweep job");
  }
}
