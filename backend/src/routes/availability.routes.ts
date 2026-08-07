import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import * as availabilityController from "../controllers/availability.controller";
import {
  addUnavailablePeriodSchema,
  deletePeriodParamSchema,
} from "../validators/availability.validator";

const router = Router();

// All availability routes are scoped to the authenticated donor's own profile.
// There is no admin-view-another-donor's-calendar endpoint — availability is
// personal data. Admins can see eligibility status through the donor list.

/** GET /api/v1/donors/me/availability — full eligibility status + periods */
router.get("/", requireAuth, availabilityController.getMyAvailability);

/** POST /api/v1/donors/me/availability — add an unavailability window */
router.post(
  "/",
  requireAuth,
  validate(addUnavailablePeriodSchema),
  availabilityController.addUnavailablePeriod
);

/** DELETE /api/v1/donors/me/availability/:periodId — remove a specific window */
router.delete(
  "/:periodId",
  requireAuth,
  validate(deletePeriodParamSchema),
  availabilityController.deleteUnavailablePeriod
);

export default router;
