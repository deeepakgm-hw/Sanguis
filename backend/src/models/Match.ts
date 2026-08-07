import { Schema, model, Document, Types } from "mongoose";

// ---------------------------------------------------------------------------
// Match — links a BloodRequest to a Donor candidate.
// Created by the matching service; status transitions driven by donor
// acceptance / expiry workers.
// ---------------------------------------------------------------------------
export type MatchStatus = "pending" | "accepted" | "declined" | "expired";

export interface IMatch extends Document {
  _id: Types.ObjectId;
  request: Types.ObjectId;           // → BloodRequest
  donor: Types.ObjectId;             // → Donor
  status: MatchStatus;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const matchSchema = new Schema<IMatch>(
  {
    request: {
      type: Schema.Types.ObjectId,
      ref: "BloodRequest",
      required: true,
    },

    donor: {
      type: Schema.Types.ObjectId,
      ref: "Donor",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired"] satisfies MatchStatus[],
      default: "pending",
      index: true,
    },

    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// Compound unique index: prevents creating duplicate (request, donor) pairs.
// A donor should only ever receive one match notification per request.
// ---------------------------------------------------------------------------
matchSchema.index({ request: 1, donor: 1 }, { unique: true });

export const Match = model<IMatch>("Match", matchSchema);
