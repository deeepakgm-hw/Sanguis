import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./env";
import { logger } from "../utils/logger";
import { AccessTokenPayload } from "../middlewares/auth";
import { Donor } from "../models/Donor";
import { LocationService } from "../services/location.service";
import { isValidCoordinates } from "../utils/geo";

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  // Reject unauthenticated socket connections at handshake
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Authentication required"));
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.user?.sub;
    const role = socket.data.user?.role;
    logger.info({ userId, role, socketId: socket.id }, "Socket connected");

    if (userId) {
      socket.join(`user:${userId}`);
      if (role) socket.join(`role:${role}`);
    }

    // Join global live dispatch channel
    socket.join("live-dispatch");

    // Dynamic room subscription
    socket.on("join:room", (roomName: string) => {
      if (roomName && typeof roomName === "string") {
        socket.join(roomName);
        logger.info({ userId, roomName }, "Socket joined room");
      }
    });

    socket.on("leave:room", (roomName: string) => {
      if (roomName && typeof roomName === "string") {
        socket.leave(roomName);
        logger.info({ userId, roomName }, "Socket left room");
      }
    });

    // Start Live GPS Tracking Session
    socket.on("donor:location:start", async (data: { lat?: number; lng?: number; latitude?: number; longitude?: number; accuracy?: number; bloodType?: string }) => {
      if (!userId) return;
      try {
        const lat = data.latitude ?? data.lat;
        const lng = data.longitude ?? data.lng;
        const accuracy = data.accuracy ?? 10;

        if (lat !== undefined && lng !== undefined && isValidCoordinates(lat, lng, accuracy)) {
          const rec = await LocationService.updateDonorLocation(userId, {
            latitude: lat,
            longitude: lng,
            accuracy,
            bloodType: data.bloodType,
          });

          io.to("live-dispatch").emit("donor:location_started", {
            userId,
            donorId: rec.donorId,
            lat: rec.latitude,
            lng: rec.longitude,
            accuracy: rec.accuracy,
            qualityCategory: rec.qualityCategory,
            bloodType: rec.bloodType,
            updatedAt: rec.lastUpdatedAt,
          });
        }
      } catch (err) {
        logger.error({ err, userId }, "Failed to start live donor location session");
      }
    });

    // Continuous Live GPS Update
    socket.on(
      "donor:location:update",
      async (data: { lat?: number; lng?: number; latitude?: number; longitude?: number; accuracy?: number; heading?: number; speed?: number; timestamp?: number; bloodType?: string }) => {
        if (!userId) return;
        try {
          const lat = data.latitude ?? data.lat;
          const lng = data.longitude ?? data.lng;
          const accuracy = data.accuracy ?? 15;

          if (lat === undefined || lng === undefined || !isValidCoordinates(lat, lng, accuracy)) {
            logger.warn({ userId, data }, "Rejected invalid donor location update payload");
            return;
          }

          const rec = await LocationService.updateDonorLocation(userId, {
            latitude: lat,
            longitude: lng,
            accuracy,
            heading: data.heading,
            speed: data.speed,
            timestamp: data.timestamp,
            bloodType: data.bloodType,
          });

          io.to("live-dispatch").emit("donor:location_updated", {
            userId,
            donorId: rec.donorId,
            lat: rec.latitude,
            lng: rec.longitude,
            accuracy: rec.accuracy,
            qualityCategory: rec.qualityCategory,
            heading: rec.heading,
            speed: rec.speed,
            bloodType: rec.bloodType,
            updatedAt: rec.lastUpdatedAt,
          });
        } catch (err) {
          logger.error({ err, userId }, "Failed to process donor GPS update");
        }
      }
    );

    // Stop Live GPS Tracking Session
    socket.on("donor:location:stop", async () => {
      if (!userId) return;
      try {
        await LocationService.stopDonorLocation(userId);
        io.to("live-dispatch").emit("donor:location_stopped", {
          userId,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        logger.error({ err, userId }, "Failed to stop donor live tracking session");
      }
    });

    socket.on("disconnect", async () => {
      logger.info({ userId, socketId: socket.id }, "Socket disconnected");
      if (userId && role === "donor") {
        try {
          await LocationService.stopDonorLocation(userId);
        } catch (e) { /* ignore */ }
      }
    });
  });

  return io;
}
