import { z } from "zod";

const MATCH_STATUSES = ["pending", "accepted", "declined", "expired"] as const;

export const listMatchesSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(MATCH_STATUSES).optional(),
    requestId: z.string().optional(),
    donorId: z.string().optional(),
  }),
  params: z.object({}).optional(),
});

export const respondMatchSchema = z.object({
  body: z.object({
    action: z.enum(["accept", "decline"], {
      required_error: "action must be 'accept' or 'decline'",
    }),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string() }),
});
