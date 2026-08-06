import mongoose, { Schema, Document } from "mongoose";

export interface IBlockedIP extends Document {
  ip: string;
  reason: string;
  expiresAt: Date;
  createdAt: Date;
}

const BlockedIPSchema: Schema = new Schema(
  {
    ip: { type: String, required: true, unique: true, index: true },
    reason: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // MongoDB TTL index to auto-delete expired blocks
  },
  {
    timestamps: true,
  }
);

export const BlockedIP = mongoose.model<IBlockedIP>("BlockedIP", BlockedIPSchema);
