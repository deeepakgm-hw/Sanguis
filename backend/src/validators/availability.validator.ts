import { z } from "zod";

/**
 * Validates adding a voluntary unavailability period.
 * Both dates must be ISO strings coercible by Zod.
 * `to` must be in the future and after `from`.
 */
export const addUnavailablePeriodSchema = z.object({
  body: z.object({
    from: z.coerce.date({ required_error: "from date is required" }),
    to: z.coerce
      .date({ required_error: "to date is required" })
      .refine((d) => d > new Date(), { message: "to must be in the future" }),
    reason: z.string().max(200).optional(),
  }).refine((b) => b.to > b.from, {
    message: "to must be after from",
    path: ["to"],
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

/**
 * Validates the periodId param for DELETE /me/unavailable-periods/:periodId
 */
export const deletePeriodParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ periodId: z.string().min(1, "periodId is required") }),
});

/**
 * Forecast query validator — lat/lng/radius/bloodType all required for
 * the regional calculation to be meaningful.
 */
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const forecastQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().min(1).max(500).optional(),
    bloodType: z.enum(BLOOD_TYPES).optional(),
  }),
  params: z.object({}).optional(),
});
