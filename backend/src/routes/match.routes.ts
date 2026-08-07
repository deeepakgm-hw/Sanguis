import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole, requireOwnership } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";
import * as matchController from "../controllers/match.controller";
import { Match } from "../models/Match";
import { Donor } from "../models/Donor";
import {
  listMatchesSchema,
  respondMatchSchema,
} from "../validators/match.validator";

const router = Router();

/** List matches — authenticated. Filtered to owner donor profile for non-admins. */
router.get(
  "/",
  requireAuth,
  validate(listMatchesSchema),
  matchController.listMatches
);

/** Get single match details. */
router.get(
  "/:id",
  requireAuth,
  matchController.getMatch
);

/** Respond to match (accept/decline) — restricted to the donor linked to the match. */
router.patch(
  "/:id/respond",
  requireAuth,
  requireOwnership(async (req) => {
    // 1. Load Match
    const match = await Match.findById(req.params.id);
    if (!match) return "";
    // 2. Load Donor linked to match
    const donor = await Donor.findById(match.donor).select("userId");
    // 3. Return userId of that Donor, so requireOwnership can verify it matches req.user.sub
    return donor?.userId.toString() ?? "";
  }),
  validate(respondMatchSchema),
  matchController.respondToMatch
);

/** Delete match — admin only. */
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  matchController.deleteMatch
);

export default router;
