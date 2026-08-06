import cors from "cors";
import { env } from "../../config/env";

/**
 * OWASP A05 - never use origin: "*" with credentials: true, that
 * combination lets ANY website read cookies/auth from your API.
 * We explicitly allowlist origins instead.
 */
const allowedOrigins = [env.CLIENT_URL, "http://localhost:3000"];

export const corsMiddleware = cors({
  origin(origin, callback) {
    // Allow non-browser tools (curl/Postman) which send no origin header.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-API-Key"],
  maxAge: 86400,
});
