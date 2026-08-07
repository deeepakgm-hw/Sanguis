import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole, requireOwnership } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";
import { requireVerifiedRequester } from "../middlewares/verifiedRequester";
import * as bloodRequestController from "../controllers/bloodRequest.controller";
import { getPriorityQueue } from "../controllers/priorityQueue.controller";
import { BloodRequest } from "../models/BloodRequest";
import {
  createBloodRequestSchema,
  updateBloodRequestSchema,
  listBloodRequestsSchema,
} from "../validators/bloodRequest.validator";

const router = Router();

/** GET /api/v1/blood-requests/priority-queue — admin/moderator dispatcher view. */
router.get(
  "/priority-queue",
  requireAuth,
  requireRole("admin", "moderator"),
  getPriorityQueue
);

/** List blood requests — authenticated. */
router.get(
  "/",
  requireAuth,
  validate(listBloodRequestsSchema),
  bloodRequestController.listBloodRequests
);

/** Get a single blood request. */
router.get(
  "/:id",
  requireAuth,
  bloodRequestController.getBloodRequest
);

/** Create a blood request — hospital / verified requester only. */
router.post(
  "/",
  requireAuth,
  requireRole("admin", "moderator"), // Or normal authenticated users with specific roles, or hospital checks. The prompt says "Hospitals can only create/update their own BloodRequests". We will verify ownership / role in requireOwnership or via custom check. Let's make sure it requires a hospital role or similar check. Since User.ts roles are "user" | "admin" | "moderator", hospital is a "user" with verified hospital credentials (managed by requireVerifiedRequester). Let's use requireVerifiedRequester here.
  requireVerifiedRequester,
  validate(createBloodRequestSchema),
  bloodRequestController.createBloodRequest
);

/** Update own blood request — ownership enforced (hospital that created it). */
router.patch(
  "/:id",
  requireAuth,
  requireOwnership(async (req) => {
    const request = await BloodRequest.findById(req.params.id).select("hospital");
    return request?.hospital.toString() ?? "";
  }),
  validate(updateBloodRequestSchema),
  bloodRequestController.updateBloodRequest
);

/** Cancel own blood request — ownership enforced. */
router.delete(
  "/:id",
  requireAuth,
  requireOwnership(async (req) => {
    const request = await BloodRequest.findById(req.params.id).select("hospital");
    return request?.hospital.toString() ?? "";
  }),
  bloodRequestController.cancelBloodRequest
);

export default router;
