import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import * as pwController from "../controllers/passwordReset.controller";
import { validate } from "../middlewares/validate";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, verifyOtpSchema, resendOtpSchema } from "../validators/auth.validator";
import { authLimiter, otpLimiter } from "../middlewares/security/rateLimiter";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// Primary Authentication & OTP Verification Endpoints (STEP 3, 11, 12)
router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/verify-otp", otpLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post("/resend-otp", otpLimiter, validate(resendOtpSchema), authController.resendOtp);

// Backwards-compatible aliases
router.post("/verify-email", otpLimiter, validate(verifyOtpSchema), authController.verifyOtp);
router.post("/send-verification", otpLimiter, validate(resendOtpSchema), authController.resendOtp);

router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authLimiter, authController.refresh);
router.post("/mfa/verify", authLimiter, validate(verifyOtpSchema), authController.verifyMfa);

router.get("/google", authController.googleLogin);
router.get("/google/callback", authController.googleCallback);
router.get("/github", authController.githubLogin);
router.get("/github/callback", authController.githubCallback);
router.post("/logout", requireAuth, authController.logout);
router.post("/logout-all", requireAuth, authController.logoutAll);
router.get("/me", requireAuth, authController.me);
router.delete("/account", requireAuth, authController.deleteAccount);

router.post("/verify-email/send", requireAuth, otpLimiter, pwController.sendVerificationOtp);
router.post("/verify-email/confirm", otpLimiter, validate(verifyOtpSchema), pwController.verifyEmailOtp);

router.post("/forgot-password", otpLimiter, validate(forgotPasswordSchema), pwController.forgotPassword);
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), pwController.resetPassword);

export default router;
