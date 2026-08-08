import { rankEligibleDonors } from "../ranking/ranking.service";
import { computeShortageForecast } from "../forecast/shortageForecast.service";
import { detectNetworkAnomalies } from "../anomaly/anomaly.service";
import { BloodType } from "../../models/Donor";

export interface CopilotResponse {
  answer: string;
  suggestedActions: string[];
  dataRef?: any;
}

/**
 * Emergency Operations AI Copilot
 * Provides natural language emergency command guidance by invoking backend tool functions safely.
 */
export async function processCopilotQuery(
  query: string,
  userRole: string,
  userCity = "Bengaluru"
): Promise<CopilotResponse> {
  const normalizedQuery = query.toLowerCase();

  if (normalizedQuery.includes("shortage") || normalizedQuery.includes("forecast") || normalizedQuery.includes("units")) {
    const forecast = await computeShortageForecast("O-", 12.9716, 77.5946, 50, 7);
    return {
      answer: `O- Blood forecast analysis for ${userCity}: Current bank inventory is ${forecast.currentBankSupplyUnits} units. Projected 7-day demand is ${forecast.predictedDemandUnits} units. Shortage risk is rated ${forecast.riskTier} (${forecast.shortageProbabilityPercent}% probability).`,
      suggestedActions: [
        "Pre-position 15 units of O- blood from regional central hub",
        "Broadcast targeted notification to O- donors within 25 km",
        "View Live Shortage Heatmap on Command Center",
      ],
      dataRef: forecast,
    };
  }

  if (normalizedQuery.includes("contact") || normalizedQuery.includes("who") || normalizedQuery.includes("donor")) {
    const donors = await rankEligibleDonors("O-", 12.9716, 77.5946, 50, 3);
    const topDonor = donors[0];

    return {
      answer: topDonor
        ? `I recommend contacting ${topDonor.name} (${topDonor.bloodType}) first. They are ${topDonor.distanceKm} km away with an estimated arrival time of ${topDonor.estimatedMinutes} minutes and a ${topDonor.responseProbabilityPercent}% predicted response probability.`
        : "No eligible donors currently match the query criteria within the 50 km emergency search radius.",
      suggestedActions: [
        "Trigger Emergency Dispatch for Top 3 Ranked Candidates",
        "Expand search radius to 75 km",
        "Check Blood Bank reserve availability",
      ],
      dataRef: donors,
    };
  }

  if (normalizedQuery.includes("anomaly") || normalizedQuery.includes("alert") || normalizedQuery.includes("spike")) {
    const anomalies = await detectNetworkAnomalies();
    return {
      answer: `Detected ${anomalies.length} network anomalies across the regional emergency network. ${anomalies[0]?.message || "All operational metrics within standard parameters."}`,
      suggestedActions: [
        "Acknowledge High-Severity Alerts",
        "Review Regional Dispatch Queue",
      ],
      dataRef: anomalies,
    };
  }

  // General Emergency Assistant Fallback Response
  return {
    answer: `Emergency Operations Copilot: Online and tracking live network status for ${userCity}. You can ask about shortage forecasts, top donor dispatch recommendations, or active network anomaly alerts.`,
    suggestedActions: [
      "Will we have enough O- blood tomorrow?",
      "Who should I contact first for emergency transfusion?",
      "Are there any active demand spikes?",
    ],
  };
}
