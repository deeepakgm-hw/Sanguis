import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole } from "../middlewares/rbac";
import {
  getCampaigns,
  getCampaignById,
  createCampaign,
  approveCampaign,
  rejectCampaign,
  cancelCampaign,
  registerForCampaign,
  getMyRegistrations,
  cancelRegistration,
  checkInParticipant,
  verifyDonation,
  getMyDonations,
  getMyCertificates,
  getCertificateById,
  verifyCertificatePublic,
  revokeCertificate,
  getOrganizerDashboard,
  getDonationStats,
} from "../controllers/donation.controller";

const router = Router();

// Public routes (no auth required for verification portal & discovery)
router.get("/campaigns", getCampaigns);
router.get("/campaigns/:id", getCampaignById);
router.get("/certificates/verify/:certificateId", verifyCertificatePublic);
router.get("/stats", getDonationStats);

// Protected routes (authenticated user)
router.use(requireAuth);

// Donor actions
router.post("/campaigns/:id/register", registerForCampaign);
router.get("/my-registrations", getMyRegistrations);
router.delete("/registrations/:id", cancelRegistration);
router.get("/my-donations", getMyDonations);
router.get("/my-certificates", getMyCertificates);
router.get("/certificates/:id", getCertificateById);

// Campaign Organizer / Hospital Staff actions
router.post("/campaigns", createCampaign);
router.post("/registrations/check-in", checkInParticipant);
router.post("/registrations/verify", verifyDonation);
router.get("/organizer/dashboard", getOrganizerDashboard);

// Admin actions
router.post("/campaigns/:id/approve", requireRole("admin"), approveCampaign);
router.post("/campaigns/:id/reject", requireRole("admin"), rejectCampaign);
router.post("/campaigns/:id/cancel", requireRole("admin", "hospital"), cancelCampaign);
router.post("/certificates/:id/revoke", requireRole("admin"), revokeCertificate);

export default router;
