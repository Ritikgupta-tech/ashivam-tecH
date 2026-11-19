import mongoose from "mongoose";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../src/app.js";
import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import Employee from "../src/modules/employee/employee.model.js";
import { generateAccessToken } from "../src/utils/jwt.js";

const RUN_ID = Date.now();

async function runBenchmarks() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongodbUri);
  }

  // Setup test users
  const adminPassHash = await bcrypt.hash("AdminBenchPass!2026", 10);
  const testAdmin = await Admin.create({
    username: `bench_admin_${RUN_ID}`,
    name: "Benchmark Admin",
    email: `bench.admin.${RUN_ID}@ashivam.test`,
    passwordHash: adminPassHash,
    role: "Superadmin",
    permissions: ["dashboard", "employees", "settings"],
    isActive: true,
  });
  const adminToken = generateAccessToken(testAdmin);

  const empPassHash = await bcrypt.hash("EmpBenchPass!2026", 10);
  const testEmp = await Employee.create({
    firstName: "Bench",
    lastName: "Tester",
    email: `bench.emp.${RUN_ID}@ashivam.test`,
    employeeId: `BNCH-${RUN_ID.toString().slice(-4)}`,
    googleEmail: `bench.google.${RUN_ID}@gmail.com`,
    passwordHash: empPassHash,
    role: "Employee",
    designation: "Performance Analyst",
    department: "Engineering",
    employmentType: "Full-time",
    joiningDate: new Date(),
    isActive: true,
  });
  const empToken = generateAccessToken(testEmp);

  const endpoints = [
    {
      name: "GET /api/v1/attendance/my (Employee Summary)",
      call: () => request(app).get("/api/v1/attendance/my").set("Authorization", `Bearer ${empToken}`),
    },
    {
      name: "GET /api/v1/attendance/admin/dashboard (Admin Metrics)",
      call: () => request(app).get("/api/v1/attendance/admin/dashboard").set("Authorization", `Bearer ${adminToken}`),
    },
    {
      name: "GET /api/v1/attendance/admin/meetings (Meetings List)",
      call: () => request(app).get("/api/v1/attendance/admin/meetings?limit=20").set("Authorization", `Bearer ${adminToken}`),
    },
    {
      name: "GET /api/v1/attendance/admin/export (CSV Stream)",
      call: () => request(app).get("/api/v1/attendance/admin/export").set("Authorization", `Bearer ${adminToken}`),
    },
  ];

  console.log("=== ATTENDANCE API PERFORMANCE BENCHMARKS (10 Iterations Each) ===");

  for (const ep of endpoints) {
    const latencies = [];
    for (let i = 0; i < 10; i++) {
      const t0 = performance.now();
      const res = await ep.call();
      const t1 = performance.now();
      if (res.status >= 400) {
        console.error(`Error on ${ep.name}: status ${res.status}`);
      }
      latencies.push(t1 - t0);
    }
    latencies.sort((a, b) => a - b);
    const min = latencies[0].toFixed(2);
    const max = latencies[latencies.length - 1].toFixed(2);
    const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2);
    const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);
    console.log(`${ep.name}: avg=${avg}ms | min=${min}ms | max=${max}ms | p95=${p95}ms`);
  }

  // Teardown
  await Admin.deleteOne({ _id: testAdmin._id });
  await Employee.deleteOne({ _id: testEmp._id });
  await mongoose.disconnect();
}

runBenchmarks().catch(console.error);
