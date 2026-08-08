import { Schema, model, Document, Types } from "mongoose";

export type VerifiedDonationStatus = "VERIFIED" | "REVOKED";

export interface IVerifiedDonation extends Document {
  _id: Types.ObjectId;
  donationId: string;       // e.g. DON-948201
  user: Types.ObjectId;     // ref User
  donor?: Types.ObjectId;    // ref Donor
  campaign: Types.ObjectId; // ref Campaign
  registration: Types.ObjectId; // ref DonationRegistration
  verifierUser: Types.ObjectId; // ref User (Verifier)
  verifierRole: string;
  verifierOrganization: string;
  donationDate: Date;
  verificationTimestamp: Date;
  unitsDonated: number;
  status: VerifiedDonationStatus;
  certificateId?: string;   // e.g. SANGUIS-BDC-XXXXXX
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const verifiedDonationSchema = new Schema<IVerifiedDonation>(
  {
    donationId: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    donor: { type: Schema.Types.ObjectId, ref: "Donor" },
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true, index: true },
    registration: { type: Schema.Types.ObjectId, ref: "DonationRegistration", required: true, unique: true },
    verifierUser: { type: Schema.Types.ObjectId, ref: "User", required: true },
    verifierRole: { type: String, required: true, default: "Authorized Staff" },
    verifierOrganization: { type: String, required: true },
    donationDate: { type: Date, required: true, default: Date.now },
    verificationTimestamp: { type: Date, required: true, default: Date.now },
    unitsDonated: { type: Number, required: true, default: 1, min: 1 },
    status: {
      type: String,
      enum: ["VERIFIED", "REVOKED"],
      default: "VERIFIED",
      index: true,
    },
    certificateId: { type: String, index: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export const VerifiedDonation = model<IVerifiedDonation>("VerifiedDonation", verifiedDonationSchema);
