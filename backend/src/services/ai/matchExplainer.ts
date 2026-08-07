import { complete } from "../ai.service";
import { logger } from "../../utils/logger";

export interface MatchExplainerInput {
  distanceKm: number;
  bloodTypeRequested: string;
  donorBloodType: string;
  responseRate: number; // e.g. 94 or 0.94
  donationsCompleted: number;
}

/**
 * Generates a concise, high-impact matching explanation sentence.
 * Calls Gemini LLM to construct a professional, user-friendly sentence,
 * with a reliable template-based fallback if the AI is unavailable.
 */
export async function explainMatch(input: MatchExplainerInput): Promise<string> {
  const { distanceKm, bloodTypeRequested, donorBloodType, responseRate, donationsCompleted } = input;
  
  // Normalize response rate
  const ratePercentage = responseRate <= 1.0 && responseRate > 0 ? responseRate * 100 : responseRate;
  
  // Basic compatibility helper
  const isExact = bloodTypeRequested.trim().toLowerCase().replace(/[\s-]/g, "") === 
                  donorBloodType.trim().toLowerCase().replace(/[\s-]/g, "");
  const matchType = isExact ? `exact ${donorBloodType} match` : `compatible ${donorBloodType} match`;

  // Define fallback template matching the user's required style
  const fallbackSentence = `Matched because donor is ${distanceKm.toFixed(1)} km away, ${matchType}, ${ratePercentage.toFixed(0)}% response rate and donated ${donationsCompleted} time${donationsCompleted === 1 ? "" : "s"}.`;

  try {
    const systemInstruction = 
      "You are a medical communications assistant. Your task is to write EXACTLY one concise, " +
      "friendly, and professional sentence explaining why a blood donor was matched with a request. " +
      "Never generate multiple sentences or additional explanations.";

    const prompt = `
Generate ONE concise explanation sentence matching this style and format:
"Matched because donor is 2.1 km away, exact O-negative match, 94% response rate and donated 18 times."

Donor details:
- Distance from hospital: ${distanceKm.toFixed(1)} km
- Requested blood type: ${bloodTypeRequested}
- Donor's blood type: ${donorBloodType}
- Match type: ${matchType}
- Donor response rate: ${ratePercentage.toFixed(0)}%
- Number of previous successful donations: ${donationsCompleted}

Important: Return ONLY the single explanation sentence. No other text, no markdown styling, no quotes.
`;

    const generatedExplanation = await complete(prompt, {
      systemInstruction,
    });

    // Post-process to ensure it's a single sentence and clean
    const cleaned = generatedExplanation.replace(/["']/g, "").trim();
    if (cleaned.length > 10 && cleaned.split(".").filter(s => s.trim().length > 0).length <= 2) {
      return cleaned;
    }

    return fallbackSentence;
  } catch (err) {
    logger.error({ err, input }, "Error in matchExplainer AI call, returning fallback template");
    return fallbackSentence;
  }
}
