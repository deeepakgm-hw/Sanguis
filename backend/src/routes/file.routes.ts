import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { uploadSingle, verifyUploadedFile } from "../middlewares/security/fileUpload";
import { uploadFile } from "../controllers/file.controller";

const router = Router();

router.post("/upload", requireAuth, uploadSingle, verifyUploadedFile, uploadFile);

export default router;
