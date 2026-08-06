import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { logger } from "../utils/logger";

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => (req.headers["x-request-id"] as string) || randomUUID(),
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, id: req.id }),
  },
});
