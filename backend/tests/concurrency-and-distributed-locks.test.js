import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import env from "../src/config/env.js";
import Admin from "../src/models/admin.model.js";
import Counter from "../src/models/counter.model.js";
import SystemLock from "../src/models/systemLock.model.js";
import Intern from "../src/modules/internship/intern.model.js";
import Internship from "../src/modules/internship/internship.model.js";
import {
  generateNextInternId,
  createInternDirectly,
  convertApplicationToIntern,
  getNextInternSequence,
} from "../src/modules/internship/internship.service.js";
import {
  updateAdminRole,
  updateAdminStatus,
  deleteAdmin,
  updateAdmin,
} from "../src/modules/admin/admin.service.js";
import {
  acquireDistributedLock,
  releaseDistributedLock,
  withDistributedLock,
} from "../src/utils/distributedLock.js";

const TEST_YEAR = new Date().getFullYear();
const TEST_TIMESTAMP = Date.now();

before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
  }
});

after(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

test("Concurrency Verification: 50 simultaneous intern ID allocations generate unique monotonic IDs without lost counter increments", async () => {
  const initialCounter = await Counter.findById(`intern_id_${TEST_YEAR}`);
  const initialSeq = initialCounter ? initialCounter.seq : 0;

  const CONCURRENCY_COUNT = 50;

  // Run 50 simultaneous allocations concurrently
  const allocationPromises = Array.from({ length: CONCURRENCY_COUNT }, (_, index) =>
    createInternDirectly({
      name: `Concurrent Intern ${index + 1}`,
      email: `concurrent.intern.${TEST_TIMESTAMP}.${index + 1}@example.com`,
      phone: `+9198765${String(index).padStart(5, "0")}`,
      college: "Indian Institute of Technology",
      domain: "Full Stack Web Development",
      department: "Engineering",
      duration: "3 Months",
    })
  );

  const results = await Promise.all(allocationPromises);

  // 1. Assert exactly 50 records created
  assert.equal(results.length, CONCURRENCY_COUNT, "Should return 50 intern records");

  // 2. Assert zero duplicate intern IDs
  const generatedIds = results.map((r) => r.internId);
  const uniqueIds = new Set(generatedIds);
  assert.equal(
    uniqueIds.size,
    CONCURRENCY_COUNT,
    `All ${CONCURRENCY_COUNT} intern IDs must be unique; detected duplicates`
  );

  // 3. Verify prefix and format for all generated IDs
  for (const id of generatedIds) {
    assert.match(
      id,
      new RegExp(`^ASH-INT-${TEST_YEAR}-\\d{3,}$`),
      `Intern ID '${id}' must match format ASH-INT-${TEST_YEAR}-XXX`
    );
  }

  // 4. Verify no lost increments in Counter document
  const finalCounter = await Counter.findById(`intern_id_${TEST_YEAR}`);
  assert.ok(finalCounter, "Counter document must exist");
  assert.ok(
    finalCounter.seq >= initialSeq + CONCURRENCY_COUNT,
    `Counter sequence should increment by at least ${CONCURRENCY_COUNT} (got ${finalCounter.seq - initialSeq})`
  );

  // 5. Cleanup created interns for this test
  await Intern.deleteMany({ _id: { $in: results.map((r) => r._id) } });
});

test("Concurrency Verification: 50 simultaneous conversion attempts on the same application yield exactly 1 active intern and 49 conflict rejections", async () => {
  // Pre-create a single internship application
  const application = await Internship.create({
    name: "Atomic Race Applicant",
    email: `race.applicant.${TEST_TIMESTAMP}@ashivam.test`,
    phone: "+919999988888",
    college: "Delhi Technological University",
    course: "B.Tech Computer Science",
    domain: "Cloud Infrastructure & DevOps",
    duration: "3 Months",
    status: "under_review",
    convertedToIntern: false,
  });

  const CONCURRENCY_COUNT = 50;

  // Fire 50 simultaneous conversion attempts
  const conversionAttempts = Array.from({ length: CONCURRENCY_COUNT }, () =>
    convertApplicationToIntern({
      applicationId: application._id.toString(),
      internData: {
        department: "Cloud Engineering",
      },
    })
  );

  const outcomes = await Promise.allSettled(conversionAttempts);

  const fulfilled = outcomes.filter((o) => o.status === "fulfilled");
  const rejected = outcomes.filter((o) => o.status === "rejected");

  // Exactly 1 must succeed
  assert.equal(
    fulfilled.length,
    1,
    `Exactly 1 conversion must succeed, but got ${fulfilled.length}`
  );

  // Exactly 49 must fail
  assert.equal(
    rejected.length,
    CONCURRENCY_COUNT - 1,
    `Exactly ${CONCURRENCY_COUNT - 1} conversions must be rejected, but got ${rejected.length}`
  );

  // Every rejected attempt must throw 409 Conflict
  for (const failure of rejected) {
    assert.equal(
      failure.reason.statusCode,
      409,
      "Duplicate conversion attempt must be rejected with HTTP 409 Conflict"
    );
    assert.match(
      failure.reason.message,
      /already been converted/i,
      "Error message must specify candidate has already been converted"
    );
  }

  // Check database integrity: exactly 1 intern created for this application
  const internsCreated = await Intern.find({ applicationId: application._id });
  assert.equal(
    internsCreated.length,
    1,
    "Database must have exactly 1 active intern linked to the application"
  );

  // Cleanup
  await Intern.deleteMany({ applicationId: application._id });
  await Internship.deleteOne({ _id: application._id });
});

test("Concurrency Verification: Concurrent Superadmin mutation attempts cannot remove the last active Superadmin", async (t) => {
  const passwordHash = await bcrypt.hash("SuperAdminConcurrencyPass!2026", 10);

  // Setup 2 test Superadmins
  const adminA = await Admin.create({
    username: `super_race_a_${TEST_TIMESTAMP}`,
    name: "Superadmin Alpha",
    email: `alpha.${TEST_TIMESTAMP}@ashivamtechnologies.com`,
    passwordHash,
    role: "Superadmin",
    permissions: ["dashboard", "users", "settings", "careers"],
    isActive: true,
  });

  const adminB = await Admin.create({
    username: `super_race_b_${TEST_TIMESTAMP}`,
    name: "Superadmin Beta",
    email: `beta.${TEST_TIMESTAMP}@ashivamtechnologies.com`,
    passwordHash,
    role: "Superadmin",
    permissions: ["dashboard", "users", "settings", "careers"],
    isActive: true,
  });

  const idA = adminA._id.toString();
  const idB = adminB._id.toString();

  try {
    // 1. Concurrently mutate both admins to verify distributed lock handles concurrent admin updates
    const updates = await Promise.all([
      updateAdmin(idA, { name: "Superadmin Alpha Updated" }, idB),
      updateAdmin(idB, { name: "Superadmin Beta Updated" }, idA),
    ]);
    assert.equal(updates[0].name, "Superadmin Alpha Updated");
    assert.equal(updates[1].name, "Superadmin Beta Updated");

    // 2. Test last active Superadmin protection under concurrent attacks:
    // When only 1 active Superadmin is reported by the database, concurrent removal attempts are 100% blocked
    let countCallCount = 0;
    t.mock.method(Admin, "countDocuments", async (filter) => {
      if (filter?.role === "Superadmin" && filter?.isActive === true) {
        countCallCount++;
        return 1; // Exactly 1 active Superadmin remains
      }
      return 1;
    });

    const concurrentAttacks = Array.from({ length: 25 }, (_, idx) => {
      if (idx % 3 === 0) {
        return updateAdminRole(idA, "Admin", idB);
      } else if (idx % 3 === 1) {
        return updateAdminStatus(idA, false, idB);
      } else {
        return deleteAdmin(idA, idB);
      }
    });

    const attackResults = await Promise.allSettled(concurrentAttacks);

    // ALL 25 attempts must be blocked with HTTP 400
    for (const res of attackResults) {
      assert.equal(res.status, "rejected", "Every removal attempt on the last Superadmin must fail");
      assert.equal(res.reason.statusCode, 400, "Removal of last Superadmin must return HTTP 400");
      assert.match(
        res.reason.message,
        /At least one active Superadmin is required/i
      );
    }

    assert.ok(countCallCount >= 25, "All concurrent attempts must have executed count check");
  } finally {
    // Cleanup test admins only
    await Admin.deleteMany({ _id: { $in: [adminA._id, adminB._id] } });
  }
});

test("Distributed Lock: Mutual exclusion, TTL lease recovery, and token validation", async () => {
  const LOCK_KEY = `test_lock_${TEST_TIMESTAMP}`;

  // 1. Acquire lock
  const token1 = await acquireDistributedLock(LOCK_KEY, { ttlMs: 1000, timeoutMs: 2000 });
  assert.ok(token1, "Should acquire lock successfully");

  // 2. Verify lock exists in MongoDB
  const lockDoc = await SystemLock.findById(LOCK_KEY);
  assert.ok(lockDoc, "Lock document must exist in MongoDB collection");
  assert.equal(lockDoc.token, token1.token || token1);

  // 3. Second immediate acquisition should fail / timeout quickly
  await assert.rejects(
    () => acquireDistributedLock(LOCK_KEY, { ttlMs: 1000, timeoutMs: 200, retryIntervalMs: 20 }),
    /Timed out waiting to acquire lock/i,
    "Concurrent acquisition without release must timeout"
  );

  // 4. Release with invalid token does not release the lock
  await releaseDistributedLock(LOCK_KEY, "wrong_token");
  const stillHeld = await SystemLock.findById(LOCK_KEY);
  assert.ok(stillHeld, "Lock must remain held if wrong token is supplied");

  // 5. Release with valid token deletes the lock
  await releaseDistributedLock(LOCK_KEY, token1);
  const released = await SystemLock.findById(LOCK_KEY);
  assert.equal(released, null, "Lock must be deleted after release with valid token");

  // 6. Simulate stale/orphaned lock with expired TTL (e.g. crashed process)
  const pastDate = new Date(Date.now() - 5000);
  await SystemLock.create({
    _id: LOCK_KEY,
    token: "crashed_process_token",
    acquiredAt: pastDate,
    expiresAt: pastDate,
  });

  // New process acquires by taking over expired lease
  const token2 = await acquireDistributedLock(LOCK_KEY, { ttlMs: 2000, timeoutMs: 2000 });
  assert.ok(token2, "New process should acquire expired lease");
  assert.notEqual(token2.token || token2, "crashed_process_token", "New token must be distinct");

  // Cleanup
  await releaseDistributedLock(LOCK_KEY, token2);
  await SystemLock.deleteOne({ _id: LOCK_KEY });
});

test("Distributed Lock: Active lease renewal (heartbeat) extends expiresAt for long-running operations", async () => {
  const LOCK_KEY = `heartbeat_lock_${TEST_TIMESTAMP}`;
  const initialTtlMs = 600;

  let observedMidExpiry = null;
  let initialExpiry = null;

  await withDistributedLock(
    LOCK_KEY,
    async () => {
      // 1. Check initial lock document in DB
      const initialDoc = await SystemLock.findById(LOCK_KEY);
      assert.ok(initialDoc, "Lock must exist in MongoDB during critical section");
      initialExpiry = initialDoc.expiresAt.getTime();

      // 2. Sleep for 500ms (longer than heartbeat interval 200ms)
      await new Promise((r) => setTimeout(r, 500));

      // 3. Inspect updated expiresAt to verify heartbeat extended the lease
      const renewedDoc = await SystemLock.findById(LOCK_KEY);
      assert.ok(renewedDoc, "Lock must still exist and be actively renewed");
      observedMidExpiry = renewedDoc.expiresAt.getTime();
      assert.ok(
        observedMidExpiry > initialExpiry,
        `Lease must be renewed: observedMidExpiry (${observedMidExpiry}) > initialExpiry (${initialExpiry})`
      );

      return true;
    },
    { ttlMs: initialTtlMs }
  );

  // 4. After critical section completes, lock must be cleanly deleted
  const postDoc = await SystemLock.findById(LOCK_KEY);
  assert.equal(postDoc, null, "Lock must be released immediately upon function completion");
});

