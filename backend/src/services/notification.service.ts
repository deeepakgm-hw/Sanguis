import { Application } from "express";
import { Notification } from "../models/Notification";

interface CreateNotificationInput {
  app: Application; // used to reach the io instance set in server.ts via app.set("io", io)
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string;
}

/**
 * Single entry point for all in-app notifications: persists to Mongo
 * (so the bell icon has history on next login) AND emits over the
 * user's private Socket.IO room (so it appears live without a refresh).
 * Any controller in the system can call this the same way.
 */
export async function createNotification(input: CreateNotificationInput) {
  const { app, userId, title, message, type = "info", link } = input;

  const notification = await Notification.create({ user: userId, title, message, type, link });

  const io = app.get("io");
  if (io) io.to(`user:${userId}`).emit("notification:new", notification);

  return notification;
}
