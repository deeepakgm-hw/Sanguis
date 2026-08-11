import { z } from "zod";

export const generateMatchExplanationSchema = z.object({
  body: z.object({
    distanceKm: z.number().nonnegative("Distance must be a non-negative number"),
    bloodTypeRequested: z.string().trim().min(1, "Requested blood type is required"),
    donorBloodType: z.string().trim().min(1, "Donor blood type is required"),
    responseRate: z.number(),
    donationsCompleted: z.number().int().nonnegative("Donations completed must be a non-negative integer"),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
