import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import env from "../config/env.js";
import Admin from "../models/admin.model.js";
import { PERMISSIONS } from "../modules/admin/admin.validator.js";

const createAdmin = async () => {
  try {
    await mongoose.connect(env.mongodbUri);

    const username = (process.env.INITIAL_ADMIN_USERNAME || "superadmin").trim().toLowerCase();
    const password = process.env.INITIAL_ADMIN_PASSWORD || "Admin@Ashivam2026!";

    const existingAdmin = await Admin.findOne({ username });

    if (existingAdmin) {
      console.log(`[Seed] Admin user "${username}" already exists.`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await Admin.create({
      username,
      name: "Super Administrator",
      passwordHash,
      role: "Superadmin",
      permissions: [...PERMISSIONS],
      isActive: true,
    });

    console.log(`[Seed] Superadmin account created successfully: ${username}`);
  } catch (error) {
    console.error("[Seed] Admin creation failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();