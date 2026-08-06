import helmet from "helmet";
import { env } from "../../config/env";

/**
 * OWASP A05:2021 - Security Misconfiguration.
 * Sets secure defaults for every response: no framing (clickjacking),
 * no MIME sniffing, strict CSP, forced HTTPS in prod, no referrer leaks.
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: ["'self'", env.CLIENT_URL],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : null,
    },
  },
  crossOriginResourcePolicy: { policy: "same-site" },
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "no-referrer" },
});
