import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { Donor } from "../models/Donor";
import { recordAudit } from "../services/audit.service";

/** GET /api/v1/donors — list all donor profiles (admin/moderator). */
export const listDonors = asyncHandler(async (req: Request, res: Response) => {
  const page  = Math.max(1, Number(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const { bloodType, search } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = {};
  if (bloodType) filter.bloodType = bloodType;
  if (search)    filter["$or"]    = [{ bloodType: { $regex: search, $options: "i" } }];

  const [donors, total] = await Promise.all([
    Donor.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Donor.countDocuments(filter),
  ]);

  return ApiResponse.success(res, donors, "Donors fetched", 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

/** GET /api/v1/donors/:id */
export const getDonor = asyncHandler(async (req: Request, res: Response) => {
  const donor = await Donor.findById(req.params.id);
  if (!donor) throw ApiError.notFound("Donor not found");
  return ApiResponse.success(res, donor);
});

/** GET /api/v1/donors/me */
export const getDonorMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const donor = await Donor.findOne({ userId });
  if (!donor) throw ApiError.notFound("Donor profile not found for this account");
  return ApiResponse.success(res, donor);
});

/** POST /api/v1/donors — create a Donor profile for the authenticated user. */
export const createDonor = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;

  const existing = await Donor.findOne({ userId });
  if (existing) throw ApiError.conflict("A donor profile already exists for this account");

  const donor = await Donor.create({ ...req.body, userId });

  await recordAudit({
    req,
    action: "donor.create",
    resourceType: "Donor",
    resourceId: donor._id.toString(),
    after: donor.toObject(),
  });

  return ApiResponse.created(res, donor, "Donor profile created");
});

/** PATCH /api/v1/donors/:id — update own donor profile. */
export const updateDonor = asyncHandler(async (req: Request, res: Response) => {
  const before = await Donor.findById(req.params.id);
  if (!before) throw ApiError.notFound("Donor not found");

  const allowedFields = ["bloodType", "lastDonationDate", "medicalFlags", "location"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const updated = await Donor.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  await recordAudit({
    req,
    action: "donor.update",
    resourceType: "Donor",
    resourceId: req.params.id,
    before: before.toObject(),
    after: updated?.toObject(),
  });

  return ApiResponse.success(res, updated, "Donor profile updated");
});

/** DELETE /api/v1/donors/:id — admin hard-delete or owner self-delete. */
export const deleteDonor = asyncHandler(async (req: Request, res: Response) => {
  const donor = await Donor.findByIdAndDelete(req.params.id);
  if (!donor) throw ApiError.notFound("Donor not found");

  await recordAudit({
    req,
    action: "donor.delete",
    resourceType: "Donor",
    resourceId: req.params.id,
    before: donor.toObject(),
  });

  return ApiResponse.success(res, null, "Donor profile deleted");
});
