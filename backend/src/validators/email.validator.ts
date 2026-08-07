import { z } from "zod";

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().trim().optional(),
    code: z
      .string()
      .trim()
      .length(6, "Verification code must be exactly 6 digits")
      .optional(),
  }).refine((data) => data.token || data.code, {
    message: "Either verification token or 6-digit OTP code is required",
    path: ["code"],
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().trim().email("Invalid email address").optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
