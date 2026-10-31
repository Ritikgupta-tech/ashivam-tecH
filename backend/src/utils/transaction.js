import mongoose from "mongoose";

/**
 * Checks whether the active MongoDB connection topology supports multi-document transactions.
 * Transactions require a replica set primary, a sharded mongos, or a load-balanced cluster.
 * Standalone topologies (single-node instances) do NOT support multi-document transactions.
 *
 * @returns {boolean} True if transactions are supported, false otherwise.
 */
export const supportsTransactions = () => {
  try {
    if (mongoose.connection.readyState !== 1) return false;
    const client = mongoose.connection.getClient
      ? mongoose.connection.getClient()
      : mongoose.connection.client;
    const topology = client?.topology;
    const type = topology?.description?.type;

    if (
      type === "ReplicaSetWithPrimary" ||
      type === "Sharded" ||
      type === "LoadBalanced"
    ) {
      return true;
    }

    // Direct connections to a replica set primary or mongos also support multi-document transactions
    if (topology?.description?.servers) {
      for (const server of topology.description.servers.values()) {
        if (server.type === "RSPrimary" || server.type === "Mongos") {
          return true;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
};

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
  if (!supportsTransactions()) {
    return callback(null);
  }

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

    // Gracefully handle topologies that report supporting transactions but fail at execution time
    const isTopologyError =
      error &&
      (error.name === "MongoServerError" || error.name === "MongoError") &&
      (error.message?.includes("Transaction numbers are only allowed on a replica set member or mongos") ||
        error.message?.includes("does not support retryable writes"));

    if (isTopologyError) {
      return callback(null);
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
