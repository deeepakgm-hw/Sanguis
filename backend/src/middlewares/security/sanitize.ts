import { Request, Response, NextFunction } from "express";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import xss from "xss";

/**
 * OWASP A03 - Injection.
 * 1. mongoSanitize strips keys starting with "$" or containing "."
 *    from req.body/query/params, which blocks NoSQL operator injection
 *    like { "email": { "$gt": "" } } used to bypass login.
 * 2. hpp prevents HTTP Parameter Pollution (?role=user&role=admin).
 * 3. deepXssClean recursively encodes/strips script payloads from
 *    string fields so stored XSS never reaches the database.
 */
export const noSqlSanitize = mongoSanitize({ replaceWith: "_" });
export const httpParamProtection = hpp();

function deepClean(value: unknown): unknown {
  if (typeof value === "string") return xss(value.trim());
  if (Array.isArray(value)) return value.map(deepClean);
  if (value && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) cleaned[k] = deepClean(v);
    return cleaned;
  }
  return value;
}

export function xssSanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) req.body = deepClean(req.body);
  if (req.query) req.query = deepClean(req.query) as typeof req.query;
  if (req.params) req.params = deepClean(req.params) as typeof req.params;
  next();
}
