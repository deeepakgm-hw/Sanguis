import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { redis } from "../config/redis";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState === 1 ? "up" : "down";
  let redisState = "down";
  try {
    await redis.ping();
    redisState = "up";
  } catch {
    redisState = "down";
  }

  const healthy = dbState === "up" && redisState === "up";
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "healthy" : "degraded",
    services: { database: dbState, redis: redisState },
    uptimeSeconds: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
