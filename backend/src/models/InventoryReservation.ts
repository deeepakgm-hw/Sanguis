import { Schema, model, Document, Types } from "mongoose";
import { BloodType } from "./Donor";

export interface IInventoryReservation extends Document {
  _id: Types.ObjectId;
  request: Types.ObjectId;
  bloodBank: Types.ObjectId;
  bloodType: BloodType;
  unitsReserved: number;
  status: "ACTIVE" | "RELEASED" | "FULFILLED" | "EXPIRED";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inventoryReservationSchema = new Schema<IInventoryReservation>(
  {
    request: { type: Schema.Types.ObjectId, ref: "BloodRequest", required: true, index: true },
    bloodBank: { type: Schema.Types.ObjectId, ref: "BloodBank", required: true, index: true },
    bloodType: { type: String, required: true, index: true },
    unitsReserved: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["ACTIVE", "RELEASED", "FULFILLED", "EXPIRED"],
      default: "ACTIVE",
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

export const InventoryReservation = model<IInventoryReservation>(
  "InventoryReservation",
  inventoryReservationSchema
);
