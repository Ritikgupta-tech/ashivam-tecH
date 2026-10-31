import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import RefreshToken from "../src/models/refreshToken.model.js";
import { generateAccessToken, verifyAccessToken, hashToken } from "../src/utils/jwt.js";

const TEST_TIMESTAMP = Date.now();
let testAdminId = null;
let testAdminToken = null;
let testAdminDoc = null;

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  }

  const passwordHash = await bcrypt.hash("AuthTestPassword!2026", 10);
  testAdminDoc = await Admin.create({
    username: `auth_tester_${TEST_TIMESTAMP}`,
    name: "Auth Lifecycle Tester",
    email: `auth.${TEST_TIMESTAMP}@ashivam.test`,
    passwordHash,
    role: "Admin",
    permissions: ["dashboard"],
    isActive: true,
  });
  testAdminId = testAdminDoc._id.toString();
  testAdminToken = generateAccessToken(testAdminDoc);
});

after(async () => {
  if (testAdminId) {
    await Admin.deleteOne({ _id: testAdminId });
    await RefreshToken.deleteMany({ userId: testAdminId });
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test("JWT Utility - Signs and verifies payload correctly", () => {
  const mockAdmin = {
    _id: "507f1f77bcf86cd799439011",
    username: "testsuperadmin",
    role: "Superadmin",
  };

  const token = generateAccessToken(mockAdmin);
  assert.ok(typeof token === "string" && token.length > 20);

  const decoded = verifyAccessToken(token);
  assert.equal(decoded.sub, "507f1f77bcf86cd799439011");
  assert.equal(decoded.username, "testsuperadmin");
  assert.equal(decoded.role, "Superadmin");
});

test("Auth Controller - POST /api/v1/auth/login rejects empty payload with 400", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Username and password are required");
});

test("Auth Controller - POST /api/v1/auth/login rejects non-string credentials with 400", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({ username: 12345, password: { secret: true } });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Username and password are required");
});

test("Auth Middleware - GET /api/v1/auth/me rejects unauthenticated request with 401", async () => {
  const response = await request(app).get("/api/v1/auth/me");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Authentication required");
});

test("Auth Middleware - GET /api/v1/auth/me rejects invalid token with 401", async () => {
  const response = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", "Bearer invalid-tampered-token-123");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Invalid access token");
});

test("Auth Middleware - GET /api/v1/auth/me rejects expired token with 401", async () => {
  const expiredToken = jwt.sign(
    { sub: testAdminId, username: testAdminDoc.username, role: "Admin" },
    env.jwtSecret,
    { algorithm: "HS256", expiresIn: "-1s" }
  );

  const response = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${expiredToken}`);

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Access token expired");
});

test("Auth Middleware - GET /api/v1/auth/me rejects inactive administrator accounts with 403", async () => {
  const inactiveAdmin = await Admin.create({
    username: `inactive_${TEST_TIMESTAMP}`,
    name: "Inactive Admin",
    email: `inactive.${TEST_TIMESTAMP}@ashivam.test`,
    passwordHash: "dummyHash",
    role: "Admin",
    permissions: ["dashboard"],
    isActive: false,
  });

  const inactiveToken = generateAccessToken(inactiveAdmin);

  const response = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${inactiveToken}`);

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Account is inactive");

  await Admin.deleteOne({ _id: inactiveAdmin._id });
});

test("Auth Middleware - GET /api/v1/auth/me invalidates old tokens when password was changed", async () => {
  // Sign a token with iat in the past
  const pastIat = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago
  const oldToken = jwt.sign(
    {
      sub: testAdminId,
      username: testAdminDoc.username,
      role: testAdminDoc.role,
      iat: pastIat,
    },
    env.jwtSecret,
    { algorithm: "HS256", expiresIn: "1h" }
  );

  // Set passwordChangedAt to 10 seconds ago (after the token was issued)
  await Admin.updateOne(
    { _id: testAdminId },
    { $set: { passwordChangedAt: new Date((pastIat + 10) * 1000) } }
  );

  const response = await request(app)
    .get("/api/v1/auth/me")
    .set("Authorization", `Bearer ${oldToken}`);

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.match(response.body.message, /Password was changed recently/i);

  // Clean up passwordChangedAt
  await Admin.updateOne({ _id: testAdminId }, { $unset: { passwordChangedAt: "" } });
});

test("Auth Lifecycle - POST /api/v1/auth/login sets HttpOnly refresh cookie and returns 15m access token", async () => {
  const loginResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testAdminDoc.username,
      password: "AuthTestPassword!2026",
    });

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.success, true);
  assert.ok(loginResponse.body.data.accessToken, "Should return 15m access token");
  assert.equal(loginResponse.body.data.user.username, testAdminDoc.username);

  // Verify Set-Cookie header contains HttpOnly refresh token
  const cookies = loginResponse.headers["set-cookie"];
  assert.ok(Array.isArray(cookies) && cookies.length > 0, "Must set cookie header");
  const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
  assert.ok(refreshCookie, "refreshToken cookie must be set");
  assert.match(refreshCookie, /HttpOnly/i, "refreshToken cookie must be HttpOnly");
  assert.match(refreshCookie, /Path=\/api\/v1\/auth/i, "refreshToken cookie path must be restricted");

  // Verify record created in database
  const count = await RefreshToken.countDocuments({ userId: testAdminId, isRevoked: false });
  assert.ok(count >= 1, "Active refresh token must exist in MongoDB");
});

test("Auth Lifecycle - POST /api/v1/auth/refresh rotates token and maintains sliding session", async () => {
  // 1. Initial Login
  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testAdminDoc.username,
      password: "AuthTestPassword!2026",
    });

  const cookies = loginRes.headers["set-cookie"];
  const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
  const rawToken = refreshCookie.split(";")[0].split("=")[1];

  // 2. Rotate Token via Cookie
  const refreshRes = await request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", `refreshToken=${rawToken}`)
    .set("X-Requested-With", "XMLHttpRequest");

  assert.equal(refreshRes.status, 200);
  assert.equal(refreshRes.body.success, true);
  assert.ok(refreshRes.body.data.accessToken, "Should return newly signed access token");

  // Verify new rotated cookie was issued
  const newCookies = refreshRes.headers["set-cookie"];
  const newRefreshCookie = newCookies.find((c) => c.startsWith("refreshToken="));
  assert.ok(newRefreshCookie, "New rotated refreshToken cookie must be set");
  const newRawToken = newRefreshCookie.split(";")[0].split("=")[1];
  assert.notEqual(newRawToken, rawToken, "New refresh token must be cryptographically distinct from old token");
});

test("Auth Lifecycle - POST /api/v1/auth/refresh detects replay attacks and revokes entire token family", async () => {
  // 1. Initial Login
  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testAdminDoc.username,
      password: "AuthTestPassword!2026",
    });

  const cookies = loginRes.headers["set-cookie"];
  const rawToken = cookies.find((c) => c.startsWith("refreshToken=")).split(";")[0].split("=")[1];

  // 2. First rotation (valid exchange)
  const firstRefreshRes = await request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", `refreshToken=${rawToken}`)
    .set("X-Requested-With", "XMLHttpRequest");
  assert.equal(firstRefreshRes.status, 200);

  // 3. Replay attack: Attacker attempts to use the already-rotated rawToken
  const replayRes = await request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", `refreshToken=${rawToken}`)
    .set("X-Requested-With", "XMLHttpRequest");

  assert.equal(replayRes.status, 401, "Replay attempt must be rejected with 401");
  assert.match(replayRes.body.message, /Compromised or reused refresh token/i);

  // Verify that ALL tokens for that compromised family are now revoked in the database
  const tokenRecord = await RefreshToken.findOne({ tokenHash: hashToken(rawToken) });
  assert.ok(tokenRecord, "Compromised token record must exist in DB");
  const familyTokens = await RefreshToken.find({ familyId: tokenRecord.familyId });
  assert.ok(familyTokens.length >= 2, "Family must contain multiple generation tokens");
  assert.ok(
    familyTokens.every((t) => t.isRevoked === true),
    "All tokens in compromised family lineage must be revoked"
  );
});

test("Auth Lifecycle - POST /api/v1/auth/logout revokes session and clears cookie", async () => {
  // 1. Login
  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: testAdminDoc.username,
      password: "AuthTestPassword!2026",
    });

  const cookies = loginRes.headers["set-cookie"];
  const rawToken = cookies.find((c) => c.startsWith("refreshToken=")).split(";")[0].split("=")[1];

  // 2. Logout
  const logoutRes = await request(app)
    .post("/api/v1/auth/logout")
    .set("Cookie", `refreshToken=${rawToken}`)
    .set("X-Requested-With", "XMLHttpRequest");

  assert.equal(logoutRes.status, 200);
  assert.equal(logoutRes.body.success, true);
  assert.equal(logoutRes.body.message, "Logged out successfully");

  // Verify cookie was cleared
  const clearCookieHeader = logoutRes.headers["set-cookie"];
  assert.ok(clearCookieHeader, "Must issue clear cookie header");
  const clearedCookie = clearCookieHeader.find((c) => c.startsWith("refreshToken="));
  assert.ok(clearedCookie, "refreshToken cookie must be cleared");
  assert.ok(clearedCookie.includes("refreshToken=;") || clearedCookie.includes("Expires="), "Cookie must be expired/cleared");

  // 3. Attempting to refresh with the logged-out token should fail
  const postLogoutRefresh = await request(app)
    .post("/api/v1/auth/refresh")
    .set("Cookie", `refreshToken=${rawToken}`)
    .set("X-Requested-With", "XMLHttpRequest");
  assert.equal(postLogoutRefresh.status, 401);
});
