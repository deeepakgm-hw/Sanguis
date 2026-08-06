import multer from "multer";
import { Request } from "express";
import { ApiError } from "../../utils/ApiError";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Magic numbers (file signatures) — the first bytes of a file never
// lie about its true type, unlike the extension or the client-supplied
// mimetype (both trivially spoofable). This is the real defense
// against "shell.php.jpg" style upload attacks.
const MAGIC_NUMBERS: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
  "application/pdf": [[0x25, 0x50, 0x44, 0x46]],
};

import { scanBuffer } from "../../utils/malwareScanner";
import { logSecurityEvent } from "../../services/securityLog.service";
import { blockIP } from "./ipBlocker";

export function validateMagicNumber(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_NUMBERS[mimeType];
  if (!signatures) return false;
  return signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte));
}

const storage = multer.memoryStorage(); // buffer only; we stream straight to Cloudinary, never write to local disk

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const allowed = Object.keys(MAGIC_NUMBERS);
  if (!allowed.includes(file.mimetype)) {
    return cb(new ApiError(400, `Unsupported file type: ${file.mimetype}`) as unknown as null);
  }
  cb(null, true);
}

export const uploadSingle = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter,
}).single("file");

/**
 * Second layer of defense run AFTER multer, on the actual buffer bytes.
 * Verifies byte signatures (magic numbers) and scans the payload for malicious contents.
 */
export function verifyUploadedFile(req: Request, _res: unknown, next: (err?: unknown) => void): void {
  const file = req.file;
  if (!file) return next(ApiError.badRequest("No file uploaded"));

  // 1. Verify file magic numbers
  if (!validateMagicNumber(file.buffer, file.mimetype)) {
    logSecurityEvent({
      eventType: "SPOOFED_FILE_UPLOAD",
      severity: "high",
      req,
      details: { fileName: file.originalname, declaredMime: file.mimetype },
    });
    return next(ApiError.badRequest("File content does not match its declared type"));
  }

  // 2. Scan file buffer for malware / embedded scripts
  const scanResult = scanBuffer(file.buffer, file.mimetype);
  if (!scanResult.isSafe) {
    logSecurityEvent({
      eventType: "MALWARE_DETECTION",
      severity: "critical",
      req,
      details: { fileName: file.originalname, reason: scanResult.reason },
    });

    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || req.ip;
    const ip = typeof rawIp === "string" ? rawIp.split(",")[0].trim() : String(rawIp);
    
    // Auto-ban threat IP for 1 hour
    blockIP(ip, `Malware file upload attempt: ${scanResult.reason}`, 3600);

    return next(
      ApiError.badRequest(
        `Security Threat Detected: The uploaded file was flagged by the system as unsafe. Event logged.`
      )
    );
  }

  next();
}
