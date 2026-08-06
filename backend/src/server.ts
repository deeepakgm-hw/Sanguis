import http from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { connectDB, disconnectDB } from "./config/db";
import { connectRedis, redis } from "./config/redis";
import { initSocket } from "./config/socket";
import { logger } from "./utils/logger";
import { seedDatabase } from "./utils/seed";

async function bootstrap(): Promise<void> {
  await connectDB();
  await connectRedis();

  if (env.NODE_ENV !== "production") {
    try {
      await seedDatabase();
    } catch (err) {
      logger.error({ err }, "Auto-seeding failed");
    }
  }

  const app = createApp();
  const httpServer = http.createServer(app);
  const io = initSocket(httpServer);

  // Make io available to controllers that need to emit events (req.app.get("io")).
  app.set("io", io);

  httpServer.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    httpServer.close(async () => {
      await disconnectDB();
      await redis.quit();
      process.exit(0);
    });
    // Force-exit if shutdown hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled Rejection");
  });
  process.on("uncaughtException", (err) => {
    logger.error({ err }, "Uncaught Exception");
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", err);
  process.exit(1);
});
