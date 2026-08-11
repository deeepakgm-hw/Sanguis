import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

/**
 * OWASP A03 - all injection/logic-bug classes start with unvalidated
 * input. This factory lets every route declare its exact expected
 * shape once (in validators/*.ts) and reject anything else BEFORE it
 * reaches business logic or the database layer.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body ?? req.body;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formattedErrors = err.errors.map((e) => {
          const field = e.path.filter((p) => p !== "body" && p !== "query" && p !== "params").join(".");
          return field ? `${field}: ${e.message}` : e.message;
        });
        return next(ApiError.badRequest("Validation failed", formattedErrors));
      }
      next(err);
    }
  };
}
