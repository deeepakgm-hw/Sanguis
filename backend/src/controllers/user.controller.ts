import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/User";
import { recordAudit } from "../services/audit.service";

/** Reusable pagination pattern used across every list endpoint in the system. */
export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = (req.query.search as string) ?? "";

  const filter = search
    ? { $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }] }
    : {};

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return ApiResponse.success(res, users, "Users fetched", 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  return ApiResponse.success(res, user.toSafeJSON());
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const before = await User.findById(req.params.id);
  if (!before) throw ApiError.notFound("User not found");

  const allowedFields = ["name", "avatarUrl"]; // never allow role/email/password here — separate privileged endpoints
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) if (req.body[field] !== undefined) updates[field] = req.body[field];

  const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

  await recordAudit({
    req,
    action: "user.update",
    resourceType: "User",
    resourceId: req.params.id,
    before: before.toSafeJSON(),
    after: updated?.toSafeJSON(),
  });

  return ApiResponse.success(res, updated?.toSafeJSON(), "User updated");
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }); // soft delete
  if (!user) throw ApiError.notFound("User not found");

  await recordAudit({ req, action: "user.delete", resourceType: "User", resourceId: req.params.id });
  return ApiResponse.success(res, null, "User deactivated");
});

/** Admin-only: change a user's role. Kept separate from updateUser to keep privilege escalation auditable and isolated. */
export const changeUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as { role: string };
  if (!["user", "admin", "moderator"].includes(role)) throw ApiError.badRequest("Invalid role");

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  if (!user) throw ApiError.notFound("User not found");

  await recordAudit({ req, action: "user.role_change", resourceType: "User", resourceId: req.params.id, after: { role } });
  return ApiResponse.success(res, user.toSafeJSON(), "Role updated");
});
