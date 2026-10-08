import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { generateAccessToken, verifyAccessToken } from "../src/utils/jwt.js";

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
