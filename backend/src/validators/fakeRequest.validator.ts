import { z } from "zod";

export const detectFakeRequestSchema = z.object({
  body: z.object({
    requesterId: z.string().trim().min(1, "Requester ID is required"),
    bloodType: z.string().trim().min(1, "Blood type is required"),
    isHospitalVerified: z.boolean(),
    location: z.string().trim().optional(),
    hospitalNotes: z.string().trim().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
