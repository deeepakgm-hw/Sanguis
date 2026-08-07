import { IDonor } from '../models/Donor';
import { DonorAvailability } from '../models/DonorAvailability';
import { Types } from 'mongoose';

// The standard AABB minimum interval between whole-blood donations.
// Defined here as the SINGLE canonical source — do not redefine this constant
// anywhere else in the codebase. Matching logic, dashboard display, and
// forecast calculations all import from here.
export const WHOLE_BLOOD_ELIGIBILITY_DAYS = 90;
const ELIGIBILITY_MS = WHOLE_BLOOD_ELIGIBILITY_DAYS * 24 * 60 * 60 * 1000;

export interface EligibilityResult {
  isMedicallyEligible: boolean;
  nextEligibleDate: Date | null; // null if already eligible
  daysUntilEligible: number;     // 0 if already eligible
}

/**
 * Computes medical re-eligibility from lastDonationDate.
 * Single source of truth — import from here, never recompute inline.
 */
export function computeMedicalEligibility(donor: Pick<IDonor, 'lastDonationDate'>): EligibilityResult {
  if (!donor.lastDonationDate) {
    return { isMedicallyEligible: true, nextEligibleDate: null, daysUntilEligible: 0 };
  }
  const nextEligibleMs = donor.lastDonationDate.getTime() + ELIGIBILITY_MS;
  const now = Date.now();
  if (now >= nextEligibleMs) {
    return { isMedicallyEligible: true, nextEligibleDate: null, daysUntilEligible: 0 };
  }
  const msRemaining = nextEligibleMs - now;
  const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
  return {
    isMedicallyEligible: false,
    nextEligibleDate: new Date(nextEligibleMs),
    daysUntilEligible: daysRemaining,
  };
}

export interface AvailabilityResult {
  isVoluntarilyAvailable: boolean;
  activePeriod?: { from: Date; to: Date; reason?: string };
}

/**
 * Checks if a donor currently has an active voluntary unavailability window.
 * Queries DonorAvailability collection by donorId.
 */
export async function checkVoluntaryAvailability(
  donorId: string | Types.ObjectId
): Promise<AvailabilityResult> {
  const now = new Date();
  const doc = await DonorAvailability.findOne({ donor: donorId });
  if (!doc || doc.unavailablePeriods.length === 0) {
    return { isVoluntarilyAvailable: true };
  }
  const active = doc.unavailablePeriods.find(
    (p) => p.from <= now && p.to >= now
  );
  if (active) {
    return {
      isVoluntarilyAvailable: false,
      activePeriod: { from: active.from, to: active.to, reason: active.reason },
    };
  }
  return { isVoluntarilyAvailable: true };
}

/**
 * Returns IDs of donors who are currently in a voluntary unavailability window.
 * Used by matching.service.ts to batch-filter candidates.
 */
export async function getUnavailableDonorIds(
  donorIds: (string | Types.ObjectId)[]
): Promise<Set<string>> {
  const now = new Date();
  const docs = await DonorAvailability.find({
    donor: { $in: donorIds },
    unavailablePeriods: {
      $elemMatch: { from: { $lte: now }, to: { $gte: now } },
    },
  }).select('donor');
  return new Set(docs.map((d) => d.donor.toString()));
}
