import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { ApiError } from "../utils/ApiError";

/**
 * Checks if the requesting user is a verified requester (hospital).
 * Admin and moderator roles are allowed for testing/dispatch convenience.
 */
export async function requireVerifiedRequester(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized("Authentication required");
    }

    const user = await User.findById(req.user.sub);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // Must be either admin/moderator or a hospital
    if (user.role !== "hospital" && user.role !== "admin" && user.role !== "moderator") {
      throw ApiError.forbidden("Only verified hospital accounts can request blood dispatches");
    }

    // Must be verified by admin
    if (!user.isEmailVerified) {
      throw ApiError.forbidden(
        "Hospital verification pending. Please contact admin clearance to verify this account before submitting requests."
      );
    }

    next();
  } catch (err) {
    next(err);
  }
}
