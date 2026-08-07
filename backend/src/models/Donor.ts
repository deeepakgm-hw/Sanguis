import { Schema, model, Document, Types } from "mongoose";

// ---------------------------------------------------------------------------
// Blood type enum — shared across Donor and BloodRequest.
// ---------------------------------------------------------------------------
export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodType = (typeof BLOOD_TYPES)[number];

// ---------------------------------------------------------------------------
// GeoJSON Point sub-document interface.
// MongoDB's $near / $geoWithin operators require GeoJSON geometry on a
// 2dsphere index.  A plain { lat, lng } object does NOT work with those
// operators.  Coordinates are stored as [longitude, latitude] per GeoJSON
// spec (note: opposite of common intuition).
// ---------------------------------------------------------------------------
export interface IGeoPoint {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
}

export const geoPointSchema = new Schema<IGeoPoint>(
  {
    type: { type: String, enum: ["Point"], required: true, default: "Point" },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Donor profile — separate collection, linked to User by ObjectId.
// Role restriction (only users whose User.role === "donor" should have a
// Donor document) is enforced by the service/controller layer, not here.
// ---------------------------------------------------------------------------
export interface IDonor extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;            // → User collection
  bloodType: BloodType;
  lastDonationDate: Date | null;
  medicalFlags: unknown;             // Schema.Types.Mixed — see comment below
  location: IGeoPoint;
  trustScore: number;
  createdAt: Date;
  updatedAt: Date;

  // Virtual — not persisted; computed on the fly.
  isEligible: boolean;
}

const donorSchema = new Schema<IDonor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,  // one donor profile per user account
      index: true,
    },

    bloodType: {
      type: String,
      enum: BLOOD_TYPES,
      required: true,
      index: true,
    },

    lastDonationDate: { type: Date, default: null },

    // Encrypted at rest via Teammate C's pre-save hook —
    // do not add encryption logic here.
    medicalFlags: { type: Schema.Types.Mixed, default: null },

    // GeoJSON Point — required for $near / $geoWithin queries.
    // Callers must provide { type: "Point", coordinates: [lng, lat] }.
    location: { type: geoPointSchema, required: true },

    // Populated by Teammate B's AI service via PATCH /api/v1/ai/trust-score —
    // do not compute here.
    trustScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// 2dsphere index on location — enables $near, $geoWithin, and $geoIntersects.
// Must be a 2dsphere index (not 2d) because we use GeoJSON geometry.
// ---------------------------------------------------------------------------
donorSchema.index({ location: "2dsphere" });

// ---------------------------------------------------------------------------
// Virtual: isEligible
// A donor is considered eligible if they have never donated OR their last
// donation was more than 90 days ago.
//
// TODO (Teammate B): extend this logic to also factor in medicalFlags once
// the trust-score service exposes a structured eligibility flag.  The 90-day
// rule is the AABB minimum interval; stricter rules per blood type (e.g. 112
// days for whole-blood double red-cell donations) can be added here.
// ---------------------------------------------------------------------------
donorSchema.virtual("isEligible").get(function (this: IDonor): boolean {
  if (!this.lastDonationDate) return true;
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  return Date.now() - this.lastDonationDate.getTime() >= NINETY_DAYS_MS;
});

// Make virtuals appear in .toJSON() / .toObject() calls.
donorSchema.set("toJSON", { virtuals: true });
donorSchema.set("toObject", { virtuals: true });

export const Donor = model<IDonor>("Donor", donorSchema);
