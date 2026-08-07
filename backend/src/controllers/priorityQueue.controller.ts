import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { BloodRequest } from "../models/BloodRequest";
import { User } from "../models/User";
import { computePriorityScore } from "../services/priority.service";

// ---------------------------------------------------------------------------
// GET /api/v1/blood-requests/priority-queue
//
// Returns all open blood requests sorted by priority score descending.
// Score is computed fresh on every read (not stored) so the wait-time
// component always reflects elapsed time accurately.
//
// Each item in the response includes a `priorityBreakdown` object that
// shows exactly which factors contributed how many points, so a dispatcher
// or judge can understand why request A outranks request B.
//
// Authorization: requireRole("admin", "moderator") — dispatchers only.
// ---------------------------------------------------------------------------
export const getPriorityQueue = asyncHandler(async (req: Request, res: Response) => {
  // Fetch all open, unfulfilled requests in one query.
  // "matched" requests are still open (matching notified donors, not yet confirmed).
  const openRequests = await BloodRequest.find({
    status: { $in: ["open", "matched"] },
  });

  if (openRequests.length === 0) {
    return ApiResponse.success(res, [], "No pending requests in queue");
  }

  // Batch-load the hospital users so we can check isEmailVerified for the
  // verification bonus — one query for all unique hospital IDs.
  const hospitalIds = [...new Set(openRequests.map((r) => r.hospital.toString()))];
  const hospitalUsers = await User.find({ _id: { $in: hospitalIds } }).select(
    "_id isEmailVerified name email"
  );
  const hospitalMap = new Map(hospitalUsers.map((u) => [u._id.toString(), u]));

  // Compute priority score for each request and attach breakdown
  const scoredRequests = openRequests.map((request) => {
    const hospital = hospitalMap.get(request.hospital.toString()) ?? null;
    const breakdown = computePriorityScore(request, hospital);

    return {
      _id: request._id,
      bloodType: request.bloodType,
      unitsNeeded: request.unitsNeeded,
      urgencyLevel: request.urgencyLevel,
      status: request.status,
      geoLocation: request.geoLocation,
      hospital: request.hospital,
      hospitalName: hospital ? (hospital as any).name : null,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      priorityScore: breakdown.totalScore,
      priorityBreakdown: breakdown,
    };
  });

  // Sort descending by priority score — highest priority served first
  scoredRequests.sort((a, b) => b.priorityScore - a.priorityScore);

  return ApiResponse.success(
    res,
    scoredRequests,
    `Priority queue computed for ${scoredRequests.length} active requests`,
    200,
    { total: scoredRequests.length }
  );
});
