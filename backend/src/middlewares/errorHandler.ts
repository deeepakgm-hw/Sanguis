import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { logger } from "../utils/logger";
import { env } from "../config/env";

/**
 * Single place all errors funnel through (via next(err) or thrown
 * inside asyncHandler-wrapped routes). Operational errors (ApiError)
 * return their real message/status; anything else is logged in full
 * server-side but returned to the client as a generic 500 — we NEVER
 * leak stack traces, DB errors, or internals to the client (OWASP A05).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    if (err.statusCode >= 500) logger.error({ err, path: req.path }, err.message);
    else logger.warn({ path: req.path, statusCode: err.statusCode }, err.message);

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: err.errors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Mongoose duplicate key error
  if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
    res.status(409).json({ success: false, message: "Duplicate resource", timestamp: new Date().toISOString() });
    return;
  }

  logger.error({ err, path: req.path }, "Unhandled error");
  res.status(500).json({
    success: false,
    message: env.NODE_ENV === "production" ? "Internal Server Error" : String(err),
    timestamp: new Date().toISOString(),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
}
