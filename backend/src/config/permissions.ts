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
  | "admin:full";

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
  ],
  moderator: [
    "request:read",
    "request:triage",
    "inventory:read",
    "bank:verify",
  ],
  hospital: [
    "request:create",
    "request:read",
    "request:cancel",
    "inventory:read",
  ],
  bloodbank: [
    "inventory:adjust",
    "inventory:read",
    "request:read",
  ],
  donor: [
    "donor:profile_manage",
    "donor:respond_match",
    "request:read",
  ],
};

export function hasPermission(role: UserRole, action: SystemAction): boolean {
  const allowedActions = ROLE_PERMISSIONS[role] ?? [];
  return allowedActions.includes(action) || allowedActions.includes("admin:full");
}
