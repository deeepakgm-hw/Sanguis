import { connectDB, disconnectDB } from "../config/db";
import { User } from "../models/User";
import { logger } from "./logger";

export async function seedDatabase(): Promise<void> {
  const adminEmail = "admin@hackathon.local";
  const existing = await User.findOne({ email: adminEmail });
  if (!existing) {
    await User.create({
      name: "Admin",
      email: adminEmail,
      password: "ChangeMe123!@#",
      role: "admin",
      isEmailVerified: true,
    });
    logger.info(`Seeded admin user: ${adminEmail} / ChangeMe123!@# (CHANGE THIS IMMEDIATELY)`);
  } else {
    logger.info("Admin user already exists, skipping seed.");
  }
}

async function run() {
  await connectDB();
  await seedDatabase();
  await disconnectDB();
}

// Check if run directly
if (process.argv[1] && (process.argv[1].endsWith("seed.ts") || process.argv[1].endsWith("seed.js"))) {
  run().catch((err) => {
    logger.error(err, "Seeding failed");
    process.exit(1);
  });
}
