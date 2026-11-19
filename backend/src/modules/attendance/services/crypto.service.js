import crypto from "crypto";
import env from "../../../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM

const getEncryptionKey = () => {
  const rawKey = env.googleTokenEncryptionKey || "ashivam_default_key_32_characters_min!";
  return crypto.createHash("sha256").update(String(rawKey)).digest();
};

/**
 * Encrypts sensitive string (e.g. Google refresh token) using AES-256-GCM.
 * Returns { encryptedText, iv, authTag }
 */
export const encryptSecret = (plainText) => {
  if (!plainText || typeof plainText !== "string") {
    return { encryptedText: null, iv: null, authTag: null };
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return {
    encryptedText: encrypted,
    iv: iv.toString("hex"),
    authTag,
  };
};

/**
 * Decrypts AES-256-GCM ciphertext using the stored iv and authTag.
 * Throws an error if ciphertext or tag was tampered with.
 */
export const decryptSecret = ({ encryptedText, iv, authTag }) => {
  if (!encryptedText || !iv || !authTag) {
    return null;
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(iv, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
