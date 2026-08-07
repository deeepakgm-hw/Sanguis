import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { Match } from "../models/Match";
import { Donor } from "../models/Donor";
import { BloodRequest } from "../models/BloodRequest";
import { recordAudit } from "../services/audit.service";

/** GET /api/v1/matches — paginated list (admin sees all; donors see their own; hospitals see theirs). */
export const listMatches = asyncHandler(async (req: Request, res: Response) => {
  const page  = Math.max(1, Number(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const { status, requestId, donorId } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = {};
  if (status)    filter.status  = status;
  if (requestId) filter.request = requestId;
  if (donorId)   filter.donor   = donorId;

  // Role-based scoping:
  if (req.user!.role === "hospital") {
    if (requestId) {
      const requestDoc = await BloodRequest.findById(requestId);
      if (requestDoc && requestDoc.hospital.toString() !== req.user!.sub) {
        throw ApiError.forbidden("Access denied: This request does not belong to your hospital.");
      }
    } else {
      // If hospital lists matches without specific request, limit to their own requests
      const ownRequests = await BloodRequest.find({ hospital: req.user!.sub }).select("_id");
      filter.request = { $in: ownRequests.map((r) => r._id) };
    }
  } else if (req.user!.role !== "admin" && req.user!.role !== "moderator") {
    const donorProfile = await Donor.findOne({ userId: req.user!.sub }).select("_id");
    if (!donorProfile) throw ApiError.forbidden("No donor profile found for this account");
    filter.donor = donorProfile._id;
  }

  const [matches, total] = await Promise.all([
    Match.find(filter)
      .populate("request", "bloodType urgencyLevel status hospital geoLocation")
      .populate("donor",   "bloodType location trustScore")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Match.countDocuments(filter),
  ]);

  return ApiResponse.success(res, matches, "Matches fetched", 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

/** GET /api/v1/matches/:id */
export const getMatch = asyncHandler(async (req: Request, res: Response) => {
  const match = await Match.findById(req.params.id)
    .populate("request", "bloodType urgencyLevel status hospital geoLocation")
    .populate("donor",   "bloodType location trustScore");
  if (!match) throw ApiError.notFound("Match not found");
  return ApiResponse.success(res, match);
});

/**
 * PATCH /api/v1/matches/:id/respond
 * Donor accepts or declines their specific match.
 * When accepted, flips BloodRequest.status to "matched" and records the
 * respondedAt timestamp.
 */
export const respondToMatch = asyncHandler(async (req: Request, res: Response) => {
  const { action } = req.body as { action: "accept" | "decline" };

  const match = await Match.findById(req.params.id);
  if (!match) throw ApiError.notFound("Match not found");
  if (match.status !== "pending")
    throw ApiError.badRequest(`Match is already ${match.status} — cannot respond again`);

  const newStatus = action === "accept" ? "accepted" : "declined";
  const respondedAt = new Date();

  const updated = await Match.findByIdAndUpdate(
    req.params.id,
    { status: newStatus, respondedAt },
    { new: true }
  );

  // When a donor accepts, mark the blood request as matched.
  if (action === "accept") {
    await BloodRequest.findByIdAndUpdate(match.request, { status: "matched" });
  }

  await recordAudit({
    req,
    action: `match.${newStatus}`,
    resourceType: "Match",
    resourceId: req.params.id,
    before: { status: "pending" },
    after:  { status: newStatus, respondedAt },
  });

  return ApiResponse.success(
    res,
    updated,
    action === "accept" ? "Match accepted — blood request marked as matched" : "Match declined"
  );
});

/** DELETE /api/v1/matches/:id — admin-only hard delete. */
export const deleteMatch = asyncHandler(async (req: Request, res: Response) => {
  const match = await Match.findByIdAndDelete(req.params.id);
  if (!match) throw ApiError.notFound("Match not found");

  await recordAudit({
    req,
    action: "match.delete",
    resourceType: "Match",
    resourceId: req.params.id,
    before: match.toObject(),
  });

  return ApiResponse.success(res, null, "Match deleted");
});
