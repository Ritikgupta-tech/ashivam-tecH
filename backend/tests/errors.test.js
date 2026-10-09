import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import {
  scrubSensitivePatterns,
  errorHandler,
  notFoundHandler,
} from "../src/middlewares/error.middleware.js";
import { requestIdMiddleware } from "../src/middlewares/requestId.middleware.js";
import {
  sanitizeLogString,
  redactSensitiveData,
} from "../src/utils/logger.js";

test("Error Normalization - Malformed JSON payload returns 400 with standard envelope", async () => {
  const response = await request(app)
    .post("/api/v1/inquiries")
    .set("Content-Type", "application/json")
    .send('{"name": "Unterminated JSON');

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Malformed JSON payload in request body");
  assert.equal(response.body.errors?.body, "Invalid JSON format");
  assert.ok(response.body.requestId);
  assert.ok(response.headers["x-request-id"]);
});

test("Error Normalization - Malformed URI parameter returns 400 with standard envelope", async () => {
  const response = await request(app).get("/api/v1/inquiries/%E0%A4%A");

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Malformed URI in request path or query");
  assert.equal(response.body.errors?.uri, "Failed to decode URI parameters");
  assert.ok(response.body.requestId);
});

test("Error Normalization - Oversized request payload returns 413", async () => {
  const hugeString = "x".repeat(1024 * 1024 + 1024); // > 1MB
  const response = await request(app)
    .post("/api/v1/inquiries")
    .set("Content-Type", "application/json")
    .send(JSON.stringify({ huge: hugeString }));

  assert.equal(response.status, 413);
  assert.equal(response.body.success, false);
  assert.ok(response.body.message.includes("Payload too large"));
  assert.ok(response.body.requestId);
});

test("Error Normalization - 404 unmatched route returns standard envelope", async () => {
  const response = await request(app).get("/api/v1/non-existent-endpoint-xyz");

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.ok(response.body.message.includes("Route not found: GET /api/v1/non-existent-endpoint-xyz"));
  assert.deepEqual(response.body.errors, {});
  assert.ok(response.body.requestId);
  assert.ok(response.headers["x-request-id"]);
});

test("Error Normalization - Private upload route returns 404 with standard envelope", async () => {
  const response = await request(app).get("/uploads/resumes/candidate-resume.pdf");

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Resource not found");
  assert.deepEqual(response.body.errors, {});
  assert.ok(response.body.requestId);
});

test("Error Normalization - Unauthenticated protected admin route returns 401 standard envelope", async () => {
  const response = await request(app).get("/api/v1/career/admin/applications");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, "Authentication required");
  assert.deepEqual(response.body.errors, {});
  assert.ok(response.body.requestId);
});

test("Production Response Safety - Sensitive patterns are scrubbed from error messages", () => {
  const dbUriMsg = "Connection failed to mongodb://admin:pass123@cluster0.net:27017/ashivam_technologies";
  const scrubbedDb = scrubSensitivePatterns(dbUriMsg);
  assert.ok(!scrubbedDb.includes("admin:pass123"));
  assert.ok(scrubbedDb.includes("[REDACTED_URI]"));

  const pathMsgWin = "File not found at C:\\Users\\DELL\\Desktop\\Official-Website-main\\backend\\secret.key";
  const scrubbedWin = scrubSensitivePatterns(pathMsgWin);
  assert.ok(!scrubbedWin.includes("C:\\Users\\DELL"));
  assert.ok(scrubbedWin.includes("[REDACTED_PATH]"));

  const pathMsgLinux = "Failed opening /var/app/backend/secrets.json";
  const scrubbedLinux = scrubSensitivePatterns(pathMsgLinux);
  assert.ok(!scrubbedLinux.includes("/var/app/backend"));
  assert.ok(scrubbedLinux.includes("[REDACTED_PATH]"));

  const tokenMsg = "Auth error for token Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secret";
  const scrubbedToken = scrubSensitivePatterns(tokenMsg);
  assert.ok(!scrubbedToken.includes("eyJhbGciOiJIUzI1Ni"));
  assert.ok(scrubbedToken.includes("[REDACTED_TOKEN]"));
});

test("Production Response Safety - 500 error in simulated production redacts stack and message", () => {
  let capturedStatus = null;
  let capturedBody = null;

  const mockRes = {
    status(code) {
      capturedStatus = code;
      return this;
    },
    json(body) {
      capturedBody = body;
      return this;
    },
  };

  const mockReq = {
    id: "req-test-123",
    method: "GET",
    originalUrl: "/test",
  };

  const internalError = new Error("Database query failed: Syntax error in Mongo internal engine");
  internalError.stack = "Error: Database query failed\n  at internalEngine (C:\\Users\\DELL\\secret.js:10:5)";

  // Execute errorHandler under simulated production check
  errorHandler(internalError, mockReq, mockRes, () => {});

  assert.equal(capturedStatus, 500);
  assert.equal(capturedBody.success, false);
  assert.equal(capturedBody.requestId, "req-test-123");
  assert.deepEqual(capturedBody.errors, {});
});

test("Request Correlation - Sanitizes and rejects malicious or invalid X-Request-Id header", async () => {
  // 1. Valid X-Request-Id is preserved
  const validId = "safe-trace-id-123_456.789";
  const res1 = await request(app).get("/api/v1/health/liveness").set("X-Request-Id", validId);
  assert.equal(res1.headers["x-request-id"], validId);
  assert.equal(res1.body.requestId, validId);

  // 2. Malicious characters (script tags, symbols) rejected and replaced by safe UUID
  const invalidId = "<script>alert(1)</script>";
  const res2 = await request(app).get("/api/v1/health/liveness").set("X-Request-Id", invalidId);
  assert.notEqual(res2.headers["x-request-id"], invalidId);
  assert.match(res2.headers["x-request-id"], /^[0-9a-f-]{36}$/);

  // 3. Oversized X-Request-Id (> 64 chars) is replaced by safe UUID
  const longId = "a".repeat(100);
  const res3 = await request(app).get("/api/v1/health/liveness").set("X-Request-Id", longId);
  assert.notEqual(res3.headers["x-request-id"], longId);
  assert.match(res3.headers["x-request-id"], /^[0-9a-f-]{36}$/);

  // 4. Direct middleware unit test for CRLF injection neutralization
  const mockReq = { headers: { "x-request-id": "injected\r\nSet-Cookie: evil=1\r\n" } };
  const mockRes = {
    headers: {},
    setHeader(name, val) { this.headers[name] = val; },
  };
  requestIdMiddleware(mockReq, mockRes, () => {});
  assert.notEqual(mockReq.id, "injected\r\nSet-Cookie: evil=1\r\n");
  assert.match(mockReq.id, /^[0-9a-f-]{36}$/);
  assert.match(mockRes.headers["X-Request-Id"], /^[0-9a-f-]{36}$/);
});

test("Logging Utilities - sanitizeLogString neutralizes CRLF and control chars", () => {
  assert.equal(sanitizeLogString(null), "");
  assert.equal(sanitizeLogString(undefined), "");
  assert.equal(
    sanitizeLogString("GET /api/v1/test\r\nCRLF-Injection: true\n"),
    "GET /api/v1/test CRLF-Injection: true"
  );
  assert.equal(
    sanitizeLogString("Multiple   \t\t spaces   and \r tabs"),
    "Multiple spaces and tabs"
  );

  const longStr = "x".repeat(600);
  assert.equal(sanitizeLogString(longStr).length, 500);
});

test("Logging Utilities - redactSensitiveData masks sensitive fields and keys", () => {
  const payload = {
    username: "admin",
    password: "SuperSecretPassword123!",
    currentPassword: "OldPassword!",
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.secret",
    apiKey: "secret-api-key-999",
    safeData: "hello",
    nested: {
      smtpPassword: "smtp-secret-pass",
      user: "john",
    },
  };

  const redacted = redactSensitiveData(payload);
  assert.equal(redacted.username, "admin");
  assert.equal(redacted.password, "[REDACTED]");
  assert.equal(redacted.currentPassword, "[REDACTED]");
  assert.equal(redacted.token, "[REDACTED]");
  assert.equal(redacted.apiKey, "[REDACTED]");
  assert.equal(redacted.safeData, "hello");
  assert.equal(redacted.nested.smtpPassword, "[REDACTED]");
  assert.equal(redacted.nested.user, "john");
});
