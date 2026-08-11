import { Request, Response } from "express";
import { eventBus, SystemEventPayload } from "../utils/eventBus";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// Server-Sent Events (SSE) Real-Time Telemetry Stream
// GET /api/v1/events/stream
// ---------------------------------------------------------------------------
export function streamEvents(req: Request, res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  logger.info("SSE Client connected to real-time telemetry stream");

  const listener = (event: SystemEventPayload) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  eventBus.on("*", listener);

  // Heartbeat ping every 15s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${new Date().toISOString()}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    eventBus.off("*", listener);
    logger.info("SSE Client disconnected from real-time stream");
  });
}
