import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import env from "../config/env.js";

let s3ClientInstance = null;

const getS3Client = () => {
  if (!s3ClientInstance) {
    const clientConfig = {
      region: env.s3Region || "us-east-1",
    };

    if (env.s3Endpoint) {
      clientConfig.endpoint = env.s3Endpoint;
    }

    if (env.s3ForcePathStyle) {
      clientConfig.forcePathStyle = true;
    }

    if (env.s3AccessKeyId && env.s3SecretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: env.s3AccessKeyId,
        secretAccessKey: env.s3SecretAccessKey,
      };
    }

    s3ClientInstance = new S3Client(clientConfig);
  }

  return s3ClientInstance;
};

/**
 * Validates the file signature (magic bytes) for allowed resume types.
 * Supported formats:
 * - PDF: %PDF (0x25, 0x50, 0x44, 0x46)
 * - DOC: Microsoft Compound OLE (0xD0, 0xCF, 0x11, 0xE0)
 * - DOCX: ZIP archive (PK\x03\x04: 0x50, 0x4B, 0x03, 0x04)
 */
export const validateFileSignature = (buffer, mimeType = "", extension = "") => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 4) {
    return false;
  }

  const ext = (extension || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();

  // PDF
  if (ext === ".pdf" || mime === "application/pdf") {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }

  // DOC (legacy Microsoft Word OLE)
  if (ext === ".doc" || mime === "application/msword") {
    return (
      buffer[0] === 0xd0 &&
      buffer[1] === 0xcf &&
      buffer[2] === 0x11 &&
      buffer[3] === 0xe0
    );
  }

  // DOCX (ZIP archive / OpenXML)
  if (
    ext === ".docx" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

  return false;
};

/**
 * Sanitizes original filename for safe Content-Disposition headers.
 * Strips path separators, control characters, quotes, and dangerous extensions.
 */
export const sanitizeDownloadFilename = (originalName = "resume.pdf") => {
  const base = path.win32.basename(String(originalName)).replace(/\0/g, "");
  const safe = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  const ext = path.win32.extname(safe).toLowerCase();
  const nameWithoutExt = path.win32.basename(safe, ext).replace(/^\.+/, "") || "document";
  const allowedExts = [".pdf", ".doc", ".docx"];
  const finalExt = allowedExts.includes(ext) ? ext : ".pdf";
  return `${nameWithoutExt.slice(0, 80)}${finalExt}`;
};

/**
 * Uploads a file buffer to the configured storage provider (S3 or local disk).
 */
export const uploadFile = async ({
  buffer,
  originalName,
  mimeType,
  folder = "resumes",
}) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    const error = new Error("File buffer is required for upload");
    error.statusCode = 400;
    throw error;
  }

  const extension = path.extname(originalName || "").toLowerCase();
  const safeUUID = crypto.randomUUID();
  const fileName = `${Date.now()}-${safeUUID}${extension}`;
  const storageKey = `${folder}/${fileName}`;

  const provider = env.storageProvider === "s3" ? "s3" : "local";

  if (provider === "s3") {
    if (!env.s3Bucket) {
      const error = new Error(
        "S3_BUCKET is not configured for object storage"
      );
      error.statusCode = 500;
      throw error;
    }

    const s3 = getS3Client();
    const command = new PutObjectCommand({
      Bucket: env.s3Bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
      ServerSideEncryption: "AES256",
    });

    try {
      await s3.send(command);
    } catch (s3Err) {
      console.error("[Storage] S3 PutObject error:", s3Err.message);
      const error = new Error("Failed to store file in object storage");
      error.statusCode = 502;
      throw error;
    }

    return {
      storageProvider: "s3",
      storageKey,
      fileName,
      size: buffer.length,
      mimeType,
    };
  }

  // Local storage adapter (development & test)
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const targetDir = path.resolve(uploadsDir, folder);
  await fs.promises.mkdir(targetDir, { recursive: true });

  const localPath = path.resolve(targetDir, fileName);
  await fs.promises.writeFile(localPath, buffer);

  return {
    storageProvider: "local",
    storageKey,
    fileName,
    path: localPath,
    size: buffer.length,
    mimeType,
  };
};

/**
 * Retrieves a file read stream from S3 or local storage, with path traversal defense
 * and backward-compatible fallback for legacy local records.
 */
export const getFileStream = async ({
  storageProvider,
  storageKey,
  legacyPath,
  fileName,
  folder = "resumes",
}) => {
  const isS3 = storageProvider === "s3";

  if (isS3) {
    if (!env.s3Bucket) {
      const error = new Error(
        "S3_BUCKET is not configured for object storage"
      );
      error.statusCode = 500;
      throw error;
    }

    const s3 = getS3Client();
    const command = new GetObjectCommand({
      Bucket: env.s3Bucket,
      Key: storageKey,
    });

    try {
      const response = await s3.send(command);
      return {
        stream: response.Body,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
      };
    } catch (s3Err) {
      if (
        s3Err.name === "NoSuchKey" ||
        s3Err.$metadata?.httpStatusCode === 404
      ) {
        const error = new Error("Resume file not found in storage");
        error.statusCode = 404;
        throw error;
      }
      console.error("[Storage] S3 GetObject error:", s3Err.message);
      const error = new Error(
        "Storage service temporarily unavailable"
      );
      error.statusCode = 502;
      throw error;
    }
  }

  // Local filesystem resolution (with path traversal defense and fallback)
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  const candidatePaths = [];

  if (storageKey) {
    candidatePaths.push(path.resolve(uploadsDir, storageKey));
  }
  if (fileName) {
    candidatePaths.push(path.resolve(uploadsDir, folder, fileName));
  }
  if (legacyPath) {
    candidatePaths.push(path.resolve(process.cwd(), legacyPath));
  }

  for (const candidate of candidatePaths) {
    const normalizedCandidate = path.normalize(candidate);
    // Path traversal defense: ensure resolved path is inside the project uploads directory
    if (!normalizedCandidate.startsWith(uploadsDir)) {
      continue;
    }

    try {
      await fs.promises.access(normalizedCandidate, fs.constants.R_OK);
      const stats = await fs.promises.stat(normalizedCandidate);
      const stream = fs.createReadStream(normalizedCandidate);
      return {
        stream,
        contentLength: stats.size,
        contentType: null,
      };
    } catch {
      // Continue checking next candidate
    }
  }

  const error = new Error("Resume file not found in storage");
  error.statusCode = 404;
  throw error;
};

/**
 * Deletes a file from S3 or local storage. Idempotent and fails safe.
 */
export const deleteFile = async ({
  storageProvider,
  storageKey,
  legacyPath,
  fileName,
  folder = "resumes",
}) => {
  try {
    if (storageProvider === "s3") {
      if (env.s3Bucket && storageKey) {
        const s3 = getS3Client();
        await s3.send(
          new DeleteObjectCommand({
            Bucket: env.s3Bucket,
            Key: storageKey,
          })
        );
      }
      return true;
    }

    // Local storage
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const candidatePaths = [];

    if (storageKey) {
      candidatePaths.push(path.resolve(uploadsDir, storageKey));
    }
    if (fileName) {
      candidatePaths.push(path.resolve(uploadsDir, folder, fileName));
    }
    if (legacyPath) {
      candidatePaths.push(path.resolve(process.cwd(), legacyPath));
    }

    for (const candidate of candidatePaths) {
      const normalized = path.normalize(candidate);
      if (normalized.startsWith(uploadsDir)) {
        try {
          await fs.promises.unlink(normalized);
        } catch (e) {
          if (e.code !== "ENOENT") {
            // Ignore other non-fatal errors
          }
        }
      }
    }

    return true;
  } catch (err) {
    console.warn("[Storage] Non-fatal deleteFile error:", err.message);
    return false;
  }
};
