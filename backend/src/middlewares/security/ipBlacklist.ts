import { Request, Response, NextFunction } from "express";
import { isIpBlacklisted } from "../../services/abuseTracking.service";
import { ApiError } from "../../utils/ApiError";
import { logger } from "../../utils/logger";

/**
 * Global IP Blacklist middleware.
 * Intercepts incoming requests early and blocks them if their source IP is blacklisted in Redis.
 */
export async function ipBlacklist(req: Request, res: Response, next: NextFunction): Promise<void> {
  const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
  const ip = typeof rawIp === "string" ? rawIp.split(",")[0].trim() : String(rawIp);

  try {
    const isBlocked = await isIpBlacklisted(ip);

    if (isBlocked) {
      logger.warn({ ip }, "Blacklisted IP attempted access");
      return next(ApiError.forbidden("Access denied: Your IP address is blacklisted due to abuse detection."));
    }

    next();
  } catch (err) {
    logger.error({ err, ip }, "Error verifying IP blacklist status");
    next();
  }
}
