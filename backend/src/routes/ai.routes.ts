import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { rankEligibleDonors } from "../ai/ranking/ranking.service";
import { computeShortageForecast } from "../ai/forecast/shortageForecast.service";
import { detectNetworkAnomalies } from "../ai/anomaly/anomaly.service";
import { processCopilotQuery } from "../ai/copilot/copilot.service";
import { parseBloodRequirementGemini } from "../ai/copilot/requirementParser.service";
import { BloodType } from "../models/Donor";
import {
  summarizeText,
  checkUrlSafety,
  classifyUrgency,
  detectFakeRequest,
  calculateTrustScore,
  generateMatchExplanation,
} from "../controllers/ai.controller";
import { classifyUrgencySchema } from "../validators/urgency.validator";
import { detectFakeRequestSchema } from "../validators/fakeRequest.validator";
import { generateMatchExplanationSchema } from "../validators/matchExplainer.validator";

const router = Router();

// Existing endpoints
router.post("/summarize", requireAuth, summarizeText);
router.post("/check-url", requireAuth, checkUrlSafety);

// New endpoints
router.post("/urgency", requireAuth, validate(classifyUrgencySchema), classifyUrgency);
router.post("/fake-check", requireAuth, validate(detectFakeRequestSchema), detectFakeRequest);
router.get("/trust-score/:donorId", requireAuth, calculateTrustScore);
router.post("/explain-match", requireAuth, validate(generateMatchExplanationSchema), generateMatchExplanation);
// 1. AI Donor Ranking Endpoint
router.get(
  "/ranking",
  asyncHandler(async (req: Request, res: Response) => {
    const bloodType = ((req.query.bloodType as string) || "O+") as BloodType;
    const lat = Number(req.query.lat) || 12.9716;
    const lng = Number(req.query.lng) || 77.5946;
    const radiusKm = Number(req.query.radiusKm) || 50;

    const candidates = await rankEligibleDonors(bloodType, lat, lng, radiusKm);
    return ApiResponse.success(res, candidates, "AI donor candidate ranking generated successfully");
  })
);

// 2. AI Shortage & Demand Forecast Endpoint
router.get(
  "/forecast",
  asyncHandler(async (req: Request, res: Response) => {
    const bloodType = ((req.query.bloodType as string) || "O-") as BloodType;
    const lat = Number(req.query.lat) || 12.9716;
    const lng = Number(req.query.lng) || 77.5946;
    const radiusKm = Number(req.query.radiusKm) || 50;
    const windowDays = Number(req.query.windowDays) || 7;

    const forecast = await computeShortageForecast(bloodType, lat, lng, radiusKm, windowDays);
    return ApiResponse.success(res, forecast, "AI shortage forecast generated successfully");
  })
);

// 3. AI Network Anomaly Detection Endpoint
router.get(
  "/anomalies",
  asyncHandler(async (req: Request, res: Response) => {
    const anomalies = await detectNetworkAnomalies();
    return ApiResponse.success(res, anomalies, "Network anomalies scanned");
  })
);

// 4. Natural Language Blood Requirement Parser Endpoint
router.post(
  "/parse-requirement",
  asyncHandler(async (req: Request, res: Response) => {
    const { prompt, history = [], currentState } = req.body;
    const parsed = await parseBloodRequirementGemini(prompt || "", history, currentState);
    return ApiResponse.success(res, parsed, "Natural language blood requirement parsed successfully");
  })
);

// 5. Emergency Operations AI Copilot Endpoint (Protected)
router.post(
  "/copilot",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { query, city } = req.body;
    const role = (req.user as any)?.role || "hospital";

    const response = await processCopilotQuery(query || "", role, city || "Bengaluru");
    return ApiResponse.success(res, response, "Copilot query processed");
  })
);

export default router;
