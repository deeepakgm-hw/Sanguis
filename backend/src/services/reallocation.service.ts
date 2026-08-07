import { BloodBank } from "../models/BloodBank";
import { BloodType, BLOOD_TYPES } from "../models/Donor";
import { haversineKm } from "./matching.service";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// CROSS-BANK INVENTORY REALLOCATION ENGINE
// Scans regional inventory across all verified repositories to detect
// surplus-vs-deficit imbalances and surface predictive transfer suggestions.
// ---------------------------------------------------------------------------

export interface ReallocationSuggestion {
  id: string;
  bloodType: BloodType;
  urgency: "critical" | "watch";
  sourceBank: {
    id: string;
    name: string;
    address: string;
    availableUnits: number;
  };
  targetBank: {
    id: string;
    name: string;
    address: string;
    availableUnits: number;
  };
  suggestedTransferUnits: number;
  distanceKm: number;
  estimatedTransitMinutes: number;
  rationale: string;
}

export async function detectRegionalImbalances(
  centerLat = 13.0827,
  centerLng = 80.2707,
  radiusKm = 50
): Promise<ReallocationSuggestion[]> {
  try {
    const verifiedBanks = await BloodBank.find({
      isVerified: true,
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [centerLng, centerLat] },
          $maxDistance: radiusKm * 1000,
        },
      },
    });

    if (verifiedBanks.length < 2) {
      return []; // need at least 2 banks to suggest cross-bank transfers
    }

    const suggestions: ReallocationSuggestion[] = [];

    for (const bloodType of BLOOD_TYPES) {
      // Find banks with surplus (>= 8 units) and banks with deficit (<= 2 units)
      const surplusBanks = verifiedBanks
        .map((b) => {
          const item = b.inventory.find((i) => i.bloodType === bloodType);
          return { bank: b, units: item ? item.unitsAvailable : 0 };
        })
        .filter((x) => x.units >= 8)
        .sort((a, b) => b.units - a.units);

      const deficitBanks = verifiedBanks
        .map((b) => {
          const item = b.inventory.find((i) => i.bloodType === bloodType);
          return { bank: b, units: item ? item.unitsAvailable : 0 };
        })
        .filter((x) => x.units <= 2)
        .sort((a, b) => a.units - b.units);

      // Pair surplus banks with nearest deficit banks
      for (const target of deficitBanks) {
        for (const source of surplusBanks) {
          if (source.bank._id.toString() === target.bank._id.toString()) continue;

          const [sLng, sLat] = source.bank.location.coordinates;
          const [tLng, tLat] = target.bank.location.coordinates;
          const dist = haversineKm(sLat, sLng, tLat, tLng);

          if (dist <= radiusKm) {
            const transferUnits = Math.min(Math.floor(source.units / 2), 5);
            if (transferUnits < 1) continue;

            const transitMin = Math.round((dist / 35) * 60);
            const urgency: "critical" | "watch" = target.units === 0 ? "critical" : "watch";

            suggestions.push({
              id: `REALLOC-${source.bank._id.toString().slice(-4)}-${target.bank._id.toString().slice(-4)}-${bloodType}`,
              bloodType,
              urgency,
              sourceBank: {
                id: source.bank._id.toString(),
                name: source.bank.name,
                address: source.bank.address,
                availableUnits: source.units,
              },
              targetBank: {
                id: target.bank._id.toString(),
                name: target.bank.name,
                address: target.bank.address,
                availableUnits: target.units,
              },
              suggestedTransferUnits: transferUnits,
              distanceKm: Math.round(dist * 10) / 10,
              estimatedTransitMinutes: transitMin,
              rationale: `Transfer ${transferUnits} units of ${bloodType} from ${source.bank.name} (${source.units} units) to ${target.bank.name} (${target.units} units) to prevent critical regional stockout.`,
            });
            break; // found optimal pairing for this target
          }
        }
      }
    }

    return suggestions;
  } catch (err) {
    logger.error({ err }, "Failed to detect regional inventory imbalances");
    return [];
  }
}
