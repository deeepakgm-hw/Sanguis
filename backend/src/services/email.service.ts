import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  // In a hackathon, SMTP creds are often not configured until the last
  // minute — log instead of crashing the whole request if unset.
  if (!env.SMTP_HOST) {
    logger.warn({ to: input.to, subject: input.subject }, "SMTP not configured — email not sent (dev no-op)");
    return;
  }
  await transporter.sendMail({ from: env.SMTP_FROM, ...input });
}

export function otpEmailTemplate(otp: string): string {
  // Kept intentionally simple/inline — no external CSS/image
  // dependencies that could fail to load or leak tracking data.
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
      <h2>Your verification code</h2>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
    </div>
  `;
}

export function resetPasswordEmailTemplate(resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
      <h2>Reset your password</h2>
      <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
      <a href="${resetUrl}">${resetUrl}</a>
    </div>
  `;
}
