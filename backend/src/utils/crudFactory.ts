import { Request, Response } from "express";
import { asyncHandler } from "./asyncHandler";
import { ApiResponse } from "./ApiResponse";
import { ApiError } from "./ApiError";
import { recordAudit } from "../services/audit.service";
import mongoose from "mongoose";

interface CrudOptions {
  allowedFields: string[];
  resourceName: string;
  checkOwnership?: boolean;
}

/**
 * Controller factory to automatically generate secure CRUD controllers for any Mongoose model.
 * Embedded with pagination, sorting, audit logs, and IDOR ownership checking.
 */
export function createCrudControllers(model: mongoose.Model<any>, options: CrudOptions) {
  const { allowedFields, resourceName, checkOwnership = false } = options;

  return {
    create: asyncHandler(async (req: Request, res: Response) => {
      const data: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) data[field] = req.body[field];
      }

      if (checkOwnership && req.user) {
        data.owner = req.user.sub;
      }

      const record = await model.create(data);

      await recordAudit({
        req,
        action: `${resourceName.toLowerCase()}.create`,
        resourceType: resourceName,
        resourceId: record._id.toString(),
        after: record.toJSON(),
      });

      return ApiResponse.created(res, record, `${resourceName} created successfully`);
    }),

    getAll: asyncHandler(async (req: Request, res: Response) => {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
      const sortField = (req.query.sortBy as string) || "createdAt";
      const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
      
      const filter: Record<string, any> = {};
      if (checkOwnership && req.user) {
        filter.owner = req.user.sub;
      }

      // 1. Dynamic Key-Value Filter matching
      for (const key of Object.keys(req.query)) {
        if (["page", "limit", "sortBy", "sortOrder", "search"].includes(key)) continue;
        if (req.query[key] !== undefined) filter[key] = req.query[key];
      }

      // 2. Multi-Field Regex Search
      if (req.query.search && allowedFields.length > 0) {
        const searchRegex = { $regex: String(req.query.search), $options: "i" };
        filter.$or = allowedFields.map((field) => ({ [field]: searchRegex }));
      }

      const [records, total] = await Promise.all([
        model.find(filter)
          .sort({ [sortField]: sortOrder })
          .skip((page - 1) * limit)
          .limit(limit),
        model.countDocuments(filter),
      ]);

      return ApiResponse.success(res, records, `${resourceName} list fetched`, 200, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      });
    }),

    getById: asyncHandler(async (req: Request, res: Response) => {
      const record = await model.findById(req.params.id);
      if (!record) throw ApiError.notFound(`${resourceName} not found`);

      if (checkOwnership && req.user && record.owner?.toString() !== req.user.sub) {
        throw ApiError.forbidden("Access denied: You do not own this resource");
      }

      return ApiResponse.success(res, record);
    }),

    update: asyncHandler(async (req: Request, res: Response) => {
      const before = await model.findById(req.params.id);
      if (!before) throw ApiError.notFound(`${resourceName} not found`);

      if (checkOwnership && req.user && before.owner?.toString() !== req.user.sub) {
        throw ApiError.forbidden("Access denied: You do not own this resource");
      }

      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updates[field] = req.body[field];
      }

      const updated = await model.findByIdAndUpdate(req.params.id, updates, {
        new: true,
        runValidators: true,
      });

      await recordAudit({
        req,
        action: `${resourceName.toLowerCase()}.update`,
        resourceType: resourceName,
        resourceId: req.params.id,
        before: before.toJSON(),
        after: updated?.toJSON(),
      });

      return ApiResponse.success(res, updated, `${resourceName} updated successfully`);
    }),

    delete: asyncHandler(async (req: Request, res: Response) => {
      const record = await model.findById(req.params.id);
      if (!record) throw ApiError.notFound(`${resourceName} not found`);

      if (checkOwnership && req.user && record.owner?.toString() !== req.user.sub) {
        throw ApiError.forbidden("Access denied: You do not own this resource");
      }

      await model.findByIdAndDelete(req.params.id);

      await recordAudit({
        req,
        action: `${resourceName.toLowerCase()}.delete`,
        resourceType: resourceName,
        resourceId: req.params.id,
        before: record.toJSON(),
      });

      return ApiResponse.success(res, null, `${resourceName} deleted successfully`);
    }),
  };
}
