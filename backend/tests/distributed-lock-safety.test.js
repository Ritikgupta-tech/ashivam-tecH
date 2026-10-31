import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import env from "../src/config/env.js";
import SystemLock from "../src/models/systemLock.model.js";
import {
  acquireDistributedLock,
  releaseDistributedLock,
  assertLockHeld,
  withDistributedLock,
} from "../src/utils/distributedLock.js";

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

test("Distributed Lock Safety: Expired lease takeover succeeds and monotonically increments fencingToken", async () => {
  const LOCK_KEY = `safety_fencing_${TEST_TIMESTAMP}`;

  // 1. Initial lock acquisition creates document with fencingToken = 1
  const lock1 = await acquireDistributedLock(LOCK_KEY, { ttlMs: 1000, timeoutMs: 2000 });
  assert.ok(lock1.token, "Lock handle must contain token");
  assert.equal(lock1.fencingToken, 1, "First acquisition should have fencingToken 1");

  const doc1 = await SystemLock.findById(LOCK_KEY);
  assert.equal(doc1.fencingToken, 1);
  assert.equal(doc1.token, lock1.token);

  // 2. Simulate expiration of worker 1's lease
  await SystemLock.updateOne(
    { _id: LOCK_KEY },
    { $set: { expiresAt: new Date(Date.now() - 1000) } }
  );

  // 3. Worker 2 takes over expired lease
  const lock2 = await acquireDistributedLock(LOCK_KEY, { ttlMs: 1000, timeoutMs: 2000 });
  assert.notEqual(lock2.token, lock1.token, "Worker 2 must have a different token");
  assert.equal(lock2.fencingToken, 2, "Second takeover must increment fencingToken to 2");

  const doc2 = await SystemLock.findById(LOCK_KEY);
  assert.equal(doc2.fencingToken, 2);
  assert.equal(doc2.token, lock2.token);

  // 4. Simulate expiration of worker 2's lease
  await SystemLock.updateOne(
    { _id: LOCK_KEY },
    { $set: { expiresAt: new Date(Date.now() - 1000) } }
  );

  // 5. Worker 3 takes over expired lease
  const lock3 = await acquireDistributedLock(LOCK_KEY, { ttlMs: 1000, timeoutMs: 2000 });
  assert.equal(lock3.fencingToken, 3, "Third takeover must increment fencingToken to 3");

  // Cleanup
  await releaseDistributedLock(LOCK_KEY, lock3);
  const remaining = await SystemLock.findById(LOCK_KEY);
  assert.equal(remaining, null, "Lock must be cleaned up");
});

test("Distributed Lock Safety: Stale worker renewal cannot overwrite new owner's lease", async () => {
  const LOCK_KEY = `safety_stale_renew_${TEST_TIMESTAMP}`;

  // Worker A acquires lock
  const lockA = await acquireDistributedLock(LOCK_KEY, { ttlMs: 500, timeoutMs: 1000 });

  // Simulate lease expiry
  await SystemLock.updateOne(
    { _id: LOCK_KEY },
    { $set: { expiresAt: new Date(Date.now() - 500) } }
  );

  // Worker B takes over
  const lockB = await acquireDistributedLock(LOCK_KEY, { ttlMs: 2000, timeoutMs: 1000 });
  assert.equal(lockB.fencingToken, 2);

  // Stale Worker A attempts to renew lease
  const staleRenewalResult = await SystemLock.updateOne(
    { _id: LOCK_KEY, token: lockA.token },
    { $set: { expiresAt: new Date(Date.now() + 5000) } }
  );

  // Worker A's renewal MUST match 0 documents
  assert.equal(staleRenewalResult.matchedCount, 0, "Stale worker lease renewal must fail to match");
  assert.equal(staleRenewalResult.modifiedCount, 0, "No documents should be modified by stale worker");

  // Verify Worker B's lease is untouched
  const currentDoc = await SystemLock.findById(LOCK_KEY);
  assert.equal(currentDoc.token, lockB.token);
  assert.equal(currentDoc.fencingToken, 2);

  // Cleanup
  await releaseDistributedLock(LOCK_KEY, lockB);
});

test("Distributed Lock Safety: Old owner release attempt fails to delete new owner's lock", async () => {
  const LOCK_KEY = `safety_stale_release_${TEST_TIMESTAMP}`;

  // Worker A acquires lock
  const lockA = await acquireDistributedLock(LOCK_KEY, { ttlMs: 500, timeoutMs: 1000 });

  // Force expiration
  await SystemLock.updateOne(
    { _id: LOCK_KEY },
    { $set: { expiresAt: new Date(Date.now() - 500) } }
  );

  // Worker B acquires
  const lockB = await acquireDistributedLock(LOCK_KEY, { ttlMs: 3000, timeoutMs: 1000 });

  // Worker A attempts to release
  await releaseDistributedLock(LOCK_KEY, lockA);

  // Worker B's lock MUST still exist
  const docStillHeld = await SystemLock.findById(LOCK_KEY);
  assert.ok(docStillHeld, "Lock must still exist in DB after stale release attempt");
  assert.equal(docStillHeld.token, lockB.token);

  // Worker B releases
  await releaseDistributedLock(LOCK_KEY, lockB);
  const docReleased = await SystemLock.findById(LOCK_KEY);
  assert.equal(docReleased, null, "Lock must be deleted when valid owner releases");
});

test("Distributed Lock Safety: assertLockHeld validates active ownership and rejects preempted workers", async () => {
  const LOCK_KEY = `safety_assert_held_${TEST_TIMESTAMP}`;

  // Worker 1 acquires lock
  const lock1 = await acquireDistributedLock(LOCK_KEY, { ttlMs: 2000, timeoutMs: 1000 });

  // Worker 1 asserts ownership -> succeeds
  const assertion1 = await assertLockHeld(LOCK_KEY, lock1);
  assert.equal(assertion1.isHeld, true);
  assert.equal(assertion1.fencingToken, 1);

  // Worker 1 asserts ownership using string token -> succeeds
  const assertionByString = await assertLockHeld(LOCK_KEY, lock1.token);
  assert.equal(assertionByString.isHeld, true);

  // Simulate lease expiry and takeover by Worker 2
  await SystemLock.updateOne(
    { _id: LOCK_KEY },
    { $set: { expiresAt: new Date(Date.now() - 500) } }
  );
  const lock2 = await acquireDistributedLock(LOCK_KEY, { ttlMs: 2000, timeoutMs: 1000 });

  // Worker 1 asserts ownership -> MUST FAIL with 409 Conflict
  await assert.rejects(
    async () => {
      await assertLockHeld(LOCK_KEY, lock1);
    },
    (err) => {
      assert.equal(err.statusCode, 409, "Must return HTTP 409 Conflict on fencing violation");
      assert.match(err.message, /Fencing violation/i, "Must identify fencing violation");
      return true;
    }
  );

  // Worker 2 asserts ownership -> succeeds
  const assertion2 = await assertLockHeld(LOCK_KEY, lock2);
  assert.equal(assertion2.isHeld, true);
  assert.equal(assertion2.fencingToken, 2);

  // Cleanup
  await releaseDistributedLock(LOCK_KEY, lock2);

  // After release, Worker 2 assertion also fails
  await assert.rejects(
    async () => {
      await assertLockHeld(LOCK_KEY, lock2);
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      return true;
    }
  );
});

test("Distributed Lock Safety: Database disconnection in production throws HTTP 503", async () => {
  const LOCK_KEY = `safety_db_disconnect_${TEST_TIMESTAMP}`;

  const originalIsProduction = env.isProduction;

  try {
    // Simulate production mode
    env.isProduction = true;
    // Simulate disconnected state (readyState 0)
    Object.defineProperty(mongoose.connection, "readyState", {
      get: () => 0,
      set: () => {},
      configurable: true,
    });

    // 1. acquireDistributedLock must throw 503
    await assert.rejects(
      async () => {
        await acquireDistributedLock(LOCK_KEY, { timeoutMs: 100 });
      },
      (err) => {
        assert.equal(err.statusCode, 503, "Must throw 503 when DB is down in production");
        assert.match(err.message, /Database connection is down/i);
        return true;
      }
    );

    // 2. assertLockHeld must throw 503
    await assert.rejects(
      async () => {
        await assertLockHeld(LOCK_KEY, "some_token");
      },
      (err) => {
        assert.equal(err.statusCode, 503, "Must throw 503 when DB is down in production");
        assert.match(err.message, /Database connection is down/i);
        return true;
      }
    );
  } finally {
    // Restore original state
    env.isProduction = originalIsProduction;
    delete mongoose.connection.readyState;
  }
});

test("Distributed Lock Safety: withDistributedLock passes fencingToken and assertHeld callback to critical section", async () => {
  const LOCK_KEY = `safety_with_lock_${TEST_TIMESTAMP}`;

  let executed = false;
  await withDistributedLock(
    LOCK_KEY,
    async ({ lockToken, fencingToken, assertHeld }) => {
      assert.ok(lockToken, "lockToken must be provided");
      assert.equal(typeof fencingToken, "number", "fencingToken must be a number");
      assert.equal(typeof assertHeld, "function", "assertHeld callback must be provided");

      // Verify that calling assertHeld inside the critical section succeeds
      const check = await assertHeld();
      assert.equal(check.isHeld, true);
      assert.equal(check.fencingToken, fencingToken);

      executed = true;
    },
    { ttlMs: 1000 }
  );

  assert.equal(executed, true, "Critical section must have completed");
  const lockAfter = await SystemLock.findById(LOCK_KEY);
  assert.equal(lockAfter, null, "Lock must be released after completion");
});
