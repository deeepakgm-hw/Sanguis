import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { redis } from "../config/redis";
import { UserRole } from "../models/User";

export interface AccessTokenPayload {
  sub: string; // user id
  role: UserRole;
  tokenId: string; // unique id per token, used for blacklisting
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * Verifies the access token from the Authorization header.
 * Why header over cookie for the ACCESS token: avoids CSRF entirely
 * for the main auth flow (JS-only readable, not auto-sent by browser).
 * The REFRESH token, by contrast, IS stored in an httpOnly cookie
 * (see auth.controller) so it can never be read by JS/XSS.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw ApiError.unauthorized("Missing or malformed Authorization header");
    }
    const token = header.slice(7);

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    // JWT Blacklisting: allows immediate revocation (logout, password
    // change, admin ban) even though the token itself hasn't expired yet.
    const isBlacklisted = await redis.get(`bl:${payload.tokenId}`);
    if (isBlacklisted) throw ApiError.unauthorized("Token has been revoked");

    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return next(ApiError.unauthorized("Access token expired"));
    if (err instanceof jwt.JsonWebTokenError) return next(ApiError.unauthorized("Invalid token"));
    next(err);
  }
}

/** Attaches req.user if a valid token is present, but never rejects. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    req.user = payload;
  } catch {
    /* ignore invalid token in optional auth */
  }
  next();
}
