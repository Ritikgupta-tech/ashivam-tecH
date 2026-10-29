/**
 * Migration Script: Replace Employee Global Unique Email Index with Partial Unique Index (AUD-08)
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

const LEGACY_INDEX_NAME = "email_1";
const TARGET_INDEX_NAME = "email_active_unique";

const parseArgs = () => {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const isRollback = args.includes("--rollback");
  const isDryRun = args.includes("--dry-run") || (!isApply && !isRollback);

  return { isApply, isRollback, isDryRun };
};

const checkActiveDuplicates = async (collection) => {
  const duplicates = await collection
    .aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: { $toLower: "$email" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  return duplicates;
};

const checkAllDuplicates = async (collection) => {
  const duplicates = await collection
    .aggregate([
      { $group: { _id: { $toLower: "$email" }, count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
    ])
    .toArray();

  return duplicates;
};

const runMigration = async () => {
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

    const existingIndexes = await collection.indexes();
    console.log("Current indexes on 'employees' collection:");
    existingIndexes.forEach((idx) => {
      console.log(` - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${Boolean(idx.unique)}, partial: ${Boolean(idx.partialFilterExpression)})`);
    });
    console.log("");

    const hasLegacyIndex = existingIndexes.some((idx) => idx.name === LEGACY_INDEX_NAME);
    const hasTargetIndex = existingIndexes.some((idx) => idx.name === TARGET_INDEX_NAME);

    if (isDryRun) {
      console.log("[DRY-RUN] Checking for active duplicate emails (deletedAt: null)...");
      const activeDuplicates = await checkActiveDuplicates(collection);

      if (activeDuplicates.length > 0) {
        console.error("  [BLOCKER] Found active duplicate emails that would violate unique constraint:");
        console.error(JSON.stringify(activeDuplicates, null, 2));
        process.exit(1);
      } else {
        console.log("  [PASS] Zero active duplicate emails found.");
      }

      console.log("\n[DRY-RUN] Planned Actions for --apply:");
      if (hasLegacyIndex) {
        console.log(`  1. Drop legacy global unique index '${LEGACY_INDEX_NAME}'`);
      } else {
        console.log(`  1. Legacy index '${LEGACY_INDEX_NAME}' already absent`);
      }

      if (!hasTargetIndex) {
        console.log(`  2. Create partial unique index '${TARGET_INDEX_NAME}' with partialFilterExpression: { deletedAt: null }`);
      } else {
        console.log(`  2. Partial unique index '${TARGET_INDEX_NAME}' already exists`);
      }

      console.log("\n[DRY-RUN] Planned Actions for --rollback:");
      console.log(`  1. Drop partial unique index '${TARGET_INDEX_NAME}'`);
      console.log(`  2. Recreate legacy global unique index '${LEGACY_INDEX_NAME}'`);
      console.log("\nDry-run complete. No changes were made.");
      return;
    }

    if (isRollback) {
      console.log("[ROLLBACK] Starting rollback to global unique index...");

      if (hasTargetIndex) {
        console.log(`  Dropping partial unique index '${TARGET_INDEX_NAME}'...`);
        await collection.dropIndex(TARGET_INDEX_NAME);
        console.log(`  Dropped '${TARGET_INDEX_NAME}'.`);
      }

      console.log("  Checking for any duplicate emails across all records before re-creating global unique index...");
      const allDuplicates = await checkAllDuplicates(collection);
      if (allDuplicates.length > 0) {
        console.error("  [WARNING] Cannot re-create global unique index because duplicate emails exist across historical soft-deleted records:");
        console.error(JSON.stringify(allDuplicates, null, 2));
        process.exit(1);
      }

      console.log(`  Recreating global unique index '${LEGACY_INDEX_NAME}'...`);
      await collection.createIndex(
        { email: 1 },
        { unique: true, name: LEGACY_INDEX_NAME, background: true }
      );
      console.log(`  [SUCCESS] Global unique index '${LEGACY_INDEX_NAME}' restored successfully.`);
      return;
    }

    if (isApply) {
      console.log("[APPLY] Executing index migration...");

      const activeDuplicates = await checkActiveDuplicates(collection);
      if (activeDuplicates.length > 0) {
        console.error("  [BLOCKER] Active duplicate emails found. Cannot proceed with unique index creation:");
        console.error(JSON.stringify(activeDuplicates, null, 2));
        process.exit(1);
      }

      if (hasLegacyIndex) {
        console.log(`  Dropping legacy global unique index '${LEGACY_INDEX_NAME}'...`);
        await collection.dropIndex(LEGACY_INDEX_NAME);
        console.log(`  Dropped legacy index '${LEGACY_INDEX_NAME}'.`);
      }

      console.log(`  Creating partial unique index '${TARGET_INDEX_NAME}'...`);
      await collection.createIndex(
        { email: 1 },
        {
          unique: true,
          partialFilterExpression: { deletedAt: null },
          name: TARGET_INDEX_NAME,
          background: true,
        }
      );
      console.log(`  [SUCCESS] Partial unique index '${TARGET_INDEX_NAME}' created successfully.`);

      const updatedIndexes = await collection.indexes();
      console.log("\nUpdated indexes on 'employees' collection:");
      updatedIndexes.forEach((idx) => {
        console.log(` - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${Boolean(idx.unique)}, partial: ${Boolean(idx.partialFilterExpression)})`);
      });
      return;
    }
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
};

runMigration();
