import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import {
  Campaign,
  DonationRegistration,
  VerifiedDonation,
  DonationCertificate,
  Donor,
  User,
  Notification,
  AuditLog,
} from "../models";
import { randomInt, randomUUID } from "crypto";

// Helper to generate unique codes
function generateRegistrationCode(): string {
  return `SDN-${randomInt(10000000, 99999999)}`;
}

function generateCertificateId(): string {
  return `SANGUIS-BDC-${randomInt(10000000, 99999999)}`;
}

function generateDonationId(): string {
  return `DON-${randomInt(10000000, 99999999)}`;
}

function generateCampaignId(): string {
  return `BDC-2026-${randomInt(1000, 9999)}`;
}

// ── 1. CAMPAIGN DISCOVERY & MANAGEMENT ──────────────────────────────────────

export const getCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const {
    search,
    city,
    bloodGroup,
    organizerType,
    status = "APPROVED",
    limit = "20",
    page = "1",
  } = req.query;

  const query: any = {};

  // Status filtering: default to APPROVED for general users unless admin/organizer explicitly asks
  if (status === "ALL" && (req.user?.role === "admin" || req.user?.role === "hospital")) {
    // Return all statuses for admin/organizer dashboard
  } else if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search as string, $options: "i" } },
      { venue: { $regex: search as string, $options: "i" } },
      { organizerName: { $regex: search as string, $options: "i" } },
      { city: { $regex: search as string, $options: "i" } },
    ];
  }

  if (city) {
    query.city = { $regex: city as string, $options: "i" };
  }

  if (bloodGroup) {
    query.bloodGroupsRequired = bloodGroup;
  }

  if (organizerType) {
    query.organizerType = organizerType;
  }

  const limitNum = parseInt(limit as string, 10) || 20;
  const pageNum = parseInt(page as string, 10) || 1;
  const skip = (pageNum - 1) * limitNum;

  const [campaigns, total] = await Promise.all([
    Campaign.find(query).sort({ date: 1, createdAt: -1 }).skip(skip).limit(limitNum),
    Campaign.countDocuments(query),
  ]);

  return ApiResponse.success(
    res,
    {
      campaigns,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    },
    "Campaigns retrieved successfully"
  );
});

export const getCampaignById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const campaign = await Campaign.findById(id);
  if (!campaign) {
    throw ApiError.notFound("Donation campaign not found");
  }

  // Check if current authenticated user has already registered
  let myRegistration = null;
  if (req.user?.sub) {
    myRegistration = await DonationRegistration.findOne({
      user: req.user.sub,
      campaign: campaign._id,
      status: { $nin: ["CANCELLED"] },
    });
  }

  return ApiResponse.success(
    res,
    { campaign, myRegistration },
    "Campaign details retrieved"
  );
});

export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    description,
    organizerName,
    organizerType,
    venue,
    address,
    city,
    lat,
    lng,
    date,
    startTime = "09:00 AM",
    endTime = "05:00 PM",
    contactPhone,
    contactEmail,
    bloodGroupsRequired,
    availableCapacity = 100,
    eligibilityRequirements,
    requiredDocuments,
  } = req.body;

  if (!title || !description || !organizerName || !organizerType || !venue || !address || !city || !date || !contactPhone) {
    throw ApiError.badRequest("Please provide all required campaign details");
  }

  const user = await User.findById(req.user?.sub);
  if (!user) {
    throw ApiError.unauthorized("User profile not found");
  }

  // Auto-approve if created by admin or verified hospital/blood-bank
  const isAdminOrVerified = user.role === "admin" || (user.role === "hospital" && user.isEmailVerified);
  const status = isAdminOrVerified ? "APPROVED" : "PENDING_APPROVAL";

  const campaign = await Campaign.create({
    campaignId: generateCampaignId(),
    title,
    description,
    organizerName,
    organizerType,
    organizerUser: user._id,
    hospitalOrBank: user.role === "hospital" ? user._id : undefined,
    venue,
    address,
    city,
    location: {
      type: "Point",
      coordinates: [parseFloat(lng) || 77.5946, parseFloat(lat) || 12.9716],
    },
    date: new Date(date),
    startTime,
    endTime,
    contactPhone,
    contactEmail: contactEmail || user.email,
    bloodGroupsRequired: bloodGroupsRequired || ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    availableCapacity: Number(availableCapacity),
    currentRegistrationsCount: 0,
    eligibilityRequirements: eligibilityRequirements || ["Age 18-65", "Weight >= 45kg", "90 days since last donation"],
    requiredDocuments: requiredDocuments || ["Government ID (Aadhaar / Passport / Driving License)"],
    isVerifiedOrganizer: isAdminOrVerified,
    status,
  });

  return ApiResponse.created(
    res,
    campaign,
    isAdminOrVerified
      ? "Donation campaign created and published successfully!"
      : "Campaign submitted successfully. It will be live once reviewed by Sanguis administrators."
  );
});

export const approveCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const campaign = await Campaign.findById(id);
  if (!campaign) {
    throw ApiError.notFound("Campaign not found");
  }

  campaign.status = "APPROVED";
  campaign.isVerifiedOrganizer = true;
  await campaign.save();

  // Notify organizer
  await Notification.create({
    user: campaign.organizerUser,
    title: "🎉 Campaign Approved!",
    message: `Your blood donation camp "${campaign.title}" has been approved and is now live for donor registrations.`,
    type: "success",
  });

  return ApiResponse.success(res, campaign, "Campaign approved and published live");
});

export const rejectCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const campaign = await Campaign.findById(id);
  if (!campaign) {
    throw ApiError.notFound("Campaign not found");
  }

  campaign.status = "REJECTED";
  campaign.rejectionReason = reason || "Does not meet authorized campaign criteria";
  await campaign.save();

  // Notify organizer
  await Notification.create({
    user: campaign.organizerUser,
    title: "Campaign Update",
    message: `Your campaign "${campaign.title}" was not approved. Reason: ${campaign.rejectionReason}`,
    type: "error",
  });

  return ApiResponse.success(res, campaign, "Campaign rejected");
});

export const cancelCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const campaign = await Campaign.findById(id);
  if (!campaign) {
    throw ApiError.notFound("Campaign not found");
  }

  campaign.status = "CANCELLED";
  await campaign.save();

  // Notify all registered participants
  const registrations = await DonationRegistration.find({ campaign: campaign._id, status: { $nin: ["CANCELLED"] } });
  for (const reg of registrations) {
    reg.status = "CANCELLED";
    await reg.save();
    await Notification.create({
      user: reg.user,
      title: "Campaign Cancelled",
      message: `The blood donation camp "${campaign.title}" scheduled for ${new Date(campaign.date).toLocaleDateString()} has been cancelled.`,
      type: "warning",
    });
  }

  return ApiResponse.success(res, campaign, "Campaign cancelled and participants notified");
});

// ── 2. DONOR REGISTRATION & CHECK-IN ────────────────────────────────────────

export const registerForCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { bloodGroup } = req.body;

  const campaign = await Campaign.findById(id);
  if (!campaign) {
    throw ApiError.notFound("Campaign not found");
  }

  if (campaign.status !== "APPROVED" && campaign.status !== "UPCOMING" && campaign.status !== "ONGOING") {
    throw ApiError.badRequest("This campaign is not accepting new registrations");
  }

  if (campaign.currentRegistrationsCount >= campaign.availableCapacity) {
    throw ApiError.badRequest("Campaign capacity is full. All slots have been booked.");
  }

  if (new Date(campaign.date).getTime() + 24 * 60 * 60 * 1000 < Date.now()) {
    throw ApiError.badRequest("Registration deadline for this campaign has passed");
  }

  const userId = req.user?.sub;
  if (!userId) {
    throw ApiError.unauthorized("User authentication required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const existingReg = await DonationRegistration.findOne({
    user: userId,
    campaign: campaign._id,
    status: { $nin: ["CANCELLED"] },
  });

  if (existingReg) {
    throw ApiError.conflict("You have already registered for this blood donation camp.");
  }

  const donor = await Donor.findOne({ userId });
  const selectedBloodGroup = bloodGroup || donor?.bloodType || "O+";
  const regCode = generateRegistrationCode();
  const qrData = JSON.stringify({
    regCode,
    campaignId: campaign.campaignId,
    userName: user.name,
    bloodGroup: selectedBloodGroup,
    date: campaign.date,
  });

  const registration = await DonationRegistration.create({
    registrationCode: regCode,
    user: user._id,
    donor: donor?._id,
    campaign: campaign._id,
    bloodGroup: selectedBloodGroup,
    status: "CONFIRMED",
    qrCodeData: qrData,
  });

  // Increment registrations count
  campaign.currentRegistrationsCount += 1;
  await campaign.save();

  // Create notification
  await Notification.create({
    user: user._id,
    title: "Donation Registration Confirmed",
    message: `You are registered for "${campaign.title}" on ${new Date(campaign.date).toLocaleDateString()} at ${campaign.venue}. Registration ID: ${regCode}`,
    type: "success",
  });

  return ApiResponse.created(
    res,
    { registration, campaign },
    "Donation registration confirmed successfully!"
  );
});

export const getMyRegistrations = asyncHandler(async (req: Request, res: Response) => {
  const registrations = await DonationRegistration.find({ user: req.user?.sub })
    .populate("campaign")
    .sort({ createdAt: -1 });

  return ApiResponse.success(res, registrations, "Registrations retrieved");
});

export const cancelRegistration = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const reg = await DonationRegistration.findOne({ _id: id, user: req.user?.sub });
  if (!reg) {
    throw ApiError.notFound("Registration record not found");
  }

  if (reg.status === "ATTENDED" || reg.status === "COMPLETED") {
    throw ApiError.badRequest("Cannot cancel a registration that has already been attended or verified");
  }

  reg.status = "CANCELLED";
  await reg.save();

  // Decrement campaign capacity count
  await Campaign.findByIdAndUpdate(reg.campaign, { $inc: { currentRegistrationsCount: -1 } });

  return ApiResponse.success(res, reg, "Registration cancelled");
});

export const checkInParticipant = asyncHandler(async (req: Request, res: Response) => {
  const { registrationCode } = req.body;
  if (!registrationCode) {
    throw ApiError.badRequest("Registration code is required");
  }

  const reg = await DonationRegistration.findOne({
    $or: [{ registrationCode: registrationCode.trim() }, { _id: registrationCode.trim() }],
  })
    .populate("campaign")
    .populate("user", "name email phone");

  if (!reg) {
    throw ApiError.notFound("Registration record not found for code: " + registrationCode);
  }

  reg.status = "CHECKED_IN";
  reg.attendanceTimestamp = new Date();
  await reg.save();

  await Notification.create({
    user: reg.user._id,
    title: "Check-in Recorded",
    message: `Your check-in for "${(reg.campaign as any).title}" has been confirmed by camp staff.`,
    type: "info",
  });

  return ApiResponse.success(res, reg, "Participant checked in successfully");
});

// ── 3. DONATION VERIFICATION & DIGITAL CERTIFICATE ──────────────────────────

export const verifyDonation = asyncHandler(async (req: Request, res: Response) => {
  const { registrationId, unitsDonated = 1, notes } = req.body;

  if (!registrationId) {
    throw ApiError.badRequest("Registration ID is required for verification");
  }

  const reg = await DonationRegistration.findById(registrationId)
    .populate("campaign")
    .populate("user", "name email phone");

  if (!reg) {
    throw ApiError.notFound("Registration record not found");
  }

  if (reg.status === "COMPLETED") {
    throw ApiError.badRequest("This donation has already been verified and issued a certificate.");
  }

  const verifierUser = await User.findById(req.user?.sub);
  if (!verifierUser) {
    throw ApiError.unauthorized("Verifier authentication required");
  }

  const campaign = reg.campaign as any;
  const donationId = generateDonationId();
  const certId = generateCertificateId();
  const verificationToken = randomUUID();

  // Create VerifiedDonation record
  const verifiedDonation = await VerifiedDonation.create({
    donationId,
    user: reg.user._id,
    donor: reg.donor,
    campaign: campaign._id,
    registration: reg._id,
    verifierUser: verifierUser._id,
    verifierRole: verifierUser.role === "admin" ? "Sanguis Administrator" : "Authorized Medical Verifier",
    verifierOrganization: campaign.organizerName || "Sanguis Blood Network",
    donationDate: new Date(),
    verificationTimestamp: new Date(),
    unitsDonated: Number(unitsDonated) || 1,
    status: "VERIFIED",
    certificateId: certId,
    notes,
  });

  // Create Digital Certificate
  const certificate = await DonationCertificate.create({
    certificateId: certId,
    verificationToken,
    user: reg.user._id,
    donorName: (reg.user as any).name,
    verifiedDonation: verifiedDonation._id,
    campaign: campaign._id,
    campaignTitle: campaign.title,
    authorizedOrganization: campaign.organizerName,
    venue: campaign.venue,
    donationDate: verifiedDonation.donationDate,
    issueDate: new Date(),
    status: "VALID",
  });

  // Update Registration status to COMPLETED
  reg.status = "COMPLETED";
  await reg.save();

  // Update Donor lastDonationDate & trustScore
  if (reg.donor) {
    await Donor.findByIdAndUpdate(reg.donor, {
      lastDonationDate: new Date(),
      $inc: { trustScore: 10 },
    });
  }

  // Generate Notification
  await Notification.create({
    user: reg.user._id,
    title: "🏆 Blood Donation Verified!",
    message: `Your blood donation at "${campaign.title}" has been verified! Certificate ID: ${certId} is ready for download.`,
    type: "success",
  });

  return ApiResponse.created(
    res,
    { verifiedDonation, certificate },
    "Blood donation verified & digital certificate issued successfully!"
  );
});

export const getMyDonations = asyncHandler(async (req: Request, res: Response) => {
  const donations = await VerifiedDonation.find({ user: req.user?.sub })
    .populate("campaign", "title venue date organizerName")
    .sort({ donationDate: -1 });

  return ApiResponse.success(res, donations, "Verified donation history retrieved");
});

export const getMyCertificates = asyncHandler(async (req: Request, res: Response) => {
  const certificates = await DonationCertificate.find({ user: req.user?.sub })
    .populate("verifiedDonation")
    .sort({ issueDate: -1 });

  return ApiResponse.success(res, certificates, "Certificates retrieved");
});

export const getCertificateById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const certificate = await DonationCertificate.findOne({
    $or: [{ certificateId: id.toUpperCase().trim() }, { _id: id }],
  }).populate("user", "name email");

  if (!certificate) {
    throw ApiError.notFound("Certificate not found");
  }

  return ApiResponse.success(res, certificate, "Certificate details retrieved");
});

// ── 4. PUBLIC QR VERIFICATION & ADMIN REVOCATION ────────────────────────────

export const verifyCertificatePublic = asyncHandler(async (req: Request, res: Response) => {
  const { certificateId } = req.params;
  if (!certificateId) {
    throw ApiError.badRequest("Certificate ID is required");
  }

  const certificate = await DonationCertificate.findOne({
    $or: [
      { certificateId: certificateId.toUpperCase().trim() },
      { verificationToken: certificateId.trim() },
    ],
  }).populate("user", "name");

  if (!certificate) {
    return res.status(404).json({
      success: false,
      status: "INVALID",
      message: "Certificate not found in official Sanguis verification registry.",
    });
  }

  const isRevoked = certificate.status === "REVOKED";

  return res.status(200).json({
    success: true,
    status: isRevoked ? "REVOKED" : "VALID",
    message: isRevoked
      ? "This certificate has been REVOKED by Sanguis administrators."
      : "Official Verified Sanguis Blood Donation Certificate",
    data: {
      certificateId: certificate.certificateId,
      donorName: certificate.donorName,
      campaignTitle: certificate.campaignTitle,
      authorizedOrganization: certificate.authorizedOrganization,
      venue: certificate.venue,
      donationDate: certificate.donationDate,
      issueDate: certificate.issueDate,
      status: certificate.status,
      revocationDetails: isRevoked ? certificate.revocationDetails : undefined,
    },
  });
});

export const revokeCertificate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (req.user?.role !== "admin") {
    throw ApiError.forbidden("Only Sanguis administrators can revoke donation certificates");
  }

  const certificate = await DonationCertificate.findOne({
    $or: [{ certificateId: id.toUpperCase().trim() }, { _id: id }],
  });

  if (!certificate) {
    throw ApiError.notFound("Certificate not found");
  }

  certificate.status = "REVOKED";
  certificate.revocationDetails = {
    revokedBy: req.user.sub as any,
    revokedAt: new Date(),
    reason: reason || "Administrative audit revocation",
  };
  await certificate.save();

  // Update VerifiedDonation record
  await VerifiedDonation.findByIdAndUpdate(certificate.verifiedDonation, { status: "REVOKED" });

  // Audit log
  await AuditLog.create({
    userId: req.user.sub,
    action: "CERTIFICATE_REVOKED",
    resource: `Certificate:${certificate.certificateId}`,
    details: { reason: certificate.revocationDetails.reason },
    ipAddress: req.ip,
  });

  return ApiResponse.success(res, certificate, "Certificate successfully revoked");
});

// ── 5. ORGANIZER & ADMIN DASHBOARDS ─────────────────────────────────────────

export const getOrganizerDashboard = asyncHandler(async (req: Request, res: Response) => {
  const myCampaigns = await Campaign.find({ organizerUser: req.user?.sub }).sort({ createdAt: -1 });
  const campaignIds = myCampaigns.map((c) => c._id);

  const registrations = await DonationRegistration.find({ campaign: { $in: campaignIds } })
    .populate("campaign", "title date")
    .populate("user", "name email phone")
    .sort({ createdAt: -1 });

  const verifiedDonations = await VerifiedDonation.find({ campaign: { $in: campaignIds } }).sort({
    donationDate: -1,
  });

  return ApiResponse.success(
    res,
    {
      myCampaigns,
      registrations,
      verifiedDonations,
    },
    "Organizer portal data retrieved"
  );
});

export const getDonationStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.sub;
  const [myDonationsCount, myCertificatesCount, myRegistrationsCount, totalCampaignsCount] =
    await Promise.all([
      VerifiedDonation.countDocuments({ user: userId, status: "VERIFIED" }),
      DonationCertificate.countDocuments({ user: userId, status: "VALID" }),
      DonationRegistration.countDocuments({ user: userId, status: { $nin: ["CANCELLED"] } }),
      Campaign.countDocuments({ status: "APPROVED" }),
    ]);

  return ApiResponse.success(
    res,
    {
      totalDonations: myDonationsCount,
      verifiedDonations: myDonationsCount,
      certificatesEarned: myCertificatesCount,
      upcomingRegistrations: myRegistrationsCount,
      totalCampaigns: totalCampaignsCount,
    },
    "Donation statistics retrieved"
  );
});
