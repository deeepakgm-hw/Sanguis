import { Schema, model, Document, Types } from "mongoose";

export interface IUserPreferences extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  emergencyAlerts: boolean;
  donationReminders: boolean;
  newMessages: boolean;
  trustUpdates: boolean;
  blogUpdates: boolean;
  showProfile: boolean;
  shareLocation: boolean;
  allowDirectMessages: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    emergencyAlerts: { type: Boolean, default: true },
    donationReminders: { type: Boolean, default: true },
    newMessages: { type: Boolean, default: true },
    trustUpdates: { type: Boolean, default: false },
    blogUpdates: { type: Boolean, default: false },
    showProfile: { type: Boolean, default: true },
    shareLocation: { type: Boolean, default: true },
    allowDirectMessages: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserPreferences = model<IUserPreferences>("UserPreferences", userPreferencesSchema);
