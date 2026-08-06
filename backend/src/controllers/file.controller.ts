import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { uploadBufferToCloudinary } from "../config/cloudinary";
import { UploadedFile } from "../models/UploadedFile";

export const uploadFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("No file uploaded");
  if (!req.user) throw ApiError.unauthorized();

  const { url, publicId } = await uploadBufferToCloudinary(req.file.buffer, `uploads/${req.user.sub}`);

  const record = await UploadedFile.create({
    owner: req.user.sub,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    url,
    publicId,
    scanStatus: "skipped", // wire up an AV scan webhook (e.g. ClamAV/VirusTotal) here in prod
  });

  return ApiResponse.created(res, record, "File uploaded");
});
