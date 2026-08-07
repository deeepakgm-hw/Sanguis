import { Schema, model, Document, Types } from "mongoose";
import { BLOOD_TYPES, BloodType, IGeoPoint, geoPointSchema } from "./Donor";

// ---------------------------------------------------------------------------
// BloodRequest — raised by a hospital user when they need a specific blood
// type.  The `hospital` field references the User document whose role must be
// "hospital"; that constraint is enforced at the controller/service layer.
// ---------------------------------------------------------------------------
export type UrgencyLevel = "low" | "medium" | "high" | "critical";
export type RequestStatus = "open" | "matched" | "fulfilled" | "cancelled" | "expired";

export interface IBloodRequest extends Document {
  _id: Types.ObjectId;
  bloodType: BloodType;
  unitsNeeded: number;
  urgencyLevel: UrgencyLevel;
  hospital: Types.ObjectId;          // → User (role: hospital)
  status: RequestStatus;
  geoLocation: IGeoPoint;
  createdAt: Date;
  updatedAt: Date;
}

const bloodRequestSchema = new Schema<IBloodRequest>(
  {
    bloodType: {
      type: String,
      enum: BLOOD_TYPES,
      required: true,
      index: true,
    },

    unitsNeeded: {
      type: Number,
      required: true,
      min: 1,
    },

    // Default fallback if AI scoring times out or is unavailable —
    // see matching.service.ts fallback logic.
    urgencyLevel: {
      type: String,
      enum: ["low", "medium", "high", "critical"] satisfies UrgencyLevel[],
      default: "medium",
      index: true,
    },

    // References a User whose role is "hospital".  Role enforcement is the
    // responsibility of the requireRole("hospital") middleware on the route —
    // not the schema.
    hospital: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: ["open", "matched", "fulfilled", "cancelled", "expired"] satisfies RequestStatus[],
      default: "open",
      index: true,
    },

    // GeoJSON Point — required for $near / $geoWithin queries.
    // Callers must provide { type: "Point", coordinates: [lng, lat] }.
    geoLocation: { type: geoPointSchema, required: true },
  },
  { timestamps: true }
);

// 2dsphere index on geoLocation — enables geo proximity matching.
bloodRequestSchema.index({ geoLocation: "2dsphere" });

export const BloodRequest = model<IBloodRequest>("BloodRequest", bloodRequestSchema);
