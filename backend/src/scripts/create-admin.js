import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import env from "../config/env.js";
import Admin from "../models/admin.model.js";
import { PERMISSIONS } from "../modules/admin/admin.validator.js";

const createAdmin = async () => {
  try {
    await mongoose.connect(env.mongodbUri);

    const username = (process.env.INITIAL_ADMIN_USERNAME || "superadmin").trim().toLowerCase();
    
    if (env.isProduction && !process.env.INITIAL_ADMIN_PASSWORD) {
      throw new Error("INITIAL_ADMIN_PASSWORD is strictly required when running in production mode.");
    }
    
    const password = process.env.INITIAL_ADMIN_PASSWORD || "Admin@Ashivam2026!";

    if (password.length < 12) {
      throw new Error("Admin password must be at least 12 characters.");
    }

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