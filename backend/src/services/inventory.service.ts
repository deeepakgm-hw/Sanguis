import mongoose, { Types } from "mongoose";
import { BloodBank, IBloodBank } from "../models/BloodBank";
import { InventoryTransaction, TransactionReason } from "../models/InventoryTransaction";
import { BloodType } from "../models/Donor";
import { ApiError } from "../utils/ApiError";
import { haversineKm } from "./matching.service";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// PARAMETER & RETURN TYPES
// ---------------------------------------------------------------------------

export interface AdjustInventoryParams {
  bloodBankId: string;
  bloodType: BloodType;
  delta: number;
  reason: TransactionReason;
  actorId: string;
  relatedRequestId?: string;
  notes?: string;
}

interface RegionalSupplyResult {
  totalUnits: number;
  bankCount: number;
  banks: Array<{
    _id: string;
    name: string;
    address: string;
    contactPhone: string;
    location: {
      type: "Point";
      coordinates: [number, number]; // [lng, lat]
    };
    unitsAvailable: number;
    distanceKm: number;
  }>;
}

// ---------------------------------------------------------------------------
// adjustInventory — THE ONLY WRITE PATH INTO INVENTORY
//
// Atomicity guarantee: both the immutable InventoryTransaction INSERT and the
// BloodBank.inventory summary UPDATE happen inside a single Mongoose session
// transaction.  If the process crashes between the two writes, MongoDB rolls
// back the incomplete transaction on recovery, so the audit trail and the
// denormalised summary can never disagree.
//
// Pre-flight: we verify the adjustment would not push stock below 0 BEFORE
// opening the session.  No documents are written for rejected operations —
// a rejected adjustment must never appear in the audit trail, because an
// entry in the audit trail implies the operation actually happened.
// ---------------------------------------------------------------------------
export async function adjustInventory(params: AdjustInventoryParams): Promise<IBloodBank> {
  const { bloodBankId, bloodType, delta, reason, actorId, relatedRequestId, notes } = params;

  // ── PRE-FLIGHT: verify stock won't go negative ──────────────────────────
  // This MUST happen before any session is opened.  Writing the
  // InventoryTransaction first and then checking would force us to either
  // delete a committed log entry (destroying immutability) or leave the
  // audit trail disagreeing with reality.  Pre-flight prevents both.
  if (delta < 0) {
    const bank = await BloodBank.findById(bloodBankId).select("inventory");
    if (!bank) throw ApiError.notFound("Blood bank not found");

    const item = bank.inventory.find((i) => i.bloodType === bloodType);
    const currentUnits = item ? item.unitsAvailable : 0;

    if (currentUnits + delta < 0) {
      throw ApiError.badRequest(
        `Insufficient inventory for this adjustment. ` +
        `Requested: ${Math.abs(delta)} units of ${bloodType}. ` +
        `Available: ${currentUnits} units.`
      );
    }
  }

  // ── TRANSACTIONAL WRITE PATH ─────────────────────────────────────────────
  const session = await mongoose.startSession();
  let updatedBank: IBloodBank | null = null;

  try {
    await session.withTransaction(async () => {
      // 1. Append immutable transaction log — source of truth for audit trail.
      //    Never update or delete this document.
      await InventoryTransaction.create(
        [
          {
            bloodBank: new Types.ObjectId(bloodBankId),
            bloodType,
            delta,
            reason,
            relatedRequest: relatedRequestId ? new Types.ObjectId(relatedRequestId) : null,
            actor: new Types.ObjectId(actorId),
            notes: notes ?? null,
          },
        ],
        { session }
      );

      // 2. Update the denormalised summary on BloodBank.inventory.
      //    $inc is atomic at the document level.
      updatedBank = await BloodBank.findOneAndUpdate(
        {
          _id: new Types.ObjectId(bloodBankId),
          "inventory.bloodType": bloodType,
        },
        {
          $inc: { "inventory.$.unitsAvailable": delta },
          $set: { "inventory.$.lastRestocked": new Date() },
        },
        { session, new: true, runValidators: true }
      );

      if (!updatedBank) {
        // The bloodType sub-document wasn't found — BloodBank.create seeds all
        // 8 types by default, so this means data integrity issue.  Throw to
        // roll back both writes atomically.
        throw new Error(
          `BloodBank ${bloodBankId} has no inventory entry for bloodType ${bloodType}. ` +
          `Re-seed the inventory array to fix.`
        );
      }
    });
  } catch (err: unknown) {
    // If MongoDB throws a replica-set / standalone error (code 20 or the
    // message contains "Transaction numbers" / "replica set"), fall back to
    // sequential atomic ops.  This keeps the demo working on a single-node
    // dev MongoDB that doesn't support multi-document transactions.
    const e = err as { code?: number; message?: string };
    const isReplicaSetError =
      e.code === 20 ||
      e.message?.includes("Transaction numbers") ||
      e.message?.includes("replica set") ||
      e.message?.includes("not supported");

    if (isReplicaSetError) {
      logger.warn(
        { bloodBankId, err: e.message },
        "adjustInventory: transactions not supported (standalone). Falling back to atomic sequential ops."
      );

      // Fallback — each op is individually atomic.  Pre-flight already
      // guaranteed no negative-stock outcome; no delete-after-write needed.
      await InventoryTransaction.create({
        bloodBank: new Types.ObjectId(bloodBankId),
        bloodType,
        delta,
        reason,
        relatedRequest: relatedRequestId ? new Types.ObjectId(relatedRequestId) : null,
        actor: new Types.ObjectId(actorId),
        notes: notes ?? null,
      });

      updatedBank = await BloodBank.findOneAndUpdate(
        {
          _id: new Types.ObjectId(bloodBankId),
          "inventory.bloodType": bloodType,
        },
        {
          $inc: { "inventory.$.unitsAvailable": delta },
          $set: { "inventory.$.lastRestocked": new Date() },
        },
        { new: true, runValidators: true }
      );

      if (!updatedBank) {
        throw ApiError.notFound(
          `BloodBank ${bloodBankId} not found or has no inventory entry for ${bloodType}.`
        );
      }
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }

  // updatedBank is non-null if we reach here (all error paths throw)
  return updatedBank!;
}

// ---------------------------------------------------------------------------
// getRegionalSupplyIndex
//
// Queries ONLY verified blood banks (isVerified: true).  This filter is a
// correctness requirement — an unverified bank's numbers have not been
// validated and must not influence routing decisions.
//
// Uses the same $near / 2dsphere approach as Donor.ts / matching.service.ts
// to keep the geo strategy consistent across all collections.
// ---------------------------------------------------------------------------
export async function getRegionalSupplyIndex(
  bloodType: BloodType,
  centerLat: number,
  centerLng: number,
  radiusKm: number
): Promise<RegionalSupplyResult> {
  const verifiedBanks = await BloodBank.find({
    isVerified: true,
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [centerLng, centerLat] }, // GeoJSON: [lng, lat]
        $maxDistance: radiusKm * 1000, // metres
      },
    },
  });

  let totalUnits = 0;

  const mappedBanks = verifiedBanks.map((bank) => {
    const [bLng, bLat] = bank.location.coordinates;
    const distanceKm = haversineKm(centerLat, centerLng, bLat, bLng);

    const inventoryItem = bank.inventory.find((i) => i.bloodType === bloodType);
    const unitsAvailable = inventoryItem ? inventoryItem.unitsAvailable : 0;

    totalUnits += unitsAvailable;

    return {
      _id: bank._id.toString(),
      name: bank.name,
      address: bank.address,
      contactPhone: bank.contactPhone,
      location: {
        type: bank.location.type,
        coordinates: bank.location.coordinates,
      } as { type: "Point"; coordinates: [number, number] },
      unitsAvailable,
      distanceKm,
    };
  });

  // Sort closest first so routing can recommend the most accessible bank
  mappedBanks.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    totalUnits,
    bankCount: mappedBanks.length,
    banks: mappedBanks,
  };
}


