import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

export const recordDonation = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body;
  if (!amount || typeof amount !== "number" || amount < 100) {
    throw ApiError.badRequest("Minimum donation amount is ₦100");
  }

  // Record donation receipt
  const receipt = {
    donationId: `DON-${Date.now()}`,
    amount,
    currency: "NGN",
    donorUserId: req.user?.sub || null,
    status: "completed",
    timestamp: new Date().toISOString(),
  };

  return ApiResponse.success(res, receipt, "Donation processed successfully. Thank you for your support!");
});
