import jwt from "jsonwebtoken";
import { randomUUID, createHash } from "crypto";
import { env } from "../config/env";
import { redis } from "../config/redis";
import { RefreshToken } from "../models/RefreshToken";
import { IUser } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { SecurityEvent } from "../models/AuditLog";
import ms from "./ms.util";

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function signAccessToken(user: IUser): { token: string; tokenId: string } {
  const tokenId = randomUUID();
  const token = jwt.sign({ sub: user._id.toString(), role: user.role, tokenId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as any,
  });
  return { token, tokenId };
}

/** Issues a new refresh token, optionally as part of an existing rotation family. */
export async function issueRefreshToken(
  userId: string,
  meta: { userAgent?: string; ip?: string },
  family = randomUUID()
): Promise<string> {
  const raw = randomUUID() + randomUUID();
  await RefreshToken.create({
    user: userId,
    tokenHash: hashToken(raw),
    family,
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  });
  // Encode family in the token so rotate() can find it without a DB lookup by hash alone.
  return `${family}.${raw}`;
}

/**
 * Rotates a refresh token: validates it, marks it used, issues a new one.
 * If a token is reused (already marked used), the WHOLE family is
 * revoked — this is the theft-detection mechanism.
 */
export async function rotateRefreshToken(
  rawCombined: string,
  meta: { userAgent?: string; ip?: string }
): Promise<{ userId: string; newToken: string }> {
  const [family, raw] = rawCombined.split(".");
  if (!family || !raw) throw ApiError.unauthorized("Malformed refresh token");

  const tokenHash = hashToken(raw);
  const record = await RefreshToken.findOne({ tokenHash, family });

  if (!record || record.isRevoked) throw ApiError.unauthorized("Invalid refresh token");

  if (record.isUsed) {
    // Reuse detected -> possible theft. Revoke the entire family.
    await RefreshToken.updateMany({ family }, { isRevoked: true });
    await SecurityEvent.create({
      type: "TOKEN_REUSE_DETECTED",
      user: record.user,
      ip: meta.ip ?? "unknown",
      userAgent: meta.userAgent,
    });
    throw ApiError.unauthorized("Token reuse detected. All sessions revoked. Please log in again.");
  }

  if (record.expiresAt < new Date()) throw ApiError.unauthorized("Refresh token expired");

  record.isUsed = true;
  await record.save();

  const newToken = await issueRefreshToken(record.user.toString(), meta, family as any);
  return { userId: record.user.toString(), newToken };
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await RefreshToken.updateMany({ user: userId }, { isRevoked: true });
}

/** Blacklists an access token by its jti until its natural expiry — used on logout. */
export async function blacklistAccessToken(tokenId: string): Promise<void> {
  const ttl = ms(env.JWT_ACCESS_EXPIRES) / 1000;
  await redis.set(`bl:${tokenId}`, "1", "EX", Math.max(ttl, 1));
}
