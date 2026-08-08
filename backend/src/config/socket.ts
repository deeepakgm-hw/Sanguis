import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./env";
import { logger } from "../utils/logger";
import { AccessTokenPayload } from "../middlewares/auth";
import { Donor } from "../models/Donor";

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
    socket.on("donor:location:start", async (data: { lat: number; lng: number; bloodType?: string }) => {
      if (!userId) return;
      try {
        await Donor.findOneAndUpdate(
          { userId },
          {
            isLiveTracking: true,
            shareLiveLocation: true,
            location: { type: "Point", coordinates: [data.lng, data.lat] },
            lastLocationUpdate: new Date(),
          }
        );

        io.to("live-dispatch").emit("donor:location_started", {
          userId,
          lat: data.lat,
          lng: data.lng,
          bloodType: data.bloodType,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        logger.error({ err, userId }, "Failed to start live donor location session");
      }
    });

    // Continuous Live GPS Update
    socket.on(
      "donor:location:update",
      async (data: { lat: number; lng: number; bloodType?: string; heading?: number; speed?: number }) => {
        if (!userId) return;
        try {
          // Update MongoDB GeoJSON coordinates in background
          await Donor.findOneAndUpdate(
            { userId, shareLiveLocation: true },
            {
              location: { type: "Point", coordinates: [data.lng, data.lat] },
              isLiveTracking: true,
              lastLocationUpdate: new Date(),
            }
          );

          io.to("live-dispatch").emit("donor:location_updated", {
            userId,
            lat: data.lat,
            lng: data.lng,
            bloodType: data.bloodType,
            heading: data.heading,
            speed: data.speed,
            updatedAt: new Date().toISOString(),
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
        await Donor.findOneAndUpdate({ userId }, { isLiveTracking: false });
        io.to("live-dispatch").emit("donor:location_stopped", {
          userId,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        logger.error({ err, userId }, "Failed to stop donor live tracking session");
      }
    });

    socket.on("disconnect", () => {
      logger.info({ userId, socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}
