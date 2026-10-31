import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import { generateAccessToken } from "../src/utils/jwt.js";

const TEST_TIMESTAMP = Date.now();
let testAdmin = null;
let testAdminToken = null;

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  }

  const passwordHash = await bcrypt.hash("CsrfTestPassword!2026", 10);
  testAdmin = await Admin.create({
    username: `csrf_tester_${TEST_TIMESTAMP}`,
    name: "CSRF Security Tester",
    email: `csrf.${TEST_TIMESTAMP}@ashivam.test`,
    passwordHash,
    role: "Admin",
    permissions: ["dashboard"],
    isActive: true,
  });
  testAdminToken = generateAccessToken(testAdmin);
});

after(async () => {
  if (testAdmin?._id) {
    await Admin.deleteOne({ _id: testAdmin._id });
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test("CSRF - State-changing JSON mutation from untrusted origin is rejected with 403", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .set("Origin", "https://malicious-attacker.com")
    .send({
      username: testAdmin.username,
      password: "CsrfTestPassword!2026",
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /not allowed by (CORS|CSRF)/i);
});

test("CSRF - Cross-site form submission (Sec-Fetch-Site: cross-site, Sec-Fetch-Mode: navigate) is blocked with 403", async () => {
  const response = await request(app)
    .post("/api/v1/auth/logout")
    .set("Sec-Fetch-Site", "cross-site")
    .set("Sec-Fetch-Mode", "navigate")
    .set("Sec-Fetch-Dest", "document")
    .send({});

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Cross-site form submission blocked by CSRF defense/i);
});

test("CSRF - Forged or unauthorized Referer origin is rejected with 403", async () => {
  const response = await request(app)
    .post("/api/v1/auth/logout")
    .set("Referer", "https://phishing-ashivam.com/attack.html")
    .send({});

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /rejected by CSRF/i);
});

test("CSRF - Cookie-authenticated request with missing Origin AND missing Referer AND no custom header is rejected with 403", async () => {
  const response = await request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", "refreshToken=dummy_stolen_token_12345")
    .send({});

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /State-changing cookie requests require Origin/i);
});

test("CSRF - Cookie-authenticated request with custom client header (X-Request-Id) is permitted through CSRF guard", async () => {
  const response = await request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", "refreshToken=unverified_sample_token")
    .set("X-Request-Id", "req-client-safe-1234")
    .send({});

  // Passed CSRF guard, then rejected by token validator as invalid token
  assert.equal(response.status, 401);
  assert.match(response.body.message, /Invalid or unverified refresh token/i);
});

test("CSRF - Approved production origin (https://ashivam-tec-h.vercel.app) is allowed through CSRF defense", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .set("Origin", "https://ashivam-tec-h.vercel.app")
    .send({
      username: testAdmin.username,
      password: "CsrfTestPassword!2026",
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data.accessToken);
});

test("CSRF - Approved Referer origin allows state-changing refresh request", async () => {
  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .set("Origin", "https://ashivam-tec-h.vercel.app")
    .send({
      username: testAdmin.username,
      password: "CsrfTestPassword!2026",
    });

  const cookies = loginRes.headers["set-cookie"];
  const rawToken = cookies.find((c) => c.startsWith("refreshToken=")).split(";")[0].split("=")[1];

  const refreshRes = await request(app)
    .post("/api/v1/auth/refresh")
    .set("Referer", "https://ashivam-tec-h.vercel.app/admin/dashboard")
    .set("Cookie", `refreshToken=${rawToken}`)
    .send({});

  assert.equal(refreshRes.status, 200);
  assert.equal(refreshRes.body.success, true);
  assert.ok(refreshRes.body.data.accessToken);
});

test("CSRF - State-changing password change endpoint rejects unauthorized origin with 403", async () => {
  const response = await request(app)
    .post("/api/v1/auth/change-password")
    .set("Origin", "https://evil-hacker.com")
    .set("Authorization", `Bearer ${testAdminToken}`)
    .send({
      currentPassword: "CsrfTestPassword!2026",
      newPassword: "NewCsrfTestPassword!2026",
    });

  assert.equal(response.status, 403);
  assert.match(response.body.message, /not allowed by (CORS|CSRF)/i);
});

test("CSRF - Documented originless non-cookie API request with explicit Authorization Bearer token is permitted", async () => {
  const response = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${testAdminToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.user.username, testAdmin.username);
});
