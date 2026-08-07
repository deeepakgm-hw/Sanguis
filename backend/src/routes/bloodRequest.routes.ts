import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireVerifiedRequester } from "../middlewares/security/requireVerifiedRequester";
import { ApiResponse } from "../utils/ApiResponse";

const router = Router();

/**
 * Placeholder endpoint to simulate urgent broadcast creation.
 * Access is restricted to authenticated users who are also verified requesters.
 */
router.post(
  "/urgent",
  requireAuth,
  requireVerifiedRequester,
  (req, res) => {
    return ApiResponse.success(
      res,
      { broadcastCreated: true },
      "Urgent broadcast created successfully"
    );
  }
);

export default router;
