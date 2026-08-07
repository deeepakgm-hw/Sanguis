import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redis } from "../../config/redis";
import { ApiError } from "../../utils/ApiError";
import { env } from "../../config/env";

/**
 * OWASP A04/A07 - Rate limiting mitigates brute force, credential
 * stuffing, and API abuse. Backed by Redis (not in-memory) because
 * in-memory limits reset per-process and don't work once you scale
 * to multiple instances behind Nginx/a load balancer.
 */
function buildLimiter(windowMs: number, max: number, prefix: string) {
  const store = env.NODE_ENV === "production"
    ? new RedisStore({
        sendCommand: (...args: string[]) => redis.call(...args) as Promise<any>,
        prefix: `rl:${prefix}:`,
      })
    : undefined; // Defaults to MemoryStore in development

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    handler: (_req, _res, next) => {
      next(ApiError.tooManyRequests("Too many requests, please try again later."));
    },
  });
}

// General API traffic
export const globalLimiter = buildLimiter(
  15 * 60 * 1000,
  env.NODE_ENV === "production" ? 300 : 10000,
  "global"
);

// Tight limit on login/register/forgot-password to slow brute force + credential stuffing
export const authLimiter = buildLimiter(
  15 * 60 * 1000,
  env.NODE_ENV === "production" ? 10 : 1000,
  "auth"
);

// Very tight limit on OTP endpoints (SMS/email cost money + abuse risk)
export const otpLimiter = buildLimiter(
  10 * 60 * 1000,
  env.NODE_ENV === "production" ? 5 : 500,
  "otp"
);

// Rate limit for Google Places API endpoints (protects Google API quota)
export const googlePlacesLimiter = buildLimiter(
  15 * 60 * 1000,
  env.NODE_ENV === "production" ? 30 : 200,
  "google_places"
);

