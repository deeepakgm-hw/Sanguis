import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole, requireOwnership } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";
import * as donorController from "../controllers/donor.controller";
import { Donor } from "../models/Donor";
import {
  createDonorSchema,
  updateDonorSchema,
  listDonorsSchema,
} from "../validators/donor.validator";

const router = Router();

/** List all donors — admin/moderator only. */
router.get(
  "/",
  requireAuth,
  requireRole("admin", "moderator"),
  validate(listDonorsSchema),
  donorController.listDonors
);

/** Get current donor profile */
router.get(
  "/me",
  requireAuth,
  donorController.getDonorMe
);

/** Get a single donor profile — auth required; admins or the profile owner. */
router.get(
  "/:id",
  requireAuth,
  requireOwnership(async (req) => {
    const donor = await Donor.findById(req.params.id).select("userId");
    return donor?.userId.toString() ?? "";
  }),
  donorController.getDonor
);

/** Create a donor profile for the authenticated user. */
router.post(
  "/",
  requireAuth,
  validate(createDonorSchema),
  donorController.createDonor
);

/** Update own donor profile — ownership enforced. */
router.patch(
  "/:id",
  requireAuth,
  requireOwnership(async (req) => {
    const donor = await Donor.findById(req.params.id).select("userId");
    return donor?.userId.toString() ?? "";
  }),
  validate(updateDonorSchema),
  donorController.updateDonor
);

/** Delete donor profile — owner or admin. */
router.delete(
  "/:id",
  requireAuth,
  requireOwnership(async (req) => {
    const donor = await Donor.findById(req.params.id).select("userId");
    return donor?.userId.toString() ?? "";
  }),
  donorController.deleteDonor
);

export default router;
