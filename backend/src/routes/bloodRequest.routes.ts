import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole, requireOwnership } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";
import { requireVerifiedRequester } from "../middlewares/security/requireVerifiedRequester";
import * as bloodRequestController from "../controllers/bloodRequest.controller";
import { BloodRequest } from "../models/BloodRequest";
import {
  createBloodRequestSchema,
  updateBloodRequestSchema,
  listBloodRequestsSchema,
} from "../validators/bloodRequest.validator";

const router = Router();

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
