import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import {
  User,
  Donor,
  BloodRequest,
  Match,
  Notification,
  UserPreferences,
  BLOOD_TYPES,
  BloodType,
} from "../src/models";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hackathon";

const HOSPITALS_DATA = [
  { name: "Lagos University Teaching Hospital (LUTH)", lat: 6.5244, lng: 3.3792, address: "Idi-Araba, Surulere, Lagos" },
  { name: "Korle Bu Teaching Hospital", lat: 5.5358, lng: -0.2281, address: "Guggisberg Ave, Accra, Ghana" },
  { name: "National Hospital Abuja", lat: 9.0479, lng: 7.4627, address: "Central Business District, Abuja" },
  { name: "Ridge Hospital (Greater Accra Regional)", lat: 5.5631, lng: -0.2014, address: "Castle Road, Accra" },
  { name: "University College Hospital (UCH) Ibadan", lat: 7.4019, lng: 3.9044, address: "Queen Elizabeth II Road, Ibadan" },
  { name: "Redington Hospital Victoria Island", lat: 6.4281, lng: 3.4219, address: "Idowu Martins St, Victoria Island, Lagos" },
  { name: "St. Nicholas Hospital Lagos", lat: 6.4529, lng: 3.3958, address: "Catholic Mission St, Lagos Island" },
  { name: "First Cardiology Consultants", lat: 6.4489, lng: 3.4150, address: "Ikoyi, Lagos" },
  { name: "Kenyatta National Hospital", lat: -1.3013, lng: 36.8073, address: "Hospital Rd, Nairobi, Kenya" },
  { name: "Munyao Emergency Medical Center", lat: 12.9716, lng: 77.5946, address: "Kengeri Main Rd, Bengaluru" },
];

const DONOR_NAMES = [
  "Chioma Eze", "Tunde Bello", "Adaeze Nwosu", "Ibrahim Sule", "Kofi Mensah",
  "Kwame Asante", "Fatima Al-Rashid", "David Osei", "Ngozi Adeleke", "Emmanuel Chukwu",
  "Amina Yussuf", "Samuel Boateng", "Zainab Abubakar", "Oluwaseun Bakare", "Mercy Agyapong",
  "Joseph Okafor", "Blessing Nnamdi", "Daniel Kalu", "Grace Appiah", "Victor Danjuma",
  "Patience Idowu", "Solomon Owusu", "Hawa Bio", "Gideon Sowore", "Joy Anyanwu",
  "Benjamin Quaye", "Rita Dlamini", "Francis Egwu", "Halima Sani", "Peter Obi",
  "Mary Annan", "Kelechi Iheanacho", "Hadiza Shehu", "Michael Vance", "Sarah Jenkins",
  "David Miller", "Elena Rostova", "Marcus Johnson", "Sophia Chen", "Carlos Gomez",
  "Anita Sharma", "Rajesh Kumar", "Deepak Gowda", "Priya Nair", "Arjun Reddy",
  "Kavya Patel", "Rahul Verma", "Siddharth Sen", "Meera Iyer", "Aravind Swamy"
];

async function seed() {
  console.log("🌱 Starting Sanguis Database Seed...");
  await mongoose.connect(MONGO_URI);

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Donor.deleteMany({}),
    BloodRequest.deleteMany({}),
    Match.deleteMany({}),
    Notification.deleteMany({}),
    UserPreferences.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash("Sanguis@2026", 10);

  // 1. Seed Admin User
  const admin = await User.create({
    name: "Sanguis Admin",
    email: "www.sanguis@gmail.com",
    passwordHash,
    role: "admin",
    isEmailVerified: true,
  });

  // 2. Seed Hospital Users
  const hospitalUsers = [];
  for (const h of HOSPITALS_DATA) {
    const email = `hospital.${h.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@sanguis.app`;
    const u = await User.create({
      name: h.name,
      email,
      passwordHash,
      role: "hospital",
      isEmailVerified: true,
    });
    hospitalUsers.push({ user: u, ...h });
  }

  // 3. Seed Donors
  const donorDocs = [];
  for (let i = 0; i < DONOR_NAMES.length; i++) {
    const name = DONOR_NAMES[i];
    const email = `donor.${name.toLowerCase().replace(/[^a-z0-9]/g, "")}@sanguis.app`;
    const bloodType = BLOOD_TYPES[i % BLOOD_TYPES.length] as BloodType;

    const u = await User.create({
      name,
      email,
      passwordHash,
      role: "donor",
      isEmailVerified: true,
    });

    // Randomize location around Lagos/Accra/Nairobi/Bengaluru centers
    const baseH = HOSPITALS_DATA[i % HOSPITALS_DATA.length];
    const lat = baseH.lat + (Math.random() * 0.08 - 0.04);
    const lng = baseH.lng + (Math.random() * 0.08 - 0.04);

    const d = await Donor.create({
      userId: u._id,
      bloodType,
      lastDonationDate: i % 3 === 0 ? new Date(Date.now() - 120 * 24 * 60 * 60 * 1000) : null,
      medicalFlags: i % 5 === 0 ? ["Hypertension"] : [],
      location: { type: "Point", coordinates: [lng, lat] },
      trustScore: 80 + Math.floor(Math.random() * 20),
    });

    // Create user preferences
    await UserPreferences.create({
      userId: u._id,
      emergencyAlerts: true,
      donationReminders: true,
      newMessages: true,
      shareLocation: true,
    });

    donorDocs.push(d);
  }

  // 4. Seed Blood Requests
  const urgencies = ["critical", "high", "medium", "low"] as const;
  const statuses = ["open", "matched", "fulfilled"] as const;
  const requests = [];

  for (let i = 0; i < 15; i++) {
    const h = hospitalUsers[i % hospitalUsers.length];
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
      description: `Emergency transfusion required for patient in Ward ${i + 1}A. Immediate match requested.`,
    });
    requests.push(req);
  }

  // 5. Seed Matches
  for (let i = 0; i < 8; i++) {
    const req = requests[i];
    const matchingDonors = donorDocs.filter((d) => d.bloodType === req.bloodType);
    if (matchingDonors.length > 0) {
      const donor = matchingDonors[0];
      const matchStatus = i % 2 === 0 ? "accepted" : "pending";
      const match = await Match.create({
        bloodRequest: req._id,
        donor: donor._id,
        status: matchStatus,
        score: 95 - i,
        respondedAt: matchStatus === "accepted" ? new Date() : undefined,
      });

      // Seed notification for donor
      await Notification.create({
        userId: donor.userId,
        type: req.urgencyLevel === "critical" ? "emergency" : "blood_needed",
        title: `Emergency ${req.bloodType} Blood Needed`,
        message: `${req.hospitalName} requires ${req.unitsNeeded} units of ${req.bloodType} blood. Please respond immediately.`,
        bloodRequestId: req._id.toString(),
        matchId: match._id.toString(),
        read: false,
      });
    }
  }

  console.log(`✅ Seeded ${HOSPITALS_DATA.length} hospitals, ${donorDocs.length} donors, ${requests.length} requests, and matches successfully!`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
