import mongoose from "mongoose";
import env from "../config/env.js";

export const APPROVED_TEST_DB_REGEX = /(_test|_test_[a-zA-Z0-9_-]+|isolated)$/i;

export function extractDatabaseName(uri) {
  try {
    const clean = uri.replace(/^mongodb(\+srv)?:\/\//, 'http://');
    const parsed = new URL(clean);
    const pathname = parsed.pathname.replace(/^\//, '').split('?')[0];
    return pathname || '';
  } catch {
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : '';
  }
}

export function validateDatabaseSafety(uri, isTest = (
  process.env.NODE_ENV === 'test' ||
  Boolean(process.env.NODE_TEST_CONTEXT) ||
  env.isTest ||
  process.argv.some(a => typeof a === 'string' && /test/i.test(a))
)) {
  const dbName = extractDatabaseName(uri);
  if (isTest) {
    if (!dbName || !APPROVED_TEST_DB_REGEX.test(dbName)) {
      throw new Error(
        `[FATAL DATA SAFETY VIOLATION] Test execution blocked! Attempted to connect to non-test database: "${dbName}". Tests must target a database matching /_test$/ to protect operational data.`
      );
    }
    if ((uri.includes('mongodb+srv://') || uri.includes('.mongodb.net')) && process.env.ALLOW_REMOTE_TEST_DB !== 'true') {
      throw new Error(
        `[FATAL DATA SAFETY VIOLATION] Test execution against remote cloud MongoDB host is blocked to prevent data contamination.`
      );
    }
  } else if (process.env.NODE_ENV === 'production' || env.isProduction) {
    if (dbName && APPROVED_TEST_DB_REGEX.test(dbName)) {
      throw new Error(
        `[FATAL DATA SAFETY VIOLATION] Production startup blocked! Production cannot connect to test database: "${dbName}".`
      );
    }
  }
  return dbName;
}

let isConnecting = false;

export const connectDatabase = async (customUri = null) => {
  const uri = customUri || env.mongodbUri;
  const isTest = (
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.NODE_TEST_CONTEXT) ||
    env.isTest ||
    process.argv.some(a => typeof a === 'string' && /test/i.test(a))
  );

  validateDatabaseSafety(uri, isTest);

  if (mongoose.connection.readyState === 1) {
    const activeDbName = mongoose.connection.name;
    if (isTest && !APPROVED_TEST_DB_REGEX.test(activeDbName)) {
      await mongoose.disconnect();
      throw new Error(
        `[FATAL DATA SAFETY VIOLATION] Active connection database "${activeDbName}" violates test naming policy.`
      );
    }
    return mongoose.connection;
  }

  if (isConnecting) {
    return;
  }

  isConnecting = true;

  try {
    const options = {
      autoIndex: !env.isProduction,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    };

    await mongoose.connect(uri, options);
    const activeDbName = mongoose.connection.name;
    if (isTest && !APPROVED_TEST_DB_REGEX.test(activeDbName)) {
      await mongoose.disconnect();
      throw new Error(
        `[FATAL DATA SAFETY VIOLATION] Active connection database "${activeDbName}" violates test naming policy.`
      );
    }
    console.log(`[Database] MongoDB connected successfully: ${activeDbName}`);
  } catch (error) {
    console.error("[Database] MongoDB connection failed:", error.message);
    if (!isTest) {
      process.exit(1);
    }
    throw error;
  } finally {
    isConnecting = false;
  }

  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log("[Database] MongoDB connection closed cleanly");
  }
};

export const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

mongoose.connection.on("disconnected", () => {
  if (!env.isTest) {
    console.warn("[Database] MongoDB disconnected. Awaiting automatic reconnect...");
  }
});

mongoose.connection.on("reconnected", () => {
  console.log("[Database] MongoDB reconnected successfully");
});

mongoose.connection.on("error", (err) => {
  console.error("[Database] MongoDB runtime error:", err.message);
});