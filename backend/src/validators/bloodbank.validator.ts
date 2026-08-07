import { z } from "zod";
import { BLOOD_TYPES } from "../models/Donor";
import { TRANSACTION_REASONS } from "../models/InventoryTransaction";

const geoPointBody = z.object({
  type: z.literal("Point"),
  coordinates: z
    .array(z.number())
    .length(2, "Coordinates must be [longitude, latitude]"),
});

export const createBloodBankSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(200),
    address: z.string().trim().min(2),
    location: geoPointBody,
    contactPhone: z.string().trim().min(5),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const adjustInventorySchema = z.object({
  body: z.object({
    bloodType: z.enum(BLOOD_TYPES, { required_error: "bloodType is required" }),
    delta: z.number().int("delta must be an integer"),
    reason: z.enum(TRANSACTION_REASONS, { required_error: "reason is required" }),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string() }),
});

export const listBloodBanksSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    bloodType: z.enum(BLOOD_TYPES).optional(),
    lat: z.coerce.number().optional(),
    lng: z.coerce.number().optional(),
    radius: z.coerce.number().optional(),
  }),
  params: z.object({}).optional(),
});
