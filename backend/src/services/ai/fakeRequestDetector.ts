import { complete, parseCleanJson } from "../ai.service";
import { redis } from "../../config/redis";
import { logger } from "../../utils/logger";

export interface FakeRequestDetectorInput {
  requesterId: string;
  bloodType: string;
  isHospitalVerified: boolean;
  location?: string;
  hospitalNotes?: string;
}

export interface FakeRequestDetectorOutput {
  riskScore: number; // Scale of 1 to 10
  status: "safe" | "suspicious" | "flagged";
  reasons: string[];
  usedAI: boolean;
}

/**
 * Detects suspicious or fraudulent requests using a hybrid heuristic-AI approach.
 * Runs fast, deterministic rule-based checks first. Only calls the AI model
 * for border-case requests where the heuristic risk score is between 3 and 6.
 */
export async function detectFakeRequest(input: FakeRequestDetectorInput): Promise<FakeRequestDetectorOutput> {
  const reasons: string[] = [];
  let heuristicScore = 0;

  const { requesterId, bloodType, isHospitalVerified, location, hospitalNotes = "" } = input;

  // Heuristic 1: Missing hospital verification
  if (!isHospitalVerified) {
    heuristicScore += 3;
    reasons.push("Requester hospital is not verified in our registry");
  }

  // Heuristic 2: Missing location info
  if (!location || location.trim() === "" || location.trim().toLowerCase() === "unknown") {
    heuristicScore += 2;
    reasons.push("Missing or invalid location information");
  }

  // Heuristic 3: Excessive urgency words
  const urgencyKeywords = /\b(emergency|urgent|immediate|asap|stat|need now|dying|please help|life and death|danger)\b/gi;
  const matchCount = (hospitalNotes.match(urgencyKeywords) || []).length;
  if (matchCount > 3) {
    heuristicScore += 2;
    reasons.push("Excessive usage of emergency/urgency keywords in notes");
  }

  // Heuristic 4: Duplicate request within 10 minutes
  if (requesterId && bloodType) {
    const redisKey = `request:dup:${requesterId}:${bloodType.trim().replace(/\s+/g, "_").toLowerCase()}`;
    try {
      const isDuplicate = await redis.get(redisKey);
      if (isDuplicate) {
        heuristicScore += 3;
        reasons.push("Identical request (same blood type) submitted within the last 10 minutes");
      } else {
        // Cache the request signature for 10 minutes
        await redis.set(redisKey, "1", "EX", 600);
      }
    } catch (err) {
      logger.error({ err }, "Redis lookup failed during duplicate check heuristic");
    }
  }

  // Heuristic 5: Suspicious formatting (ALL CAPS or excessive punctuation)
  const isAllCaps = hospitalNotes.length > 15 && hospitalNotes === hospitalNotes.toUpperCase();
  const hasExcessivePunctuation = /(!|\?){3,}/.test(hospitalNotes);
  if (isAllCaps || hasExcessivePunctuation) {
    heuristicScore += 2;
    reasons.push("Suspicious notes formatting (all caps or excessive punctuation)");
  }

  // Cap base score at 10
  heuristicScore = Math.min(heuristicScore, 10);

  // If score is outside 3-6, return deterministic response without calling LLM
  if (heuristicScore < 3 || heuristicScore > 6) {
    let status: "safe" | "suspicious" | "flagged" = "safe";
    if (heuristicScore > 6) {
      status = "flagged";
    }

    return {
      riskScore: heuristicScore === 0 ? 1 : heuristicScore, // base score of at least 1
      status,
      reasons: reasons.length > 0 ? reasons : ["No suspicious markers detected."],
      usedAI: false,
    };
  }

  // If score is 3-6, utilize AI validation
  try {
    const systemInstruction =
      "You are a fraud detection assistant specializing in analyzing hospital emergency blood requests. " +
      "Analyze the details and heuristics to refine the risk score (1-10) and status ('safe', 'suspicious', 'flagged'). " +
      "Respond strictly with JSON containing riskScore (number), status (string: safe/suspicious/flagged), and reasons (array of strings).";

    const prompt = `
Analyze this request for potential fraud or spam:
- Blood Type: ${bloodType}
- Hospital Notes: "${hospitalNotes}"
- Location: ${location || "Not Provided"}
- Hospital Verified: ${isHospitalVerified}
- Pre-flagged Heuristics: ${JSON.stringify(reasons)}
- Initial Heuristic Risk Score: ${heuristicScore} (Range 3-6 triggers AI evaluation)

Provide your assessment. If you believe the request is legitimate despite minor flags, you can lower the score/status. If it looks spammy/fabricated, elevate it.

Return ONLY a valid JSON object matching this structure:
{
  "riskScore": number,
  "status": "safe" | "suspicious" | "flagged",
  "reasons": ["Updated list of reason strings explaining this rating"]
}
`;

    const aiRawResponse = await complete(prompt, {
      systemInstruction,
      jsonMode: true,
    });

    const parsed = parseCleanJson<any>(aiRawResponse);
    return {
      riskScore: typeof parsed.riskScore === "number" ? parsed.riskScore : heuristicScore,
      status: ["safe", "suspicious", "flagged"].includes(parsed.status) ? parsed.status : "suspicious",
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : reasons,
      usedAI: true,
    };
  } catch (err) {
    logger.error({ err, input }, "Error in fakeRequestDetector AI call, falling back to heuristics");
    return {
      riskScore: heuristicScore,
      status: "suspicious",
      reasons,
      usedAI: false, // marked false as AI failed
    };
  }
}
