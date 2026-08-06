import { Request, Response, NextFunction } from "express";
import { randomBytes, timingSafeEqual } from "crypto";
import { ApiError } from "../../utils/ApiError";

/**
 * OWASP A01/CSRF - Double-Submit Cookie pattern.
 * Why this over csurf (deprecated/unmaintained): we issue a random
 * token as a readable cookie; the SPA reads it and echoes it back in
 * the X-CSRF-Token header on state-changing requests. An attacker's
 * cross-site form can force a cookie to be SENT, but JS on another
 * origin cannot READ our cookie (browser same-origin policy), so it
 * can never produce a matching header value.
 *
 * Only needed if you authenticate via cookies. If you send the JWT
 * via Authorization header (recommended below), CSRF risk is already
 * near-zero since cross-site requests can't set custom headers either
 * — but we ship this for endpoints/situations that use cookie auth.
 */
const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

export function issueCsrfToken(req: Request, res: Response, next: NextFunction): void {
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // must be readable by frontend JS to echo back
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
  }
  next();
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function verifyCsrfToken(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER];

  if (
    typeof cookieToken !== "string" ||
    typeof headerToken !== "string" ||
    cookieToken.length !== headerToken.length ||
    !timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  ) {
    return next(ApiError.forbidden("Invalid or missing CSRF token"));
  }
  next();
}
