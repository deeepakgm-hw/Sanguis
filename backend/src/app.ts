import express, { Application } from "express";
import cookieParser from "cookie-parser";
import compression from "compression";

import { env } from "./config/env";
import { corsMiddleware } from "./middlewares/security/cors";
import { securityHeaders } from "./middlewares/security/headers";
import { noSqlSanitize, httpParamProtection, xssSanitize } from "./middlewares/security/sanitize";
import { globalLimiter } from "./middlewares/security/rateLimiter";
import { requestLogger } from "./middlewares/requestLogger";
import { ipBlocker } from "./middlewares/security/ipBlocker";
import { ipBlacklist } from "./middlewares/security/ipBlacklist";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";

import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import fileRoutes from "./routes/file.routes";
import healthRoutes from "./routes/health.routes";
import auditRoutes from "./routes/audit.routes";
import notificationRoutes from "./routes/notification.routes";
import bloodRequestRoutes from "./routes/bloodRequest.routes";

export function createApp(): Application {
  const app = express();

  // Trust first proxy (Nginx) so req.ip and secure cookies work correctly behind it.
  app.set("trust proxy", 1);

  // --- Order matters ---
  app.use(requestLogger);
  app.use(ipBlocker);
  app.use(ipBlacklist);
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.use(compression());
  app.use(express.json({ limit: "1mb" })); // caps body size -> mitigates payload-based DoS
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(noSqlSanitize);
  app.use(httpParamProtection);
  app.use(xssSanitize);
  app.use(globalLimiter);

  app.use("/api/v1/health", healthRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/files", fileRoutes);
  app.use("/api/v1/audit", auditRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
  app.use("/api/v1/blood-requests", bloodRequestRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
