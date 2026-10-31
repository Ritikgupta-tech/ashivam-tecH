import mongoose from "mongoose";

/**
 * Executes a callback within a MongoDB session/transaction if the underlying
 * MongoDB topology supports multi-document transactions (e.g. ReplicaSet / Mongos).
 * Gracefully falls back to non-transactional execution on standalone topologies
 * (such as local single-node test instances).
 *
 * @param {Function} callback - Async function receiving (session) => Promise<T>
 * @returns {Promise<T>} The result returned by callback
 */
export const withOptionalTransaction = async (callback) => {
  let session = null;
  let transactionStarted = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    transactionStarted = true;
  } catch {
    // Standalone MongoDB or environment where transactions are unsupported
    if (session) {
      try {
        await session.endSession();
      } catch {
        // Suppress session cleanup error
      }
      session = null;
    }
  }

  if (!transactionStarted || !session) {
    return callback(null);
  }

  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch {
      // Suppress abort error
    }
    throw error;
  } finally {
    try {
      await session.endSession();
    } catch {
      // Suppress endSession error
    }
  }
};
