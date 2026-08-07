import { redis } from "../config/redis";
import { SecurityEvent, SecurityEventType } from "../models/AuditLog";
import { logger } from "../utils/logger";

const FLAG_WINDOW_SECONDS = 10 * 60; // 10 minutes
const BLACKLIST_DURATION_SECONDS = 1 * 60 * 60; // 1 hour
const THRESHOLD = 3;

/**
 * Increments the fake request flag counter for a specific IP.
 * If the counter reaches or exceeds the threshold (3), the IP is blacklisted in Redis
 * for 1 hour and a SecurityEvent is logged.
 *
 * @param ip The client IP address to flag.
 */
export async function recordFakeFlag(ip: string): Promise<void> {
  const flagsKey = `abuse:flagcount:${ip}`;
  const blacklistKey = `abuse:blacklist:${ip}`;

  try {
    const count = await redis.incr(flagsKey);

    // Set TTL on the first increment
    if (count === 1) {
      await redis.expire(flagsKey, FLAG_WINDOW_SECONDS);
    }

    if (count >= THRESHOLD) {
      // Blacklist IP for 1 hour
      await redis.set(blacklistKey, "1", "EX", BLACKLIST_DURATION_SECONDS);

      // Log SecurityEvent (using cast since IP_BLACKLISTED is not in default SecurityEventType)
      await SecurityEvent.create({
        type: "IP_BLACKLISTED" as unknown as SecurityEventType,
        ip,
        metadata: {
          flagCount: count,
          windowMinutes: Math.round(FLAG_WINDOW_SECONDS / 60),
        },
      });

      logger.warn({ ip, count }, "IP blacklisted due to multiple fake request flags");
    }
  } catch (err) {
    logger.error({ err, ip }, "Failed to record fake request flag");
  }
}

/**
 * Checks if an IP address is currently blacklisted in Redis.
 *
 * @param ip The client IP address to check.
 * @returns True if the IP is blacklisted, false otherwise.
 */
export async function isIpBlacklisted(ip: string): Promise<boolean> {
  try {
    const blacklisted = await redis.get(`abuse:blacklist:${ip}`);
    return !!blacklisted;
  } catch (err) {
    logger.error({ err, ip }, "Failed to check IP blacklist status");
    return false;
  }
}
