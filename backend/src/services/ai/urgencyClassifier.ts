import { complete, parseCleanJson } from "../ai.service";
import { logger } from "../../utils/logger";

export interface UrgencyClassifierInput {
  bloodType: string;
  unitsRequested: number;
  hospitalNotes: string;
}

export interface UrgencyClassifierOutput {
  urgencyLevel: "critical" | "urgent" | "routine";
  reasoning: string;
}

/**
 * Classifies the urgency of a blood request based on units requested, clinical notes, and blood type rarity.
 * Baseline urgency is programmatically and prompt-level elevated for critical types (O- and AB-).
 */
export async function classifyUrgency(input: UrgencyClassifierInput): Promise<UrgencyClassifierOutput> {
  const fallbackResponse: UrgencyClassifierOutput = {
    urgencyLevel: "urgent",
    reasoning: "Fallback due to AI unavailable.",
  };

  try {
    const { bloodType, unitsRequested, hospitalNotes } = input;
    
    // Normalize blood type check
    const normalizedType = bloodType.trim().toLowerCase();
    const isCriticalBloodType = 
      normalizedType === "o negative" || 
      normalizedType === "o-" || 
      normalizedType === "o neg" || 
      normalizedType === "ab negative" || 
      normalizedType === "ab-" || 
      normalizedType === "ab neg";

    const systemInstruction = 
      "You are an expert emergency medicine triage assistant. " +
      "Your job is to analyze blood requests and classify their urgency level as 'critical', 'urgent', or 'routine'. " +
      "Provide a JSON response with keys 'urgencyLevel' (string: only 'critical', 'urgent', or 'routine') and 'reasoning' (string). " +
      "Be decisive, brief, and objective.";

    const prompt = `
Analyze the following blood request details and classify the urgency:
- Blood Type: ${bloodType}
- Units Requested: ${unitsRequested}
- Hospital Notes: ${hospitalNotes}

CRITICAL RULES:
1. If the blood type is O Negative (universal donor) or AB Negative (extremely rare), baseline urgency MUST be elevated (minimum level of 'urgent', and 'critical' if notes indicate active bleeding/trauma/ER).
2. Look for emergency markers like "ER", "ICU", "active bleeding", "surgery", "trauma", "stat", "immediately", "accident".
3. Return ONLY a valid JSON object matching this structure:
{
  "urgencyLevel": "critical" | "urgent" | "routine",
  "reasoning": "A concise explanation of why this urgency level was selected based on clinical details and blood type rarity."
}
`;

    const rawResponse = await complete(prompt, {
      systemInstruction,
      jsonMode: true,
    });

    const result = parseCleanJson<UrgencyClassifierOutput>(rawResponse);

    // Post-processing safety verification: enforce business rule that baseline urgency must increase for O- / AB-
    if (isCriticalBloodType && result.urgencyLevel === "routine") {
      result.urgencyLevel = "urgent";
      result.reasoning = `[System Override] Elevated urgency to urgent due to rare/universal blood type (${bloodType}). original AI reasoning: ${result.reasoning}`;
    }

    return {
      urgencyLevel: result.urgencyLevel || "urgent",
      reasoning: result.reasoning || "Classification generated successfully.",
    };
  } catch (err) {
    logger.error({ err, input }, "Error in urgencyClassifier service");
    return fallbackResponse;
  }
}
