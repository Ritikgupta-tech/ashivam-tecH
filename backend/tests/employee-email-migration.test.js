import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import Employee from "../src/modules/employee/employee.model.js";
import {
  LEGACY_INDEX_NAME,
  TARGET_INDEX_NAME,
  TARGET_PARTIAL_FILTER,
  checkActiveDuplicates,
  checkAllDuplicates,
  isPartialIndexValid,
  isGlobalUniqueIndexValid,
  applyMigration,
  rollbackMigration,
  dryRunMigration,
} from "../src/scripts/migrate-employee-email-index.js";

const ISOLATED_MONGO_URI = "mongodb://127.0.0.1:27017/ashivam_audit_isolated";
let testCollection = null;

before(async () => {
  await mongoose.connect(ISOLATED_MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  testCollection = mongoose.connection.db.collection("test_employee_migrations");
});

after(async () => {
  if (testCollection) {
    await testCollection.drop().catch(() => {});
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

beforeEach(async () => {
  await testCollection.drop().catch(() => {});
});

// Helper: Setup legacy global unique index on test collection
const setupLegacyIndex = async () => {
  await testCollection.createIndex(
    { email: 1 },
    { unique: true, name: LEGACY_INDEX_NAME }
  );
};

// Helper: Setup target partial unique index on test collection
const setupPartialIndex = async () => {
  await testCollection.createIndex(
    { email: 1 },
    {
      unique: true,
      partialFilterExpression: TARGET_PARTIAL_FILTER,
      name: TARGET_INDEX_NAME,
    }
  );
};

// =========================================================================
// 1. Forward Migration Tests
// =========================================================================

test("Migration - Forward migration succeeds when legacy index is present and zero duplicates exist", async () => {
  await setupLegacyIndex();

  // Insert two employees with distinct emails
  await testCollection.insertMany([
    { email: "alice@ashivamtechnologies.com", deletedAt: null },
    { email: "bob@ashivamtechnologies.com", deletedAt: null },
  ]);

  const result = await applyMigration(testCollection);
  assert.equal(result.success, true);
  assert.equal(result.legacyDropped, true);

  const indexes = await testCollection.indexes();
  const partialIdx = indexes.find((i) => i.name === TARGET_INDEX_NAME);
  const legacyIdx = indexes.find((i) => i.name === LEGACY_INDEX_NAME);

  assert.ok(partialIdx, "Target partial index must exist");
  assert.equal(isPartialIndexValid(partialIdx), true);
  assert.equal(legacyIdx, undefined, "Legacy global unique index must be dropped");
});

test("Migration - Both indexes coexist safely during index swap without collision", async () => {
  await setupLegacyIndex();
  await setupPartialIndex();

  const indexes = await testCollection.indexes();
  const legacyIdx = indexes.find((i) => i.name === LEGACY_INDEX_NAME);
  const partialIdx = indexes.find((i) => i.name === TARGET_INDEX_NAME);

  assert.ok(legacyIdx, "Legacy index must coexist");
  assert.ok(partialIdx, "Partial index must coexist");
  assert.equal(isGlobalUniqueIndexValid(legacyIdx), true);
  assert.equal(isPartialIndexValid(partialIdx), true);
});

test("Migration - Failure during new index creation preserves legacy index without dropping it", async () => {
  await setupLegacyIndex();

  const originalCreateIndex = testCollection.createIndex.bind(testCollection);
  testCollection.createIndex = async (...args) => {
    if (args[1]?.name === TARGET_INDEX_NAME) {
      throw new Error("Simulated index creation failure: out of memory");
    }
    return originalCreateIndex(...args);
  };

  try {
    await assert.rejects(
      async () => {
        await applyMigration(testCollection);
      },
      /Simulated index creation failure: out of memory/i
    );

    const indexes = await testCollection.indexes();
    const legacyIdx = indexes.find((i) => i.name === LEGACY_INDEX_NAME);
    const partialIdx = indexes.find((i) => i.name === TARGET_INDEX_NAME);

    assert.ok(legacyIdx, "Legacy index must remain completely intact upon failure");
    assert.equal(isGlobalUniqueIndexValid(legacyIdx), true);
    assert.equal(partialIdx, undefined, "Target index must not exist");
  } finally {
    testCollection.createIndex = originalCreateIndex;
  }
});

test("Migration - Verification failure preserves legacy index without dropping it", async () => {
  await setupLegacyIndex();

  // Create an index named TARGET_INDEX_NAME but with an incompatible specification (not partial)
  await testCollection.createIndex(
    { email: 1, department: 1 },
    { name: TARGET_INDEX_NAME }
  );

  // Migration must reject the incompatible index without dropping the legacy index
  await assert.rejects(
    async () => {
      await applyMigration(testCollection);
    },
    /already exists but has an invalid or incompatible specification/i
  );

  const indexes = await testCollection.indexes();
  const legacyIdx = indexes.find((i) => i.name === LEGACY_INDEX_NAME);
  assert.ok(legacyIdx, "Legacy index must be preserved when target index verification fails");
});

test("Migration - Duplicate active emails aborts migration safely without changes", async () => {
  // Insert active duplicates before any index is created
  await testCollection.insertMany([
    { email: "active.dupe@ashivamtechnologies.com", deletedAt: null },
    { email: "active.dupe@ashivamtechnologies.com", deletedAt: null },
  ]);

  await assert.rejects(
    async () => {
      await applyMigration(testCollection);
    },
    /active duplicate email group/i
  );

  const indexes = await testCollection.indexes();
  assert.ok(!indexes.some((i) => i.name === TARGET_INDEX_NAME));
});

test("Migration - Idempotent re-run recovers safely from state where both indexes already exist", async () => {
  await setupLegacyIndex();
  await setupPartialIndex();

  // Re-running apply should detect partial index is already valid and finish dropping legacy index
  const result = await applyMigration(testCollection);
  assert.equal(result.success, true);
  assert.equal(result.legacyDropped, true);

  const indexes = await testCollection.indexes();
  assert.ok(indexes.some((i) => i.name === TARGET_INDEX_NAME));
  assert.ok(!indexes.some((i) => i.name === LEGACY_INDEX_NAME));

  // Running apply a third time when already complete is a clean no-op
  const rerunResult = await applyMigration(testCollection);
  assert.equal(rerunResult.success, true);
  assert.equal(rerunResult.legacyDropped, false);
});

// =========================================================================
// 2. Rollback Tests
// =========================================================================

test("Migration - Rollback with duplicate emails across deleted records aborts before dropping partial index", async () => {
  await setupPartialIndex();

  // Active employee + soft-deleted employee sharing email (permitted under Option A)
  await testCollection.insertMany([
    { email: "shared@ashivamtechnologies.com", deletedAt: null },
    { email: "shared@ashivamtechnologies.com", deletedAt: new Date("2023-01-01") },
  ]);

  await assert.rejects(
    async () => {
      await rollbackMigration(testCollection);
    },
    /Cannot rollback to global unique index.*duplicate email group.*Preserving partial unique index/i
  );

  // Partial index must STILL exist!
  const indexes = await testCollection.indexes();
  const partialIdx = indexes.find((i) => i.name === TARGET_INDEX_NAME);
  const legacyIdx = indexes.find((i) => i.name === LEGACY_INDEX_NAME);

  assert.ok(partialIdx, "Partial unique index must NOT be dropped when rollback is blocked");
  assert.equal(isPartialIndexValid(partialIdx), true);
  assert.equal(legacyIdx, undefined, "Legacy index must not be created");
});

test("Migration - Rollback succeeds when zero duplicates exist across all records", async () => {
  await setupPartialIndex();

  // Clean records with distinct emails
  await testCollection.insertMany([
    { email: "clean1@ashivamtechnologies.com", deletedAt: null },
    { email: "clean2@ashivamtechnologies.com", deletedAt: new Date("2023-01-01") },
  ]);

  const result = await rollbackMigration(testCollection);
  assert.equal(result.success, true);
  assert.equal(result.targetDropped, true);

  const indexes = await testCollection.indexes();
  const legacyIdx = indexes.find((i) => i.name === LEGACY_INDEX_NAME);
  const partialIdx = indexes.find((i) => i.name === TARGET_INDEX_NAME);

  assert.ok(legacyIdx, "Global unique index must be restored");
  assert.equal(isGlobalUniqueIndexValid(legacyIdx), true);
  assert.equal(partialIdx, undefined, "Partial index must be dropped after global index is verified");
});

test("Migration - Rollback failure during global index creation preserves partial index", async () => {
  await setupPartialIndex();

  const originalCreateIndex = testCollection.createIndex.bind(testCollection);
  testCollection.createIndex = async (...args) => {
    if (args[1]?.name === LEGACY_INDEX_NAME) {
      throw new Error("Simulated failure during global index creation: connection timeout");
    }
    return originalCreateIndex(...args);
  };

  try {
    await assert.rejects(
      async () => {
        await rollbackMigration(testCollection);
      },
      /Simulated failure during global index creation/i
    );

    const indexes = await testCollection.indexes();
    const partialIdx = indexes.find((i) => i.name === TARGET_INDEX_NAME);
    assert.ok(partialIdx, "Partial index must be preserved on rollback failure");
    assert.equal(isPartialIndexValid(partialIdx), true);
  } finally {
    testCollection.createIndex = originalCreateIndex;
  }
});

// =========================================================================
// 3. Missing `deletedAt` Behavior & Schema Consistency
// =========================================================================

test("Migration - Missing deletedAt is correctly identified as active in duplicate checks", async () => {
  await testCollection.insertMany([
    { email: "missing1@ashivamtechnologies.com" }, // deletedAt is completely undefined
    { email: "missing1@ashivamtechnologies.com", deletedAt: null }, // deletedAt is null
  ]);

  const activeDuplicates = await checkActiveDuplicates(testCollection);
  assert.equal(activeDuplicates.length, 1, "Must detect collision between missing deletedAt and deletedAt: null");
  assert.equal(activeDuplicates[0]._id, "missing1@ashivamtechnologies.com");
  assert.equal(activeDuplicates[0].count, 2);
});

test("Migration - Missing deletedAt is correctly indexed and constrained by partial unique index in MongoDB", async () => {
  await setupPartialIndex();

  // Insert record with missing deletedAt
  await testCollection.insertOne({ email: "missing.field@ashivamtechnologies.com" });

  // Attempt inserting duplicate with deletedAt: null
  await assert.rejects(
    async () => {
      await testCollection.insertOne({ email: "missing.field@ashivamtechnologies.com", deletedAt: null });
    },
    (err) => err.code === 11000,
    "Partial unique index must reject duplicate when first record had missing deletedAt"
  );

  // Inserting duplicate where deletedAt is a Date must succeed
  await testCollection.insertOne({
    email: "missing.field@ashivamtechnologies.com",
    deletedAt: new Date(),
  });

  const count = await testCollection.countDocuments({ email: "missing.field@ashivamtechnologies.com" });
  assert.equal(count, 2, "Historical record with date can coexist with active missing-deletedAt record");
});

test("Migration - Mongoose Employee schema index declaration matches migration TARGET_INDEX_NAME and filter", () => {
  const indexes = Employee.schema.indexes();
  const partialSchemaIndex = indexes.find((idxDef) => {
    const keys = idxDef[0];
    const options = idxDef[1];
    return keys.email === 1 && options?.unique === true && options?.partialFilterExpression;
  });

  assert.ok(partialSchemaIndex, "Employee schema must declare partial unique index on email");
  const [keys, options] = partialSchemaIndex;

  assert.deepEqual(keys, { email: 1 });
  assert.equal(options.unique, true);
  assert.equal(options.name, TARGET_INDEX_NAME);
  assert.deepEqual(options.partialFilterExpression, TARGET_PARTIAL_FILTER);
});

test("Migration - Dry run completes read-only validation without altering indexes or records", async () => {
  await setupLegacyIndex();

  await testCollection.insertOne({
    email: "dryrun.test@ashivamtechnologies.com",
    deletedAt: null,
  });

  const preIndexes = await testCollection.indexes();
  const preCount = await testCollection.countDocuments();

  const dryRunResult = await dryRunMigration(testCollection);
  assert.ok(dryRunResult.existingIndexes);
  assert.equal(dryRunResult.activeDuplicates.length, 0);

  const postIndexes = await testCollection.indexes();
  const postCount = await testCollection.countDocuments();

  assert.equal(preIndexes.length, postIndexes.length);
  assert.equal(preCount, postCount);
});
