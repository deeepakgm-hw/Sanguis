import { Request } from "express";
import { SecurityEvent, SecurityEventType } from "../models/AuditLog";
import { logger } from "../utils/logger";
import mongoose from "mongoose";

interface SecurityEventOptions {
  eventType: SecurityEventType | string;
  severity: "low" | "medium" | "high" | "critical";
  req?: Request;
  userId?: string | mongoose.Types.ObjectId;
  details?: Record<string, any>;
}

/**
 * Service to log cybersecurity threats, failed audits, and access anomalies.
 * Writes asynchronously to the database and standard pino console logs.
 */
export async function logSecurityEvent({
  eventType,
  severity,
  req,
  userId,
  details = {},
}: SecurityEventOptions): Promise<void> {
  try {
    let ip = "internal";
    let userAgent = undefined;
    let email = undefined;

    if (req) {
      const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
      ip = typeof rawIp === "string" ? rawIp.split(",")[0].trim() : String(rawIp);
      userAgent = req.headers["user-agent"];
      if (req.user) {
        email = req.user.email;
      }
    }

    const event = new SecurityEvent({
      type: eventType as any,
      severity,
      ip,
      user: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      email,
      userAgent,
      metadata: {
        severity,
        ...details,
      },
    });

    await event.save();
    
    const logMsg = `[SECURITY EVENT] [${severity.toUpperCase()}] ${eventType} from IP ${ip}`;
    if (severity === "critical" || severity === "high") {
      logger.error({ eventType, ip, details }, logMsg);
    } else {
      logger.warn({ eventType, ip, details }, logMsg);
    }
  } catch (err) {
    logger.error({ err }, "Failed to write security event log to database");
  }
}
