/**
 * Distinguishes "operational" errors (expected: bad input, unauthorized,
 * not found) from programmer errors (bugs). Only operational errors are
 * safe to expose to the client; everything else becomes a generic 500
 * in the global error handler so we never leak stack traces or internals.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errors?: unknown;
  public readonly code?: string;

  constructor(statusCode: number, message: string, errors?: unknown, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad Request", errors?: unknown) {
    return new ApiError(400, message, errors, "BAD_REQUEST");
  }
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message, undefined, "UNAUTHORIZED");
  }
  static forbidden(message = "Forbidden") {
    return new ApiError(403, message, undefined, "FORBIDDEN");
  }
  static notFound(message = "Resource not found") {
    return new ApiError(404, message, undefined, "NOT_FOUND");
  }
  static conflict(message = "Conflict") {
    return new ApiError(409, message, undefined, "CONFLICT");
  }
  static tooManyRequests(message = "Too many requests") {
    return new ApiError(429, message, undefined, "RATE_LIMITED");
  }
  static internal(message = "Internal Server Error") {
    return new ApiError(500, message, undefined, "INTERNAL");
  }
}
