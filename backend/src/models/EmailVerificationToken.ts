import { Schema, model, Document, Types } from "mongoose";

export interface IEmailVerificationToken extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  token: string;
  otpCode: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const emailVerificationTokenSchema = new Schema<IEmailVerificationToken>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    otpCode: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Mongoose TTL index -> auto-expires document
    },
  },
  { timestamps: true }
);

export const EmailVerificationToken = model<IEmailVerificationToken>(
  "EmailVerificationToken",
  emailVerificationTokenSchema
);
