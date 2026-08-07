import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { getPreferences, updatePreferences } from "../controllers/settings.controller";

const router = Router();

router.get("/preferences", requireAuth, getPreferences);
router.patch("/preferences", requireAuth, updatePreferences);

export default router;
