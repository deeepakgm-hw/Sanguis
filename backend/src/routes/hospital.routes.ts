import { Router } from "express";
import { getNearbyHospitalsHandler, getAllHospitals } from "../controllers/hospital.controller";
import { getNearbyHospitalsSchema } from "../validators/hospital.validator";
import { validate } from "../middlewares/validate";
import { googlePlacesLimiter } from "../middlewares/security/rateLimiter";

const router = Router();

// GET /api/v1/hospitals/all OR /api/v1/hospitals — Fetch real-time Indian hospitals via RapidAPI
router.get("/all", getAllHospitals);
router.get("/", getAllHospitals);

// GET /api/v1/hospitals/nearby?lat=&lng=&radius= — Proximity lookup
router.get(
  "/nearby",
  googlePlacesLimiter,
  validate(getNearbyHospitalsSchema),
  getNearbyHospitalsHandler
);

export default router;
