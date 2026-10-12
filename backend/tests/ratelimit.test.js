import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import {
  isHealthOrDiscoveryPath,
  createRateLimitHandler,
} from "../src/middlewares/rateLimit.middleware.js";

test("Rate Limiting - isHealthOrDiscoveryPath exempts infrastructure health probes and discovery paths", () => {
  assert.equal(isHealthOrDiscoveryPath("/api/v1/health"), true);
  assert.equal(isHealthOrDiscoveryPath("/api/v1/health/liveness"), true);
  assert.equal(isHealthOrDiscoveryPath("/health"), true);
  assert.equal(isHealthOrDiscoveryPath("/"), true);
  assert.equal(isHealthOrDiscoveryPath("/api/v1"), true);
  assert.equal(isHealthOrDiscoveryPath("/api/v1/"), true);

  // Normal endpoints must NOT be skipped
  assert.equal(isHealthOrDiscoveryPath("/api/v1/auth/login"), false);
  assert.equal(isHealthOrDiscoveryPath("/api/v1/inquiries"), false);
  assert.equal(isHealthOrDiscoveryPath("/api/v1/career/applications"), false);
});

test("Rate Limiting - createRateLimitHandler formats consistent 429 JSON response envelope", () => {
  const handler = createRateLimitHandler("Rate limit reached for test.");
  let statusCode = null;
  let responseBody = null;
  const mockReq = { id: "req-envelope-test-429" };
  const mockRes = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          responseBody = data;
        },
      };
    },
  };

  handler(mockReq, mockRes);
  assert.equal(statusCode, 429);
  assert.equal(responseBody.success, false);
  assert.equal(responseBody.message, "Rate limit reached for test.");
  assert.equal(responseBody.requestId, "req-envelope-test-429");
  assert.deepEqual(responseBody.errors, {});
});

test("Rate Limiting - Health endpoints (/health, /api/v1/health, /api/v1/health/liveness) return 200/503 without being blocked", async () => {
  for (const endpoint of ["/health", "/api/v1/health", "/api/v1/health/liveness"]) {
    const res = await request(app).get(endpoint);
    assert.ok(
      [200, 503].includes(res.status),
      `Endpoint ${endpoint} should respond with 200 or 503, got ${res.status}`
    );
    assert.notEqual(res.status, 429, `Endpoint ${endpoint} should never receive 429 under standard checks`);
  }
});
