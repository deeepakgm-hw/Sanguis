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

interface SendUrgentBroadcastNotificationInput {
  app: Application;
  donorIds: string[];
  requestDetails: {
    bloodRequestId: string;
    bloodType: string;
    urgencyLevel: string;
    unitsNeeded: number;
  };
}

/**
 * Creates persistent in-app notifications in MongoDB for a group of matching
 * nearby donors, and emits an "urgent:broadcast" event over their WebSocket connections.
 */
export async function sendUrgentBroadcastNotification(input: SendUrgentBroadcastNotificationInput) {
  const { app, donorIds, requestDetails } = input;

  const title = "URGENT: Blood Request Broadcast";
  const message = `An urgent request for blood type ${requestDetails.bloodType} has been created nearby.`;
  const link = `/requests/${requestDetails.bloodRequestId}`;

  // Persist notifications to MongoDB so the notification history is preserved on next login
  const notificationDocs = donorIds.map((userId) => ({
    user: userId,
    title,
    message,
    type: "error" as const,
    link,
  }));

  let notifications: any[] = [];
  if (notificationDocs.length) {
    notifications = await Notification.insertMany(notificationDocs);
  }

  // Emit live socket event to all active matching users
  const io = app.get("io");
  if (io) {
    const { emitToDonorsInRadius } = await import("../config/socket");
    emitToDonorsInRadius(io, donorIds, "urgent:broadcast", {
      requestDetails,
      message,
    });
  }

  return notifications;
}

