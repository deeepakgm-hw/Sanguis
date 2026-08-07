import { Schema, model, Document, Types } from "mongoose";
import { BLOOD_TYPES, BloodType } from "./Donor";

export const TRANSACTION_REASONS = [
  "donation_intake",
  "dispatch_fulfilled",
  "expired_removed",
  "manual_adjustment",
] as const;

export type TransactionReason = (typeof TRANSACTION_REASONS)[number];

export interface IInventoryTransaction extends Document {
  _id: Types.ObjectId;
  bloodBank: Types.ObjectId;       // → BloodBank
  bloodType: BloodType;
  delta: number;                   // positive = restock, negative = dispense
  reason: TransactionReason;
  relatedRequest?: Types.ObjectId; // → BloodRequest (optional, dispatch_fulfilled)
  actor: Types.ObjectId;           // → User who triggered the operation
  notes?: string;                  // free text — use this for corrections, never edit history
  createdAt: Date;                 // updatedAt intentionally omitted — document is immutable
}

const inventoryTransactionSchema = new Schema<IInventoryTransaction>(
  {
    bloodBank: {
      type: Schema.Types.ObjectId,
      ref: "BloodBank",
      required: true,
      index: true,
    },
    bloodType: {
      type: String,
      enum: BLOOD_TYPES,
      required: true,
      index: true,
    },
    delta: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: TRANSACTION_REASONS,
      required: true,
    },
    relatedRequest: {
      type: Schema.Types.ObjectId,
      ref: "BloodRequest",
      required: false,
      default: null,
      index: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Free-text annotation. To "correct" a wrong transaction, insert a new
    // one with reason "manual_adjustment" and explain here — never edit history.
    notes: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // only createdAt is needed for logs
  }
);

export const InventoryTransaction = model<IInventoryTransaction>(
  "InventoryTransaction",
  inventoryTransactionSchema
);
