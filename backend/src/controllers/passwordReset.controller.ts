import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/User";
import { generateOtp, verifyOtp, generateResetToken, consumeResetToken } from "../services/otp.service";
import { sendEmail, otpEmailTemplate, resetPasswordEmailTemplate } from "../services/email.service";
import { SecurityEvent } from "../models/AuditLog";
import { revokeAllUserSessions } from "../services/token.service";
import { env } from "../config/env";

/** Step 1 of email verification: send a 6-digit OTP to the user's email. */
export const sendVerificationOtp = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?.sub);
  if (!user) throw ApiError.notFound("User not found");
  if (user.isEmailVerified) return ApiResponse.success(res, null, "Email already verified");

  const otp = await generateOtp(user.email);
  await sendEmail({ to: user.email, subject: "Verify your email", html: otpEmailTemplate(otp) });
  return ApiResponse.success(res, null, "OTP sent to your email");
});

/** Step 2: verify the OTP and flip isEmailVerified. */
export const verifyEmailOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body as { email: string; otp: string };
  const isValid = await verifyOtp(email, otp);
  if (!isValid) throw ApiError.badRequest("Invalid or expired OTP");

  await User.updateOne({ email }, { isEmailVerified: true });
  return ApiResponse.success(res, null, "Email verified successfully");
});

/**
 * Forgot password: always return the same generic response whether or
 * not the email exists — otherwise this endpoint becomes a free user
 * enumeration oracle (OWASP A07).
 */
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };
  const user = await User.findOne({ email });

  if (user) {
    const token = await generateResetToken(email);
    const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
    await sendEmail({ to: email, subject: "Reset your password", html: resetPasswordEmailTemplate(resetUrl) });
    await SecurityEvent.create({ type: "PASSWORD_RESET_REQUESTED", user: user._id, email, ip: req.ip ?? "unknown" });
  }

  return ApiResponse.success(res, null, "If that email exists, a reset link has been sent.");
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = req.body as { token: string; newPassword: string };
  const email = await consumeResetToken(token);
  if (!email) throw ApiError.badRequest("Invalid or expired reset token");

  const user = await User.findOne({ email }).select("+password");
  if (!user) throw ApiError.notFound("User not found");

  user.password = newPassword; // pre-save hook re-hashes
  await user.save();

  // Resetting a password should kill every existing session — otherwise
  // an attacker who stole a session earlier stays logged in.
  await revokeAllUserSessions(user._id.toString());
  await SecurityEvent.create({ type: "PASSWORD_CHANGED", user: user._id, email, ip: req.ip ?? "unknown" });

  return ApiResponse.success(res, null, "Password reset successful. Please log in again.");
});
