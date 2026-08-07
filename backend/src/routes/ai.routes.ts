import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
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

export default router;
