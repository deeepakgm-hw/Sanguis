/**
 * requirementParser.service.ts — Sanguis AI Natural Language Blood Requirement Parser
 *
 * Secure Gemini AI-driven NLP parser that extracts structured parameters from conversational context.
 * Includes a robust rule-based local parser as an offline/error fallback.
 * CRITICAL RULE: This service ONLY parses query intent. It NEVER invents blood banks or stock data.
 */

import { BLOOD_TYPES, BloodType } from "../../models/Donor";
import { env } from "../../config/env";

export interface ParsedBloodRequirement {
  bloodGroup: BloodType | null;
  quantity: number | null;
  location: string | null;
  urgency: "normal" | "urgent" | "critical" | null;
  missingFields: string[];
  readyToSearch: boolean;
  assistantResponse: string;
  isFallback?: boolean;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

/**
 * Local rule-based parser fallback when Gemini is unavailable or not configured.
 */
export function parseLocalRequirementFallback(
  prompt: string,
  currentState?: Partial<ParsedBloodRequirement>
): ParsedBloodRequirement {
  const lower = (prompt || "").trim().toLowerCase();

  // Inherit existing state fields
  let bloodGroup: BloodType | null = currentState?.bloodGroup || null;
  let quantity: number | null = currentState?.quantity || null;
  let location: string | null = currentState?.location || null;
  let urgency: "normal" | "urgent" | "critical" | null = currentState?.urgency || null;

  // 1. Extract Blood Group
  if (/\bab\s*pos(itive)?\b|\bab\+/i.test(lower)) bloodGroup = "AB+";
  else if (/\bab\s*neg(ative)?\b|\bab\-/i.test(lower)) bloodGroup = "AB-";
  else if (/\ba\s*pos(itive)?\b|\ba\+/i.test(lower)) bloodGroup = "A+";
  else if (/\ba\s*neg(ative)?\b|\ba\-/i.test(lower)) bloodGroup = "A-";
  else if (/\bb\s*pos(itive)?\b|\bb\+/i.test(lower)) bloodGroup = "B+";
  else if (/\bb\s*neg(ative)?\b|\bb\-/i.test(lower)) bloodGroup = "B-";
  else if (/\bo\s*pos(itive)?\b|\bo\+/i.test(lower)) bloodGroup = "O+";
  else if (/\bo\s*neg(ative)?\b|\bo\-/i.test(lower)) bloodGroup = "O-";
  else {
    const match = lower.match(/\b(a|b|ab|o)[\s-]*(positive|negative|\+|\-)\b/i);
    if (match) {
      const grp = match[1].toUpperCase();
      const sign = match[2].startsWith("pos") || match[2] === "+" ? "+" : "-";
      const candidate = `${grp}${sign}` as BloodType;
      if (BLOOD_TYPES.includes(candidate)) {
        bloodGroup = candidate;
      }
    }
  }

  // 2. Extract Quantity
  const qtyMatch = lower.match(/(\d+)\s*(unit|units|bag|bags|pack|packs|bottle|bottles)/i);
  if (qtyMatch) {
    quantity = Math.max(1, Math.min(20, parseInt(qtyMatch[1], 10)));
  } else {
    // If user says "one", "two", etc.
    if (/\bone\b/i.test(lower)) quantity = 1;
    else if (/\btwo\b/i.test(lower)) quantity = 2;
    else if (/\bthree\b/i.test(lower)) quantity = 3;
  }

  // 3. Extract Urgency
  if (lower.includes("critical") || lower.includes("emergency") || lower.includes("immediately") || lower.includes("icu")) {
    urgency = "critical";
  } else if (lower.includes("urgent") || lower.includes("urgently") || lower.includes("asap") || lower.includes("fast")) {
    urgency = "urgent";
  } else if (lower.includes("normal") || lower.includes("standard")) {
    urgency = "normal";
  }

  // 4. Extract Location
  const cities = ["bengaluru", "bangalore", "chennai", "mumbai", "delhi", "hyderabad", "kolkata", "pune", "lagos"];
  for (const city of cities) {
    if (lower.includes(city)) {
      location = city.charAt(0).toUpperCase() + city.slice(1);
      if (location === "Bangalore") location = "Bengaluru";
      break;
    }
  }

  if (!location) {
    const locMatch = lower.match(/(?:near|in|around|at)\s+([a-z\s]{3,20})/i);
    if (locMatch) {
      const rawLoc = locMatch[1].trim().split(" ")[0];
      if (rawLoc && !["me", "us", "here", "blood", "units", "hospital"].includes(rawLoc.toLowerCase())) {
        location = rawLoc.charAt(0).toUpperCase() + rawLoc.slice(1);
      }
    }
  }

  // Build missing fields
  const missingFields: string[] = [];
  if (!bloodGroup) missingFields.push("bloodGroup");
  if (!quantity) missingFields.push("quantity");
  if (!location) missingFields.push("location");
  if (!urgency) missingFields.push("urgency");

  const readyToSearch = missingFields.length === 0;

  // Build natural conversational response
  let assistantResponse = "";
  if (!bloodGroup) {
    assistantResponse = "Understood. Let's find some blood banks. What blood group is required? (e.g. O+, A-)";
  } else if (!quantity) {
    assistantResponse = `Got it, blood group ${bloodGroup}. How many units are required?`;
  } else if (!location) {
    assistantResponse = `Awesome, ${quantity} unit(s) of ${bloodGroup}. Where do you need the blood? You can specify a city or choose your current location.`;
  } else if (!urgency) {
    assistantResponse = `Almost done. How urgent is this request? (normal, urgent, or critical)`;
  } else {
    assistantResponse = `Perfect. I have all parameters: ${quantity} unit(s) of ${bloodGroup} in ${location} (${urgency.toUpperCase()} priority). Let me search the database now.`;
  }

  return {
    bloodGroup,
    quantity,
    location,
    urgency,
    missingFields,
    readyToSearch,
    assistantResponse,
    isFallback: true,
  };
}

/**
 * Main AI entry point. Queries Gemini 1.5 Flash using environment keys, falling back to rule-based engine.
 */
export async function parseBloodRequirementGemini(
  prompt: string,
  history: ChatMessage[] = [],
  currentState?: Partial<ParsedBloodRequirement>
): Promise<ParsedBloodRequirement> {
  const apiKey = env.AI_API_KEY;

  // Clear context check
  const lowerPrompt = (prompt || "").trim().toLowerCase();
  if (lowerPrompt === "start over" || lowerPrompt === "new request" || lowerPrompt === "clear") {
    return {
      bloodGroup: null,
      quantity: null,
      location: null,
      urgency: null,
      missingFields: ["bloodGroup", "quantity", "location", "urgency"],
      readyToSearch: false,
      assistantResponse: "Sure, let's start a new request. What blood group is required?",
    };
  }

  // Fallback if key is missing or not configured
  if (!apiKey || apiKey === "change_me" || apiKey.trim() === "") {
    return parseLocalRequirementFallback(prompt, currentState);
  }

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // Frame the prompt for conversational structured output extraction
    const systemInstruction = `
You are the Sanguis Blood Finder Assistant. Your sole job is to parse the user's natural language requests and extract blood requirement details.
You must return a raw JSON object matching this schema:
{
  "bloodGroup": "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | null,
  "quantity": number | null,
  "location": string | null,
  "urgency": "normal" | "urgent" | "critical" | null,
  "missingFields": string[],
  "readyToSearch": boolean,
  "assistantResponse": "string asking naturally for the next missing parameter or confirming completion"
}

CRITICAL RULES:
1. Never invent missing parameters. If not provided in user prompt or current state, mark them null and list in "missingFields".
2. Never invent blood banks, hospitals, phone numbers, addresses, coordinates, or units available.
3. Allowed blood groups: A+, A-, B+, B-, AB+, AB-, O+, O-.
4. Valid urgency levels: "normal", "urgent", "critical". Map "fast", "urgently", "asap" to "urgent". Map "immediately", "emergency" to "critical".
5. Location should be a city name (e.g. Bengaluru, Chennai) or "Current Location".
6. If the user corrects a parameter (e.g., "Actually A+"), update it.
7. Return ONLY the raw JSON block. No markdown, no backticks, no comments.
`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemInstruction}\n\nAccumulated State:\n${JSON.stringify(
                currentState || {}
              )}\n\nConversation History:\n${JSON.stringify(
                history
              )}\n\nNew User Message: "${prompt}"\n\nJSON output:`,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const resJson = (await response.json()) as any;
    const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error("Empty candidate text response from Gemini");
    }

    const parsed: ParsedBloodRequirement = JSON.parse(candidateText.trim());

    // Validate extracted values
    if (parsed.bloodGroup && !BLOOD_TYPES.includes(parsed.bloodGroup as BloodType)) {
      parsed.bloodGroup = null;
    }
    if (parsed.quantity && (typeof parsed.quantity !== "number" || parsed.quantity <= 0)) {
      parsed.quantity = null;
    }
    if (parsed.urgency && !["normal", "urgent", "critical"].includes(parsed.urgency)) {
      parsed.urgency = null;
    }

    // Recalculate missingFields
    const missing: string[] = [];
    if (!parsed.bloodGroup) missing.push("bloodGroup");
    if (!parsed.quantity) missing.push("quantity");
    if (!parsed.location) missing.push("location");
    if (!parsed.urgency) missing.push("urgency");

    parsed.missingFields = missing;
    parsed.readyToSearch = missing.length === 0;

    return parsed;
  } catch (err) {
    console.warn("Gemini API call failed, falling back to local NLP parser:", err);
    return parseLocalRequirementFallback(prompt, currentState);
  }
}
