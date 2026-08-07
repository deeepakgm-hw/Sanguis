import { Router } from "express";
import { getFaqContent, getBlogContent } from "../controllers/content.controller";

const router = Router();

router.get("/faq", getFaqContent);
router.get("/blog", getBlogContent);

export default router;
