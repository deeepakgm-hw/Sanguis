import { z } from "zod";

export const classifyUrgencySchema = z.object({
  body: z.object({
    bloodType: z.string().trim().min(1, "Blood type is required"),
    unitsRequested: z.number().int().positive("Units requested must be a positive integer"),
    hospitalNotes: z.string().trim(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
