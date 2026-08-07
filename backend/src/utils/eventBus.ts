import { EventEmitter } from "events";
import { recordAudit } from "../services/audit.service";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// CENTRAL SYSTEM EVENT BUS
// Single source of truth for all domain events across the platform.
// Both the real-time stream (SSE/WS) and the Audit Log subscribe here.
// ---------------------------------------------------------------------------

export type SystemEventType =
  | "emergency.created"
  | "dispatch.matched"
  | "dispatch.accepted"
  | "inventory.updated"
  | "donor.responded"
  | "hospital.verified";

export interface SystemEventPayload {
  type: SystemEventType;
  timestamp: string;
  data: Record<string, any>;
  actorId?: string;
}

class SystemEventBus extends EventEmitter {
  public publish(type: SystemEventType, data: Record<string, any>, actorId?: string): void {
    const payload: SystemEventPayload = {
      type,
      timestamp: new Date().toISOString(),
      data,
      actorId,
    };

    logger.info({ type, actorId }, `[EVENT BUS] Published: ${type}`);
    this.emit(type, payload);
    this.emit("*", payload);
  }
}

export const eventBus = new SystemEventBus();

// Automatically record immutable audit logs for state-changing events
eventBus.on("*", (event: SystemEventPayload) => {
  try {
    recordAudit({
      action: event.type,
      actor: event.actorId ?? undefined,
      resourceType: event.type.split(".")[0],
      resourceId: event.data._id || event.data.requestId || event.data.bloodBankId || "system",
      after: event.data,
    }).catch((err) => logger.error({ err }, "Failed to record audit log from event bus"));
  } catch (err) {
    logger.error({ err }, "Event bus audit subscriber error");
  }
});
