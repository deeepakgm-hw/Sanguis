import { Response } from "express";

/**
 * Every response in the system follows this exact shape.
 * Why: frontend can write ONE response interceptor instead of guessing
 * shapes per-endpoint. Judges/teammates can also read raw JSON and
 * immediately understand success/failure without reading route code.
 */
interface Meta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export class ApiResponse {
  static success<T>(res: Response, data: T, message = "Success", statusCode = 200, meta?: Meta) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      meta: meta ?? undefined,
      timestamp: new Date().toISOString(),
    });
  }

  static created<T>(res: Response, data: T, message = "Created") {
    return this.success(res, data, message, 201);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }
}
