import { redis } from "../../config/redis";
import { ApiError } from "../../utils/ApiError";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_SECONDS = 15 * 60; // 15 minutes

/**
 * OWASP A07 - Identification and Authentication Failures.
 * Tracks failed login attempts PER ACCOUNT (by email) in Redis.
 * After MAX_ATTEMPTS failures, the account is locked for a cool-down
 * window regardless of source IP (defeats distributed brute force).
 */
export async function assertAccountNotLocked(email: string): Promise<void> {
  const lockKey = `lock:${email}`;
  const locked = await redis.get(lockKey);
  if (locked) {
    throw new ApiError(423, "Account temporarily locked due to repeated failed logins. Try again later.");
  }
}

export async function recordFailedAttempt(email: string): Promise<void> {
  const attemptsKey = `attempts:${email}`;
  const attempts = await redis.incr(attemptsKey);
  if (attempts === 1) {
    await redis.expire(attemptsKey, LOCK_DURATION_SECONDS);
  }
  if (attempts >= MAX_ATTEMPTS) {
    await redis.set(`lock:${email}`, "1", "EX", LOCK_DURATION_SECONDS);
  }
}

export async function clearFailedAttempts(email: string): Promise<void> {
  await redis.del(`attempts:${email}`, `lock:${email}`);
}
