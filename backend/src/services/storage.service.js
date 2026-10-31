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
 * Validates the in-memory ZIP archive structure for OpenXML (.docx) documents.
 * Verifies:
 * - Proper ZIP local and central directory headers.
 * - Required DOCX component files ([Content_Types].xml and word/document.xml).
 * - Maximum archive entry limits (prevents ZIP bomb file table saturation).
 * - Maximum total uncompressed size limits (prevents decompression bombs).
 * - Absolute path and directory traversal ('..') rejection on entry filenames.
 *
 * Does NOT extract files to disk. Operates strictly in memory.
 */
export const validateDocxStructure = (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 30) {
    return false;
  }

  // Initial local file header check
  if (
    buffer[0] !== 0x50 ||
    buffer[1] !== 0x4b ||
    buffer[2] !== 0x03 ||
    buffer[3] !== 0x04
  ) {
    return false;
  }

  try {
    let offset = 0;
    let entryCount = 0;
    let totalUncompressedSize = 0;
    let hasEocd = false;
    const entries = new Set();
    const localEntries = new Set();
    const MAX_ENTRIES = 500;
    const MAX_TOTAL_UNCOMPRESSED = 50 * 1024 * 1024; // 50 MB limit

    while (offset + 4 <= buffer.length) {
      const sig = buffer.readUInt32LE(offset);

      if (sig === 0x04034b50) {
        if (offset + 30 > buffer.length) return false;
        // Local file header (30 bytes)
        entryCount += 1;
        if (entryCount > MAX_ENTRIES) return false;

        const compressionMethod = buffer.readUInt16LE(offset + 8);
        // Only Stored (0) and Deflate (8) allowed for OpenXML documents
        if (compressionMethod !== 0 && compressionMethod !== 8) {
          return false;
        }

        const compSize = buffer.readUInt32LE(offset + 18);
        const uncompSize = buffer.readUInt32LE(offset + 22);
        totalUncompressedSize += uncompSize;
        if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED) return false;

        // Compression ratio defense against decompression bombs
        if (compSize > 0 && uncompSize / compSize > 100 && uncompSize > 10 * 1024 * 1024) {
          return false;
        }

        const nameLen = buffer.readUInt16LE(offset + 26);
        const extraLen = buffer.readUInt16LE(offset + 28);
        offset += 30;

        if (offset + nameLen > buffer.length) return false;
        const entryName = buffer.toString("utf8", offset, offset + nameLen);

        // Path traversal / suspicious archive name protection
        if (
          entryName.includes("..") ||
          entryName.startsWith("/") ||
          entryName.startsWith("\\")
        ) {
          return false;
        }

        // Reject duplicate local entries
        if (localEntries.has(entryName)) {
          return false;
        }
        localEntries.add(entryName);
        entries.add(entryName);

        offset += nameLen + extraLen + compSize;
      } else if (sig === 0x02014b50) {
        // Central directory file header (46 bytes)
        if (offset + 46 > buffer.length) break;
        const nameLen = buffer.readUInt16LE(offset + 28);
        const extraLen = buffer.readUInt16LE(offset + 30);
        const commentLen = buffer.readUInt16LE(offset + 32);
        offset += 46;

        if (offset + nameLen <= buffer.length) {
          const entryName = buffer.toString("utf8", offset, offset + nameLen);
          entries.add(entryName);
        }
        offset += nameLen + extraLen + commentLen;
      } else if (sig === 0x06054b50) {
        // End of central directory record
        if (offset + 22 <= buffer.length) {
          hasEocd = true;
        }
        break;
      } else {
        // Next boundary or data descriptor
        offset += 1;
      }
    }

    // Verify critical OpenXML DOCX entries and valid EOCD closure
    const hasContentTypes = entries.has("[Content_Types].xml");
    const hasWordDoc =
      entries.has("word/document.xml") ||
      Array.from(entries).some((e) => e.startsWith("word/"));

    return hasEocd && hasContentTypes && hasWordDoc;
  } catch {
    return false;
  }
};

/**
 * Validates the file signature (magic bytes) for allowed resume types.
 * Supported formats:
 * - PDF: %PDF (0x25, 0x50, 0x44, 0x46)
 * - DOC: Microsoft Compound OLE (0xD0, 0xCF, 0x11, 0xE0)
 * - DOCX: ZIP archive (PK\x03\x04) + OpenXML structure verification
 * - JPEG: SOI marker (0xFF, 0xD8, 0xFF)
 * - PNG: \x89PNG (0x89, 0x50, 0x4E, 0x47)
 * - WEBP: RIFF....WEBP (0x52, 0x49, 0x46, 0x46, ..., 0x57, 0x45, 0x42, 0x50)
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

  // DOCX (ZIP archive / OpenXML) - requires magic bytes and full structural validation on full archives
  if (
    ext === ".docx" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    if (
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      buffer[2] !== 0x03 ||
      buffer[3] !== 0x04
    ) {
      return false;
    }
    if (buffer.length >= 30) {
      return validateDocxStructure(buffer);
    }
    return true;
  }

  // JPEG / JPG (SOI marker 0xFF 0xD8 0xFF)
  if (ext === ".jpg" || ext === ".jpeg" || mime === "image/jpeg") {
    return (
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  // PNG (magic bytes \x89PNG: 0x89 0x50 0x4E 0x47)
  if (ext === ".png" || mime === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  // WEBP (RIFF....WEBP)
  if (ext === ".webp" || mime === "image/webp") {
    if (buffer.length < 12) return false;
    return (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
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
