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

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await registerUser(req.body);
  return ApiResponse.created(res, user.toSafeJSON(), "Registration successful");
});

import { generateOtp, verifyOtp } from "../services/otp.service";
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
  const isValid = await verifyOtp(email, otp);
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
import { logger } from "../utils/logger";

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
        const emailsList = (await emailsResponse.json()) as any;
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
