import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps async route handlers so rejected promises are forwarded to
 * Express's error middleware via next(err), instead of crashing the
 * process (unhandled promise rejection) or requiring try/catch in
 * every single controller.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
