// ---------------------------------------------------------------------------
// CENTRALIZED ROLE PERMISSIONS MAP
// Single source of truth for Role-Based Access Control (RBAC).
// ---------------------------------------------------------------------------

export type UserRole = "donor" | "hospital" | "bloodbank" | "admin" | "moderator";

export type SystemAction =
  | "request:create"
  | "request:read"
  | "request:cancel"
  | "request:triage"
  | "inventory:adjust"
  | "inventory:read"
  | "donor:profile_manage"
  | "donor:respond_match"
  | "bank:verify"
  | "admin:full"
  | "campaign:create"
  | "campaign:manage"
  | "campaign:approve"
  | "campaign:reject"
  | "campaign:checkin"
  | "donation:verify"
  | "certificate:view"
  | "certificate:revoke";

const ROLE_PERMISSIONS: Record<UserRole, SystemAction[]> = {
  admin: [
    "request:create",
    "request:read",
    "request:cancel",
    "request:triage",
    "inventory:adjust",
    "inventory:read",
    "donor:profile_manage",
    "donor:respond_match",
    "bank:verify",
    "admin:full",
    "campaign:create",
    "campaign:manage",
    "campaign:approve",
    "campaign:reject",
    "campaign:checkin",
    "donation:verify",
    "certificate:view",
    "certificate:revoke",
  ],
  moderator: [
    "request:read",
    "request:triage",
    "inventory:read",
    "bank:verify",
    "campaign:approve",
    "campaign:reject",
    "certificate:view",
    "certificate:revoke",
  ],
  hospital: [
    "request:create",
    "request:read",
    "request:cancel",
    "inventory:read",
    "campaign:create",
    "campaign:manage",
    "campaign:checkin",
    "donation:verify",
    "certificate:view",
  ],
  bloodbank: [
    "inventory:adjust",
    "inventory:read",
    "request:read",
    "campaign:create",
    "campaign:manage",
    "campaign:checkin",
    "donation:verify",
    "certificate:view",
  ],
  donor: [
    "donor:profile_manage",
    "donor:respond_match",
    "request:read",
    "certificate:view",
  ],
};

export function hasPermission(role: UserRole, action: SystemAction): boolean {
  const allowedActions = ROLE_PERMISSIONS[role] ?? [];
  return allowedActions.includes(action) || allowedActions.includes("admin:full");
}
