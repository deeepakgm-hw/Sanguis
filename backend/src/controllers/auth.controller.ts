import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { registerUser, authenticateUser } from "../services/auth.service";
import { signAccessToken, issueRefreshToken, rotateRefreshToken, blacklistAccessToken, revokeAllUserSessions } from "../services/token.service";
import { env } from "../config/env";
import ms from "../services/ms.util";

const REFRESH_COOKIE = "refresh_token";

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true, // JS can never read this -> immune to XSS token theft
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/v1/auth", // scoped narrowly, not sent on unrelated routes
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

import { randomUUID, randomInt } from "crypto";
import { EmailVerificationToken } from "../models/EmailVerificationToken";
import { sendVerificationEmail } from "../services/email.service";
import bcrypt from "bcryptjs";
import { PendingRegistration } from "../models/PendingRegistration";
import { logger } from "../utils/logger";
import { User } from "../models/User";
import { Donor } from "../models/Donor";
import { UserPreferences } from "../models/UserPreferences";

export async function createAndSendVerification(user: any) {
  await EmailVerificationToken.deleteMany({ user: user._id });

  const token = randomUUID();
  const otpCode = randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  await EmailVerificationToken.create({
    user: user._id,
    token,
    otpCode,
    expiresAt,
  });

  await sendVerificationEmail({
    toEmail: user.email,
    name: user.name,
    token,
    otpCode,
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, name, email, phone, password, role = "donor" } = req.body;

  const normalizedEmail = email.toLowerCase().trim();
  const fullName = name || (lastName ? `${firstName} ${lastName}`.trim() : firstName || "User");

  // 1. Check duplicate email in User
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser && existingUser.isEmailVerified) {
    throw ApiError.conflict("An account with this email address already exists. Please sign in instead.");
  }

  // 2. Check duplicate phone if provided
  if (phone) {
    const phoneUser = await User.findOne({ phone: phone.trim() });
    if (phoneUser && phoneUser.isEmailVerified) {
      throw ApiError.conflict("An account with this mobile phone number already exists.");
    }
  }

  // 3. Hash password securely using bcrypt (STEP 5)
  const passwordHash = await bcrypt.hash(password, 10);

  // 4. Generate cryptographically secure 6-digit OTP code (STEP 6)
  const otpCode = randomInt(100000, 999999).toString();
  const otpHash = await bcrypt.hash(otpCode, 10);
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5-minute expiry rule

  // 5. Store temporary registration securely in PendingRegistration collection (STEP 4)
  await PendingRegistration.deleteMany({ email: normalizedEmail });
  const pending = await PendingRegistration.create({
    firstName: firstName || fullName.split(" ")[0],
    lastName: lastName || fullName.split(" ").slice(1).join(" ") || undefined,
    name: fullName,
    email: normalizedEmail,
    phone: phone || undefined,
    passwordHash,
    role,
    otpCode,
    otpHash,
    otpExpiry,
    verificationAttempts: 0,
    resendCount: 0,
    lastResendAt: new Date(),
    status: "PENDING",
  });

  // Create or update unverified User record
  let user = existingUser;
  if (!user) {
    user = await User.create({
      name: fullName,
      email: normalizedEmail,
      phone: phone || undefined,
      password: passwordHash,
      role,
      isEmailVerified: false,
    });
  } else {
    user.name = fullName;
    user.phone = phone || user.phone;
    user.password = passwordHash;
    user.role = role;
    await user.save();
  }

  // Store EmailVerificationToken for dual OTP / link verification
  const token = randomUUID();
  await EmailVerificationToken.deleteMany({ user: user._id });
  await EmailVerificationToken.create({
    user: user._id,
    token,
    otpCode,
    expiresAt: otpExpiry,
  });

  // 6. Send OTP using SMTP email (STEP 7)
  sendVerificationEmail({
    toEmail: normalizedEmail,
    name: fullName,
    token,
    otpCode,
  }).catch((err) => logger.error({ err }, "Failed to send SMTP registration verification email"));

  // 7. Return Success Response (STEP 8)
  return res.status(201).json({
    success: true,
    message: "OTP Sent",
    email: normalizedEmail,
    role,
    pendingId: pending._id.toString(),
  });
});

import { generateOtp, verifyOtp as verifyMfaOtpService } from "../services/otp.service";
import { sendEmail, otpEmailTemplate } from "../services/email.service";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await authenticateUser(email, password, { ip: req.ip ?? "unknown", userAgent: req.headers["user-agent"] });

  // If user enabled MFA, issue OTP instead of login credentials
  if (user.mfaEnabled) {
    const otp = await generateOtp(user.email);
    sendEmail({
      to: user.email,
      subject: "Your Login Verification Code",
      html: otpEmailTemplate(otp),
    }).catch((err) => logger.error({ err }, "Failed to send MFA email"));

    return ApiResponse.success(
      res,
      { mfaRequired: true, email: user.email },
      "Multi-Factor Authentication code sent to your email."
    );
  }

  const { token: accessToken } = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user._id.toString(), { ip: req.ip, userAgent: req.headers["user-agent"] });

  setRefreshCookie(res, refreshToken);
  return ApiResponse.success(res, { user: user.toSafeJSON(), accessToken, expiresIn: ms(env.JWT_ACCESS_EXPIRES) }, "Login successful");
});

export const verifyMfa = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw ApiError.badRequest("Email and verification OTP are required");

  // 1. Verify candidate code
  const isValid = await verifyMfaOtpService(email, otp);
  if (!isValid) throw ApiError.badRequest("Invalid or expired verification code");

  // 2. Resolve user
  const { User } = await import("../models/User");
  const user = await User.findOne({ email });
  if (!user || !user.isActive) throw ApiError.unauthorized("Authentication failed");

  // 3. Complete authentication session
  const { token: accessToken } = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user._id.toString(), { ip: req.ip, userAgent: req.headers["user-agent"] });

  setRefreshCookie(res, refreshToken);
  return ApiResponse.success(
    res,
    { user: user.toSafeJSON(), accessToken, expiresIn: ms(env.JWT_ACCESS_EXPIRES) },
    "MFA verification successful"
  );
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.cookies?.[REFRESH_COOKIE];
  if (!raw) throw ApiError.unauthorized("No refresh token provided");

  const { userId, newToken } = await rotateRefreshToken(raw, { ip: req.ip, userAgent: req.headers["user-agent"] });

  const { User } = await import("../models/User");
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw ApiError.unauthorized("User not found or inactive");

  const { token: accessToken } = signAccessToken(user);
  setRefreshCookie(res, newToken);
  return ApiResponse.success(res, { accessToken, expiresIn: ms(env.JWT_ACCESS_EXPIRES) }, "Token refreshed");
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user?.tokenId) await blacklistAccessToken(req.user.tokenId);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
  return ApiResponse.success(res, null, "Logged out");
});

/** Nuclear option: revoke every active session (all devices) — e.g. "log out everywhere". */
export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  await revokeAllUserSessions(req.user.sub);
  if (req.user.tokenId) await blacklistAccessToken(req.user.tokenId);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
  return ApiResponse.success(res, null, "Logged out from all devices");
});

import crypto from "crypto";

export const me = asyncHandler(async (req: Request, res: Response) => {
  const { User } = await import("../models/User");
  const user = await User.findById(req.user?.sub);
  if (!user) throw ApiError.notFound("User not found");
  return ApiResponse.success(res, user.toSafeJSON());
});

// Dynamic host helper to determine the callback redirect dynamically
function getCallbackBase(req: Request): string {
  const protocol = req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  const host = req.get("host") || `localhost:${env.PORT}`;
  return `${protocol}://${host}`;
}

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const redirectUri = `${getCallbackBase(req)}/api/v1/auth/google/callback`;

  if (!env.GOOGLE_CLIENT_ID) {
    logger.warn("Google OAuth is not configured. Redirecting to mock login callback in development mode.");
    return res.redirect(`${redirectUri}?code=mock_google_code`);
  }

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=profile%20email`;
  return res.redirect(url);
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) throw ApiError.badRequest("OAuth authorization code missing");

  let profile: { email: string; name: string };

  if (code === "mock_google_code" && !env.GOOGLE_CLIENT_ID) {
    profile = {
      email: "google.demo@hackathon.local",
      name: "Demo Google User",
    };
  } else {
    const redirectUri = `${getCallbackBase(req)}/api/v1/auth/google/callback`;

    // 1. Exchange authorization code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: String(code),
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      logger.error({ errorData }, "Google Token Exchange failed");
      throw ApiError.badRequest("Google authentication failed");
    }

    const { access_token } = (await tokenResponse.json()) as any;

    // 2. Retrieve user profile info from Google API
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userResponse.ok) {
      throw ApiError.badRequest("Failed to fetch Google profile info");
    }

    profile = (await userResponse.json()) as any; // { name, email, sub }
  }

  // 3. Find or register user
  const { User } = await import("../models/User");
  let user = await User.findOne({ email: profile.email });
  if (!user) {
    user = await User.create({
      name: profile.name || "Google User",
      email: profile.email,
      password: crypto.randomUUID(), // Secure random fallback password
      isEmailVerified: true,
      role: "user",
    });
  }

  // 4. Issue session access & refresh tokens
  const { token: accessToken } = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user._id.toString(), {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  setRefreshCookie(res, refreshToken);

  // Redirect to frontend callback route
  return res.redirect(`${env.CLIENT_URL}/oauth-callback?token=${accessToken}`);
});

export const githubLogin = asyncHandler(async (req: Request, res: Response) => {
  const redirectUri = `${getCallbackBase(req)}/api/v1/auth/github/callback`;

  if (!env.GITHUB_CLIENT_ID) {
    logger.warn("GitHub OAuth is not configured. Redirecting to mock login callback in development mode.");
    return res.redirect(`${redirectUri}?code=mock_github_code`);
  }

  const url = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=user:email`;
  return res.redirect(url);
});

export const githubCallback = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) throw ApiError.badRequest("OAuth authorization code missing");

  let email: string;
  let profileName: string;

  if (code === "mock_github_code" && !env.GITHUB_CLIENT_ID) {
    email = "github.demo@hackathon.local";
    profileName = "Demo GitHub User";
  } else {
    // 1. Exchange authorization code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code: String(code),
      }),
    });

    if (!tokenResponse.ok) {
      throw ApiError.badRequest("GitHub token exchange failed");
    }

    const { access_token } = (await tokenResponse.json()) as any;

    // 2. Fetch User Profile
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${access_token}`,
        "User-Agent": "Node-OAuth",
      },
    });

    if (!userResponse.ok) {
      throw ApiError.badRequest("Failed to fetch GitHub profile info");
    }

    const profile = (await userResponse.json()) as any; // { id, name, login, email }
    profileName = profile.name || profile.login || "GitHub User";
    email = profile.email;

    if (!email) {
      // Attempt fetching primary verified email if public profile hides it
      const emailsResponse = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `token ${access_token}`,
          "User-Agent": "Node-OAuth",
        },
      });
      if (emailsResponse.ok) {
        const emailsList = (await emailsResponse.json()) as any[];
        const primaryEmail = emailsList.find((e: any) => e.primary && e.verified);
        email = primaryEmail ? primaryEmail.email : emailsList[0]?.email;
      }
    }
  }

  if (!email) {
    throw ApiError.badRequest("GitHub account must have an email associated.");
  }

  // 3. Find or register user
  const { User } = await import("../models/User");
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      name: profileName,
      email,
      password: crypto.randomUUID(),
      isEmailVerified: true,
      role: "user",
    });
  }

  // 4. Issue tokens
  const { token: accessToken } = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user._id.toString(), {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  setRefreshCookie(res, refreshToken);

  return res.redirect(`${env.CLIENT_URL}/oauth-callback?token=${accessToken}`);
});

export const sendVerification = asyncHandler(async (req: Request, res: Response) => {
  const email = req.body?.email || (req.user as any)?.email;
  if (!email) throw ApiError.badRequest("Email address is required");

  const targetUser = await User.findOne({ email });
  if (!targetUser) throw ApiError.notFound("User account not found");
  if (targetUser.isEmailVerified) throw ApiError.badRequest("Email is already verified");

  await createAndSendVerification(targetUser);
  return ApiResponse.success(res, null, "Verification code and email link sent successfully.");
});

export const verifyEmail = (req: Request, res: Response, next: any) => verifyOtp(req, res, next);

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, code, token } = req.body;
  const candidateCode = (otp || code || "").trim();
  const normalizedEmail = email ? email.toLowerCase().trim() : undefined;

  if (!candidateCode && !token) {
    throw ApiError.badRequest("Verification OTP code or token is required");
  }

  // 1. Find Pending Registration or Verification Token
  let pending = normalizedEmail ? await PendingRegistration.findOne({ email: normalizedEmail }) : null;
  let tokenDoc = token ? await EmailVerificationToken.findOne({ token }) : null;
  if (!tokenDoc && candidateCode) {
    tokenDoc = await EmailVerificationToken.findOne({ otpCode: candidateCode });
  }

  if (!pending && tokenDoc) {
    const userDoc = await User.findById(tokenDoc.user);
    if (userDoc) {
      pending = await PendingRegistration.findOne({ email: userDoc.email });
    }
  }

  if (!pending && !tokenDoc) {
    throw ApiError.badRequest("No pending registration found for this email address.");
  }

  // 2. Check Expiry (STEP 11: 5-minute expiry)
  const expiry = pending?.otpExpiry || tokenDoc?.expiresAt;
  if (expiry && new Date() > new Date(expiry)) {
    throw ApiError.badRequest("OTP code has expired (5-minute limit). Please click Resend OTP.");
  }

  // 3. Check Verification Attempt Limit (STEP 11 & 13: max 5 attempts)
  if (pending) {
    if (pending.verificationAttempts >= 5) {
      throw ApiError.tooManyRequests("Maximum verification attempts exceeded (5/5). Please request a new OTP.");
    }
    pending.verificationAttempts += 1;
    await pending.save();
  }

  // 4. Validate OTP Code using bcrypt or direct token
  let isMatch = false;
  if (candidateCode && pending?.otpHash) {
    isMatch = await bcrypt.compare(candidateCode, pending.otpHash);
  }
  if (!isMatch && candidateCode && pending?.otpCode) {
    isMatch = candidateCode === pending.otpCode;
  }
  if (!isMatch && candidateCode && tokenDoc?.otpCode) {
    isMatch = candidateCode === tokenDoc.otpCode;
  }
  if (!isMatch && token) {
    isMatch = true;
  }

  if (!isMatch) {
    throw ApiError.badRequest("Invalid OTP verification code. Please check your email.");
  }

  // 5. Success -> Promote User & Mark Verified (STEP 11)
  const targetEmail = pending?.email || (tokenDoc ? (await User.findById(tokenDoc.user))?.email : null);
  if (!targetEmail) throw ApiError.notFound("User email not found");

  let user = await User.findOne({ email: targetEmail });
  if (!user && pending) {
    user = await User.create({
      name: pending.name,
      email: pending.email,
      phone: pending.phone,
      password: pending.passwordHash,
      role: pending.role,
      isEmailVerified: true,
    });
  } else if (user) {
    user.isEmailVerified = true;
    if (pending) {
      user.name = pending.name || user.name;
      user.phone = pending.phone || user.phone;
      user.role = pending.role || user.role;
    }
    await user.save();
  }

  // Delete temporary registration & verification tokens
  if (pending) await PendingRegistration.deleteOne({ _id: pending._id });
  await EmailVerificationToken.deleteMany({ user: user!._id });

  // 6. Generate JWT Session (STEP 11)
  const { token: accessToken } = signAccessToken(user!);
  const refreshToken = await issueRefreshToken(user!._id.toString(), {
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  setRefreshCookie(res, refreshToken);

  return res.status(200).json({
    success: true,
    message: "Account verified successfully",
    data: {
      user: user!.toSafeJSON(),
      accessToken,
      expiresIn: ms(env.JWT_ACCESS_EXPIRES),
    },
  });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  const targetEmail = (email || (req.user as any)?.email)?.toLowerCase().trim();
  if (!targetEmail) throw ApiError.badRequest("Email address is required");

  // Find Pending Registration or existing User
  let pending = await PendingRegistration.findOne({ email: targetEmail });
  const user = await User.findOne({ email: targetEmail });

  if (user && user.isEmailVerified) {
    throw ApiError.badRequest("This email is already verified. Please sign in.");
  }

  // Enforce 60-Second Cooldown (STEP 12)
  if (pending?.lastResendAt) {
    const elapsedSeconds = (Date.now() - new Date(pending.lastResendAt).getTime()) / 1000;
    if (elapsedSeconds < 60) {
      const waitTime = Math.ceil(60 - elapsedSeconds);
      throw ApiError.tooManyRequests(`Please wait ${waitTime} seconds before requesting another OTP.`);
    }
  }

  // Enforce Max 5 Resends (STEP 12)
  if (pending && pending.resendCount >= 5) {
    throw ApiError.tooManyRequests("Maximum OTP resend attempts reached (5/5). Please re-register.");
  }

  // Generate new 6-digit OTP (STEP 12)
  const newOtpCode = randomInt(100000, 999999).toString();
  const newOtpHash = await bcrypt.hash(newOtpCode, 10);
  const newExpiry = new Date(Date.now() + 5 * 60 * 1000);
  const newToken = randomUUID();

  if (pending) {
    pending.otpCode = newOtpCode;
    pending.otpHash = newOtpHash;
    pending.otpExpiry = newExpiry;
    pending.verificationAttempts = 0;
    pending.resendCount += 1;
    pending.lastResendAt = new Date();
    await pending.save();
  }

  if (user) {
    await EmailVerificationToken.deleteMany({ user: user._id });
    await EmailVerificationToken.create({
      user: user._id,
      token: newToken,
      otpCode: newOtpCode,
      expiresAt: newExpiry,
    });
  }

  // Send new SMTP email (STEP 12)
  sendVerificationEmail({
    toEmail: targetEmail,
    name: pending?.name || user?.name || "User",
    token: newToken,
    otpCode: newOtpCode,
  }).catch((err) => logger.error({ err }, "Failed to resend SMTP verification OTP"));

  return res.status(200).json({
    success: true,
    message: "New OTP Sent",
    email: targetEmail,
  });
});

export const deleteAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.sub;
  if (!userId) throw ApiError.unauthorized();

  await Promise.all([
    User.findByIdAndDelete(userId),
    Donor.deleteMany({ userId }),
    UserPreferences.deleteMany({ userId }),
  ]);

  res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
  return ApiResponse.success(res, null, "Account deleted successfully");
});
