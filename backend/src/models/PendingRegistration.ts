import { Schema, model, Document, Types } from "mongoose";

export interface IPendingRegistration extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName?: string;
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: "donor" | "hospital" | "user";
  otpCode: string;
  otpHash: string;
  otpExpiry: Date;
  verificationAttempts: number;
  resendCount: number;
  lastResendAt?: Date;
  status: "PENDING" | "VERIFIED" | "EXPIRED";
  createdAt: Date;
  updatedAt: Date;
}

const pendingRegistrationSchema = new Schema<IPendingRegistration>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["donor", "hospital", "user"], default: "donor" },
    otpCode: { type: String, required: true },
    otpHash: { type: String, required: true },
    otpExpiry: {
      type: Date,
      required: true,
      index: { expires: 900 }, // Mongoose TTL index auto-deletes document 15 mins after expiry
    },
    verificationAttempts: { type: Number, default: 0 },
    resendCount: { type: Number, default: 0 },
    lastResendAt: { type: Date },
    status: { type: String, enum: ["PENDING", "VERIFIED", "EXPIRED"], default: "PENDING" },
  },
  { timestamps: true }
);

export const PendingRegistration = model<IPendingRegistration>(
  "PendingRegistration",
  pendingRegistrationSchema
);
