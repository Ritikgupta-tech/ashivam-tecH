import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";

test("Security Headers - X-Powered-By is disabled", async () => {
  const response = await request(app).get("/");
  assert.equal(response.headers["x-powered-by"], undefined);
});

test("Security Headers - Helmet security headers are present", async () => {
  const response = await request(app).get("/");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.ok(response.headers["cross-origin-resource-policy"]);
});

test("Correlation ID - Incoming X-Request-Id is echoed in response", async () => {
  const customId = "trace-client-12345-test";
  const response = await request(app)
    .get("/")
    .set("X-Request-Id", customId);

  assert.equal(response.headers["x-request-id"], customId);
  assert.equal(response.body.requestId, customId);
});

test("Error Handling - 404 handler returns standardized envelope", async () => {
  const response = await request(app).get("/api/v1/non-existent-route-404");

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.ok(response.body.message.includes("Route not found"));
  assert.ok(response.headers["x-request-id"]);
});

test("Proxy Trust - Safely processes X-Forwarded-For headers from reverse proxy without rate limit crash", async () => {
  const response = await request(app)
    .get("/api/v1/health/liveness")
    .set("X-Forwarded-For", "203.0.113.195, 10.0.0.1");

  assert.equal(response.status, 200);
  assert.equal(response.body.status, "alive");
});

