/**
 * Migration Script: Replace Employee Global Unique Email Index with Partial Unique Index (AUD-08)
 *
 * Operational Safety Guarantees:
 * 1. Safe Forward Migration: Creates and verifies the partial unique index before dropping the legacy index.
 * 2. Safe Rollback: Checks all records (active and deleted) for duplicate emails before touching indexes,
 *    creates and verifies the global unique index first, and only drops the partial index after verification.
 * 3. Idempotent & Crash-Resilient: Safely recovers from states where both indexes exist.
 * 4. Missing Field Safety: Handles missing, null, and non-null `deletedAt` fields correctly.
 *
 * Usage:
 *   node backend/src/scripts/migrate-employee-email-index.js --dry-run
 *   node backend/src/scripts/migrate-employee-email-index.js --apply
 *   node backend/src/scripts/migrate-employee-email-index.js --rollback
 *
 * Environment:
 *   MONGODB_URI (defaults to configured env.mongodbUri)
 */

import mongoose from "mongoose";
import env from "../config/env.js";

export const LEGACY_INDEX_NAME = "email_1";
export const TARGET_INDEX_NAME = "email_active_unique";
export const TARGET_PARTIAL_FILTER = { deletedAt: null };

export const parseArgs = (argv = process.argv.slice(2)) => {
  const isApply = argv.includes("--apply");
  const isRollback = argv.includes("--rollback");
  const isDryRun = argv.includes("--dry-run") || (!isApply && !isRollback);

  return { isApply, isRollback, isDryRun };
};

/**
 * Checks for duplicate emails among active employee records.
 * Active employees are defined as records where deletedAt is null OR deletedAt does not exist.
 */
export const checkActiveDuplicates = async (collection) => {
  const duplicates = await collection
    .aggregate([
      {
        $match: {
          $or: [
            { deletedAt: null },
            { deletedAt: { $exists: false } },
          ],
        },
      },
      {
        $group: {
          _id: { $toLower: { $ifNull: ["$email", ""] } },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          sampleEmails: { $addToSet: "$email" },
        },
      },
      { $match: { count: { $gt: 1 }, _id: { $ne: "" } } },
    ])
    .toArray();

  return duplicates;
};

/**
 * Checks for duplicate emails across ALL employee records (both active and soft-deleted).
 */
export const checkAllDuplicates = async (collection) => {
  const duplicates = await collection
    .aggregate([
      {
        $group: {
          _id: { $toLower: { $ifNull: ["$email", ""] } },
          count: { $sum: 1 },
          ids: { $push: "$_id" },
          sampleEmails: { $addToSet: "$email" },
          activeCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ["$deletedAt", null] },
                    { $not: ["$deletedAt"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $match: { count: { $gt: 1 }, _id: { $ne: "" } } },
    ])
    .toArray();

  return duplicates;
};

/**
 * Validates that an index definition matches the expected partial unique specification.
 */
export const isPartialIndexValid = (index) => {
  if (!index) return false;

  const keys = Object.keys(index.key || {});
  const hasEmailKey = keys.length === 1 && index.key.email === 1;
  const isUnique = index.unique === true;

  const partialFilter = index.partialFilterExpression;
  if (!partialFilter || typeof partialFilter !== "object") {
    return false;
  }

  const filterKeys = Object.keys(partialFilter);
  const hasDeletedAtNull = filterKeys.length === 1 && partialFilter.deletedAt === null;

  return hasEmailKey && isUnique && hasDeletedAtNull;
};

/**
 * Validates that an index definition matches the expected global unique specification.
 */
export const isGlobalUniqueIndexValid = (index) => {
  if (!index) return false;

  const keys = Object.keys(index.key || {});
  const hasEmailKey = keys.length === 1 && index.key.email === 1;
  const isUnique = index.unique === true;
  const hasNoPartialFilter = !index.partialFilterExpression;

  return hasEmailKey && isUnique && hasNoPartialFilter;
};

/**
 * Executes safe read-only inspection and preflight checks.
 */
export const dryRunMigration = async (collection) => {
  console.log("[DRY-RUN] Inspecting collection indexes and data constraints...");
  const existingIndexes = await collection.indexes();

  console.log("Current indexes on 'employees' collection:");
  existingIndexes.forEach((idx) => {
    console.log(
      ` - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${Boolean(idx.unique)}, partialFilter: ${
        idx.partialFilterExpression ? JSON.stringify(idx.partialFilterExpression) : "none"
      })`
    );
  });

  const legacyIndex = existingIndexes.find((idx) => idx.name === LEGACY_INDEX_NAME);
  const targetIndex = existingIndexes.find((idx) => idx.name === TARGET_INDEX_NAME);

  console.log("\n[DRY-RUN] Checking for active duplicate emails (deletedAt: null or missing)...");
  const activeDuplicates = await checkActiveDuplicates(collection);
  if (activeDuplicates.length > 0) {
    console.error("  [BLOCKER] Found active duplicate emails that violate uniqueness:");
    console.error(JSON.stringify(activeDuplicates, null, 2));
    throw new Error(`Preflight check failed: ${activeDuplicates.length} active duplicate email group(s) found.`);
  }
  console.log("  [PASS] Zero active duplicate emails found.");

  console.log("\n[DRY-RUN] Checking for all duplicate emails (including soft-deleted)...");
  const allDuplicates = await checkAllDuplicates(collection);
  if (allDuplicates.length > 0) {
    console.log(`  [INFO] Found ${allDuplicates.length} duplicate email group(s) across historical records.`);
    console.log("  Note: Option A allows this, but rollback to global unique index would require resolving these duplicates first.");
  } else {
    console.log("  [PASS] Zero duplicates across all records (rollback would be immediately possible).");
  }

  console.log("\n[DRY-RUN] Planned execution sequence for --apply:");
  if (targetIndex && isPartialIndexValid(targetIndex)) {
    console.log(`  1. Partial unique index '${TARGET_INDEX_NAME}' is already created and verified.`);
  } else {
    console.log(`  1. Create partial unique index '${TARGET_INDEX_NAME}' with partialFilterExpression: { deletedAt: null }`);
    console.log(`  2. Read back and verify '${TARGET_INDEX_NAME}' definition from MongoDB.`);
  }

  if (legacyIndex) {
    console.log(`  3. Drop legacy global unique index '${LEGACY_INDEX_NAME}' ONLY after '${TARGET_INDEX_NAME}' is verified.`);
  } else {
    console.log(`  3. Legacy index '${LEGACY_INDEX_NAME}' is already absent.`);
  }

  console.log("\n[DRY-RUN] Planned execution sequence for --rollback:");
  console.log("  1. Verify zero duplicate emails exist across ALL records (including soft-deleted). Abort if any exist.");
  console.log(`  2. Create legacy global unique index '${LEGACY_INDEX_NAME}' FIRST.`);
  console.log(`  3. Read back and verify '${LEGACY_INDEX_NAME}' definition from MongoDB.`);
  console.log(`  4. Drop partial unique index '${TARGET_INDEX_NAME}' ONLY after '${LEGACY_INDEX_NAME}' is verified.`);
  console.log("\n[DRY-RUN] Complete. Zero mutations performed.");

  return { activeDuplicates, allDuplicates, existingIndexes };
};

/**
 * Executes forward migration with safe ordering:
 * 1. Preflight check for active duplicates.
 * 2. Create replacement partial unique index FIRST.
 * 3. Verify replacement partial unique index from database.
 * 4. Drop legacy index ONLY after verification passes.
 */
export const applyMigration = async (collection) => {
  console.log("[APPLY] Starting safe forward index migration...");

  // 1. Preflight active duplicate check
  const activeDuplicates = await checkActiveDuplicates(collection);
  if (activeDuplicates.length > 0) {
    const msg = `Cannot apply migration: ${activeDuplicates.length} active duplicate email group(s) detected.`;
    console.error(`  [BLOCKER] ${msg}`);
    console.error(JSON.stringify(activeDuplicates, null, 2));
    throw new Error(msg);
  }
  console.log("  [PASS] Zero active duplicate emails found.");

  // 2. Inspect existing indexes
  let indexes = await collection.indexes();
  const legacyIndex = indexes.find((idx) => idx.name === LEGACY_INDEX_NAME);
  const targetIndex = indexes.find((idx) => idx.name === TARGET_INDEX_NAME);

  if (targetIndex && !isPartialIndexValid(targetIndex)) {
    throw new Error(
      `Index '${TARGET_INDEX_NAME}' already exists but has an invalid or incompatible specification: ` +
        JSON.stringify(targetIndex)
    );
  }

  // 3. Create target partial unique index FIRST if not already created
  if (!targetIndex) {
    console.log(`  Creating replacement partial unique index '${TARGET_INDEX_NAME}'...`);
    try {
      await collection.createIndex(
        { email: 1 },
        {
          unique: true,
          partialFilterExpression: TARGET_PARTIAL_FILTER,
          name: TARGET_INDEX_NAME,
          background: true,
        }
      );
      console.log(`  [OK] Index '${TARGET_INDEX_NAME}' creation requested.`);
    } catch (err) {
      console.error(`  [CRITICAL] Failed to create replacement index '${TARGET_INDEX_NAME}'.`);
      console.error(`  Preserving existing legacy index '${LEGACY_INDEX_NAME}'. No indexes were dropped.`);
      throw err;
    }
  } else {
    console.log(`  Index '${TARGET_INDEX_NAME}' already exists with valid definition.`);
  }

  // 4. Verify replacement index definition from MongoDB
  indexes = await collection.indexes();
  const verifiedTarget = indexes.find((idx) => idx.name === TARGET_INDEX_NAME);
  if (!isPartialIndexValid(verifiedTarget)) {
    const errorMsg = `Replacement index verification failed: '${TARGET_INDEX_NAME}' was not found or has invalid spec.`;
    console.error(`  [CRITICAL] ${errorMsg}`);
    console.error(`  Preserving existing legacy index '${LEGACY_INDEX_NAME}'. No legacy index was dropped.`);
    throw new Error(errorMsg);
  }
  console.log(`  [VERIFIED] Partial unique index '${TARGET_INDEX_NAME}' verified successfully in MongoDB.`);

  // 5. Drop legacy index ONLY after verification passes
  let legacyDropped = false;
  if (legacyIndex) {
    console.log(`  Safely dropping legacy global unique index '${LEGACY_INDEX_NAME}'...`);
    try {
      await collection.dropIndex(LEGACY_INDEX_NAME);
      legacyDropped = true;
      console.log(`  [OK] Dropped legacy index '${LEGACY_INDEX_NAME}'.`);
    } catch (err) {
      console.error(`  [WARNING] Could not drop legacy index '${LEGACY_INDEX_NAME}': ${err.message}`);
      console.error("  Target index remains active and valid. Both indexes currently coexist safely.");
      throw err;
    }
  } else {
    console.log(`  Legacy index '${LEGACY_INDEX_NAME}' already absent (previously dropped or clean setup).`);
  }

  // Final verification of state
  const finalIndexes = await collection.indexes();
  console.log("\n[SUCCESS] Final indexes on 'employees' collection:");
  finalIndexes.forEach((idx) => {
    console.log(
      ` - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${Boolean(idx.unique)}, partialFilter: ${
        idx.partialFilterExpression ? JSON.stringify(idx.partialFilterExpression) : "none"
      })`
    );
  });

  return {
    success: true,
    targetIndex: verifiedTarget,
    legacyDropped,
    finalIndexes,
  };
};

/**
 * Executes rollback with safe ordering:
 * 1. Preflight check for duplicate emails across ALL records (including soft-deleted).
 * 2. Create legacy global unique index FIRST.
 * 3. Verify legacy global unique index from database.
 * 4. Drop partial unique index ONLY after verification passes.
 */
export const rollbackMigration = async (collection) => {
  console.log("[ROLLBACK] Starting safe rollback to global unique index...");

  // 1. Preflight check across ALL records
  console.log("  Checking for duplicate emails across all records (including soft-deleted)...");
  const allDuplicates = await checkAllDuplicates(collection);
  if (allDuplicates.length > 0) {
    const msg =
      `Cannot rollback to global unique index: ${allDuplicates.length} duplicate email group(s) exist across historical records. ` +
      `Preserving partial unique index '${TARGET_INDEX_NAME}'. Zero indexes were dropped.`;
    console.error(`  [BLOCKER] ${msg}`);
    console.error(JSON.stringify(allDuplicates, null, 2));
    throw new Error(msg);
  }
  console.log("  [PASS] Zero duplicate emails across all records. Safe to restore global unique index.");

  // 2. Inspect existing indexes
  let indexes = await collection.indexes();
  const legacyIndex = indexes.find((idx) => idx.name === LEGACY_INDEX_NAME);
  const targetIndex = indexes.find((idx) => idx.name === TARGET_INDEX_NAME);

  if (legacyIndex && !isGlobalUniqueIndexValid(legacyIndex)) {
    throw new Error(
      `Index '${LEGACY_INDEX_NAME}' already exists but has an invalid or incompatible specification: ` +
        JSON.stringify(legacyIndex)
    );
  }

  // 3. Create legacy global unique index FIRST if not already present
  if (!legacyIndex) {
    console.log(`  Creating global unique index '${LEGACY_INDEX_NAME}'...`);
    try {
      await collection.createIndex(
        { email: 1 },
        { unique: true, name: LEGACY_INDEX_NAME, background: true }
      );
      console.log(`  [OK] Index '${LEGACY_INDEX_NAME}' creation requested.`);
    } catch (err) {
      console.error(`  [CRITICAL] Failed to create global unique index '${LEGACY_INDEX_NAME}'.`);
      console.error(`  Preserving existing partial unique index '${TARGET_INDEX_NAME}'. No indexes were dropped.`);
      throw err;
    }
  } else {
    console.log(`  Global unique index '${LEGACY_INDEX_NAME}' already exists with valid definition.`);
  }

  // 4. Verify legacy global unique index from MongoDB
  indexes = await collection.indexes();
  const verifiedLegacy = indexes.find((idx) => idx.name === LEGACY_INDEX_NAME);
  if (!isGlobalUniqueIndexValid(verifiedLegacy)) {
    const errorMsg = `Rollback verification failed: '${LEGACY_INDEX_NAME}' was not found or has invalid spec.`;
    console.error(`  [CRITICAL] ${errorMsg}`);
    console.error(`  Preserving partial unique index '${TARGET_INDEX_NAME}'. No indexes were dropped.`);
    throw new Error(errorMsg);
  }
  console.log(`  [VERIFIED] Global unique index '${LEGACY_INDEX_NAME}' verified successfully in MongoDB.`);

  // 5. Drop partial unique index ONLY after verification passes
  let targetDropped = false;
  if (targetIndex) {
    console.log(`  Safely dropping partial unique index '${TARGET_INDEX_NAME}'...`);
    try {
      await collection.dropIndex(TARGET_INDEX_NAME);
      targetDropped = true;
      console.log(`  [OK] Dropped partial unique index '${TARGET_INDEX_NAME}'.`);
    } catch (err) {
      console.error(`  [WARNING] Could not drop partial index '${TARGET_INDEX_NAME}': ${err.message}`);
      console.error("  Global index remains active and valid. Both indexes currently coexist safely.");
      throw err;
    }
  } else {
    console.log(`  Partial unique index '${TARGET_INDEX_NAME}' already absent.`);
  }

  // Final verification of state
  const finalIndexes = await collection.indexes();
  console.log("\n[SUCCESS] Final rollback indexes on 'employees' collection:");
  finalIndexes.forEach((idx) => {
    console.log(
      ` - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${Boolean(idx.unique)}, partialFilter: ${
        idx.partialFilterExpression ? JSON.stringify(idx.partialFilterExpression) : "none"
      })`
    );
  });

  return {
    success: true,
    legacyIndex: verifiedLegacy,
    targetDropped,
    finalIndexes,
  };
};

/**
 * Main CLI entry point.
 */
export const runMigration = async () => {
  const { isApply, isRollback, isDryRun } = parseArgs();

  console.log("=================================================");
  console.log("  Ashivam Technologies - Employee Email Index Migration");
  console.log("=================================================");
  console.log(`Mode: ${isRollback ? "ROLLBACK" : isApply ? "APPLY" : "DRY-RUN (Safe Read-Only)"}`);
  console.log(`Target Database: ${env.mongodbUri ? env.mongodbUri.replace(/\/\/.*@/, "//***@") : "none"}\n`);

  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;
    const collection = db.collection("employees");

    if (isDryRun) {
      await dryRunMigration(collection);
      return;
    }

    if (isApply) {
      await applyMigration(collection);
      return;
    }

    if (isRollback) {
      await rollbackMigration(collection);
      return;
    }
  } catch (error) {
    console.error("\n[MIGRATION FAILED]", error.message);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

// Only execute directly when run as CLI script
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("migrate-employee-email-index.js")) {
  runMigration();
}
