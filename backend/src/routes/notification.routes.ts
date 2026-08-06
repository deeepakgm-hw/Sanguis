import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import * as notificationController from "../controllers/notification.controller";

const router = Router();

router.get("/", requireAuth, notificationController.listNotifications);
router.patch("/:id/read", requireAuth, notificationController.markAsRead);
router.patch("/read-all", requireAuth, notificationController.markAllAsRead);

export default router;
