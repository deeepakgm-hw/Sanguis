import { Schema, model, Document, Types } from "mongoose";
import argon2 from "argon2";

export type UserRole = "user" | "admin" | "moderator";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isActive: boolean;
  mfaEnabled: boolean;
  authProvider: "local" | "google" | "github";
  lastLoginAt?: Date;
  lastLoginIp?: string;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
  toSafeJSON(): Partial<IUser>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false }, // never returned by default
    role: { type: String, enum: ["user", "admin", "moderator"], default: "user" },
    avatarUrl: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    mfaEnabled: { type: Boolean, default: false },
    authProvider: { type: String, enum: ["local", "google", "github"], default: "local" },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true }
);

// Argon2id: winner of the Password Hashing Competition, resistant to
// GPU cracking (memory-hard) — the current OWASP-recommended default,
// preferred over bcrypt for new systems.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await argon2.hash(this.password, {
    type: argon2.argon2id,
    memoryCost: 19456, // ~19 MB, OWASP minimum recommendation
    timeCost: 2,
    parallelism: 1,
  });
  if (!this.isNew) this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return argon2.verify(this.password, candidate);
};

// Strips sensitive fields before sending user objects to the client.
userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

export const User = model<IUser>("User", userSchema);
