import { Schema, model, Document, Types } from "mongoose";
import { geoPointSchema, IGeoPoint } from "./Donor";

export interface IHospital extends Document {
  _id: Types.ObjectId;
  googlePlaceId?: string;
  name: string;
  formattedAddress: string;
  location: IGeoPoint;
  phoneNumber?: string;
  openingHours?: string[];
  dataSource: "google_places" | "manual";
  hospitalId?: Types.ObjectId | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hospitalSchema = new Schema<IHospital>(
  {
    googlePlaceId: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    formattedAddress: { type: String, required: true, trim: true },
    location: { type: geoPointSchema, required: true },
    phoneNumber: { type: String, trim: true },
    openingHours: { type: [String], default: [] },
    dataSource: {
      type: String,
      enum: ["google_places", "manual"],
      default: "google_places",
      required: true,
    },
    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// 2dsphere index for location-based spatial queries
hospitalSchema.index({ location: "2dsphere" });

export const Hospital = model<IHospital>("Hospital", hospitalSchema);
