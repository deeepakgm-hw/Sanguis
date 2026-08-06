import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      pagination?: {
        page: number;
        limit: number;
        skip: number;
        sortBy: string;
        sortOrder: 1 | -1;
        search: string;
      };
    }
  }
}

/**
 * Middleware to parse, sanitize, and validate pagination, sorting, and search queries.
 * Attaches a standardized req.pagination object to the request.
 */
export function parsePagination(req: Request, _res: Response, next: NextFunction): void {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  
  // Sanitize sortBy to prevent injection attacks (limit to alphanumeric and common symbols)
  let sortBy = (req.query.sortBy as string) || "createdAt";
  if (!/^[a-zA-Z0-9_.]+$/.test(sortBy)) {
    sortBy = "createdAt";
  }

  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  req.pagination = {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
    search,
  };

  next();
}
