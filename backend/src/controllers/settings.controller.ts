import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { UserPreferences } from "../models/UserPreferences";

/** GET /api/v1/settings/preferences */
export const getPreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  let prefs = await UserPreferences.findOne({ userId });
  if (!prefs) {
    prefs = await UserPreferences.create({ userId });
  }
  return ApiResponse.success(res, prefs);
});

/** PATCH /api/v1/settings/preferences */
export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.sub;
  const allowed = [
    "emergencyAlerts",
    "donationReminders",
    "newMessages",
    "trustUpdates",
    "blogUpdates",
    "showProfile",
    "shareLocation",
    "allowDirectMessages",
  ];

  const updates: Record<string, boolean> = {};
  for (const key of allowed) {
    if (typeof req.body[key] === "boolean") {
      updates[key] = req.body[key];
    }
  }

  const prefs = await UserPreferences.findOneAndUpdate(
    { userId },
    { $set: updates },
    { new: true, upsert: true }
  );

  return ApiResponse.success(res, prefs, "Preferences updated successfully");
});
