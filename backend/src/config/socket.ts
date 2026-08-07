import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "./env";
import { logger } from "../utils/logger";
import { AccessTokenPayload } from "../middlewares/auth";

export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL, credentials: true },
  });

  // Reject unauthenticated socket connections at the handshake, not after.
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
    logger.info({ userId, socketId: socket.id }, "Socket connected");

    // Private room per user -> lets any controller push a targeted
    // notification via io.to(`user:${userId}`).emit(...)
    if (userId) socket.join(`user:${userId}`);

    // Join global dispatch channel for live map updates
    socket.join("live-dispatch");

    // Handle live donor GPS position updates
    socket.on("donor:update_location", (data: { lat: number; lng: number; bloodType?: string; donorId?: string }) => {
      logger.info({ userId, data }, "Received donor live location update");
      // Broadcast live movement to all dispatch and request detail map listeners
      io.to("live-dispatch").emit("donor:location_updated", {
        userId,
        donorId: data.donorId,
        bloodType: data.bloodType,
        lat: data.lat,
        lng: data.lng,
        updatedAt: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => logger.info({ userId, socketId: socket.id }, "Socket disconnected"));
  });

  return io;
}
