import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../utils/logger";

let mongod: any = null;

export async function connectDB(): Promise<void> {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("error", (err) => logger.error({ err }, "MongoDB connection error"));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

  let mongoUri = env.MONGO_URI;

  if (env.NODE_ENV !== "production") {
    logger.info("Starting in-memory MongoDB server...");
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    mongod = await MongoMemoryServer.create();
    mongoUri = mongod.getUri();
    logger.info(`In-memory MongoDB server started at ${mongoUri}`);
  }

  await mongoose.connect(mongoUri, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000,
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
    logger.info("In-memory MongoDB server stopped");
  }
}
