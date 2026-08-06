import { randomInt, randomBytes, createHash } from "crypto";
import { redis } from "../config/redis";

const OTP_TTL_SECONDS = 10 * 60;
const RESET_TOKEN_TTL_SECONDS = 15 * 60;
const MAX_VERIFY_ATTEMPTS = 5;

function otpKey(email: string) {
  return `otp:${email}`;
}
function otpAttemptsKey(email: string) {
  return `otp:attempts:${email}`;
}

/** Generates a 6-digit OTP, stores its hash (never the raw value) in Redis with a TTL. */
export async function generateOtp(email: string): Promise<string> {
  const otp = randomInt(100000, 999999).toString();
  const hash = createHash("sha256").update(otp).digest("hex");
  await redis.set(otpKey(email), hash, "EX", OTP_TTL_SECONDS);
  await redis.del(otpAttemptsKey(email));
  return otp; // caller emails this; only the hash is persisted
}

/**
 * Verifies an OTP with a bounded number of guesses (defeats brute
 * forcing a 6-digit code, which is only ~1M possibilities).
 */
export async function verifyOtp(email: string, candidate: string): Promise<boolean> {
  const attempts = await redis.incr(otpAttemptsKey(email));
  if (attempts === 1) await redis.expire(otpAttemptsKey(email), OTP_TTL_SECONDS);
  if (attempts > MAX_VERIFY_ATTEMPTS) return false;

  const storedHash = await redis.get(otpKey(email));
  if (!storedHash) return false;

  const candidateHash = createHash("sha256").update(candidate).digest("hex");
  const isValid = candidateHash === storedHash;
  if (isValid) await redis.del(otpKey(email), otpAttemptsKey(email));
  return isValid;
}

/** Password-reset tokens: opaque random string, hashed at rest, single-use via TTL delete. */
export async function generateResetToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(token).digest("hex");
  await redis.set(`reset:${hash}`, email, "EX", RESET_TOKEN_TTL_SECONDS);
  return token;
}

export async function consumeResetToken(token: string): Promise<string | null> {
  const hash = createHash("sha256").update(token).digest("hex");
  const email = await redis.get(`reset:${hash}`);
  if (email) await redis.del(`reset:${hash}`);
  return email;
}
