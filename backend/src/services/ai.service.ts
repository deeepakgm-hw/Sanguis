import { logger } from "../utils/logger";

/**
 * Service to execute LLM calls using the Gemini Developer API.
 * Uses a robust fetch-based client to avoid introducing extra external dependency complications.
 * Automatically falls back to high-fidelity rule-based mocks when GEMINI_API_KEY is not configured
 * to ensure offline resilience and seamless developer onboarding.
 */

interface CompleteOptions {
  systemInstruction?: string;
  jsonMode?: boolean;
}

export async function complete(prompt: string, options: CompleteOptions = {}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    logger.warn("GEMINI_API_KEY is not configured. Falling back to local mock response generation.");
    return generateMockResponse(prompt, options);
  }

  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body: Record<string, any> = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
  };

  if (options.systemInstruction) {
    body.systemInstruction = {
      parts: [
        {
          text: options.systemInstruction,
        },
      ],
    };
  }

  if (options.jsonMode) {
    body.generationConfig = {
      responseMimeType: "application/json",
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    logger.error({ status: response.status, error: errText }, "Gemini API call failed");
    throw new Error(`Gemini API error: ${response.statusText} (${errText})`);
  }

  const result = (await response.json()) as any;
  const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!generatedText) {
    logger.error({ result }, "Invalid response format from Gemini API");
    throw new Error("Invalid response received from Gemini API");
  }

  return generatedText.trim();
}

/**
 * Generates high-fidelity mock responses for development/offline testing.
 */
function generateMockResponse(prompt: string, options: CompleteOptions): string {
  const promptLower = prompt.toLowerCase();

  // Normalize string: strip spaces, hyphens, underscores, and common punctuation
  const normalized = promptLower.replace(/[\s\-_,.:;?!"'()\[\]{}]/g, "");

  // 1. Mock output for Urgency Classifier
  const isUrgencyPrompt = normalized.includes("urgency") && (normalized.includes("bloodtype") || normalized.includes("bloodrequest"));
  if (isUrgencyPrompt) {
    // Isolate the user details part from the CRITICAL RULES instructions
    const detailsPart = prompt.split(/critical rules:/i)[0] || prompt;
    const detailsLower = detailsPart.toLowerCase();
    const detailsNormalized = detailsLower.replace(/[\s\-_,.:;?!"'()\[\]{}]/g, "");

    // Check if critical blood type: O Negative or AB Negative in the isolated details
    const isCriticalType = 
      detailsNormalized.includes("onegative") || 
      detailsNormalized.includes("abnegative") || 
      detailsNormalized.includes("oneg") || 
      detailsNormalized.includes("abneg") ||
      /\bo-?\b/i.test(detailsLower) || 
      /\bab-?\b/i.test(detailsLower);

    const hasEmergencyKeywords = /\b(er|emergency|bleeding|accident|icu|critical|dying|trauma|surgery|stat|immediate)\b/i.test(detailsLower);

    let urgencyLevel = "routine";
    let reasoning = "The patient's condition description indicates routine requirements and stable vitals.";

    if (isCriticalType && hasEmergencyKeywords) {
      urgencyLevel = "critical";
      reasoning = "Critical blood type (O/AB Negative) requested alongside emergency room / critical care indicators.";
    } else if (hasEmergencyKeywords) {
      urgencyLevel = "critical";
      reasoning = "Emergency keywords detected in notes, suggesting immediate medical intervention is required.";
    } else if (isCriticalType) {
      urgencyLevel = "urgent";
      reasoning = "Urgency elevated due to request for rare/universal negative blood type (O Negative or AB Negative).";
    }

    if (options.jsonMode) {
      return JSON.stringify({ urgencyLevel, reasoning });
    }
    return `Urgency: ${urgencyLevel}\nReasoning: ${reasoning}`;
  }

  // 2. Mock output for Fake Request Detector
  const isFakePrompt = normalized.includes("suspicious") || normalized.includes("risk") || normalized.includes("fake") || normalized.includes("fraud");
  if (isFakePrompt) {
    // Isolate details section from assessment instructions
    const detailsPart = prompt.split(/provide your assessment/i)[0] || prompt;
    const detailsLower = detailsPart.toLowerCase();
    const detailsNormalized = detailsLower.replace(/[\s\-_,.:;?!"'()\[\]{}]/g, "");

    // Determine risk level based on keywords from isolated details
    const missingVerify = detailsNormalized.includes("missinghospitalverification") || 
                          detailsNormalized.includes("verifiedfalse") ||
                          /hospital verified:\s*false/i.test(detailsPart);
    const missingLoc = detailsNormalized.includes("missinglocation") || 
                       detailsNormalized.includes("locationunknown") ||
                       /location:\s*not provided/i.test(detailsPart) ||
                       /location:\s*""/i.test(detailsPart);
    const duplicate = detailsNormalized.includes("duplicate") || detailsNormalized.includes("identicalrequest");
    
    let riskScore = 1;
    let status = "safe";
    const reasons: string[] = [];

    if (missingVerify) {
      riskScore += 2;
      reasons.push("Hospital status not verified in database.");
    }
    if (missingLoc) {
      riskScore += 2;
      reasons.push("Location coordinates or address missing.");
    }
    if (duplicate) {
      riskScore += 3;
      reasons.push("Multiple similar requests received in quick succession.");
    }

    if (riskScore >= 7) {
      status = "flagged";
    } else if (riskScore >= 3) {
      status = "suspicious";
    }

    if (options.jsonMode) {
      return JSON.stringify({ riskScore, status, reasons });
    }
    return `Risk Score: ${riskScore}\nStatus: ${status}\nReasons: ${reasons.join(", ")}`;
  }

  // 3. Mock output for Match Explainer
  const isMatchExplainerPrompt = normalized.includes("distance") && (normalized.includes("response") || normalized.includes("explain"));
  if (isMatchExplainerPrompt) {
    // Isolate actual details section by splitting on "donor details:" to avoid matching the instructions example sentence
    const detailsPart = prompt.split(/donor details:/i)[1] || prompt;

    // Extract values with flexible regexes
    const distMatch = detailsPart.match(/distance[^\n]*?(\d+(\.\d+)?)\s*km/i) || detailsPart.match(/(\d+(\.\d+)?)\s*km/i);
    const distance = distMatch ? distMatch[1] : "2.5";
    
    const respMatch = detailsPart.match(/response rate[^\n]*?(\d+)%/i) || detailsPart.match(/(\d+)%\s*response/i) || detailsPart.match(/(\d+)%/i);
    const responseRate = respMatch ? respMatch[1] : "95";

    const donMatch = detailsPart.match(/donations[^\n]*?(\d+)/i) || detailsPart.match(/donated\s*(\d+)/i) || detailsPart.match(/(\d+)\s*donations/i);
    const donations = donMatch ? donMatch[1] : "10";

    const bloodMatch = detailsPart.match(/donor's\s*blood\s*type:\s*([abodeABODE+\-]+)/i) || detailsPart.match(/blood type\s*([abodeABODE+\-]+)/i);
    const bloodType = bloodMatch ? bloodMatch[1].trim() : "O-";

    return `Matched because donor is ${distance} km away, exact ${bloodType} match, ${responseRate}% response rate and donated ${donations} times.`;
  }

  // Default fallback JSON/Text
  if (options.jsonMode) {
    return JSON.stringify({
      message: "Fallback mock response",
      info: "GEMINI_API_KEY was not provided.",
    });
  }
  return "This is an AI generated fallback response since GEMINI_API_KEY is not defined.";
}

/**
 * Parses JSON response from Gemini, cleaning markdown code blocks or preambles if present.
 */
export function parseCleanJson<T>(raw: string): T {
  let text = raw.trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    text = text.substring(start, end + 1);
  }
  return JSON.parse(text) as T;
}

