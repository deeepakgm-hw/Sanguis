import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { redis } from "../config/redis";
import { Donor } from "../models/Donor";
import { BloodBank } from "../models/BloodBank";
import { BloodRequest } from "../models/BloodRequest";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState === 1 ? "up" : "down";
  let redisState = "disabled";
  try {
    if (process.env.REDIS_URL) {
      await redis.ping();
      redisState = "up";
    }
  } catch {
    redisState = "down";
  }

  const healthy = dbState === "up";
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? "healthy" : "degraded",
      services: { database: dbState, redis: redisState },
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    error: healthy ? null : "Database connection down",
  });
});

/**
 * GET /api/v1/health/stats
 * Returns real aggregate counts from the database.
 * Used by the landing page — no auth required, public endpoint.
 */
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [donors, verifiedBanks, openRequests] = await Promise.all([
      Donor.countDocuments(),
      BloodBank.countDocuments({ isVerified: true }),
      BloodRequest.countDocuments({ status: "open" }),
    ]);
    res.status(200).json({
      success: true,
      data: { donors, verifiedBanks, openRequests },
    });
  } catch {
    res.status(500).json({ success: false, data: null, error: "Failed to fetch stats" });
  }
});

export default router;
