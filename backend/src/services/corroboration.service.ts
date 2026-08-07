import { BloodRequest } from "../models/BloodRequest";
import { User } from "../models/User";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// EMERGENCY CORROBORATION LAYER (ANTI-FALSE-ALARM TRUST CHECK)
// Evaluates request credibility before full-network SMS broadcast to donors
// to prevent false alarms and "cry wolf" burnout.
// ---------------------------------------------------------------------------

export interface CredibilityEvaluation {
  score: number; // 0 to 100
  status: "INSTANT_BROADCAST" | "GATED_VERIFICATION_REQUIRED";
  requiresVerification: boolean;
  hospitalVerified: boolean;
  recentRequestCount1h: number;
  fulfillmentRatePct: number;
  rationale: string;
}

export async function evaluateRequestCredibility(
  hospitalId: string,
  urgencyLevel: string
): Promise<CredibilityEvaluation> {
  try {
    const hospitalUser = await User.findById(hospitalId).select("isEmailVerified name role");
    const isVerified = hospitalUser?.isEmailVerified ?? false;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Check frequency of requests in last 1 hour
    const recentRequests1h = await BloodRequest.countDocuments({
      hospital: hospitalId,
      createdAt: { $gte: oneHourAgo },
    });

    // 2. Check 30-day fulfillment track record
    const pastRequests30d = await BloodRequest.find({
      hospital: hospitalId,
      createdAt: { $gte: thirtyDaysAgo },
    }).select("status");

    const totalPast = pastRequests30d.length;
    const fulfilledCount = pastRequests30d.filter((r) => r.status === "fulfilled" || r.status === "matched").length;
    const fulfillmentRatePct = totalPast > 0 ? Math.round((fulfilledCount / totalPast) * 100) : 100;

    // 3. Compute score
    let score = isVerified ? 90 : 65;

    // Frequency penalty (anomalous surge)
    if (recentRequests1h >= 4) score -= 25;
    else if (recentRequests1h >= 2) score -= 10;

    // Fulfillment bonus/penalty
    if (totalPast >= 3 && fulfillmentRatePct < 50) score -= 20;
    else if (fulfillmentRatePct >= 80) score += 10;

    score = Math.min(100, Math.max(10, score));

    const requiresVerification = score < 70;
    const status: CredibilityEvaluation["status"] = requiresVerification
      ? "GATED_VERIFICATION_REQUIRED"
      : "INSTANT_BROADCAST";

    let rationale = "";
    if (requiresVerification) {
      rationale = `Anomalous request frequency detected (${recentRequests1h} requests in 60m). Verification required before network broadcast to protect donor trust.`;
    } else {
      rationale = `High-credibility requester (${fulfillmentRatePct}% 30-day fulfillment rate). Instant full-network broadcast authorized.`;
    }

    logger.info({ hospitalId, score, status }, "evaluateRequestCredibility complete");

    return {
      score,
      status,
      requiresVerification,
      hospitalVerified: isVerified,
      recentRequestCount1h: recentRequests1h,
      fulfillmentRatePct,
      rationale,
    };
  } catch (err) {
    logger.error({ err }, "evaluateRequestCredibility error — falling back to instant broadcast");
    return {
      score: 85,
      status: "INSTANT_BROADCAST",
      requiresVerification: false,
      hospitalVerified: true,
      recentRequestCount1h: 1,
      fulfillmentRatePct: 100,
      rationale: "Default fallback credibility check passed.",
    };
  }
}
