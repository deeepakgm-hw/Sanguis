import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRole, requirePermission } from "../middlewares/rbac";
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

// Campaign Organizer / Hospital / Blood Bank Staff actions (RBAC Protected)
router.post("/campaigns", requirePermission("campaign:create"), createCampaign);
router.post("/registrations/check-in", requirePermission("campaign:checkin"), checkInParticipant);
router.post("/registrations/verify", requirePermission("donation:verify"), verifyDonation);
router.get("/organizer/dashboard", requirePermission("campaign:manage"), getOrganizerDashboard);

// Admin actions (RBAC & Permission Protected)
router.post("/campaigns/:id/approve", requirePermission("campaign:approve"), approveCampaign);
router.post("/campaigns/:id/reject", requirePermission("campaign:reject"), rejectCampaign);
router.post("/campaigns/:id/cancel", requirePermission("campaign:manage"), cancelCampaign);
router.post("/certificates/:id/revoke", requirePermission("certificate:revoke"), revokeCertificate);

export default router;
