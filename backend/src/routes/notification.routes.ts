import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import * as notificationController from "../controllers/notification.controller";

const router = Router();

router.get("/", requireAuth, notificationController.listNotifications);
router.patch("/read-all", requireAuth, notificationController.markAllAsRead);
router.patch("/:id/read", requireAuth, notificationController.markAsRead);

export default router;
