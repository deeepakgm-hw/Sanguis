import { z } from "zod";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const URGENCY_LEVELS = ["low", "medium", "high", "critical"] as const;
const REQUEST_STATUSES = ["open", "matched", "fulfilled", "cancelled", "expired"] as const;

const geoPointBody = z.object({
  type: z.literal("Point"),
  coordinates: z
    .array(z.number())
    .length(2, "coordinates must be [longitude, latitude]"),
});

export const createBloodRequestSchema = z.object({
  body: z.object({
    bloodType: z.enum(BLOOD_TYPES, { required_error: "bloodType is required" }),
    unitsNeeded: z.number().int().min(1, "unitsNeeded must be at least 1"),
    urgencyLevel: z.enum(URGENCY_LEVELS).optional(),
    geoLocation: geoPointBody,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateBloodRequestSchema = z.object({
  body: z.object({
    bloodType: z.enum(BLOOD_TYPES).optional(),
    unitsNeeded: z.number().int().min(1).optional(),
    urgencyLevel: z.enum(URGENCY_LEVELS).optional(),
    status: z.enum(REQUEST_STATUSES).optional(),
    geoLocation: geoPointBody.optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string() }).optional(),
});

export const listBloodRequestsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    bloodType: z.enum(BLOOD_TYPES).optional(),
    urgencyLevel: z.enum(URGENCY_LEVELS).optional(),
    status: z.enum(REQUEST_STATUSES).optional(),
    search: z.string().optional(),
  }),
  params: z.object({}).optional(),
});
