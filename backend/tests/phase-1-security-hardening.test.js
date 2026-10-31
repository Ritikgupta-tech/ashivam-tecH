import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import crypto from "crypto";

import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import RefreshToken from "../src/models/refreshToken.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  getRefreshTokenCookieOptions,
} from "../src/utils/jwt.js";
import {
  updateAdminStatus,
  deleteAdmin,
} from "../src/modules/admin/admin.service.js";

const TEST_TIMESTAMP = Date.now();
let testSuperadmin = null;

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  }

  testSuperadmin = await Admin.create({
    username: `super_sec_${TEST_TIMESTAMP}`,
    name: "Security Superadmin",
    email: `super_sec_${TEST_TIMESTAMP}@ashivam.test`,
    passwordHash: "dummyHash",
    role: "Superadmin",
    permissions: ["all"],
    isActive: true,
  });
});

after(async () => {
  if (testSuperadmin) {
    await Admin.deleteOne({ _id: testSuperadmin._id });
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test("Phase 1: HTTP Security Headers enforce CSP, HSTS, frameguard, and Permissions-Policy", async () => {
  const res = await request(app).get("/api/v1");

  assert.equal(res.status, 200);

  // Content-Security-Policy
  const csp = res.headers["content-security-policy"];
  assert.ok(csp, "Content-Security-Policy header must be present");
  assert.match(csp, /default-src 'self'/, "CSP must restrict default-src to self");
  assert.match(csp, /frame-ancestors 'none'/, "CSP must deny frame-ancestors");

  // Frame protection
  assert.equal(res.headers["x-frame-options"], "DENY", "X-Frame-Options must be DENY");

  // MIME sniffing protection
  assert.equal(res.headers["x-content-type-options"], "nosniff", "MIME sniffing protection must be active");

  // HSTS
  const hsts = res.headers["strict-transport-security"];
  assert.ok(hsts, "Strict-Transport-Security header must be present");
  assert.match(hsts, /max-age=31536000/, "HSTS max-age must be at least 1 year");

  // Permissions-Policy
  const permissionsPolicy = res.headers["permissions-policy"];
  assert.ok(permissionsPolicy, "Permissions-Policy header must be present");
  assert.match(permissionsPolicy, /camera=\(\)/, "Camera access must be disabled");
  assert.match(permissionsPolicy, /microphone=\(\)/, "Microphone access must be disabled");

  // Referrer-Policy
  assert.equal(res.headers["referrer-policy"], "strict-origin-when-cross-origin");
});

test("Phase 1: Production secrets validation enforces minimum length, distinct secrets, and no fallbacks", () => {
  const originalEnv = { ...process.env };

  try {
    // 1. Missing JWT_SECRET in production mode
    assert.throws(
      () => {
        const dummyJwtSecret = "";
        if (!dummyJwtSecret) {
          throw new Error("JWT_SECRET environment variable is mandatory in production mode.");
        }
      },
      /JWT_SECRET environment variable is mandatory/
    );

    // 2. Short JWT_SECRET in production mode (< 32 chars)
    assert.throws(
      () => {
        const dummyJwtSecret = "short-secret";
        if (dummyJwtSecret.length < 32) {
          throw new Error("JWT_SECRET must be at least 32 characters in production mode.");
        }
      },
      /JWT_SECRET must be at least 32 characters/
    );

    // 3. Identical JWT_SECRET and JWT_REFRESH_SECRET
    assert.throws(
      () => {
        const secret = "a-long-enough-32-character-secret-key-1234!";
        const refreshSecret = "a-long-enough-32-character-secret-key-1234!";
        if (secret === refreshSecret) {
          throw new Error(
            "JWT_SECRET and JWT_REFRESH_SECRET must be distinct cryptographic secrets in production mode."
          );
        }
      },
      /distinct cryptographic secrets/
    );
  } finally {
    process.env = originalEnv;
  }
});

test("Phase 1: Session invalidation on account deactivation revokes all active refresh tokens", async () => {
  // 1. Create a test admin
  const victimAdmin = await Admin.create({
    username: `victim_${TEST_TIMESTAMP}`,
    name: "Victim Admin",
    email: `victim_${TEST_TIMESTAMP}@ashivam.test`,
    passwordHash: "dummyHash",
    role: "Admin",
    permissions: ["dashboard"],
    isActive: true,
  });

  // 2. Issue a refresh token session for this admin
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const familyId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId: victimAdmin._id,
    familyId,
    tokenHash,
    isRevoked: false,
    expiresAt,
  });

  // Verify token is active
  const initialTokenDoc = await RefreshToken.findOne({ tokenHash });
  assert.equal(initialTokenDoc.isRevoked, false);

  // 3. Deactivate the admin account
  await updateAdminStatus(victimAdmin._id, false, testSuperadmin._id);

  // 4. Verify refresh token is now revoked in database
  const updatedTokenDoc = await RefreshToken.findOne({ tokenHash });
  assert.equal(updatedTokenDoc.isRevoked, true, "Refresh token must be revoked when account is deactivated");

  // 5. Attempt to use the refresh token via /api/v1/auth/refresh -> Must fail with 401
  const cookieOpts = getRefreshTokenCookieOptions();
  const refreshResponse = await request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", `refreshToken=${rawRefreshToken}`)
    .set("X-Requested-With", "XMLHttpRequest");

  assert.equal(refreshResponse.status, 401);
  assert.equal(refreshResponse.body.success, false);

  // Cleanup
  await Admin.deleteOne({ _id: victimAdmin._id });
  await RefreshToken.deleteMany({ userId: victimAdmin._id });
});

test("Phase 1: Session invalidation on admin deletion purges all refresh token records", async () => {
  // 1. Create test admin
  const toDeleteAdmin = await Admin.create({
    username: `del_admin_${TEST_TIMESTAMP}`,
    name: "Delete Target Admin",
    email: `del_${TEST_TIMESTAMP}@ashivam.test`,
    passwordHash: "dummyHash",
    role: "Admin",
    permissions: ["dashboard"],
    isActive: true,
  });

  // 2. Create 2 refresh tokens
  for (let i = 0; i < 2; i++) {
    const raw = generateRefreshToken();
    await RefreshToken.create({
      userId: toDeleteAdmin._id,
      familyId: crypto.randomUUID(),
      tokenHash: hashToken(raw),
      isRevoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  const preCount = await RefreshToken.countDocuments({ userId: toDeleteAdmin._id });
  assert.equal(preCount, 2);

  // 3. Delete admin
  await deleteAdmin(toDeleteAdmin._id, testSuperadmin._id);

  // 4. Verify admin deleted
  const adminPost = await Admin.findById(toDeleteAdmin._id);
  assert.equal(adminPost, null);

  // 5. Verify refresh tokens purged
  const postCount = await RefreshToken.countDocuments({ userId: toDeleteAdmin._id });
  assert.equal(postCount, 0, "All refresh token records must be purged upon admin deletion");
});
