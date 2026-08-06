import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { Notification } from "../models/Notification";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);

  const [items, total, unreadCount] = await Promise.all([
    Notification.find({ user: req.user!.sub })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments({ user: req.user!.sub }),
    Notification.countDocuments({ user: req.user!.sub, isRead: false }),
  ]);

  return ApiResponse.success(res, items, "Notifications fetched", 200, { page, limit, total, unreadCount });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user!.sub }, { isRead: true });
  return ApiResponse.success(res, null, "Marked as read");
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  await Notification.updateMany({ user: req.user!.sub, isRead: false }, { isRead: true });
  return ApiResponse.success(res, null, "All notifications marked as read");
});
