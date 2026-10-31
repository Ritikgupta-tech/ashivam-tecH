import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import { generateAccessToken } from "../src/utils/jwt.js";
import { sanitizeCsvCell, toCsv } from "../src/utils/csv.js";

let testSuperadminToken = null;
let testSuperadminId = null;
const TEST_ADMIN_USER = `csv-dash-${Date.now()}`;
const TEST_ADMIN_PASS = "CsvDashPass2026!#$";

before(async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 3000 });
    }
    const passwordHash = await bcrypt.hash(TEST_ADMIN_PASS, 10);
    const superadmin = await Admin.create({
      username: TEST_ADMIN_USER,
      name: "CSV and Dashboard Superadmin",
      email: "csv.dash@ashivamtechnologies.com",
      passwordHash,
      role: "Superadmin",
      permissions: [
        "dashboard",
        "admins",
        "users",
        "content",
        "settings",
        "inquiries",
        "careers",
        "media",
        "employees",
        "audit",
        "notifications",
      ],
      isActive: true,
    });
    testSuperadminId = superadmin._id.toString();
    testSuperadminToken = generateAccessToken(superadmin);
  } catch (err) {
    const mockAdmin = {
      _id: new mongoose.Types.ObjectId(),
      username: TEST_ADMIN_USER,
      role: "Superadmin",
      permissions: [
        "dashboard",
        "inquiries",
        "careers",
        "audit",
      ],
    };
    testSuperadminToken = generateAccessToken(mockAdmin);
  }
});

after(async () => {
  try {
    if (testSuperadminId) {
      await Admin.findByIdAndDelete(testSuperadminId);
    }
  } catch {
    // cleanup fallback
  } finally {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  }
});

/* -------------------------------------------------------------
 * 1. CSV Formula Injection Defense Unit Tests
 * ----------------------------------------------------------- */
test("CSV Sanitization: neutralizes formula injection prefixes (=, +, -, @, \\t, \\r)", () => {
  assert.equal(sanitizeCsvCell("=SUM(A1:A10)"), "'=SUM(A1:A10)");
  assert.equal(sanitizeCsvCell("+1+1"), "'+1+1");
  assert.equal(sanitizeCsvCell("-5"), "'-5");
  assert.equal(sanitizeCsvCell("@SUM(A1:A10)"), "'@SUM(A1:A10)");
  assert.equal(sanitizeCsvCell("\tEvilTab"), "'\tEvilTab");
  assert.equal(sanitizeCsvCell("\rEvilCR"), '"\'\rEvilCR"');

  // Formula injection with DDE command payload
  assert.equal(
    sanitizeCsvCell("=cmd|' /C calc'!A0"),
    "'=cmd|' /C calc'!A0"
  );
});

test("CSV Sanitization: properly handles quotes, delimiters, newlines, and primitives", () => {
  // Empty or null values
  assert.equal(sanitizeCsvCell(null), "");
  assert.equal(sanitizeCsvCell(undefined), "");
  assert.equal(sanitizeCsvCell(""), "");

  // Numbers
  assert.equal(sanitizeCsvCell(42), "42");
  assert.equal(sanitizeCsvCell(0), "0");

  // Strings containing commas, quotes, or newlines
  assert.equal(sanitizeCsvCell('Hello, "World"'), '"Hello, ""World"""');
  assert.equal(sanitizeCsvCell("Line1\nLine2"), '"Line1\nLine2"');

  // Normal safe strings
  assert.equal(sanitizeCsvCell("Ashivam Technologies"), "Ashivam Technologies");
});

test("CSV Serialization: toCsv formats headers and rows safely", () => {
  const columns = [
    { key: "id", label: "ID" },
    { key: "name", label: "Client Name" },
    { key: "notes", label: "Notes", transform: (r) => r.notes || "None" },
  ];

  const rows = [
    { id: 1, name: "Alice", notes: "=DDE(calc)" },
    { id: 2, name: 'Bob, "Special" Smith', notes: null },
  ];

  const csv = toCsv(rows, columns);
  const lines = csv.split("\r\n");

  assert.equal(lines.length, 3);
  assert.equal(lines[0], "ID,Client Name,Notes");
  assert.equal(lines[1], "1,Alice,'=DDE(calc)");
  assert.equal(lines[2], '2,"Bob, ""Special"" Smith",None');
});

/* -------------------------------------------------------------
 * 2. Authenticated CSV Export Endpoints
 * ----------------------------------------------------------- */
test("CSV Export: GET /api/v1/inquiries/export requires authentication", async () => {
  const res = await request(app).get("/api/v1/inquiries/export");
  assert.equal(res.status, 401);
});

test("CSV Export: GET /api/v1/inquiries/export streams CSV for authenticated admin", async () => {
  const res = await request(app)
    .get("/api/v1/inquiries/export")
    .set("Authorization", `Bearer ${testSuperadminToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.headers["content-type"].includes("text/csv"));
  assert.ok(res.headers["content-disposition"].includes("inquiries_export.csv"));
  assert.ok(res.text.includes("Reference,Date,Name,Email,Phone"));
});

test("CSV Export: GET /api/v1/career/admin/applications/export requires authentication", async () => {
  const res = await request(app).get("/api/v1/career/admin/applications/export");
  assert.equal(res.status, 401);
});

test("CSV Export: GET /api/v1/career/admin/applications/export streams CSV for authenticated admin", async () => {
  const res = await request(app)
    .get("/api/v1/career/admin/applications/export")
    .set("Authorization", `Bearer ${testSuperadminToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.headers["content-type"].includes("text/csv"));
  assert.ok(res.headers["content-disposition"].includes("job_applications_export.csv"));
  assert.ok(res.text.includes("Reference,Date,Candidate Name,Email"));
});

test("CSV Export: GET /api/v1/audit/export requires authentication", async () => {
  const res = await request(app).get("/api/v1/audit/export");
  assert.equal(res.status, 401);
});

test("CSV Export: GET /api/v1/audit/export streams CSV for authenticated admin", async () => {
  const res = await request(app)
    .get("/api/v1/audit/export")
    .set("Authorization", `Bearer ${testSuperadminToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.headers["content-type"].includes("text/csv"));
  assert.ok(res.headers["content-disposition"].includes("security_audit_export.csv"));
  assert.ok(res.text.includes("Timestamp (ISO),Action,Entity,Actor Username"));
});

test("CSV Export: GET /api/v1/employees/export requires authentication", async () => {
  const res = await request(app).get("/api/v1/employees/export");
  assert.equal(res.status, 401);
});

test("CSV Export: GET /api/v1/employees/export streams CSV for authenticated admin", async () => {
  const res = await request(app)
    .get("/api/v1/employees/export")
    .set("Authorization", `Bearer ${testSuperadminToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.headers["content-type"].includes("text/csv"));
  assert.ok(res.headers["content-disposition"].includes("ashivam_employees_export.csv"));
  assert.ok(res.text.includes("Employee ID,Full Name,Email,Phone,Department,Designation"));
});

test("CSV Export: GET /api/v1/hr-documents/export requires authentication", async () => {
  const res = await request(app).get("/api/v1/hr-documents/export");
  assert.equal(res.status, 401);
});

test("CSV Export: GET /api/v1/hr-documents/export streams CSV for authenticated admin", async () => {
  const res = await request(app)
    .get("/api/v1/hr-documents/export")
    .set("Authorization", `Bearer ${testSuperadminToken}`);

  assert.equal(res.status, 200);
  assert.ok(res.headers["content-type"].includes("text/csv"));
  assert.ok(res.headers["content-disposition"].includes("ashivam_hr_documents_export.csv"));
  assert.ok(res.text.includes("Document ID,Employee Name,Employee Email,Department,Document Type"));
});

/* -------------------------------------------------------------
 * 3. Dashboard Overview Time-Range Filtering
 * ----------------------------------------------------------- */
test("Dashboard: GET /api/v1/dashboard/overview supports range=7d", async () => {
  const res = await request(app)
    .get("/api/v1/dashboard/overview?range=7d")
    .set("Authorization", `Bearer ${testSuperadminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.timeRange, "7d");
  assert.ok(res.body.data.dateRange);
  assert.ok(res.body.data.dateRange.start);
  assert.ok(res.body.data.dateRange.end);
});

test("Dashboard: GET /api/v1/dashboard/overview supports range=30d", async () => {
  const res = await request(app)
    .get("/api/v1/dashboard/overview?range=30d")
    .set("Authorization", `Bearer ${testSuperadminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.timeRange, "30d");
  assert.ok(res.body.data.dateRange);
});

test("Dashboard: GET /api/v1/dashboard/overview supports range=90d", async () => {
  const res = await request(app)
    .get("/api/v1/dashboard/overview?range=90d")
    .set("Authorization", `Bearer ${testSuperadminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.timeRange, "90d");
  assert.ok(res.body.data.dateRange);
});

test("Dashboard: GET /api/v1/dashboard/overview defaults to all time when range=all", async () => {
  const res = await request(app)
    .get("/api/v1/dashboard/overview?range=all")
    .set("Authorization", `Bearer ${testSuperadminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.timeRange, "all");
  assert.equal(res.body.data.dateRange, null);
});

test("Dashboard: GET /api/v1/dashboard/summary supports range parameter", async () => {
  const res = await request(app)
    .get("/api/v1/dashboard/summary?range=7d")
    .set("Authorization", `Bearer ${testSuperadminToken}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.data.summary);
  assert.equal(res.body.data.summary.timeRange, "7d");
});
