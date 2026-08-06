import { Request } from "express";
import { AuditLog } from "../models/AuditLog";
import { logger } from "../utils/logger";

interface AuditParams {
  req: Request;
  action: string;
  resourceType: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Fire-and-forget audit trail. Never throws or blocks the request —
 * a failed audit write should never fail the user-facing operation,
 * but we DO log it loudly so ops notices if the audit pipeline breaks.
 */
export async function recordAudit(params: AuditParams): Promise<void> {
  const { req, action, resourceType, resourceId, before, after } = params;
  try {
    await AuditLog.create({
      actor: req.user?.sub ?? null,
      action,
      resourceType,
      resourceId,
      before,
      after,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (err) {
    logger.error({ err, action, resourceType }, "Failed to write audit log");
  }
}
