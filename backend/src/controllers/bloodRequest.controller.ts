import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { BloodRequest } from "../models/BloodRequest";
import { recordAudit } from "../services/audit.service";
import { routeBloodRequest } from "../services/matching.service";
import { Match } from "../models/Match";
import { logger } from "../utils/logger";

/** GET /api/v1/blood-requests — paginated list. */
export const listBloodRequests = asyncHandler(async (req: Request, res: Response) => {
  const page  = Math.max(1, Number(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const { bloodType, urgencyLevel, status } = req.query as Record<string, string | undefined>;

  const filter: Record<string, unknown> = {};
  if (bloodType)    filter.bloodType    = bloodType;
  if (urgencyLevel) filter.urgencyLevel = urgencyLevel;
  if (status)       filter.status       = status;

  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    BloodRequest.countDocuments(filter),
  ]);

  return ApiResponse.success(res, requests, "Blood requests fetched", 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

/** GET /api/v1/blood-requests/:id */
export const getBloodRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await BloodRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound("Blood request not found");
  return ApiResponse.success(res, request);
});

/**
 * POST /api/v1/blood-requests
 * Creates a new request and immediately runs the matching engine to surface
 * candidate donors.  Match documents are created here (controller's job per
 * matching.service contract).
 */
export const createBloodRequest = asyncHandler(async (req: Request, res: Response) => {
  const hospitalId = req.user!.sub;

  const { evaluateRequestCredibility } = await import("../services/corroboration.service");
  const credibility = await evaluateRequestCredibility(hospitalId, req.body.urgencyLevel || "medium");

  const request = await BloodRequest.create({
    ...req.body,
    hospital: hospitalId,
    status: credibility.requiresVerification ? "open" : "open",
  });

  await recordAudit({
    req,
    action: "blood_request.create",
    resourceType: "BloodRequest",
    resourceId: request._id.toString(),
    after: { ...request.toObject(), credibility },
  });

  // Run Emergency Dispatch & Multi-Tier Routing Engine
  let routeResult = null;
  let matchCount = 0;
  try {
    const { executeEmergencyDispatch } = await import("../services/dispatch.service");
    const dispatchResult = await executeEmergencyDispatch(request, req.app.get("io"));
    routeResult = dispatchResult;
    matchCount = dispatchResult.candidatesCount;
  } catch (err) {
    logger.error({ err }, "[createBloodRequest] Emergency dispatch engine error");
  }

  return ApiResponse.created(
    res,
    { request, matchCount, routeResult },
    "Blood request created & emergency dispatch executed"
  );
});

/** PATCH /api/v1/blood-requests/:id — update own request (hospital only). */
export const updateBloodRequest = asyncHandler(async (req: Request, res: Response) => {
  const before = await BloodRequest.findById(req.params.id);
  if (!before) throw ApiError.notFound("Blood request not found");

  const allowedFields = ["bloodType", "unitsNeeded", "urgencyLevel", "status", "geoLocation"];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const updated = await BloodRequest.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  await recordAudit({
    req,
    action: "blood_request.update",
    resourceType: "BloodRequest",
    resourceId: req.params.id,
    before: before.toObject(),
    after: updated?.toObject(),
  });

  return ApiResponse.success(res, updated, "Blood request updated");
});

/** DELETE /api/v1/blood-requests/:id — cancel (soft status change). */
export const cancelBloodRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await BloodRequest.findById(req.params.id);
  if (!request) throw ApiError.notFound("Blood request not found");
  if (request.status === "fulfilled")
    throw ApiError.badRequest("Cannot cancel a fulfilled request");

  const updated = await BloodRequest.findByIdAndUpdate(
    req.params.id,
    { status: "cancelled" },
    { new: true }
  );

  await recordAudit({
    req,
    action: "blood_request.cancel",
    resourceType: "BloodRequest",
    resourceId: req.params.id,
    before: { status: request.status },
    after:  { status: "cancelled" },
  });

  return ApiResponse.success(res, updated, "Blood request cancelled");
});
