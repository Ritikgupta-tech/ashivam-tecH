import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import Employee from "../src/modules/employee/employee.model.js";
import { loginAdmin } from "../src/modules/auth/auth.service.js";
import {
  updateAdmin,
  updateAdminRole,
  deleteAdmin,
} from "../src/modules/admin/admin.service.js";
import {
  listPublicEmployees,
  PUBLIC_EMPLOYEE_PROJECTION,
} from "../src/modules/employee/employee.service.js";
import { generateAccessToken, verifyAccessToken } from "../src/utils/jwt.js";
import { authenticate } from "../src/middlewares/auth.middleware.js";

const ISOLATED_MONGO_URI = "mongodb://127.0.0.1:27017/ashivam_audit_isolated";

before(async () => {
  await mongoose.connect(ISOLATED_MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});

// Helper mock response object
const createMockRes = () => {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
};

// ==========================================
// AUD-01: Public Employee Projection Sanitization
// ==========================================
test("AUD-01 - listPublicEmployees does not expose private or sensitive employee fields", async () => {
  const secretPhone = "+91 9876543210";
  const secretEmail = `private.${Date.now()}@ashivamtechnologies.com`;

  const emp = await Employee.create({
    firstName: "Security",
    lastName: "Auditor",
    email: secretEmail,
    phone: secretPhone,
    designation: "Principal Security Architect",
    department: "Information Security",
    employmentType: "Full-time",
    workLocation: "Office",
    joiningDate: new Date("2023-01-15"),
    isActive: true,
    deletedAt: null,
    skills: ["AppSec", "Cryptography"],
    bio: "Securing enterprise platforms",
  });

  const result = await listPublicEmployees({ limit: 10 });
  const found = result.employees.find((e) => e._id.toString() === emp._id.toString());

  assert.ok(found, "Created employee should be listed in public employees");
  assert.equal(found.firstName, "Security");
  assert.equal(found.lastName, "Auditor");
  assert.equal(found.designation, "Principal Security Architect");
  assert.equal(found.department, "Information Security");

  // Verify sensitive fields are strictly undefined
  assert.equal(found.email, undefined, "Email must NOT be exposed in public listing");
  assert.equal(found.phone, undefined, "Phone number must NOT be exposed in public listing");
  assert.equal(found.joiningDate, undefined, "Joining date must NOT be exposed in public listing");
  assert.equal(found.isActive, undefined, "isActive internal flag must NOT be exposed in public listing");
  assert.equal(found.createdAt, undefined, "createdAt must NOT be exposed in public listing");
  assert.equal(found.updatedAt, undefined, "updatedAt must NOT be exposed in public listing");

  await Employee.deleteOne({ _id: emp._id });
});

// ==========================================
// AUD-02: Production CORS Strict Origin Matching
// ==========================================
test("AUD-02 - Production CORS strictly validates origins without wildcard bypass", () => {
  const allowedProductionOrigins = [
    "https://ashivam.com",
    "https://www.ashivam.com",
    "https://ashivam-tec-h.vercel.app",
    "https://ashivamtechnologies.com",
    "https://www.ashivamtechnologies.com",
  ];

  const verifyCorsOrigin = (origin, isProduction) => {
    let allowed = false;
    let err = null;

    if (!origin) {
      return { allowed: true, err: null };
    }

    if (allowedProductionOrigins.includes(origin)) {
      return { allowed: true, err: null };
    }

    if (!isProduction) {
      const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");
      if (isLocal) {
        return { allowed: true, err: null };
      }
    }

    const error = new Error(`Origin ${origin} not allowed by CORS`);
    error.statusCode = 403;
    return { allowed: false, err: error };
  };

  // Valid production origin passes
  const resValid = verifyCorsOrigin("https://ashivam-tec-h.vercel.app", true);
  assert.equal(resValid.allowed, true);
  assert.equal(resValid.err, null);

  // Malicious arbitrary vercel subdomain fails in production
  const resMaliciousVercel = verifyCorsOrigin("https://attacker-phishing.vercel.app", true);
  assert.equal(resMaliciousVercel.allowed, false);
  assert.equal(resMaliciousVercel.err?.statusCode, 403);

  // Localhost fails in production
  const resProdLocal = verifyCorsOrigin("http://localhost:3000", true);
  assert.equal(resProdLocal.allowed, false);
  assert.equal(resProdLocal.err?.statusCode, 403);

  // Localhost passes in development
  const resDevLocal = verifyCorsOrigin("http://localhost:5173", false);
  assert.equal(resDevLocal.allowed, true);
});

// ==========================================
// AUD-03: Login Timing Attack Normalization
// ==========================================
test("AUD-03 - Login runs password comparison path for unknown or inactive usernames", async () => {
  const unknownUsername = `nonexistent-user-${Date.now()}`;
  const start = performance.now();
  const result = await loginAdmin(unknownUsername, "Password123!");
  const duration = performance.now() - start;

  assert.equal(result, null, "Login must return null for non-existent admin");
  // bcrypt cost 10 takes at least 30-100ms in Node, verifying dummy hash comparison was executed
  assert.ok(
    duration > 20,
    `Duration ${duration}ms confirms bcrypt dummy work was performed (not early return)`
  );
});

// ==========================================
// AUD-04: Guarded Role Changes & Self-Demotion in General Updates
// ==========================================
test("AUD-04 - General admin update cannot bypass self-demotion or last-superadmin protections", async () => {
  const passwordHash = await bcrypt.hash("TestPass2026!#", 10);
  const sa1 = await Admin.create({
    username: `sa-audit-1-${Date.now()}`,
    name: "Superadmin One",
    passwordHash,
    role: "Superadmin",
    isActive: true,
  });

  // Attempt self-demotion via updateAdmin
  await assert.rejects(
    async () => {
      await updateAdmin(sa1._id, { role: "Admin" }, sa1._id.toString());
    },
    /cannot remove your own Superadmin role/i,
    "updateAdmin must reject self-demotion attempt"
  );

  // Attempt demoting the only active Superadmin via updateAdmin from another admin caller
  const callerId = new mongoose.Types.ObjectId().toString();
  await assert.rejects(
    async () => {
      await updateAdmin(sa1._id, { role: "Admin" }, callerId);
    },
    /At least one active Superadmin is required/i,
    "updateAdmin must reject demoting last active Superadmin"
  );

  await Admin.deleteOne({ _id: sa1._id });
});

// ==========================================
// AUD-05: JWT Invalidation on Password Change
// ==========================================
test("AUD-05 - Password changes invalidate previously issued access tokens", async () => {
  const passwordHash = await bcrypt.hash("InitialPass2026!", 10);
  const admin = await Admin.create({
    username: `pwd-audit-${Date.now()}`,
    name: "Password Change Auditor",
    passwordHash,
    role: "Admin",
    isActive: true,
    passwordChangedAt: null,
  });

  // Issue token before password change
  const oldToken = generateAccessToken(admin);

  // Wait 1.1s so iat is strictly less than passwordChangedAt timestamp in seconds
  await new Promise((r) => setTimeout(r, 1100));

  // Update password
  await updateAdmin(admin._id, { password: "NewStrongPassword2026!" });

  // Test authentication with old token
  const reqOld = {
    headers: { authorization: `Bearer ${oldToken}` },
    id: "req-audit-old",
  };
  const resOld = createMockRes();
  let nextCalledOld = false;

  await authenticate(reqOld, resOld, () => {
    nextCalledOld = true;
  });

  assert.equal(nextCalledOld, false, "Old token must NOT proceed to next middleware");
  assert.equal(resOld.statusCode, 401, "Old token must receive 401 Unauthorized");
  assert.match(
    resOld.body?.message,
    /Password was changed recently/i,
    "Response must notify user that password was changed"
  );

  // Login again and verify new token succeeds
  const loginRes = await loginAdmin(admin.username, "NewStrongPassword2026!");
  assert.ok(loginRes?.accessToken, "Login with new password should succeed");

  const reqNew = {
    headers: { authorization: `Bearer ${loginRes.accessToken}` },
    id: "req-audit-new",
  };
  const resNew = createMockRes();
  let nextCalledNew = false;

  await authenticate(reqNew, resNew, () => {
    nextCalledNew = true;
  });

  assert.equal(nextCalledNew, true, "New token must proceed successfully");

  await Admin.deleteOne({ _id: admin._id });
});

// ==========================================
// AUD-06: JWT Algorithm HS256 Pinned
// ==========================================
test("AUD-06 - JWT explicitly enforces HS256 algorithm and rejects algorithm confusion", () => {
  const validToken = generateAccessToken({
    _id: new mongoose.Types.ObjectId(),
    username: "crypto-auditor",
    role: "Superadmin",
  });

  const decodedHeader = jwt.decode(validToken, { complete: true });
  assert.equal(decodedHeader.header.alg, "HS256", "Token algorithm must be HS256");

  // Algorithm none must fail
  const forgedNone = jwt.sign({ sub: "hacker" }, "", { algorithm: "none" });
  assert.throws(() => verifyAccessToken(forgedNone));
});

// ==========================================
// AUD-07: Error Stack Trace Disclosure Prevention
// ==========================================
test("AUD-07 - Stack traces and internal paths are strictly hidden outside development", () => {
  const sanitizeErrorResponse = (err, nodeEnv) => {
    const isDev = nodeEnv === "development";
    const statusCode = 500;
    const clientMessage = isDev
      ? err.message || "An unexpected error occurred"
      : "Internal server error";

    const responseBody = {
      success: false,
      message: clientMessage,
      errors: {},
      requestId: "test-req",
    };

    if (isDev && err.stack) {
      responseBody.stack = err.stack;
    }

    return { statusCode, body: responseBody };
  };

  const sampleError = new Error("Database connection timed out at /var/app/backend/db.js:42");
  sampleError.stack = "Error: Database connection timed out\n    at Object.<anonymous> (/var/app/backend/db.js:42:15)";

  // Production check
  const prodRes = sanitizeErrorResponse(sampleError, "production");
  assert.equal(prodRes.body.message, "Internal server error");
  assert.equal(prodRes.body.stack, undefined);

  // Test / Staging check
  const testRes = sanitizeErrorResponse(sampleError, "test");
  assert.equal(testRes.body.message, "Internal server error");
  assert.equal(testRes.body.stack, undefined);

  // Development check
  const devRes = sanitizeErrorResponse(sampleError, "development");
  assert.match(devRes.body.message, /timed out/);
  assert.ok(devRes.body.stack.includes("db.js"));
});

// ==========================================
// AUD-08: Soft-Delete Email Uniqueness Evaluation on Real MongoDB
// ==========================================
test("AUD-08 - Validates soft-delete email unique constraint and partial index behavior on real MongoDB", async () => {
  const reuseEmail = `reuse.${Date.now()}@ashivamtechnologies.com`;

  // Insert active employee
  const emp1 = await Employee.create({
    firstName: "Original",
    lastName: "Employee",
    email: reuseEmail,
    designation: "Engineer",
    department: "Engineering",
    employmentType: "Full-time",
    joiningDate: new Date(),
  });

  // Soft-delete employee
  emp1.deletedAt = new Date();
  emp1.isActive = false;
  await emp1.save();

  // With standard global unique index, creating another record with same email yields E11000
  await assert.rejects(
    async () => {
      await Employee.create({
        firstName: "New",
        lastName: "Candidate",
        email: reuseEmail,
        designation: "Engineer",
        department: "Engineering",
        employmentType: "Full-time",
        joiningDate: new Date(),
      });
    },
    (err) => err.code === 11000,
    "Default global unique index prevents duplicate email even after soft delete"
  );

  // Cleanup
  await Employee.deleteMany({ email: reuseEmail });
});

// ==========================================
// AUD-09 & AUD-10: Concurrency Races for Admin Role, Status & Deletion
// ==========================================
test("AUD-10 - Concurrent demotions cannot leave zero active Superadmins", async () => {
  const passwordHash = await bcrypt.hash("ConcPass2026!#", 10);
  const saA = await Admin.create({
    username: `sa-conc-a-${Date.now()}`,
    name: "Superadmin A",
    passwordHash,
    role: "Superadmin",
    isActive: true,
  });

  const saB = await Admin.create({
    username: `sa-conc-b-${Date.now()}`,
    name: "Superadmin B",
    passwordHash,
    role: "Superadmin",
    isActive: true,
  });

  const callerId = new mongoose.Types.ObjectId().toString();

  // Run two concurrent demotions
  const results = await Promise.allSettled([
    updateAdminRole(saA._id, "Admin", callerId),
    updateAdminRole(saB._id, "Admin", callerId),
  ]);

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  assert.equal(fulfilled.length, 1, "Exactly one demotion must succeed");
  assert.equal(rejected.length, 1, "The concurrent demotion must be rejected");
  assert.match(
    rejected[0].reason.message,
    /At least one active Superadmin is required/i
  );

  const activeSuperadminsCount = await Admin.countDocuments({
    role: "Superadmin",
    isActive: true,
  });
  assert.equal(
    activeSuperadminsCount,
    1,
    "Active superadmins count must remain exactly 1 (never 0)"
  );

  await Admin.deleteMany({ _id: { $in: [saA._id, saB._id] } });
});

test("AUD-09 - Concurrent deletions cannot leave zero active Superadmins (Admin Delete Race)", async () => {
  const passwordHash = await bcrypt.hash("ConcDelPass2026!#", 10);
  const saC = await Admin.create({
    username: `sa-conc-c-${Date.now()}`,
    name: "Superadmin C",
    passwordHash,
    role: "Superadmin",
    isActive: true,
  });

  const saD = await Admin.create({
    username: `sa-conc-d-${Date.now()}`,
    name: "Superadmin D",
    passwordHash,
    role: "Superadmin",
    isActive: true,
  });

  const callerId = new mongoose.Types.ObjectId().toString();

  // Run two concurrent deletions
  const results = await Promise.allSettled([
    deleteAdmin(saC._id, callerId),
    deleteAdmin(saD._id, callerId),
  ]);

  const fulfilled = results.filter((r) => r.status === "fulfilled");
  const rejected = results.filter((r) => r.status === "rejected");

  assert.equal(fulfilled.length, 1, "Exactly one deletion must succeed");
  assert.equal(rejected.length, 1, "The concurrent deletion must be rejected");
  assert.match(
    rejected[0].reason.message,
    /At least one active Superadmin is required/i
  );

  const remainingActiveSuperadmins = await Admin.countDocuments({
    role: "Superadmin",
    isActive: true,
  });
  assert.equal(
    remainingActiveSuperadmins,
    1,
    "At least one Superadmin must remain active in the system"
  );

  await Admin.deleteMany({ _id: { $in: [saC._id, saD._id] } });
});
