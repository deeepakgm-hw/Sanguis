import { Router } from "express";
import { getNearbyHospitalsHandler } from "../controllers/hospital.controller";
import { getNearbyHospitalsSchema } from "../validators/hospital.validator";
import { validate } from "../middlewares/validate";
import { googlePlacesLimiter } from "../middlewares/security/rateLimiter";

const router = Router();

// GET /api/v1/hospitals/nearby?lat=&lng=&radius=
router.get(
  "/nearby",
  googlePlacesLimiter,
  validate(getNearbyHospitalsSchema),
  getNearbyHospitalsHandler
);

export default router;
