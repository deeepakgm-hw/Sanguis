import { User, IUser } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { SecurityEvent } from "../models/AuditLog";
import { assertAccountNotLocked, recordFailedAttempt, clearFailedAttempts } from "../middlewares/security/bruteForce";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginMeta {
  ip: string;
  userAgent?: string;
}

export async function registerUser(input: RegisterInput): Promise<IUser> {
  const existing = await User.findOne({ email: input.email });
  // Deliberately vague error: don't reveal whether an email is
  // registered (prevents user enumeration - OWASP A07).
  if (existing) throw ApiError.conflict("Unable to register with the provided details");

  const user = await User.create(input);
  return user;
}

export async function authenticateUser(email: string, password: string, meta: LoginMeta): Promise<IUser> {
  await assertAccountNotLocked(email);

  // select("+password") because the schema excludes it by default.
  const user = await User.findOne({ email }).select("+password");

  if (!user || !user.isActive) {
    await recordFailedAttempt(email);
    await SecurityEvent.create({ type: "LOGIN_FAILURE", email, ip: meta.ip, userAgent: meta.userAgent });
    // Same generic message whether the user doesn't exist or the
    // password is wrong — prevents user enumeration.
    throw ApiError.unauthorized("Invalid email or password");
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    await recordFailedAttempt(email);
    await SecurityEvent.create({ type: "LOGIN_FAILURE", user: user._id, email, ip: meta.ip, userAgent: meta.userAgent });
    throw ApiError.unauthorized("Invalid email or password");
  }

  await clearFailedAttempts(email);
  user.lastLoginAt = new Date();
  user.lastLoginIp = meta.ip;
  await user.save({ validateBeforeSave: false });

  await SecurityEvent.create({ type: "LOGIN_SUCCESS", user: user._id, email, ip: meta.ip, userAgent: meta.userAgent });

  return user;
}
