import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";

test("Career API - POST /api/v1/career/jobs/:jobId/apply rejects missing application body", async () => {
  const response = await request(app)
    .post("/api/v1/career/jobs/507f1f77bcf86cd799439011/apply")
    .send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Validation failed");
  assert.ok(response.body.errors);
});

test("Career API - Upload filter rejects disallowed file extensions (.sh)", async () => {
  const response = await request(app)
    .post("/api/v1/career/jobs/507f1f77bcf86cd799439011/apply")
    .field("firstName", "Jane")
    .field("lastName", "Doe")
    .field("email", "jane@example.com")
    .field("phone", "+1234567890")
    .attach("resume", Buffer.from("echo 'malicious shell'"), "exploit.sh");

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.ok(response.body.message.includes("resumes are allowed"));
});
