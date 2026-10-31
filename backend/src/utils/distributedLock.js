import crypto from "crypto";
import mongoose from "mongoose";
import env from "../config/env.js";
import SystemLock from "../models/systemLock.model.js";

const inProcessLocks = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createLockHandle(token, fencingToken = 1) {
  return {
    token,
    fencingToken,
    toString() {
      return this.token;
    },
    valueOf() {
      return this.token;
    },
  };
}

/**
 * Acquire a distributed lock backed by MongoDB, with automatic lease expiry (TTL),
 * monotonic fencing token increment, and token-based release validation.
 *
 * @param {string} lockKey
 * @param {object} options
 * @param {number} options.ttlMs - Lease duration in ms before lock auto-expires (default: 15000)
 * @param {number} options.timeoutMs - Max wait time to acquire lock before erroring (default: 30000)
 * @param {number} options.retryIntervalMs - Base polling interval between attempts (default: 40)
 * @returns {Promise<{token: string, fencingToken: number}>} Unique acquisition token and fencing sequence
 */
export const acquireDistributedLock = async (
  lockKey,
  {
    ttlMs = 15000,
    timeoutMs = 30000,
    retryIntervalMs = 40,
  } = {}
) => {
  if (mongoose.connection.readyState !== 1) {
    if (env.isProduction) {
      const err = new Error(
        `[DistributedLock] Cannot acquire lock '${lockKey}': Database connection is down.`
      );
      err.statusCode = 503;
      throw err;
    }
    // If MongoDB is not ready in test/dev (e.g. pure unit test mock), return an in-process token
    return createLockHandle(`in_memory_${process.pid}_${crypto.randomUUID()}`, 1);
  }

  const token = `${Date.now()}_${process.pid}_${crypto.randomUUID()}`;
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    // 1. Try to take over an expired lease with an incremented monotonic fencing token
    try {
      const acquiredExpired = await SystemLock.findOneAndUpdate(
        {
          _id: lockKey,
          expiresAt: { $lte: now },
        },
        {
          $set: {
            token,
            acquiredAt: now,
            expiresAt,
          },
          $inc: {
            fencingToken: 1,
          },
        },
        { returnDocument: "after" }
      );

      if (acquiredExpired) {
        return createLockHandle(token, acquiredExpired.fencingToken || 1);
      }
    } catch (err) {
      // Ignore query error and fall through to insert
    }

    // 2. Try to insert new lock document if it doesn't exist (initial fencing token 1)
    try {
      const created = await SystemLock.create({
        _id: lockKey,
        token,
        fencingToken: 1,
        acquiredAt: now,
        expiresAt,
      });
      return createLockHandle(token, created.fencingToken || 1);
    } catch (err) {
      if (err.code !== 11000) {
        throw err;
      }
    }

    // Lock is held by another process/instance; wait with randomized jitter to prevent resonance
    const jitter = Math.floor(Math.random() * 25);
    await sleep(retryIntervalMs + jitter);
  }

  throw new Error(`[DistributedLock] Timed out waiting to acquire lock '${lockKey}' after ${timeoutMs}ms`);
};

/**
 * Release a previously acquired distributed lock if the token matches.
 *
 * @param {string} lockKey
 * @param {string|object} tokenOrLock
 */
export const releaseDistributedLock = async (lockKey, tokenOrLock) => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  const token =
    typeof tokenOrLock === "object" && tokenOrLock !== null
      ? tokenOrLock.token
      : tokenOrLock;

  try {
    // Ensure we only release the lock if it was not overtaken by an expiry lease
    await SystemLock.deleteOne({ _id: lockKey, token });
  } catch (err) {
    console.warn(`[DistributedLock] Error releasing lock '${lockKey}':`, err.message);
  }
};

/**
 * Assert that the lock is currently held by the specified token and has not expired.
 * Throws an error (with statusCode 409) if the lock was lost, preempted, or expired.
 *
 * @param {string} lockKey
 * @param {string|object} tokenOrLock
 * @returns {Promise<{ isHeld: boolean, fencingToken: number }>}
 */
export const assertLockHeld = async (lockKey, tokenOrLock) => {
  if (mongoose.connection.readyState !== 1) {
    if (env.isProduction) {
      const err = new Error(
        `[DistributedLock] Cannot verify lock '${lockKey}': Database connection is down.`
      );
      err.statusCode = 503;
      throw err;
    }
    return { isHeld: true, fencingToken: 1 };
  }

  const token =
    typeof tokenOrLock === "object" && tokenOrLock !== null
      ? tokenOrLock.token
      : tokenOrLock;

  const now = new Date();
  const currentLock = await SystemLock.findOne({
    _id: lockKey,
    token,
    expiresAt: { $gt: now },
  });

  if (!currentLock) {
    const err = new Error(
      `[DistributedLock] Fencing violation: Lock '${lockKey}' is no longer held by current worker or lease expired.`
    );
    err.statusCode = 409;
    throw err;
  }

  return { isHeld: true, fencingToken: currentLock.fencingToken };
};

/**
 * Execute a critical section wrapped with both in-process serialization
 * and cluster-wide distributed MongoDB locking.
 *
 * @param {string} lockKey - Identifier for the resource/lock
 * @param {Function} fn - Async task to execute within lock
 * @param {object} options
 */
export const withDistributedLock = async (lockKey, fn, options = {}) => {
  const {
    ttlMs = 15000,
    timeoutMs = 30000,
    retryIntervalMs = 40,
  } = options;

  // 1. In-process queue: serialize requests within this Node.js instance
  let releaseInProcess;
  const nextInProcessLock = new Promise((resolve) => {
    releaseInProcess = resolve;
  });

  const previousInProcessLock = inProcessLocks.get(lockKey) || Promise.resolve();
  inProcessLocks.set(lockKey, previousInProcessLock.then(() => nextInProcessLock));

  await previousInProcessLock;

  // 2. Distributed lock: serialize across all Node.js instances / Render processes
  let distributedLockHandle = null;
  let heartbeatTimer = null;
  try {
    distributedLockHandle = await acquireDistributedLock(lockKey, {
      ttlMs,
      timeoutMs,
      retryIntervalMs,
    });
    const distributedToken = distributedLockHandle.token;
    const fencingToken = distributedLockHandle.fencingToken;

    // Active lease renewal: while fn() executes, extend expiresAt periodically
    const renewalIntervalMs = Math.max(50, Math.floor(ttlMs / 3));
    heartbeatTimer = setInterval(async () => {
      try {
        if (mongoose.connection.readyState === 1 && distributedToken) {
          await SystemLock.updateOne(
            { _id: lockKey, token: distributedToken },
            { $set: { expiresAt: new Date(Date.now() + ttlMs) } }
          );
        }
      } catch (err) {
        // Non-fatal lease extension glitch
      }
    }, renewalIntervalMs);
    if (heartbeatTimer.unref) {
      heartbeatTimer.unref();
    }

    return await fn({
      lockToken: distributedToken,
      fencingToken,
      token: distributedToken,
      assertHeld: () => assertLockHeld(lockKey, distributedToken),
    });
  } finally {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
    }
    if (distributedLockHandle) {
      await releaseDistributedLock(lockKey, distributedLockHandle);
    }
    releaseInProcess();
  }
};
