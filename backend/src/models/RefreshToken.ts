import { Schema, model, Document, Types } from "mongoose";

/**
 * Refresh Token Rotation: every time a refresh token is used, it is
 * marked "used" and a NEW one is issued. If a token marked "used" is
 * ever presented again, that's a signal of theft/replay — the entire
 * token family is revoked, forcing re-login. This bounds the damage
 * window of a stolen refresh token to a single use.
 */
export interface IRefreshToken extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string; // never store raw tokens, only their hash
  family: string; // groups tokens issued from the same login session
  isUsed: boolean;
  isRevoked: boolean;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    isUsed: { type: Boolean, default: false },
    isRevoked: { type: Boolean, default: false },
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index: MongoDB auto-deletes expired tokens, no cron job needed.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = model<IRefreshToken>("RefreshToken", refreshTokenSchema);
