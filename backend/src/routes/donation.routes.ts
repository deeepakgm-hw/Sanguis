import { Router } from "express";
import { recordDonation } from "../controllers/donation.controller";

const router = Router();

router.post("/", recordDonation);

export default router;
