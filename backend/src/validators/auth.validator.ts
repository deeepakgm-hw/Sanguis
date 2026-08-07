import { z } from "zod";

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number");

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1, "First name is required").optional(),
    lastName: z.string().trim().optional(),
    name: z.string().trim().min(2, "Full name is required").optional(),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    phone: z.string().trim().optional(),
    password: passwordSchema,
    role: z.enum(["donor", "hospital", "user"]).default("donor"),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1, "Password is required"),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().trim().toLowerCase().email() }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    newPassword: passwordSchema,
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    otp: z.string().length(6, "OTP code must be 6 digits").optional(),
    code: z.string().length(6, "OTP code must be 6 digits").optional(),
    token: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const resendOtpSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
