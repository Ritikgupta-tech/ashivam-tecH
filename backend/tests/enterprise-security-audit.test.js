import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import { generateAccessToken, verifyAccessToken } from "../src/utils/jwt.js";
import { validateMediaFile } from "../src/modules/media/media.validator.js";
import { sanitizeDownloadFilename, getFileStream } from "../src/services/storage.service.js";

let testSuperadminToken = null;
let testSuperadminId = null;
const AUDIT_ADMIN_USER = `sec-audit-${Date.now()}`;
const AUDIT_ADMIN_PASS = "SecAuditPassword2026!#$";

before(async () => {
  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 3000 });
    const passwordHash = await bcrypt.hash(AUDIT_ADMIN_PASS, 10);
    const superadmin = await Admin.create({
      username: AUDIT_ADMIN_USER,
      name: "Security Audit Superadmin",
      email: "sec.audit@ashivamtechnologies.com",
      passwordHash,
      role: "Superadmin",
      permissions: [
        "dashboard", "admins", "users", "content", "settings",
        "inquiries", "careers", "media", "employees", "audit", "notifications"
      ],
      isActive: true,
    });
    testSuperadminId = superadmin._id.toString();
    testSuperadminToken = generateAccessToken(superadmin);
  } catch (err) {
    // If MongoDB is offline, fallback token with synthetic id
    const mockAdmin = {
      _id: new mongoose.Types.ObjectId(),
      username: AUDIT_ADMIN_USER,
      role: "Superadmin",
    };
    testSuperadminToken = generateAccessToken(mockAdmin);
  }
});

after(async () => {
  try {
    if (testSuperadminId) {
      await Admin.deleteOne({ _id: testSuperadminId });
    }
  } catch {
    // Ignore cleanup error
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
});

// 1. JWT Security & Algorithm Confusion Protection
test("Security - JWT rejects tokens with algorithm 'none'", () => {
  const forgedToken = jwt.sign(
    { sub: "fake-admin", username: "hacker", role: "Superadmin" },
    "",
    { algorithm: "none" }
  );

  assert.throws(
    () => verifyAccessToken(forgedToken),
    /invalid algorithm|jwt/i,
    "verifyAccessToken must reject tokens created with algorithm 'none'"
  );
});

test("Security - JWT rejects tokens signed with wrong secret key", () => {
  const wrongSecretToken = jwt.sign(
    { sub: "fake-admin", username: "hacker", role: "Superadmin" },
    "wrong-secret-key-that-does-not-match-env-key-32chars",
    { algorithm: "HS256" }
  );

  assert.throws(
    () => verifyAccessToken(wrongSecretToken),
    /invalid signature/i,
    "verifyAccessToken must reject tokens signed with incorrect secret"
  );
});

test("Security - JWT rejects modified payload tampering", () => {
  const validToken = generateAccessToken({
    _id: new mongoose.Types.ObjectId(),
    username: "test",
    role: "Admin",
  });

  const parts = validToken.split(".");
  const tamperedPayload = Buffer.from(
    JSON.stringify({ sub: "hacked", role: "Superadmin" })
  ).toString("base64url");
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

  assert.throws(
    () => verifyAccessToken(tamperedToken),
    /invalid signature/i,
    "verifyAccessToken must reject payload tampering"
  );
});

test("Security - JWT rejects expired access tokens", () => {
  const expiredToken = jwt.sign(
    { sub: "expired-admin", username: "expired", role: "Admin" },
    env.jwtSecret,
    { algorithm: "HS256", expiresIn: "-1s" }
  );

  assert.throws(
    () => verifyAccessToken(expiredToken),
    /jwt expired/i,
    "verifyAccessToken must reject expired tokens"
  );
});

test("Security - JWT rejects malformed token strings", () => {
  const malformedTokens = [
    "not.a.valid.token",
    "Bearer token123",
    "eyJhbGciOiJIUzI1NiJ9.invalid.signature",
    "---",
    "",
  ];

  for (const t of malformedTokens) {
    assert.throws(
      () => verifyAccessToken(t),
      (err) => err instanceof jwt.JsonWebTokenError,
      `verifyAccessToken must reject malformed token: ${t}`
    );
  }
});

// 2. SVG Stored XSS & XXE Mitigation in Media Uploads
test("Security - Media Validator rejects SVG files containing embedded <script>", () => {
  const maliciousSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(document.cookie)</script><circle cx="50" cy="50" r="40"/></svg>'
  );

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: maliciousSvg.length,
        buffer: maliciousSvg,
      });
    },
    (err) => {
      return err.statusCode === 400 && err.message.includes("executable scripts");
    },
    "validateMediaFile must reject SVGs containing <script> tags"
  );
});

test("Security - Media Validator rejects SVG files with active event handlers (onload, onerror)", () => {
  const maliciousOnloadSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" onload="fetch(\'https://attacker.com\')"><rect width="100" height="100"/></svg>'
  );

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: maliciousOnloadSvg.length,
        buffer: maliciousOnloadSvg,
      });
    },
    (err) => {
      return err.statusCode === 400 && err.message.includes("active event handlers");
    },
    "validateMediaFile must reject SVGs containing onload handlers"
  );
});

test("Security - Media Validator rejects SVG files with onmouseover event handler bypass attempt", () => {
  const mouseoverSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" onmouseover="alert(\'XSS\')"><rect width="100" height="100"/></svg>'
  );

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: mouseoverSvg.length,
        buffer: mouseoverSvg,
      });
    },
    (err) => {
      return err.statusCode === 400 && err.message.includes("active event handlers");
    },
    "validateMediaFile must reject SVGs containing onmouseover handlers"
  );
});

test("Security - Media Validator rejects SVG with entity-encoded javascript: protocol bypass attempt", () => {
  const entitySvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><a href="jav&#x61;script:alert(1)"><text y="20">Click</text></a></svg>'
  );

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: entitySvg.length,
        buffer: entitySvg,
      });
    },
    (err) => {
      return err.statusCode === 400 && err.message.includes("executable scripts");
    },
    "validateMediaFile must reject entity-encoded javascript: protocols"
  );
});

test("Security - Media Validator rejects SVG with newline-separated javascript: protocol", () => {
  const newlineSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><a href="java\nscript:alert(1)"><text y="20">Click</text></a></svg>'
  );

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: newlineSvg.length,
        buffer: newlineSvg,
      });
    },
    (err) => {
      return err.statusCode === 400 && err.message.includes("executable scripts");
    },
    "validateMediaFile must reject newline-split javascript: protocols"
  );
});

test("Security - Media Validator rejects SVG with XML DOCTYPE & external entity (XXE)", () => {
  const xxeSvg = Buffer.from(
    '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg><text>&xxe;</text></svg>'
  );

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: xxeSvg.length,
        buffer: xxeSvg,
      });
    },
    (err) => {
      return err.statusCode === 400 && err.message.includes("XML DTD");
    },
    "validateMediaFile must reject XML DOCTYPE and external entity declarations"
  );
});

test("Security - Media Validator rejects SVG with dangerous tags (<iframe, <animate, <object)", () => {
  const iframeSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><iframe src="https://evil.com"></iframe></svg>'
  );

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: iframeSvg.length,
        buffer: iframeSvg,
      });
    },
    (err) => {
      return err.statusCode === 400 && err.message.includes("executable scripts or active event handlers");
    },
    "validateMediaFile must reject SVG containing <iframe> tags"
  );
});

test("Security - Media Validator rejects SVG with slash delimiter event handler (<svg/onload=)", () => {
  const slashOnloadSvg = Buffer.from('<svg/onload=alert(1)><rect/></svg>');

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: slashOnloadSvg.length,
        buffer: slashOnloadSvg,
      });
    },
    (err) => err.statusCode === 400 && err.message.includes("active event handlers"),
    "validateMediaFile must reject slash-delimited event handlers"
  );
});

test("Security - Media Validator rejects SVG with slash delimiter tag (<script/x>)", () => {
  const slashScriptSvg = Buffer.from('<svg><script/x>alert(1)</script></svg>');

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: slashScriptSvg.length,
        buffer: slashScriptSvg,
      });
    },
    (err) => err.statusCode === 400 && err.message.includes("executable scripts"),
    "validateMediaFile must reject slash-delimited script tags"
  );
});

test("Security - Media Validator rejects SVG with namespaced script tag (<xhtml:script>)", () => {
  const namespacedSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:html="http://www.w3.org/1999/xhtml"><html:script>alert(1)</html:script></svg>'
  );

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: namespacedSvg.length,
        buffer: namespacedSvg,
      });
    },
    (err) => err.statusCode === 400 && err.message.includes("executable scripts"),
    "validateMediaFile must reject namespaced script tags"
  );
});

test("Security - Media Validator rejects SVG with xml-stylesheet processing instruction", () => {
  const xmlStylesheetSvg = Buffer.from(
    '<?xml version="1.0"?><?xml-stylesheet href="http://evil.com/xss.xsl"?><svg><text>Hi</text></svg>'
  );

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: xmlStylesheetSvg.length,
        buffer: xmlStylesheetSvg,
      });
    },
    (err) => err.statusCode === 400 && err.message.includes("xml-stylesheet instructions"),
    "validateMediaFile must reject xml-stylesheet processing instructions"
  );
});

test("Security - Media Validator rejects SVG with CSS @import and remote url() references", () => {
  const cssLeakSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url("http://evil.com/leak.css");</style><rect width="10" height="10"/></svg>'
  );

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: cssLeakSvg.length,
        buffer: cssLeakSvg,
      });
    },
    (err) => err.statusCode === 400 && err.message.includes("external stylesheets"),
    "validateMediaFile must reject CSS @import"
  );
});

test("Security - Media Validator rejects SVG with executable data URI (data:application/xhtml+xml)", () => {
  const dataUriSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><a href="data:application/xhtml+xml;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="><text>Click</text></a></svg>'
  );

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/svg+xml",
        size: dataUriSvg.length,
        buffer: dataUriSvg,
      });
    },
    (err) => err.statusCode === 400 && err.message.includes("executable scripts"),
    "validateMediaFile must reject executable data URIs"
  );
});

test("Security - Media Validator rejects disguised SVG uploaded with image/png MIME type", () => {
  const disguisedSvg = Buffer.from('<svg onload="alert(1)"><circle r="5"/></svg>');

  assert.throws(
    () => {
      validateMediaFile({
        mimetype: "image/png",
        originalname: "avatar.png",
        size: disguisedSvg.length,
        buffer: disguisedSvg,
      });
    },
    (err) => err.statusCode === 400 && err.message.includes("executable scripts"),
    "validateMediaFile must detect and reject disguised SVG content in other MIME types"
  );
});

test("Security - Media Validator accepts benign SVG with local gradient references (url(#id))", () => {
  const benignGradientSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="brandGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#D4AF37"/>
          <stop offset="100%" stop-color="#AA771C"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#brandGold)"/>
    </svg>`
  );

  const result = validateMediaFile({
    mimetype: "image/svg+xml",
    size: benignGradientSvg.length,
    buffer: benignGradientSvg,
  });

  assert.equal(result, true, "Benign SVG with local gradient URL must pass validation");
});

test("Security - Media Validator accepts valid non-SVG formats (JPEG, PNG, WEBP, PDF)", () => {
  const sampleBuffer = Buffer.from("ValidBinaryFileContentPlaceholder");
  const formats = [
    { mimetype: "image/jpeg", originalname: "photo.jpg" },
    { mimetype: "image/png", originalname: "logo.png" },
    { mimetype: "image/webp", originalname: "graphic.webp" },
    { mimetype: "application/pdf", originalname: "document.pdf" },
  ];

  for (const fmt of formats) {
    const res = validateMediaFile({
      mimetype: fmt.mimetype,
      originalname: fmt.originalname,
      size: sampleBuffer.length,
      buffer: sampleBuffer,
    });
    assert.equal(res, true, `Non-SVG format ${fmt.mimetype} must pass validation`);
  }
});

// 3. Static Media Headers & CSP Isolation
test("Security - Public static uploads set X-Content-Type-Options: nosniff", async () => {
  const res = await request(app).get("/uploads/media/non-existent-test.png");
  // Even on 404 for missing static file, helmet headers are present
  assert.equal(res.headers["x-content-type-options"], "nosniff");
});

test("Security - Static media endpoint serves fortified CSP headers for SVG assets", async () => {
  const fs = await import("fs/promises");
  const path = await import("path");
  const uploadsMediaDir = path.resolve(process.cwd(), "uploads", "media");
  await fs.mkdir(uploadsMediaDir, { recursive: true });

  const testSvgFilename = `test-csp-probe-${Date.now()}.svg`;
  const testSvgPath = path.join(uploadsMediaDir, testSvgFilename);
  const safeSvgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="blue"/></svg>';

  await fs.writeFile(testSvgPath, safeSvgContent, "utf8");

  try {
    const res = await request(app).get(`/uploads/media/${testSvgFilename}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
    assert.ok(
      res.headers["content-security-policy"]?.includes("default-src 'none'"),
      "CSP header must contain default-src 'none'"
    );
    assert.ok(
      res.headers["content-security-policy"]?.includes("sandbox"),
      "CSP header must contain sandbox directive"
    );
  } finally {
    await fs.unlink(testSvgPath).catch(() => {});
  }
});

// 4. NoSQL Injection & Input Fuzzing Defense
test("Security - POST /api/v1/auth/login rejects NoSQL injection object payload safely", async () => {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({
      username: { "$gt": "" },
      password: { "$ne": null },
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Username and password are required");
  assert.ok(res.body.requestId);
});

test("Security - POST /api/v1/inquiries rejects NoSQL injection objects in all form fields", async () => {
  const res = await request(app)
    .post("/api/v1/inquiries")
    .send({
      name: { "$regex": ".*" },
      email: { "$ne": "valid@email.com" },
      service: { "$gt": "" },
      message: { "$where": "sleep(5000)" },
    });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Validation failed");
  assert.ok(res.body.errors);
  assert.ok(res.body.requestId);
});

// 5. Honeypot Bot Trap Defenses
test("Security - POST /api/v1/internships honeypot bot trap silently swallows submissions", async () => {
  const res = await request(app)
    .post("/api/v1/internships")
    .send({
      fullName: "Spam Bot",
      email: "spambot@spam.com",
      phone: "+91 9999999999",
      domain: "web-development",
      college: "Spam University",
      yearOfStudy: "3rd",
      statementOfPurpose: "Spam statement",
      website: "http://spam-link.com", // Hidden honeypot field filled by bot
    });

  // Returns 201 success to deny feedback signal to bots, while storing nothing
  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, "Internship application submitted successfully");
});

// 6. Path Traversal Neutralization in File Storage
test("Security - Storage Service sanitizes filenames against path traversal", () => {
  const dangerousNames = [
    "../../etc/passwd",
    "..\\..\\windows\\system32\\cmd.exe",
    "foo/bar/../../../secret.txt",
    "resume.pdf\0.exe",
    "test/../../../etc/shadow",
  ];

  for (const name of dangerousNames) {
    const safe = sanitizeDownloadFilename(name);
    assert.ok(!safe.includes(".."), `Sanitized name should not contain directory traversal: ${safe}`);
    assert.ok(!safe.includes("/"), `Sanitized name should not contain forward slashes: ${safe}`);
    assert.ok(!safe.includes("\\"), `Sanitized name should not contain backslashes: ${safe}`);
    assert.ok(!safe.includes("\0"), `Sanitized name should not contain null bytes: ${safe}`);
    assert.ok(safe.endsWith(".pdf") || safe.endsWith(".doc") || safe.endsWith(".docx"));
  }
});

// 7. Error Handling Envelope Consistency
test("API Envelope - Standard envelope contract { success, message, errors, requestId } on 400 validation error", async () => {
  const res = await request(app)
    .post("/api/v1/inquiries")
    .send({ name: "" });

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(typeof res.body.message, "string");
  assert.equal(typeof res.body.errors, "object");
  assert.ok(res.body.requestId, "Response must include requestId");
});

test("API Envelope - Standard envelope contract on 401 unauthenticated request", async () => {
  const res = await request(app).get("/api/v1/admin/dashboard");

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.equal(typeof res.body.message, "string");
  assert.equal(typeof res.body.errors, "object");
  assert.ok(res.body.requestId, "Response must include requestId");
});

test("API Envelope - Standard envelope contract on 404 route not found", async () => {
  const res = await request(app).get("/api/v1/non-existent-endpoint-path");

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(typeof res.body.message, "string");
  assert.equal(typeof res.body.errors, "object");
  assert.ok(res.body.requestId, "Response must include requestId");
});

// 8. CORS Preflight & Policy
test("Security - CORS preflight OPTIONS returns allowed methods and credentials", async () => {
  const res = await request(app)
    .options("/api/v1/inquiries")
    .set("Origin", "https://ashivam-tec-h.vercel.app")
    .set("Access-Control-Request-Method", "POST");

  assert.ok([200, 204].includes(res.status));
  assert.equal(res.headers["access-control-allow-origin"], "https://ashivam-tec-h.vercel.app");
  assert.equal(res.headers["access-control-allow-credentials"], "true");
});

// 9. Employee Creation Validation Errors Populated
test("Security - Employee creation validation errors are populated in response envelope", async () => {
  const res = await request(app)
    .post("/api/v1/employees")
    .set("Authorization", `Bearer ${testSuperadminToken}`)
    .send({}); // Empty body

  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Validation failed");
  assert.equal(typeof res.body.errors, "object");
  assert.ok(Object.keys(res.body.errors).length > 0, "Validation errors must be populated in envelope");
  assert.ok(res.body.requestId, "Response must include requestId");
});
