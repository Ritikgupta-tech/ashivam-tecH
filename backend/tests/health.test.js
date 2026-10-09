import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";

test("API Root & Discovery - GET / and /api/v1 return 200 with API info and X-Request-Id header", async () => {
  for (const endpoint of ["/", "/api/v1", "/api/v1/"]) {
    const response = await request(app).get(endpoint);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, "Ashivam Technologies Official API");
    assert.equal(response.body.status, "operational");
    assert.ok(response.body.endpoints?.health);
    assert.ok(response.headers["x-request-id"], "Should return X-Request-Id header");
  }
});

test("Health Probe - GET /api/v1/health/liveness returns 200 alive", async () => {
  const response = await request(app).get("/api/v1/health/liveness");

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.status, "alive");
});

test("Health Probe - GET /api/v1/health returns health status payload", async () => {
  const response = await request(app).get("/api/v1/health");

  assert.ok([200, 503].includes(response.status));
  assert.equal(response.body.service, "ashivam-website-backend");
  assert.ok(response.body.timestamp);
});
