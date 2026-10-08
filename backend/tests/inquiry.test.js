import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { validateCreateInquiry } from "../src/modules/inquiry/inquiry.validator.js";

test("Inquiry Validator - Unit tests for input validation", () => {
  // Empty payload
  const emptyValidation = validateCreateInquiry({});
  assert.equal(emptyValidation.isValid, false);
  assert.ok(emptyValidation.errors.name);
  assert.ok(emptyValidation.errors.email);
  assert.ok(emptyValidation.errors.message);

  // Invalid email
  const badEmailValidation = validateCreateInquiry({
    name: "John Doe",
    email: "not-an-email",
    message: "This is a legitimate message longer than 10 characters",
  });
  assert.equal(badEmailValidation.isValid, false);
  assert.equal(
    badEmailValidation.errors.email,
    "Please provide a valid email address"
  );

  // Message too short
  const shortMsgValidation = validateCreateInquiry({
    name: "John Doe",
    email: "john@example.com",
    message: "Too short",
  });
  assert.equal(shortMsgValidation.isValid, false);
  assert.ok(shortMsgValidation.errors.message);

  // Valid inquiry
  const valid = validateCreateInquiry({
    name: "John Doe",
    email: "john@example.com",
    subject: "Project Consultation",
    message: "We need custom software development for our enterprise.",
  });
  assert.equal(valid.isValid, true);
  assert.equal(valid.data.name, "John Doe");
  assert.equal(valid.data.email, "john@example.com");
});

test("Inquiry API - POST /api/v1/inquiries rejects invalid payload with 400 and structured errors", async () => {
  const response = await request(app)
    .post("/api/v1/inquiries")
    .send({
      name: "A", // too short
      email: "invalid-email-address",
      message: "short", // too short
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Validation failed");
  assert.ok(response.body.errors);
  assert.ok(response.body.errors.name);
  assert.ok(response.body.errors.email);
  assert.ok(response.body.errors.message);
});

test("Inquiry API - Rejects NoSQL injection attempts in inquiry body", async () => {
  const response = await request(app)
    .post("/api/v1/inquiries")
    .send({
      name: { $gt: "" },
      email: { $ne: null },
      message: { $exists: true },
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Validation failed");
});
