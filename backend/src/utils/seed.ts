import { User } from "../models/User";
import { Donor } from "../models/Donor";
import { BloodRequest } from "../models/BloodRequest";
import { Match } from "../models/Match";
import { Notification } from "../models/Notification";
import { UserPreferences } from "../models/UserPreferences";
import { BloodBank } from "../models/BloodBank";
import { Hospital } from "../models/Hospital";
import { Campaign, DonationRegistration, VerifiedDonation, DonationCertificate } from "../models";
import { BLOOD_TYPES, BloodType } from "../models/Donor";
import { logger } from "./logger";
import bcrypt from "bcryptjs";

// Top 10 Accredited Indian Emergency Hospitals & Blood Banks
const INDIAN_HOSPITALS = [
  { name: "AIIMS Apex Trauma Center & Blood Bank", city: "New Delhi", lat: 28.5672, lng: 77.2100, address: "Ansari Nagar, New Delhi, Delhi 110029", phone: "+91 11 2658 8500" },
  { name: "Apollo Hospitals Emergency Blood Hub", city: "Bengaluru", lat: 12.8958, lng: 77.5986, address: "154/11 Bannerghatta Road, Bengaluru, Karnataka 560076", phone: "+91 80 2630 4050" },
  { name: "Fortis Hospital & Research Center", city: "Mumbai", lat: 19.1678, lng: 72.9431, address: "Mulund Goregaon Link Rd, Mumbai, Maharashtra 400078", phone: "+91 22 6799 4100" },
  { name: "Manipal Hospital Central Blood Bank", city: "Bengaluru", lat: 12.9582, lng: 77.6482, address: "98 HAL Old Airport Rd, Bengaluru, Karnataka 560017", phone: "+91 80 2502 4444" },
  { name: "Max Super Speciality Hospital Saket", city: "New Delhi", lat: 28.5284, lng: 77.2114, address: "1 2 Press Enclave Marg, Saket, New Delhi, Delhi 110017", phone: "+91 11 2651 5050" },
  { name: "KIMS Hospitals & Regional Blood Bank", city: "Hyderabad", lat: 17.4332, lng: 78.4870, address: "1-8-31/1 Minister Rd, Secunderabad, Telangana 500003", phone: "+91 40 4488 5000" },
  { name: "Narayana Health City Emergency Center", city: "Bengaluru", lat: 12.8090, lng: 77.6970, address: "258/A Bommasandra Industrial Area, Bengaluru, Karnataka 560099", phone: "+91 80 7122 2222" },
  { name: "Medanta The Medicity Blood Bank", city: "Gurugram", lat: 28.4384, lng: 77.0425, address: "CH Baktawar Singh Road, Sector 38, Gurugram, Haryana 122001", phone: "+91 124 414 1414" },
  { name: "Ruby Hall Clinic Regional Blood Bank", city: "Pune", lat: 18.5326, lng: 73.8742, address: "40 Sassoon Road, Sangamvadi, Pune, Maharashtra 411001", phone: "+91 20 6645 5100" },
  { name: "AMRI Hospitals Emergency Wing", city: "Kolkata", lat: 22.5129, lng: 88.3639, address: "P-238 CIT Scheme VIII M, Kankurgachi, Kolkata, West Bengal 700054", phone: "+91 33 6680 0000" },
];

// 50 Real Verified Indian Donors
const INDIAN_DONORS = [
  "Aarav Sharma", "Priya Patel", "Rajesh Kumar", "Ananya Iyer", "Vikram Singh",
  "Sneha Kulkarni", "Rahul Verma", "Kavya Reddy", "Siddharth Sen", "Meera Nair",
  "Aditya Deshmukh", "Riya Chakraborty", "Arjun Mehta", "Pooja Hegde", "Gaurav Joshi",
  "Tanvi Rao", "Karthik Swamy", "Ishita Gupta", "Rohan Malhotra", "Divya Menon",
  "Manish Agarwal", "Neha Bhatia", "Suresh Pillai", "Shruti Pandey", "Alok Saxena",
  "Deepika Sundaram", "Varun Chopra", "Shreya Kapoor", "Nikhil D'Souza", "Priti Nambiar",
  "Abhinav Mishra", "Swati Kulkarni", "Pranav Shetty", "Aditi Banerjee", "Karan Ahuja",
  "Archana Varma", "Mayank Jain", "Tanya Srivastava", "Harish Bhat", "Nisha Ranganathan",
  "Amitabh Roy", "Komal Sethi", "Vishal Pandey", "Richa Bhardwaj", "Sameer Qureshi",
  "Deepak Gowda", "Gayatri Naidu", "Tarun Gill", "Bhavna Joshi", "Yashwant Patil"
];

export async function seedDatabase(): Promise<void> {
  const existingCount = await User.countDocuments();
  if (existingCount > 10) {
    logger.info(`Database already contains ${existingCount} users. Skipping full seed.`);
    return;
  }

  logger.info("🌱 Seeding Sanguis database with rich Indian emergency dataset...");

  // Reset collections for clean state
  await Promise.all([
    User.deleteMany({}),
    Donor.deleteMany({}),
    BloodRequest.deleteMany({}),
    Match.deleteMany({}),
    Notification.deleteMany({}),
    UserPreferences.deleteMany({}),
    BloodBank.deleteMany({}),
    Hospital.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("Sanguis@2026", 10);

  // 1. Seed Admin User
  const admin = await User.create({
    name: "Sanguis Admin",
    email: "www.sanguis@gmail.com",
    password: passwordHash,
    role: "admin",
    isEmailVerified: true,
  });

  // 2. Seed Hospital Accounts & Blood Banks
  const hospitalDocs = [];
  for (const h of INDIAN_HOSPITALS) {
    const slug = h.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const email = `hospital.${slug.slice(0, 15)}@sanguis.in`;
    const user = await User.create({
      name: h.name,
      email,
      phone: h.phone,
      password: passwordHash,
      role: "hospital",
      isEmailVerified: true,
    });

    await Hospital.create({
      hospitalId: user._id,
      name: h.name,
      formattedAddress: h.address,
      contactPhone: h.phone,
      phoneNumber: h.phone,
      isVerified: true,
      dataSource: "manual",
      location: { type: "Point", coordinates: [h.lng, h.lat] },
    });

    const inventory = BLOOD_TYPES.map((bt) => ({
      bloodType: bt,
      unitsAvailable: 15 + Math.floor(Math.random() * 35),
      lastRestocked: new Date(),
    }));

    await BloodBank.create({
      name: h.name,
      address: h.address,
      location: { type: "Point", coordinates: [h.lng, h.lat] },
      contactPhone: h.phone,
      isVerified: true,
      inventory,
      owner: user._id,
    });

    hospitalDocs.push({ user, ...h });
  }

  // 3. Seed 50 Indian Blood Donors
  const donorDocs = [];
  for (let i = 0; i < INDIAN_DONORS.length; i++) {
    const name = INDIAN_DONORS[i];
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const email = `${slug}@gmail.com`;
    const phone = `+91 ${9800000000 + i * 12345}`;
    const bloodType = BLOOD_TYPES[i % BLOOD_TYPES.length] as BloodType;

    const user = await User.create({
      name,
      email,
      phone,
      password: passwordHash,
      role: "donor",
      isEmailVerified: true,
    });

    const hospitalBase = INDIAN_HOSPITALS[i % INDIAN_HOSPITALS.length];
    const lat = hospitalBase.lat + (Math.random() * 0.06 - 0.03);
    const lng = hospitalBase.lng + (Math.random() * 0.06 - 0.03);

    const donor = await Donor.create({
      userId: user._id,
      bloodType,
      lastDonationDate: i % 3 === 0 ? new Date(Date.now() - 110 * 24 * 60 * 60 * 1000) : null,
      medicalFlags: i % 7 === 0 ? ["Hypertension"] : [],
      location: { type: "Point", coordinates: [lng, lat] },
      trustScore: 82 + Math.floor(Math.random() * 17),
    });

    await UserPreferences.create({
      userId: user._id,
      emergencyAlerts: true,
      donationReminders: true,
      newMessages: true,
      shareLocation: true,
    });

    donorDocs.push(donor);
  }

  // 4. Seed Emergency Blood Requests
  const urgencies = ["critical", "high", "medium", "low"] as const;
  const statuses = ["open", "matched", "fulfilled"] as const;
  const requestDocs = [];

  for (let i = 0; i < 20; i++) {
    const h = hospitalDocs[i % hospitalDocs.length];
    const bloodType = BLOOD_TYPES[i % BLOOD_TYPES.length];
    const urgencyLevel = urgencies[i % urgencies.length];
    const status = statuses[i % statuses.length];

    const req = await BloodRequest.create({
      bloodType,
      unitsNeeded: (i % 4) + 1,
      urgencyLevel,
      hospital: h.user._id,
      hospitalName: h.name,
      status,
      geoLocation: { type: "Point", coordinates: [h.lng, h.lat] },
      description: `Emergency ${bloodType} transfusion needed immediately at ${h.name} ICU Ward ${i + 1}B.`,
    });
    requestDocs.push(req);
  }

  // 5. Seed Matches & Real-Time Notifications
  for (let i = 0; i < 10; i++) {
    const req = requestDocs[i];
    const matchingDonors = donorDocs.filter((d) => d.bloodType === req.bloodType);
    if (matchingDonors.length > 0) {
      const donor = matchingDonors[0];
      const matchStatus = i % 2 === 0 ? "accepted" : "pending";
      const match = await Match.create({
        request: req._id,
        donor: donor._id,
        status: matchStatus,
        respondedAt: matchStatus === "accepted" ? new Date() : undefined,
      });

      await Notification.create({
        user: donor.userId,
        title: `🚨 Emergency ${req.bloodType} Blood Alert`,
        message: `Emergency transfusion urgently requires ${req.unitsNeeded} units of ${req.bloodType} blood.`,
        type: "warning",
        isRead: false,
      });
    }
  }

  // 6. Seed Authorized Blood Donation Campaigns
  await Promise.all([
    Campaign.deleteMany({}),
    DonationRegistration.deleteMany({}),
    VerifiedDonation.deleteMany({}),
    DonationCertificate.deleteMany({}),
  ]);

  const campaign1 = await Campaign.create({
    campaignId: "BDC-2026-101",
    title: "AIIMS National Lifesaving Blood Donation Camp",
    description: "Join AIIMS Apex Trauma Center for a mega blood donation drive. All blood groups needed. Compliant with national health standards.",
    organizerName: "AIIMS Apex Trauma Center & Blood Bank",
    organizerType: "hospital",
    organizerUser: hospitalDocs[0].user._id,
    venue: "AIIMS Main Auditorium Hall A",
    address: "Ansari Nagar, New Delhi, Delhi 110029",
    city: "New Delhi",
    location: { type: "Point", coordinates: [77.2100, 28.5672] },
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    startTime: "09:00 AM",
    endTime: "05:00 PM",
    contactPhone: "+91 11 2658 8500",
    contactEmail: "camps@aiims.edu.in",
    bloodGroupsRequired: ["A+", "A-", "B+", "B-", "O+", "O-"],
    availableCapacity: 150,
    currentRegistrationsCount: 12,
    isVerifiedOrganizer: true,
    status: "APPROVED",
  });

  const campaign2 = await Campaign.create({
    campaignId: "BDC-2026-102",
    title: "Apollo Bengaluru Emergency Plasma & Blood Drive",
    description: "Annual voluntary blood donation drive organized by Apollo Hospitals in partnership with Rotary Club Bengaluru.",
    organizerName: "Apollo Hospitals Emergency Blood Hub",
    organizerType: "hospital",
    organizerUser: hospitalDocs[1].user._id,
    venue: "Apollo Hospital Convention Center",
    address: "154/11 Bannerghatta Road, Bengaluru, Karnataka 560076",
    city: "Bengaluru",
    location: { type: "Point", coordinates: [77.5986, 12.8958] },
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    startTime: "08:30 AM",
    endTime: "04:30 PM",
    contactPhone: "+91 80 2630 4050",
    contactEmail: "bloodbank@apollo.com",
    bloodGroupsRequired: ["O-", "AB-", "B-", "A-", "O+"],
    availableCapacity: 200,
    currentRegistrationsCount: 28,
    isVerifiedOrganizer: true,
    status: "APPROVED",
  });

  const campaign3 = await Campaign.create({
    campaignId: "BDC-2026-103",
    title: "Fortis Mumbai Youth & NSS Blood Donation Camp",
    description: "Community blood drive empowering college students and NSS volunteers to save lives across Mumbai metro.",
    organizerName: "Fortis Hospital & Research Center",
    organizerType: "ngo",
    organizerUser: hospitalDocs[2].user._id,
    venue: "Mulund Community Center",
    address: "Mulund Goregaon Link Rd, Mumbai, Maharashtra 400078",
    city: "Mumbai",
    location: { type: "Point", coordinates: [72.9431, 19.1678] },
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (completed)
    startTime: "10:00 AM",
    endTime: "06:00 PM",
    contactPhone: "+91 22 6799 4100",
    contactEmail: "donations@fortismumbai.org",
    bloodGroupsRequired: ["A+", "B+", "O+", "AB+"],
    availableCapacity: 100,
    currentRegistrationsCount: 45,
    isVerifiedOrganizer: true,
    status: "COMPLETED",
  });

  // 7. Seed Sample Registrations, Verified Donation & Digital Certificate
  const sampleUser = await User.findOne({ role: "donor" });
  if (sampleUser) {
    const reg = await DonationRegistration.create({
      registrationCode: "SDN-84920412",
      user: sampleUser._id,
      campaign: campaign3._id,
      bloodGroup: "O+",
      status: "COMPLETED",
      attendanceTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      qrCodeData: JSON.stringify({ regCode: "SDN-84920412", userName: sampleUser.name }),
    });

    const vDonation = await VerifiedDonation.create({
      donationId: "DON-94820194",
      user: sampleUser._id,
      campaign: campaign3._id,
      registration: reg._id,
      verifierUser: hospitalDocs[2].user._id,
      verifierRole: "Authorized Medical Verifier",
      verifierOrganization: "Fortis Hospital & Research Center",
      donationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      verificationTimestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      unitsDonated: 1,
      status: "VERIFIED",
      certificateId: "SANGUIS-BDC-94820194",
    });

    await DonationCertificate.create({
      certificateId: "SANGUIS-BDC-94820194",
      verificationToken: "sanguis-mock-verification-token",
      user: sampleUser._id,
      donorName: sampleUser.name,
      verifiedDonation: vDonation._id,
      campaign: campaign3._id,
      campaignTitle: campaign3.title,
      authorizedOrganization: campaign3.organizerName,
      venue: campaign3.venue,
      donationDate: vDonation.donationDate,
      issueDate: new Date(),
      status: "VALID",
    });
  }

  logger.info(
    `✅ Successfully seeded ${INDIAN_HOSPITALS.length} accredited hospitals, ${donorDocs.length} verified donors, ${requestDocs.length} emergency requests, authorized donation campaigns, and sample verified digital certificates!`
  );
}

