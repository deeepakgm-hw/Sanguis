import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { seedDatabase } from "../utils/seed";
import { User } from "../models/User";

const router = Router();

/**
 * @route   POST /api/v1/seed
 * @desc    Triggers full database re-seeding with rich Indian emergency dataset.
 * @access  Public / Admin Demo
 */
router.post(
  "/",
  asyncHandler(async (req, res) => {
    // Delete existing records to allow re-seeding on demand
    await User.deleteMany({});
    await seedDatabase();
    return ApiResponse.success(res, null, "Database successfully populated with rich Indian emergency dataset.");
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userCount = await User.countDocuments();
    return ApiResponse.success(res, { userCount }, "Seed status active.");
  })
);

export default router;
