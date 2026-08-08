import { Schema, model, Document, Types } from "mongoose";
import { geoPointSchema, IGeoPoint, BLOOD_TYPES, BloodType } from "./Donor";

export type CampaignOrganizerType =
  | "blood_bank"
  | "hospital"
  | "ngo"
  | "college"
  | "government"
  | "admin";

export type CampaignStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "UPCOMING"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "REJECTED";

export interface ICampaign extends Document {
  _id: Types.ObjectId;
  campaignId: string; // e.g. BDC-2026-XXXX
  title: string;
  description: string;
  organizerName: string;
  organizerType: CampaignOrganizerType;
  organizerUser: Types.ObjectId; // ref User
  hospitalOrBank?: Types.ObjectId; // ref User (Hospital or BloodBank user)
  venue: string;
  address: string;
  city: string;
  location: IGeoPoint;
  date: Date;
  startTime: string; // "09:00 AM"
  endTime: string;   // "05:00 PM"
  contactPhone: string;
  contactEmail: string;
  bloodGroupsRequired: BloodType[];
  availableCapacity: number;
  currentRegistrationsCount: number;
  eligibilityRequirements: string[];
  requiredDocuments: string[];
  isVerifiedOrganizer: boolean;
  status: CampaignStatus;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    campaignId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true },
    organizerName: { type: String, required: true, trim: true },
    organizerType: {
      type: String,
      enum: ["blood_bank", "hospital", "ngo", "college", "government", "admin"],
      required: true,
    },
    organizerUser: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    hospitalOrBank: { type: Schema.Types.ObjectId, ref: "User" },
    venue: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, index: true },
    location: { type: geoPointSchema, required: true },
    date: { type: Date, required: true, index: true },
    startTime: { type: String, required: true, default: "09:00 AM" },
    endTime: { type: String, required: true, default: "05:00 PM" },
    contactPhone: { type: String, required: true, trim: true },
    contactEmail: { type: String, required: true, trim: true },
    bloodGroupsRequired: [
      {
        type: String,
        enum: BLOOD_TYPES,
      },
    ],
    availableCapacity: { type: Number, required: true, default: 100, min: 1 },
    currentRegistrationsCount: { type: Number, required: true, default: 0, min: 0 },
    eligibilityRequirements: { type: [String], default: ["Age 18-65", "Weight >= 45kg", "90 days since last donation"] },
    requiredDocuments: { type: [String], default: ["Government ID (Aadhaar / Passport / Driving License)"] },
    isVerifiedOrganizer: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "UPCOMING", "ONGOING", "COMPLETED", "CANCELLED", "REJECTED"],
      default: "PENDING_APPROVAL",
      index: true,
    },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

campaignSchema.index({ location: "2dsphere" });

export const Campaign = model<ICampaign>("Campaign", campaignSchema);
