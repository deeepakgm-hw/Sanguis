import { cleanEnv, str, port, num } from "envalid";
import dotenv from "dotenv";

dotenv.config();

export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ["development", "test", "production"], default: "development" }),
  PORT: port({ default: 5000 }),
  CLIENT_URL: str(),

  MONGO_URI: str(),
  REDIS_URL: str({ default: "redis://localhost:6379" }),

  JWT_ACCESS_SECRET: str({ desc: "min 32 chars" }),
  JWT_REFRESH_SECRET: str({ desc: "min 32 chars" }),
  JWT_ACCESS_EXPIRES: str({ default: "15m" }),
  JWT_REFRESH_EXPIRES: str({ default: "7d" }),

  COOKIE_SECRET: str(),

  ENCRYPTION_KEY: str({ desc: "AES-256-GCM key, 32 bytes hex-encoded" }),

  CLOUDINARY_CLOUD_NAME: str({ default: "" }),
  CLOUDINARY_API_KEY: str({ default: "" }),
  CLOUDINARY_API_SECRET: str({ default: "" }),

  SMTP_HOST: str({ default: "" }),
  SMTP_PORT: num({ default: 587 }),
  SMTP_USER: str({ default: "" }),
  SMTP_PASS: str({ default: "" }),
  SMTP_FROM: str({ default: "no-reply@app.com" }),

  GOOGLE_CLIENT_ID: str({ default: "" }),
  GOOGLE_CLIENT_SECRET: str({ default: "" }),
  GITHUB_CLIENT_ID: str({ default: "" }),
  GITHUB_CLIENT_SECRET: str({ default: "" }),
  GOOGLE_PLACES_API_KEY: str({ default: "" }),
});

// Fail fast: hackathon debugging time is precious, so we validate secrets
// strength at boot instead of getting a cryptic JWT error 3 hours in.
if (env.JWT_ACCESS_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32) {
  throw new Error("JWT secrets must be at least 32 characters long.");
}

const encryptionKeyBuffer = Buffer.from(env.ENCRYPTION_KEY, "hex");
if (encryptionKeyBuffer.length !== 32 || !/^[0-9a-fA-F]{64}$/.test(env.ENCRYPTION_KEY)) {
  throw new Error("ENCRYPTION_KEY must be a 32-byte hex-encoded string (64 hex characters).");
}
