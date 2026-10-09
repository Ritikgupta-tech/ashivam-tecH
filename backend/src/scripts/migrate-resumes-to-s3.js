import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import env from "../config/env.js";
import Application from "../modules/career/application.model.js";

const migrateResumes = async () => {
  console.log("==================================================");
  console.log("ASHIVAM TECHNOLOGIES - RESUME S3 MIGRATION UTILITY");
  console.log("==================================================");

  if (!env.s3Bucket || !env.s3AccessKeyId || !env.s3SecretAccessKey) {
    console.error(
      "[Migration Error] S3 object storage is not fully configured."
    );
    console.error(
      "Required environment variables: S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY"
    );
    process.exitCode = 1;
    return;
  }

  const s3Config = {
    region: env.s3Region || "us-east-1",
    credentials: {
      accessKeyId: env.s3AccessKeyId,
      secretAccessKey: env.s3SecretAccessKey,
    },
  };

  if (env.s3Endpoint) {
    s3Config.endpoint = env.s3Endpoint;
  }
  if (env.s3ForcePathStyle) {
    s3Config.forcePathStyle = true;
  }

  const s3 = new S3Client(s3Config);

  try {
    console.log("[Migration] Connecting to MongoDB...");
    await mongoose.connect(env.mongodbUri);
    console.log("[Migration] Database connection established.");

    const applications = await Application.find({
      $or: [
        { "resume.storageProvider": { $ne: "s3" } },
        { "resume.storageProvider": { $exists: false } },
        { "resume.storageKey": null },
        { "resume.storageKey": { $exists: false } },
      ],
    });

    console.log(
      `[Migration] Found ${applications.length} application(s) requiring storage verification/migration.`
    );

    let migratedCount = 0;
    let missingLocalCount = 0;
    let alreadySyncedCount = 0;

    const uploadsDir = path.resolve(process.cwd(), "uploads");

    for (const app of applications) {
      if (!app.resume || !app.resume.fileName) {
        continue;
      }

      if (app.resume.storageProvider === "s3" && app.resume.storageKey) {
        alreadySyncedCount++;
        continue;
      }

      const storageKey =
        app.resume.storageKey || `resumes/${app.resume.fileName}`;

      // Check candidate local paths
      const candidates = [
        path.resolve(uploadsDir, "resumes", app.resume.fileName),
        path.resolve(uploadsDir, storageKey),
      ];
      if (app.resume.path) {
        candidates.push(path.resolve(process.cwd(), app.resume.path));
      }

      let localFilePath = null;
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          localFilePath = candidate;
          break;
        }
      }

      if (!localFilePath) {
        console.warn(
          `[Migration Notice] Application ${app._id} (${app.firstName} ${app.lastName}): file '${app.resume.fileName}' not found on local disk. Document preserved.`
        );
        missingLocalCount++;
        continue;
      }

      // Read and upload to S3
      const fileBuffer = await fs.promises.readFile(localFilePath);

      await s3.send(
        new PutObjectCommand({
          Bucket: env.s3Bucket,
          Key: storageKey,
          Body: fileBuffer,
          ContentType: app.resume.mimeType || "application/pdf",
          ServerSideEncryption: "AES256",
        })
      );

      await Application.updateOne(
        { _id: app._id },
        {
          $set: {
            "resume.storageProvider": "s3",
            "resume.storageKey": storageKey,
          },
        }
      );

      console.log(
        `[Migration Success] Application ${app._id} migrated to S3 (${storageKey}).`
      );
      migratedCount++;
    }

    console.log("--------------------------------------------------");
    console.log("[Migration Summary]");
    console.log(`- Total inspected: ${applications.length}`);
    console.log(`- Successfully uploaded to S3: ${migratedCount}`);
    console.log(`- Missing on local filesystem: ${missingLocalCount}`);
    console.log(`- Already synced: ${alreadySyncedCount}`);
    console.log("--------------------------------------------------");
  } catch (error) {
    console.error("[Migration Error] Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("[Migration] Database connection closed.");
  }
};

migrateResumes();
