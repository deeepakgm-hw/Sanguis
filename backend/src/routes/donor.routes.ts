import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole, requireOwnership } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";
import * as donorController from "../controllers/donor.controller";
import { Donor } from "../models/Donor";
import availabilityRoutes from "./availability.routes";
import {
  createDonorSchema,
  updateDonorSchema,
  listDonorsSchema,
} from "../validators/donor.validator";

const router = Router();

/** List all donors — authenticated search directory. */
router.get(
  "/",
  requireAuth,
  validate(listDonorsSchema),
  donorController.listDonors
);

/** Availability calendar sub-router — must be before /me so it routes correctly */
router.use("/me/availability", availabilityRoutes);

/** Get current donor profile */
router.get(
  "/me",
  requireAuth,
  donorController.getDonorMe
);

/** PATCH /me/location — live GPS sync for logged-in donor */
router.patch(
  "/me/location",
  requireAuth,
  donorController.updateLocationMe
);

/** Get a single donor profile — auth required. */
router.get(
  "/:id",
  requireAuth,
  donorController.getDonor
);

/** Create or update donor profile for authenticated user. */
router.post(
  "/",
  requireAuth,
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

/** Delete own donor profile or admin. */
router.delete(
  "/:id",
  requireAuth,
  donorController.deleteDonor
);

export default router;
