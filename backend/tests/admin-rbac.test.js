import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import { generateAccessToken } from "../src/utils/jwt.js";
import {
  requireRole,
  requirePermission,
} from "../src/middlewares/authorization.middleware.js";
import {
  validateCreateAdmin,
  validateUpdateAdmin,
  ROLES,
  PERMISSIONS,
} from "../src/modules/admin/admin.validator.js";
import { loginAdmin } from "../src/modules/auth/auth.service.js";

// Helper to create mock response object
const createMockRes = () => {
  const res = {
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
  return res;
};

// 1. Admin Creation Validation Tests
test("Admin Validator - validateCreateAdmin enforces schema and constraints", () => {
  // Empty body
  assert.equal(validateCreateAdmin({}), "Username is required");

  // Invalid username length
  assert.equal(
    validateCreateAdmin({ username: "ab", name: "Test", password: "Password123!" }),
    "Username must be between 3 and 50 characters"
  );

  // Illegal characters in username
  assert.equal(
    validateCreateAdmin({ username: "user@invalid!", name: "Test", password: "Password123!" }),
    "Username may only contain letters, numbers, dots, underscores, and dashes"
  );

  // Missing name
  assert.equal(
    validateCreateAdmin({ username: "valid.user", name: "", password: "Password123!" }),
    "Name is required"
  );

  // Invalid email format
  assert.equal(
    validateCreateAdmin({
      username: "valid.user",
      name: "Valid Name",
      email: "not-an-email",
      password: "Password123!",
    }),
    "Please provide a valid email address"
  );

  // Short password
  assert.equal(
    validateCreateAdmin({
      username: "valid.user",
      name: "Valid Name",
      password: "short",
    }),
    "Password must be at least 8 characters"
  );

  // Invalid role
  assert.equal(
    validateCreateAdmin({
      username: "valid.user",
      name: "Valid Name",
      password: "Password123!",
      role: "UnauthorizedRole",
    }),
    "Invalid role"
  );

  // Invalid permission
  assert.equal(
    validateCreateAdmin({
      username: "valid.user",
      name: "Valid Name",
      password: "Password123!",
      permissions: ["dashboard", "non_existent_perm"],
    }),
    "Invalid permissions"
  );

  // Valid normal Admin payload
  const validNormalAdmin = {
    username: "john.admin",
    name: "John Doe",
    email: "john@ashivamtechnologies.com",
    password: "SecurePassword2026!",
    role: "Admin",
    permissions: ["dashboard", "inquiries", "careers"],
  };
  assert.equal(validateCreateAdmin(validNormalAdmin), null);
});

// 2. Admin Update Validation Tests
test("Admin Validator - validateUpdateAdmin enforces partial update constraints", () => {
  assert.equal(validateUpdateAdmin({ name: "   " }), "Name must be a valid string");
  assert.equal(validateUpdateAdmin({ email: "invalid-email" }), "Please provide a valid email address");
  assert.equal(validateUpdateAdmin({ password: "123" }), "Password must be at least 8 characters");
  assert.equal(validateUpdateAdmin({ role: "Hacker" }), "Invalid role");
  assert.equal(validateUpdateAdmin({ permissions: ["hacked"] }), "Invalid permissions");

  assert.equal(
    validateUpdateAdmin({
      name: "John Updated",
      email: "john.updated@ashivamtechnologies.com",
      permissions: ["inquiries"],
    }),
    null
  );
});

// 3. Unit Tests: requireRole middleware
test("RBAC Middleware - requireRole strictly isolates permissions", () => {
  const superadminOnlyMiddleware = requireRole("Superadmin");
  const adminAllowedMiddleware = requireRole("Superadmin", "Admin");

  // Unauthenticated user
  const reqUnauth = { user: null };
  const resUnauth = createMockRes();
  let nextCalled = false;
  superadminOnlyMiddleware(reqUnauth, resUnauth, () => { nextCalled = true; });
  assert.equal(resUnauth.statusCode, 401);
  assert.equal(nextCalled, false);

  // Normal Admin accessing Superadmin-only route
  const reqAdmin = { user: { role: "Admin", username: "normaladmin" } };
  const resAdmin = createMockRes();
  nextCalled = false;
  superadminOnlyMiddleware(reqAdmin, resAdmin, () => { nextCalled = true; });
  assert.equal(resAdmin.statusCode, 403);
  assert.equal(resAdmin.body.message, "Insufficient permissions");
  assert.equal(nextCalled, false);

  // Normal Admin accessing Superadmin or Admin allowed route
  const resAdminAllowed = createMockRes();
  nextCalled = false;
  adminAllowedMiddleware(reqAdmin, resAdminAllowed, () => { nextCalled = true; });
  assert.equal(resAdminAllowed.statusCode, null);
  assert.equal(nextCalled, true);

  // Superadmin accessing Superadmin-only route
  const reqSuper = { user: { role: "Superadmin", username: "superadmin" } };
  const resSuper = createMockRes();
  nextCalled = false;
  superadminOnlyMiddleware(reqSuper, resSuper, () => { nextCalled = true; });
  assert.equal(resSuper.statusCode, null);
  assert.equal(nextCalled, true);
});

// 4. Unit Tests: requirePermission middleware
test("RBAC Middleware - requirePermission enforces granular feature permissions", () => {
  const careersMiddleware = requirePermission("careers");

  // Superadmin bypasses permission check
  const reqSuper = { user: { role: "Superadmin", permissions: [] } };
  const resSuper = createMockRes();
  let nextCalled = false;
  careersMiddleware(reqSuper, resSuper, () => { nextCalled = true; });
  assert.equal(resSuper.statusCode, null);
  assert.equal(nextCalled, true);

  // Normal Admin WITH "careers" permission
  const reqPermittedAdmin = {
    user: { role: "Admin", permissions: ["careers", "inquiries"] },
  };
  const resPermitted = createMockRes();
  nextCalled = false;
  careersMiddleware(reqPermittedAdmin, resPermitted, () => { nextCalled = true; });
  assert.equal(resPermitted.statusCode, null);
  assert.equal(nextCalled, true);

  // Normal Admin WITHOUT "careers" permission
  const reqRestrictedAdmin = {
    user: { role: "Admin", permissions: ["dashboard", "inquiries"] },
  };
  const resRestricted = createMockRes();
  nextCalled = false;
  careersMiddleware(reqRestrictedAdmin, resRestricted, () => { nextCalled = true; });
  assert.equal(resRestricted.statusCode, 403);
  assert.equal(resRestricted.body.message, "Insufficient permissions");
  assert.equal(nextCalled, false);
});

// 5. Unauthenticated requests to protected admin routes
test("RBAC API - Unauthenticated requests to /api/v1/admin endpoints return 401", async () => {
  const resDashboard = await request(app).get("/api/v1/admin/dashboard");
  assert.equal(resDashboard.status, 401);
  assert.equal(resDashboard.body.success, false);
  assert.equal(resDashboard.body.message, "Authentication required");

  const resList = await request(app).get("/api/v1/admin");
  assert.equal(resList.status, 401);
  assert.equal(resList.body.success, false);
  assert.equal(resList.body.message, "Authentication required");
});

// 6. Integration tests with live Database connection
let testNormalAdminId = null;
let testNormalAdminToken = null;
const TEST_ADMIN_USERNAME = `test-admin-${Date.now()}`;
const TEST_ADMIN_PASSWORD = "ValidAdminPass2026!";

before(async () => {
  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 2500 });
    const passwordHash = await bcrypt.hash(TEST_ADMIN_PASSWORD, 10);
    const testAdmin = await Admin.create({
      username: TEST_ADMIN_USERNAME,
      name: "Test Normal Admin",
      email: "test.admin@ashivamtechnologies.com",
      passwordHash,
      role: "Admin",
      permissions: ["dashboard", "careers"],
      isActive: true,
    });
    testNormalAdminId = testAdmin._id.toString();
    testNormalAdminToken = generateAccessToken(testAdmin);
  } catch (err) {
    // If DB is offline during tests, graceful handling
    testNormalAdminId = null;
  }
});

after(async () => {
  try {
    if (testNormalAdminId) {
      await Admin.deleteOne({ _id: testNormalAdminId });
    }
  } catch (err) {
    // Ignore cleanup error
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
});

test("RBAC Live Integration - Normal Admin can log in and is blocked from Superadmin endpoints", async (t) => {
  if (!testNormalAdminId) {
    t.skip("Database connection not available for integration check");
    return;
  }

  // 1. Login with correct credentials
  const loginRes = await loginAdmin(TEST_ADMIN_USERNAME, TEST_ADMIN_PASSWORD);
  assert.ok(loginRes, "loginAdmin must succeed for valid credentials");
  assert.equal(loginRes.user.role, "Admin");
  assert.equal(loginRes.user.username, TEST_ADMIN_USERNAME);
  assert.equal(loginRes.user.email, "test.admin@ashivamtechnologies.com");

  // 2. Login with wrong password
  const badLoginRes = await loginAdmin(TEST_ADMIN_USERNAME, "WrongPassword123!");
  assert.equal(badLoginRes, null, "loginAdmin must return null for bad password");

  // 3. Normal Admin access to /dashboard (Allowed)
  const dashRes = await request(app)
    .get("/api/v1/admin/dashboard")
    .set("Authorization", `Bearer ${testNormalAdminToken}`);
  assert.equal(dashRes.status, 200);
  assert.equal(dashRes.body.success, true);

  // 4. Normal Admin access to /admin management (Forbidden - Superadmin only)
  const listRes = await request(app)
    .get("/api/v1/admin")
    .set("Authorization", `Bearer ${testNormalAdminToken}`);
  assert.equal(listRes.status, 403);
  assert.equal(listRes.body.message, "Insufficient permissions");

  // 5. Normal Admin POST to /admin (Forbidden - Superadmin only)
  const createRes = await request(app)
    .post("/api/v1/admin")
    .set("Authorization", `Bearer ${testNormalAdminToken}`)
    .send({
      username: "another.admin",
      name: "Another Admin",
      password: "Password12345!",
    });
  assert.equal(createRes.status, 403);
  assert.equal(createRes.body.message, "Insufficient permissions");
});
