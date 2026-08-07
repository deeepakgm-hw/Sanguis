import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { Donor } from "../models/Donor";
import { DonorAvailability } from "../models/DonorAvailability";
import { computeMedicalEligibility, checkVoluntaryAvailability } from "../services/eligibility.service";
import { recordAudit } from "../services/audit.service";
import { Types } from "mongoose";

// ---------------------------------------------------------------------------
// GET /api/v1/donors/me/availability
// Returns the current donor's full eligibility status:
//   - medical eligibility (computed from lastDonationDate)
//   - voluntary unavailability windows
//   - combined "ready to match" flag
// ---------------------------------------------------------------------------
export const getMyAvailability = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;

  const donor = await Donor.findOne({ userId });
  if (!donor) throw ApiError.notFound("Donor profile not found for this account");

  const medical = computeMedicalEligibility(donor);
  const voluntary = await checkVoluntaryAvailability(donor._id);

  // Load the full unavailability periods for the calendar widget
  const availabilityDoc = await DonorAvailability.findOne({ donor: donor._id });

  return ApiResponse.success(res, {
    donorId: donor._id,
    bloodType: donor.bloodType,
    lastDonationDate: donor.lastDonationDate,
    medical,
    voluntary,
    unavailablePeriods: availabilityDoc?.unavailablePeriods ?? [],
    isReadyToMatch: medical.isMedicallyEligible && voluntary.isVoluntarilyAvailable,
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/donors/me/unavailable-periods
// Adds a new voluntary unavailability window for the authenticated donor.
// Uses upsert so the first call creates the DonorAvailability document.
// ---------------------------------------------------------------------------
export const addUnavailablePeriod = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { from, to, reason } = req.body as { from: Date; to: Date; reason?: string };

  const donor = await Donor.findOne({ userId }).select("_id");
  if (!donor) throw ApiError.notFound("Donor profile not found for this account");

  // Upsert: create the DonorAvailability document if it doesn't exist,
  // push the new period into the array atomically.
  const updated = await DonorAvailability.findOneAndUpdate(
    { donor: donor._id },
    {
      $push: {
        unavailablePeriods: {
          _id: new Types.ObjectId(),
          from: new Date(from),
          to: new Date(to),
          reason: reason ?? null,
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await recordAudit({
    req,
    action: "donor.availability.add_period",
    resourceType: "DonorAvailability",
    resourceId: donor._id.toString(),
    after: { from, to, reason },
  });

  return ApiResponse.created(res, updated, "Unavailability period added");
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/donors/me/unavailable-periods/:periodId
// Removes a specific unavailability window by its subdocument _id.
// ---------------------------------------------------------------------------
export const deleteUnavailablePeriod = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const { periodId } = req.params;

  const donor = await Donor.findOne({ userId }).select("_id");
  if (!donor) throw ApiError.notFound("Donor profile not found for this account");

  const result = await DonorAvailability.findOneAndUpdate(
    { donor: donor._id },
    { $pull: { unavailablePeriods: { _id: new Types.ObjectId(periodId) } } },
    { new: true }
  );

  if (!result) throw ApiError.notFound("No availability record found for this donor");

  await recordAudit({
    req,
    action: "donor.availability.remove_period",
    resourceType: "DonorAvailability",
    resourceId: donor._id.toString(),
    before: { periodId },
  });

  return ApiResponse.success(res, result, "Unavailability period removed");
});
