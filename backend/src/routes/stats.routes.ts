import { Router } from "express";
import { getAggregateStats } from "../controllers/stats.controller";

const router = Router();

/** GET /api/v1/stats/aggregate — public platform statistics */
router.get("/aggregate", getAggregateStats);

export default router;
