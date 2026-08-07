import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { BloodBank } from "../models/BloodBank";
import { InventoryTransaction } from "../models/InventoryTransaction";
import { Donor } from "../models/Donor";
import { User } from "../models/User";
import { Match } from "../models/Match";
import { recordAudit } from "../services/audit.service";
import * as inventoryService from "../services/inventory.service";
import { BloodType } from "../models/Donor";
import { Types } from "mongoose";

/**
 * Register a new Blood Bank.
 * POST /api/v1/bloodbanks
 */
export const createBloodBank = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.user!.sub;

  // Enforce one bank profile per user account unless admin
  if (req.user!.role !== "admin") {
    const existing = await BloodBank.findOne({ owner: ownerId });
    if (existing) {
      throw ApiError.conflict("A blood bank profile already exists for this account.");
    }
  }

  const bank = await BloodBank.create({
    ...req.body,
    owner: ownerId,
    isVerified: false, // verification gates admin validation
  });

  await recordAudit({
    req,
    action: "blood_bank.create",
    resourceType: "BloodBank",
    resourceId: bank._id.toString(),
    after: bank.toObject(),
  });

  return ApiResponse.created(res, bank, "Blood bank registered successfully. Awaiting verification.");
});

/**
 * List blood banks.
 * Optional geo filter: ?lat=13.08&lng=80.27&radius=15&bloodType=O-
 * GET /api/v1/bloodbanks
 */
export const listBloodBanks = asyncHandler(async (req: Request, res: Response) => {
  const { bloodType, lat, lng, radius, page, limit } = req.query as Record<string, string | undefined>;

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skipNum = (pageNum - 1) * limitNum;

  // If lat, lng, and radius are present, run inventory proximity logic
  if (lat && lng) {
    const rKm = Number(radius) || 15;
    const bType = (bloodType as BloodType) || "O-";

    const results = await inventoryService.getRegionalSupplyIndex(
      bType,
      Number(lat),
      Number(lng),
      rKm
    );

    return ApiResponse.success(res, results, "Regional supply index fetched");
  }

  // Otherwise, return normal list with pagination (verified only unless admin)
  const filter: Record<string, unknown> = {};
  if (req.user!.role !== "admin" && req.user!.role !== "moderator") {
    filter.isVerified = true;
  }
  if (bloodType) {
    filter["inventory.bloodType"] = bloodType;
  }

  const [banks, total] = await Promise.all([
    BloodBank.find(filter)
      .populate("owner", "name email")
      .skip(skipNum)
      .limit(limitNum),
    BloodBank.countDocuments(filter),
  ]);

  return ApiResponse.success(res, {
    items: banks,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  }, "Blood banks fetched");
});

/**
 * Adjust Blood Bank stock.
 * Ownership check (owner OR admin) is enforced at the route level via
 * requireOwnership — do not duplicate it here.
 * PATCH /api/v1/bloodbanks/:id/inventory
 */
export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { bloodType, delta, reason, notes } = req.body as {
    bloodType: BloodType;
    delta: number;
    reason: any;
    notes?: string;
  };
  const actorId = req.user!.sub;

  // Capture pre-adjustment units for the audit record (best-effort read
  // before the write; the exact value is also in the transaction ledger).
  const bankBefore = await BloodBank.findById(id).select("inventory");
  if (!bankBefore) throw ApiError.notFound("Blood bank not found.");

  const beforeItem = bankBefore.inventory.find((i) => i.bloodType === bloodType);
  const beforeUnits = beforeItem ? beforeItem.unitsAvailable : 0;

  // adjustInventory now returns the updated BloodBank document — use it
  // directly rather than issuing a second findById.
  const updatedBank = await inventoryService.adjustInventory({
    bloodBankId: id,
    bloodType,
    delta,
    reason,
    actorId,
    notes,
  });

  await recordAudit({
    req,
    action: "blood_bank.adjust_inventory",
    resourceType: "BloodBank",
    resourceId: id,
    before: { bloodType, unitsAvailable: beforeUnits },
    after: { bloodType, unitsAvailable: beforeUnits + delta },
  });

  return ApiResponse.success(res, updatedBank, "Stock adjusted successfully");
});

/**
 * Get transactions ledger.
 * GET /api/v1/bloodbanks/:id/transactions
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const bank = await BloodBank.findById(id);
  if (!bank) throw ApiError.notFound("Blood bank not found.");

  // Access restricted to admin, moderator or the bank owner
  if (
    req.user!.role !== "admin" &&
    req.user!.role !== "moderator" &&
    bank.owner.toString() !== req.user!.sub
  ) {
    throw ApiError.forbidden("Access denied.");
  }

  const [transactions, total] = await Promise.all([
    InventoryTransaction.find({ bloodBank: id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("actor", "name email")
      .populate("relatedRequest", "bloodType unitsNeeded status"),
    InventoryTransaction.countDocuments({ bloodBank: id }),
  ]);

  return ApiResponse.success(res, transactions, "Transactions ledger fetched", 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

/**
 * Aggregated command center overview.
 * Role check (admin/moderator) is enforced at the route level via requireRole.
 * GET /api/v1/bloodbanks/command-center/overview
 */
export const getCommandCenterOverview = asyncHandler(async (req: Request, res: Response) => {
  const [bloodBanks, donors, hospitals, dispatches] = await Promise.all([
    // 1. Verified Blood Banks with full inventory
    BloodBank.find({ isVerified: true }).select("name address location inventory contactPhone"),
    // 2. All registered Donors with location for map rendering
    Donor.find().select("bloodType location trustScore"),
    // 3. Hospital User accounts
    User.find({ role: "hospital" }).select("name email"),
    // 4. In-flight pending dispatches
    Match.find({ status: "pending" })
      .populate("request", "bloodType urgencyLevel geoLocation status")
      .populate("donor", "location bloodType trustScore"),
  ]);

  return ApiResponse.success(
    res,
    { bloodBanks, donors, hospitals, dispatches },
    "Command center overview metrics fetched"
  );
});

/**
 * Verify Blood Bank profile (Admin only).
 * PATCH /api/v1/bloodbanks/:id/verify
 */
export const verifyBloodBank = asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.role !== "admin" && req.user!.role !== "moderator") {
    throw ApiError.forbidden("Requires administrative clearance.");
  }

  const { isVerified } = req.body as { isVerified: boolean };

  const bank = await BloodBank.findByIdAndUpdate(
    req.params.id,
    { isVerified },
    { new: true }
  );

  if (!bank) throw ApiError.notFound("Blood bank not found.");

  await recordAudit({
    req,
    action: "blood_bank.verify",
    resourceType: "BloodBank",
    resourceId: req.params.id,
    after: { isVerified },
  });

  return ApiResponse.success(res, bank, "Verification status updated");
});

/**
 * Cross-Bank Inventory Reallocation Suggestions.
 * GET /api/v1/bloodbanks/reallocation/suggestions
 */
export const getReallocationSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const lat = req.query.lat ? parseFloat(req.query.lat as string) : 13.0827;
  const lng = req.query.lng ? parseFloat(req.query.lng as string) : 80.2707;
  const radiusKm = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : 50;

  const { detectRegionalImbalances } = await import("../services/reallocation.service");
  const suggestions = await detectRegionalImbalances(lat, lng, radiusKm);

  return ApiResponse.success(res, suggestions, "Predictive cross-bank reallocation suggestions computed");
});
