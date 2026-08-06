import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { UserRole } from "../models/User";

/**
 * OWASP A01 - Broken Access Control.
 * requireRole is a factory so routes read declaratively:
 *   router.delete("/users/:id", requireAuth, requireRole("admin"), ...)
 * requireAuth MUST run first to populate req.user.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized("Authentication required"));
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires one of roles: ${allowedRoles.join(", ")}`));
    }
    next();
  };
}

/**
 * Ownership check: lets a user access/modify only their OWN resource,
 * unless they're an admin. Pass a function that extracts the owner id
 * from the request (e.g. from a loaded document or route param).
 * This closes the classic IDOR gap (Insecure Direct Object Reference)
 * where a plain requireAuth check isn't enough — e.g. /orders/:id
 * must check the order actually belongs to req.user.sub.
 */
export function requireOwnership(getOwnerId: (req: Request) => string | Promise<string>) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) return next(ApiError.unauthorized("Authentication required"));
    if (req.user.role === "admin") return next();

    const ownerId = await getOwnerId(req);
    if (ownerId !== req.user.sub) {
      return next(ApiError.forbidden("You do not have access to this resource"));
    }
    next();
  };
}
