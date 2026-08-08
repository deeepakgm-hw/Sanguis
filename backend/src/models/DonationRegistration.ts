import { Schema, model, Document, Types } from "mongoose";
import { BloodType, BLOOD_TYPES } from "./Donor";

export type RegistrationStatus =
  | "REGISTERED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "ATTENDED"
  | "CANCELLED"
  | "NO_SHOW"
  | "COMPLETED";

export interface IDonationRegistration extends Document {
  _id: Types.ObjectId;
  registrationCode: string; // e.g. SDN-84920412
  user: Types.ObjectId;     // ref User
  donor?: Types.ObjectId;    // ref Donor
  campaign: Types.ObjectId; // ref Campaign
  bloodGroup: BloodType;
  status: RegistrationStatus;
  attendanceTimestamp?: Date;
  qrCodeData: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const donationRegistrationSchema = new Schema<IDonationRegistration>(
  {
    registrationCode: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    donor: { type: Schema.Types.ObjectId, ref: "Donor" },
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    bloodGroup: { type: String, enum: BLOOD_TYPES, required: true },
    status: {
      type: String,
      enum: ["REGISTERED", "CONFIRMED", "CHECKED_IN", "ATTENDED", "CANCELLED", "NO_SHOW", "COMPLETED"],
      default: "CONFIRMED",
      index: true,
    },
    attendanceTimestamp: { type: Date },
    qrCodeData: { type: String, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

// Ensure user cannot register twice for the same active campaign
donationRegistrationSchema.index({ user: 1, campaign: 1 }, { unique: true });

export const DonationRegistration = model<IDonationRegistration>(
  "DonationRegistration",
  donationRegistrationSchema
);
