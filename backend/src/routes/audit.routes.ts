import { Router, Request, Response } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { AuditLog, SecurityEvent } from "../models/AuditLog";

const router = Router();

router.get(
  "/logs",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const [logs, total] = await Promise.all([
      AuditLog.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("actor", "name email"),
      AuditLog.countDocuments(),
    ]);
    return ApiResponse.success(res, logs, "Audit logs", 200, { page, limit, total });
  })
);

router.get(
  "/security-events",
  requireAuth,
  requireRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 50);
    const [events, total] = await Promise.all([
      SecurityEvent.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      SecurityEvent.countDocuments(),
    ]);
    return ApiResponse.success(res, events, "Security events", 200, { page, limit, total });
  })
);

export default router;
