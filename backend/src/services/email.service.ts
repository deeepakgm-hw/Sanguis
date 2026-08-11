import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../utils/logger";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for 465, false for 587
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
    return transporter;
  }
  return null;
}

export interface SendVerificationEmailParams {
  toEmail: string;
  name: string;
  token: string;
  otpCode: string;
}

/**
 * Sends a branded Sanguis HTML email with both a one-click verification link and a 6-digit OTP.
 */
export async function sendVerificationEmail({
  toEmail,
  name,
  token,
  otpCode,
}: SendVerificationEmailParams): Promise<boolean> {
  const verifyLink = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;

  // Log to console for development / fallback visibility
  logger.info(
    { toEmail, otpCode, verifyLink },
    `[EMAIL SERVICE] Verification generated for ${toEmail} | OTP Code: ${otpCode} | Link: ${verifyLink}`
  );

  const mailTransporter = getTransporter();
  if (!mailTransporter) {
    logger.warn("SMTP Transporter not configured — skipping email dispatch");
    return false;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 20px; }
          .container { max-width: 550px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #e11d48 0%, #9f1239 100%); padding: 30px 24px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 22px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
          .header p { margin: 6px 0 0 0; color: #fecdd3; font-size: 11px; font-weight: 600; letter-spacing: 1px; }
          .body { padding: 32px 24px; text-align: center; }
          .greeting { font-size: 16px; font-weight: 700; color: #f4f4f5; margin-bottom: 12px; }
          .message { font-size: 13px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px; }
          .otp-box { background-color: #09090b; border: 1px solid #3f3f46; border-radius: 12px; padding: 16px 24px; display: inline-block; margin: 16px 0 24px 0; }
          .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; color: #f43f5e; letter-spacing: 8px; margin: 0; }
          .otp-label { font-size: 10px; color: #71717a; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
          .cta-btn { display: inline-block; background-color: #e11d48; color: #ffffff; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; padding: 14px 32px; border-radius: 10px; transition: background-color 0.2s; shadow: 0 4px 12px rgba(225, 29, 72, 0.4); }
          .footer { border-t: 1px solid #27272a; padding: 20px 24px; text-align: center; font-size: 10px; color: #71717a; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sanguis Emergency Network</h1>
            <p>CRITICAL BLOOD RESPONSE & DISPATCH PLATFORM</p>
          </div>
          <div class="body">
            <div class="greeting">Hello, ${name}!</div>
            <div class="message">
              Welcome to the Sanguis Emergency Network. Please verify your email address to complete credential authentication and activate your emergency dispatch access.
            </div>

            <div class="otp-box">
              <div class="otp-code">${otpCode}</div>
              <div class="otp-label">Your 6-Digit Verification Code</div>
            </div>

            <div>
              <a href="${verifyLink}" class="cta-btn" target="_blank">Verify Email Address Now</a>
            </div>

            <div style="margin-top: 24px; font-size: 11px; color: #71717a;">
              Or copy this URL into your browser:<br>
              <a href="${verifyLink}" style="color: #f43f5e; word-break: break-all;">${verifyLink}</a>
            </div>
          </div>
          <div class="footer">
            SANGUIS NETWORK · SECURE DISPATCH PROTOCOL · VERIFICATION CODE EXPIRES IN 15 MINUTES
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const info = await mailTransporter.sendMail({
      from: env.SMTP_FROM,
      to: toEmail,
      subject: `Sanguis Verification Code: ${otpCode}`,
      html: htmlContent,
    });
    logger.info({ messageId: info.messageId, toEmail }, "Verification email dispatched successfully via SMTP");
    return true;
  } catch (err) {
    logger.error({ err, toEmail }, "SMTP verification email delivery failed");
    return false;
  }
}

export interface GenericEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: GenericEmailParams): Promise<boolean> {
  logger.info({ to, subject }, `[EMAIL SERVICE] Sending email to ${to}`);
  const mailTransporter = getTransporter();
  if (!mailTransporter) {
    logger.warn("SMTP Transporter not configured — skipping email dispatch");
    return false;
  }
  try {
    const info = await mailTransporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
    });
    logger.info({ messageId: info.messageId, to }, "Email dispatched successfully via SMTP");
    return true;
  } catch (err) {
    logger.error({ err, to }, "SMTP email delivery failed");
    return false;
  }
}

export function otpEmailTemplate(otp: string): string {
  return `
    <div style="font-family: sans-serif; padding: 20px; background-color: #09090b; color: #f4f4f5; border-radius: 12px;">
      <h2 style="color: #e11d48;">Sanguis Verification Code</h2>
      <p>Use the following 6-digit code to complete authentication:</p>
      <h1 style="letter-spacing: 6px; color: #f43f5e; font-family: monospace;">${otp}</h1>
      <p style="font-size: 11px; color: #71717a;">Code expires in 10 minutes.</p>
    </div>
  `;
}

export function resetPasswordEmailTemplate(resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; padding: 20px; background-color: #09090b; color: #f4f4f5; border-radius: 12px;">
      <h2 style="color: #e11d48;">Reset Your Sanguis Password</h2>
      <p>Click the link below to set a new password for your account:</p>
      <p><a href="${resetUrl}" style="background: #e11d48; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
      <p style="font-size: 11px; color: #71717a;">Or copy this link: ${resetUrl}</p>
    </div>
  `;
}
