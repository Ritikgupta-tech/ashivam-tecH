import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import readline from "readline";
import env from "../config/env.js";
import Admin from "../models/admin.model.js";
import { PERMISSIONS } from "../modules/admin/admin.validator.js";

const DEFAULT_ADMIN_PERMISSIONS = ["dashboard", "inquiries", "careers"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCliArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        result[key] = next;
        i++;
      } else {
        result[key] = true;
      }
    }
  }
  return result;
}

function askQuestion(rl, prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

const run = async () => {
  const cliArgs = parseCliArgs();

  let username = (process.env.NEW_ADMIN_USERNAME || cliArgs.username || "").trim().toLowerCase();
  let name = (process.env.NEW_ADMIN_NAME || cliArgs.name || "").trim();
  let email = (process.env.NEW_ADMIN_EMAIL || cliArgs.email || "").trim().toLowerCase();
  let password = (process.env.NEW_ADMIN_PASSWORD || cliArgs.password || "").trim();
  let permissionsStr = process.env.NEW_ADMIN_PERMISSIONS || cliArgs.permissions || "";

  let rl = null;
  const isInteractive = process.stdin.isTTY && (!username || !password || !name);

  if (isInteractive) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    console.log("=== Ashivam Technologies - Create Normal Admin Account ===");
    console.log("Role: Admin (Restricted - Not Superadmin)\n");

    if (!name) {
      name = await askQuestion(rl, "Full Name (e.g., Jane Doe): ");
    }
    if (!username) {
      username = (await askQuestion(rl, "Username (3-50 chars, e.g., jane.admin): ")).toLowerCase();
    }
    if (!email) {
      email = (await askQuestion(rl, "Company Email (e.g., jane@ashivamtechnologies.com): ")).toLowerCase();
    }
    if (!password) {
      password = await askQuestion(rl, "Password (min 8 chars, 12+ recommended): ");
    }
    if (!permissionsStr) {
      const permInput = await askQuestion(
        rl,
        `Permissions (comma-separated, default: "${DEFAULT_ADMIN_PERMISSIONS.join(",")}"): `
      );
      if (permInput) {
        permissionsStr = permInput;
      }
    }
    rl.close();
  }

  try {
    if (!username || username.length < 3 || username.length > 50) {
      throw new Error("Username must be between 3 and 50 characters.");
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      throw new Error("Username may only contain letters, numbers, dots, underscores, and dashes.");
    }

    if (!name) {
      throw new Error("Full name is required.");
    }

    if (email && !EMAIL_REGEX.test(email)) {
      throw new Error("Company email is invalid.");
    }

    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters long (12+ recommended).");
    }

    let permissions = DEFAULT_ADMIN_PERMISSIONS;
    if (permissionsStr) {
      const parsed = permissionsStr.split(",").map((p) => p.trim()).filter(Boolean);
      const invalid = parsed.filter((p) => !PERMISSIONS.includes(p));
      if (invalid.length > 0) {
        throw new Error(`Invalid permissions specified: ${invalid.join(", ")}. Valid permissions: ${PERMISSIONS.join(", ")}`);
      }
      // Normal admins should not have the "admins" management permission
      permissions = parsed.filter((p) => p !== "admins");
    }

    await mongoose.connect(env.mongodbUri);

    // Check duplicate username or email
    const duplicateQuery = [{ username }];
    if (email) duplicateQuery.push({ email });

    const existing = await Admin.findOne({ $or: duplicateQuery });
    if (existing) {
      const msg = existing.username === username
        ? `Administrator username "${username}" already exists.`
        : `Administrator email "${email}" is already registered.`;
      throw new Error(msg);
    }

    // Hash with bcrypt cost factor 12
    const passwordHash = await bcrypt.hash(password, 12);

    const createdAdmin = await Admin.create({
      username,
      name,
      email: email || null,
      passwordHash,
      role: "Admin", // Strictly Normal Admin
      permissions,
      isActive: true,
    });

    console.log("\n[Success] Normal Admin account created successfully!");
    console.log(`- ID: ${createdAdmin._id}`);
    console.log(`- Username: ${createdAdmin.username}`);
    console.log(`- Name: ${createdAdmin.name}`);
    console.log(`- Email: ${createdAdmin.email || "(not set)"}`);
    console.log(`- Role: ${createdAdmin.role}`);
    console.log(`- Permissions: ${createdAdmin.permissions.join(", ")}`);
    console.log(`- Status: Active`);
    console.log("\nThe Admin can now sign in at /admin/login with their username and password.");
  } catch (error) {
    console.error(`\n[Error] Admin creation failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

run();
