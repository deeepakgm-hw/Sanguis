import { z } from "zod";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

const geoPointBody = z.object({
  type: z.literal("Point"),
  coordinates: z
    .array(z.number())
    .length(2, "coordinates must be [longitude, latitude]"),
});

export const createDonorSchema = z.object({
  body: z.object({
    bloodType: z.enum(BLOOD_TYPES, { required_error: "bloodType is required" }),
    lastDonationDate: z.coerce.date().nullable().optional(),
    medicalFlags: z.unknown().optional(),
    location: geoPointBody,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateDonorSchema = z.object({
  body: z.object({
    bloodType: z.enum(BLOOD_TYPES).optional(),
    lastDonationDate: z.coerce.date().nullable().optional(),
    medicalFlags: z.unknown().optional(),
    location: geoPointBody.optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string() }).optional(),
});

export const listDonorsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    bloodType: z.enum(BLOOD_TYPES).optional(),
    search: z.string().optional(),
  }),
  params: z.object({}).optional(),
});
