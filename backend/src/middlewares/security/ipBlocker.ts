import { Request, Response, NextFunction } from "express";
import { BlockedIP } from "../../models/BlockedIP";
import { logger } from "../../utils/logger";
import { ApiError } from "../../utils/ApiError";

/**
 * Global IP Blocker middleware.
 * Intercepts incoming requests and verifies if client IP is blacklisted.
 */
export async function ipBlocker(req: Request, res: Response, next: NextFunction) {
  const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
  // Handle comma-separated list from reverse proxy
  const ip = typeof rawIp === "string" ? rawIp.split(",")[0].trim() : String(rawIp);

  try {
    const isBlocked = await BlockedIP.findOne({ ip });
    
    if (isBlocked) {
      logger.warn({ ip, reason: isBlocked.reason }, "Blocked IP attempted access");
      return next(ApiError.forbidden("Access denied: Your IP address is blacklisted due to security policy violations."));
    }
    
    next();
  } catch (err) {
    // Fallback: log error but do not block legitimate requests if MongoDB has issues
    logger.error({ err, ip }, "Error verifying IP blacklist status");
    next();
  }
}

/**
 * Utility function to programmatically block a threat IP address.
 */
export async function blockIP(ip: string, reason: string, durationSeconds: number): Promise<void> {
  const expiresAt = new Date(Date.now() + durationSeconds * 1000);
  try {
    await BlockedIP.findOneAndUpdate(
      { ip },
      { reason, expiresAt },
      { upsert: true, new: true }
    );
    logger.warn({ ip, reason, durationSeconds }, "IP blacklisted successfully");
  } catch (err) {
    logger.error({ err, ip }, "Failed to blacklist IP");
  }
}
