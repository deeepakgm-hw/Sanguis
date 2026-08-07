import { Request, Response, NextFunction } from "express";

/**
 * TEMP passthrough — replace with Teammate C's OAuth-verified-hospital check.
 * Do not block the demo on this.
 *
 * When Teammate C's implementation lands, this middleware should:
 *   1. Confirm req.user.role === "hospital" (or equivalent verified-requester role).
 *   2. Confirm the hospital's OAuth credentials have been verified against
 *      the hospital registry (Teammate C's external service call).
 *   3. Call next() on success, next(ApiError.forbidden(...)) on failure.
 */
export function requireVerifiedRequester(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  next();
}
