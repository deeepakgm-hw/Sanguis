import { Schema, model, Document, Types } from "mongoose";
import { geoPointSchema, IGeoPoint, BLOOD_TYPES, BloodType } from "./Donor";

export interface IInventoryItem {
  bloodType: BloodType;
  unitsAvailable: number;
  lastRestocked: Date;
}

export interface IBloodBank extends Document {
  _id: Types.ObjectId;
  name: string;
  address: string;
  location: IGeoPoint;
  contactPhone: string;
  isVerified: boolean;
  inventory: IInventoryItem[];
  owner: Types.ObjectId; // -> User
  createdAt: Date;
  updatedAt: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    bloodType: { type: String, enum: BLOOD_TYPES, required: true },
    unitsAvailable: { type: Number, required: true, default: 0, min: 0 },
    lastRestocked: { type: Date, required: true, default: Date.now },
  },
  { _id: false }
);

const bloodBankSchema = new Schema<IBloodBank>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    address: { type: String, required: true, trim: true },
    location: { type: geoPointSchema, required: true },
    contactPhone: { type: String, required: true, trim: true },
    isVerified: { type: Boolean, required: true, default: false },
    inventory: {
      type: [inventoryItemSchema],
      default: () =>
        BLOOD_TYPES.map((bt) => ({
          bloodType: bt,
          unitsAvailable: 0,
          lastRestocked: new Date(),
        })),
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

// 2dsphere index for location-based radial queries
bloodBankSchema.index({ location: "2dsphere" });

export const BloodBank = model<IBloodBank>("BloodBank", bloodBankSchema);
