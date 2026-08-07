import { Router } from "express";
import { validate } from "../middlewares/validate";
import { getForecast } from "../controllers/forecast.controller";
import { forecastQuerySchema } from "../validators/availability.validator";

const router = Router();

/**
 * GET /api/v1/forecast
 * Public endpoint — no auth required so the landing page can display
 * real shortage data to unauthenticated visitors.
 *
 * Query: lat, lng, radiusKm (optional, default 50), bloodType (optional)
 */
router.get("/", validate(forecastQuerySchema), getForecast);

export default router;
