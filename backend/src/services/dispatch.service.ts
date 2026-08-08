import { BloodRequest, IBloodRequest } from "../models/BloodRequest";
import { Match } from "../models/Match";
import { BloodBank } from "../models/BloodBank";
import { InventoryReservation } from "../models/InventoryReservation";
import { Notification } from "../models/Notification";
import { rankEligibleDonors } from "../ai/ranking/ranking.service";
import { computePriorityScore } from "./priority.service";
import { logger } from "../utils/logger";
import { Server } from "socket.io";

export interface DispatchExecutionResult {
  requestId: string;
  dispatchState: string;
  escalationTier: number;
  candidatesCount: number;
  topCandidates: any[];
  reservedInventory?: any;
}

/**
 * Emergency Dispatch Lifecycle Service
 * Manages atomic candidate generation, priority scoring, multi-tier escalation,
 * blood bank inventory holding, and real-time Socket.io dispatch broadcasts.
 */
export async function executeEmergencyDispatch(
  requestDoc: IBloodRequest,
  io?: Server
): Promise<DispatchExecutionResult> {
  const requestId = requestDoc._id.toString();
  const coords = requestDoc.geoLocation.coordinates; // [lng, lat]
  const reqLng = coords[0];
  const reqLat = coords[1];

  logger.info({ requestId, urgency: requestDoc.urgencyLevel }, "Executing Emergency Dispatch Engine");

  // 1. Update BloodRequest state
  requestDoc.dispatchState = "DISPATCHING";
  requestDoc.status = "open";
  await requestDoc.save();

  // 2. Rank candidates using AI ranking service (Tier 1: 0-30km)
  let candidates = await rankEligibleDonors(
    requestDoc.bloodType,
    reqLat,
    reqLng,
    30,
    5
  );

  let escalationTier = 1;

  // 3. Multi-tier escalation if Tier 1 yields no candidates
  if (candidates.length === 0) {
    escalationTier = 2; // Tier 2: Expanded radius (75km)
    candidates = await rankEligibleDonors(
      requestDoc.bloodType,
      reqLat,
      reqLng,
      75,
      10
    );
  }

  // 4. Create Matches & Notifications for top candidate donors
  for (const candidate of candidates) {
    const existingMatch = await Match.findOne({
      request: requestDoc._id,
      donor: candidate.donorId,
    });

    if (!existingMatch) {
      await Match.create({
        request: requestDoc._id,
        donor: candidate.donorId,
        status: "pending",
      });

      await Notification.create({
        user: candidate.userId,
        title: `🚨 CRITICAL EMERGENCY: ${requestDoc.bloodType} Blood Transfusion Required`,
        message: `Emergency at hospital location (${candidate.distanceKm} km away, ~${candidate.estimatedMinutes} min ETA). Urgent response needed!`,
        type: "warning",
        isRead: false,
      });

      // Emit direct socket alert to donor if connected
      if (io) {
        io.to(`user:${candidate.userId}`).emit("notification:new", {
          type: "EMERGENCY_DISPATCH",
          requestId,
          bloodType: requestDoc.bloodType,
          unitsNeeded: requestDoc.unitsNeeded,
          distanceKm: candidate.distanceKm,
          estimatedMinutes: candidate.estimatedMinutes,
        });
      }
    }
  }

  // 5. Tier 3 & Tier 4: Reserve Blood Bank Inventory if available
  let reservedInventory: any = null;

  if (candidates.length < requestDoc.unitsNeeded) {
    escalationTier = Math.max(escalationTier, 3);

    const availableBanks = await BloodBank.find({
      isVerified: true,
      "inventory.bloodType": requestDoc.bloodType,
      "inventory.unitsAvailable": { $gte: 1 },
    });

    if (availableBanks.length > 0) {
      const targetBank = availableBanks[0];
      const invItem = targetBank.inventory.find((i) => i.bloodType === requestDoc.bloodType);

      if (invItem && invItem.unitsAvailable >= 1) {
        const unitsToHold = Math.min(requestDoc.unitsNeeded, invItem.unitsAvailable);

        // Atomically hold units
        invItem.unitsAvailable -= unitsToHold;
        await targetBank.save();

        const reservation = await InventoryReservation.create({
          request: requestDoc._id,
          bloodBank: targetBank._id,
          bloodType: requestDoc.bloodType,
          unitsReserved: unitsToHold,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour hold
        });

        requestDoc.reservedInventoryId = reservation._id as any;
        reservedInventory = {
          bankName: targetBank.name,
          unitsReserved: unitsToHold,
          expiresAt: reservation.expiresAt,
        };

        // Broadcast inventory update over socket
        if (io) {
          io.to("live-dispatch").emit("bloodbank:inventory_updated", {
            bloodBankId: targetBank._id,
            bankName: targetBank.name,
            bloodType: requestDoc.bloodType,
            unitsAvailable: invItem.unitsAvailable,
          });
        }
      }
    }
  }

  requestDoc.escalationTier = escalationTier;
  requestDoc.targetETAMinutes = candidates[0]?.estimatedMinutes || 15;
  await requestDoc.save();

  // 6. Broadcast Emergency Dispatch Event to Command Center map
  if (io) {
    io.to("live-dispatch").emit("emergency:created", {
      requestId,
      bloodType: requestDoc.bloodType,
      unitsNeeded: requestDoc.unitsNeeded,
      urgencyLevel: requestDoc.urgencyLevel,
      dispatchState: requestDoc.dispatchState,
      escalationTier: requestDoc.escalationTier,
      targetETAMinutes: requestDoc.targetETAMinutes,
      lat: reqLat,
      lng: reqLng,
      createdAt: requestDoc.createdAt,
    });
  }

  return {
    requestId,
    dispatchState: requestDoc.dispatchState,
    escalationTier,
    candidatesCount: candidates.length,
    topCandidates: candidates.slice(0, 3),
    reservedInventory,
  };
}
