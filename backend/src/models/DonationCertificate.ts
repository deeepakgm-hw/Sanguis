import { Schema, model, Document, Types } from "mongoose";

export type CertificateStatus = "VALID" | "REVOKED";

export interface IDonationCertificate extends Document {
  _id: Types.ObjectId;
  certificateId: string;       // e.g. SANGUIS-BDC-84920194
  verificationToken: string;   // Unique UUID for QR verification
  user: Types.ObjectId;        // ref User
  donorName: string;
  verifiedDonation: Types.ObjectId; // ref VerifiedDonation
  campaign: Types.ObjectId;    // ref Campaign
  campaignTitle: string;
  authorizedOrganization: string;
  venue: string;
  donationDate: Date;
  issueDate: Date;
  status: CertificateStatus;
  revocationDetails?: {
    revokedBy: Types.ObjectId; // ref User
    revokedAt: Date;
    reason: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const donationCertificateSchema = new Schema<IDonationCertificate>(
  {
    certificateId: { type: String, required: true, unique: true, index: true },
    verificationToken: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    donorName: { type: String, required: true },
    verifiedDonation: { type: Schema.Types.ObjectId, ref: "VerifiedDonation", required: true, unique: true },
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    campaignTitle: { type: String, required: true },
    authorizedOrganization: { type: String, required: true },
    venue: { type: String, required: true },
    donationDate: { type: Date, required: true },
    issueDate: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ["VALID", "REVOKED"],
      default: "VALID",
      index: true,
    },
    revocationDetails: {
      revokedBy: { type: Schema.Types.ObjectId, ref: "User" },
      revokedAt: { type: Date },
      reason: { type: String },
    },
  },
  { timestamps: true }
);

export const DonationCertificate = model<IDonationCertificate>(
  "DonationCertificate",
  donationCertificateSchema
);
