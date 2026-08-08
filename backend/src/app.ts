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
import donorRoutes from "./routes/donor.routes";
import bloodRequestRoutes from "./routes/bloodRequest.routes";
import matchRoutes from "./routes/match.routes";
import bloodBankRoutes from "./routes/bloodbank.routes";
import forecastRoutes from "./routes/forecast.routes";
import hospitalRoutes from "./routes/hospital.routes";
import statsRoutes from "./routes/stats.routes";
import settingsRoutes from "./routes/settings.routes";
import contentRoutes from "./routes/content.routes";
import donationRoutes from "./routes/donation.routes";
import seedRoutes from "./routes/seed.routes";
import aiRoutes from "./routes/ai.routes";
import { streamEvents } from "./controllers/events.controller";

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
  app.get("/api/v1/events/stream", streamEvents);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/files", fileRoutes);
  app.use("/api/v1/audit", auditRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
  app.use("/api/v1/donors", donorRoutes);
  app.use("/api/v1/blood-requests", bloodRequestRoutes);
  app.use("/api/v1/matches", matchRoutes);
  app.use("/api/v1/bloodbanks", bloodBankRoutes);
  app.use("/api/v1/forecast", forecastRoutes);
  app.use("/api/v1/hospitals", hospitalRoutes);
  app.use("/api/v1/stats", statsRoutes);
  app.use("/api/v1/settings", settingsRoutes);
  app.use("/api/v1/content", contentRoutes);
  app.use("/api/v1/donations", donationRoutes);
  app.use("/api/v1/seed", seedRoutes);
  app.use("/api/v1/ai", aiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
