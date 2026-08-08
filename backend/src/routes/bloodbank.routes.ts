import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole, requireOwnership } from "../middlewares/rbac";
import { validate } from "../middlewares/validate";
import * as bloodBankController from "../controllers/bloodbank.controller";
import { BloodBank } from "../models/BloodBank";
import {
  createBloodBankSchema,
  adjustInventorySchema,
  listBloodBanksSchema,
} from "../validators/bloodbank.validator";

const router = Router();

// Command center overview — admin/moderator only (role enforced here, not in controller)
router.get(
  "/command-center/overview",
  requireAuth,
  requireRole("admin", "moderator"),
  bloodBankController.getCommandCenterOverview
);

// Cross-Bank Inventory Reallocation Engine suggestions
router.get(
  "/reallocation/suggestions",
  requireAuth,
  bloodBankController.getReallocationSuggestions
);

// Blood Bank Search endpoint with availability ranking
router.get(
  "/search",
  bloodBankController.searchBloodBanks
);

// Register a blood bank profile
router.post(
  "/",
  requireAuth,
  validate(createBloodBankSchema),
  bloodBankController.createBloodBank
);

// List/Geo-query verified blood banks
router.get(
  "/",
  requireAuth,
  validate(listBloodBanksSchema),
  bloodBankController.listBloodBanks
);

// Adjust inventory stock — bank owner OR admin only (IDOR protection via requireOwnership)
router.patch(
  "/:id/inventory",
  requireAuth,
  requireOwnership(async (req) => {
    const bank = await BloodBank.findById(req.params.id).select("owner");
    return bank?.owner.toString() ?? "";
  }),
  validate(adjustInventorySchema),
  bloodBankController.adjustStock
);

// Get transactions ledger list
router.get(
  "/:id/transactions",
  requireAuth,
  bloodBankController.getTransactions
);

// Verify profile (Admin internally gated)
router.patch(
  "/:id/verify",
  requireAuth,
  bloodBankController.verifyBloodBank
);

export default router;
