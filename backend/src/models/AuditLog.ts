import { Schema, model, Document, Types } from "mongoose";

/** Records every state-changing action for compliance & forensics. */
export interface IAuditLog extends Document {
  actor: Types.ObjectId | null;
  action: string; // e.g. "user.update", "order.delete"
  resourceType: string;
  resourceId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);

/** Records security-relevant events: failed logins, lockouts, blocked IPs. */
export type SecurityEventType =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "ACCOUNT_LOCKED"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_REQUESTED"
  | "TOKEN_REUSE_DETECTED"
  | "ACCESS_DENIED"
  | "SUSPICIOUS_FILE_UPLOAD";

export interface ISecurityEvent extends Document {
  type: SecurityEventType;
  user?: Types.ObjectId;
  email?: string;
  ip: string;
  userAgent?: string;
  geo?: { country?: string; city?: string };
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const securityEventSchema = new Schema<ISecurityEvent>(
  {
    type: { type: String, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    email: { type: String },
    ip: { type: String, required: true },
    userAgent: { type: String },
    geo: { country: String, city: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SecurityEvent = model<ISecurityEvent>("SecurityEvent", securityEventSchema);
