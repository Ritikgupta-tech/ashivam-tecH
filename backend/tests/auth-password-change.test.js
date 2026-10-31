import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import { generateAccessToken } from "../src/utils/jwt.js";

let testAdminId = null;
let testAdminToken = null;
const TEST_USER = `pwd-test-${Date.now()}`;
const INITIAL_PASS = "InitialPass2026!#$";
const NEW_PASS = "NewUpdatedPass2026!#$";

before(async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 3000 });
    }
    const passwordHash = await bcrypt.hash(INITIAL_PASS, 10);
    const admin = await Admin.create({
      username: TEST_USER,
      name: "Password Change Test User",
      email: `${TEST_USER}@ashivam.test`,
      passwordHash,
      role: "Admin",
      permissions: ["dashboard"],
      isActive: true,
    });
    testAdminId = admin._id.toString();
    testAdminToken = generateAccessToken(admin);
  } catch (err) {
    // If MongoDB is not reachable, create a token for offline tests
    const mockAdmin = {
      _id: new mongoose.Types.ObjectId(),
      username: TEST_USER,
      role: "Admin",
      permissions: ["dashboard"],
    };
    testAdminToken = generateAccessToken(mockAdmin);
  }
});

after(async () => {
  try {
    if (testAdminId) {
      await Admin.findByIdAndDelete(testAdminId);
    }
  } catch {
    // cleanup
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  }
});

test("Change Password: POST /api/v1/auth/change-password requires authentication", async () => {
  const res = await request(app)
    .post("/api/v1/auth/change-password")
    .send({ currentPassword: "OldPassword1!", newPassword: "NewPassword1!" });

  assert.equal(res.status, 401);
});

test("Change Password: POST /api/v1/auth/change-password rejects empty body with 400", async () => {
  const res = await request(app)
    .post("/api/v1/auth/change-password")
    .set("Authorization", `Bearer ${testAdminToken}`)
    .send({});

  assert.equal(res.status, 400);
  assert.ok(res.body.message.includes("Current password and new password are required"));
});

test("Change Password: rejects new password shorter than 8 characters", async () => {
  const res = await request(app)
    .post("/api/v1/auth/change-password")
    .set("Authorization", `Bearer ${testAdminToken}`)
    .send({ currentPassword: INITIAL_PASS, newPassword: "short" });

  assert.equal(res.status, 400);
  assert.ok(res.body.message.includes("at least 8 characters"));
});

test("Change Password: rejects new password identical to current password", async () => {
  const res = await request(app)
    .post("/api/v1/auth/change-password")
    .set("Authorization", `Bearer ${testAdminToken}`)
    .send({ currentPassword: INITIAL_PASS, newPassword: INITIAL_PASS });

  assert.equal(res.status, 400);
  assert.ok(res.body.message.includes("different from current password"));
});

test("Change Password: rejects incorrect current password with 401", async (t) => {
  if (!testAdminId) {
    t.skip("Database connection unavailable");
    return;
  }

  const res = await request(app)
    .post("/api/v1/auth/change-password")
    .set("Authorization", `Bearer ${testAdminToken}`)
    .send({ currentPassword: "WrongCurrentPassword123!", newPassword: NEW_PASS });

  assert.equal(res.status, 401);
  assert.ok(res.body.message.includes("Current password is incorrect"));
});

test("Change Password: successfully updates password and returns fresh token", async (t) => {
  if (!testAdminId) {
    t.skip("Database connection unavailable");
    return;
  }

  const res = await request(app)
    .post("/api/v1/auth/change-password")
    .set("Authorization", `Bearer ${testAdminToken}`)
    .send({ currentPassword: INITIAL_PASS, newPassword: NEW_PASS });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.accessToken);
  assert.ok(res.body.data.passwordChangedAt);

  // Verify that subsequent login with NEW password succeeds
  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ username: TEST_USER, password: NEW_PASS });

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.body.success, true);

  // Verify that login with OLD password fails
  const oldLoginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ username: TEST_USER, password: INITIAL_PASS });

  assert.equal(oldLoginRes.status, 401);
});
