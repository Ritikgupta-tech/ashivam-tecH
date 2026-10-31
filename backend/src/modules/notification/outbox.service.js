import OutboxJob from "../../models/outbox.model.js";
import {
  sendEmail,
  sendCompanyNotification,
} from "./email.service.js";

let workerTimer = null;
let isProcessing = false;
let hasPendingWork = false;

const WORKER_ID = `worker_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
const LEASE_DURATION_MS = 5 * 60 * 1000; // 5-minute lease before reclaiming crashed worker jobs

/**
 * Enqueue an email job into the transactional Outbox collection.
 * Supports passing a Mongoose session for transactional atomicity.
 */
export const enqueueOutboxEmail = async ({
  eventType = "EMAIL_DISPATCH",
  payload,
  dedupKey = null,
  maxAttempts = 5,
  session = null,
  autoProcess = true,
}) => {
  try {
    const doc = {
      eventType,
      payload,
      maxAttempts,
      status: "pending",
      nextAttemptAt: new Date(),
    };

    if (dedupKey) {
      doc.dedupKey = dedupKey;
    }

    const options = session ? { session } : {};
    const [job] = await OutboxJob.create([doc], options);

    // If participating in an active uncommitted transaction session,
    // do not dispatch immediately on a separate connection.
    if (autoProcess && !session) {
      processOutboxJob(job).catch((err) => {
        console.warn("[Outbox Worker] Immediate dispatch failure, will retry:", err.message);
      });
    }

    return job;
  } catch (error) {
    // If deduplication collision occurs, resolve gracefully to existing job
    if (error.code === 11000 && dedupKey) {
      const existing = await OutboxJob.findOne({ dedupKey });
      return existing;
    }
    throw error;
  }
};

/**
 * Atomically claims and processes a single outbox job with lease recovery and fencing.
 */
export const processOutboxJob = async (job) => {
  if (!job || !job._id) return null;

  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);

  // Atomic state lock: claim pending/failed jobs OR reclaim expired leases from crashed workers
  const claimed = await OutboxJob.findOneAndUpdate(
    {
      _id: job._id,
      $or: [
        { status: { $in: ["pending", "failed"] } },
        { status: "processing", leaseExpiresAt: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "processing",
        lockedAt: now,
        lockedBy: WORKER_ID,
        leaseExpiresAt,
      },
      $inc: {
        attempts: 1,
        fencingToken: 1,
      },
    },
    { returnDocument: "after" }
  );

  if (!claimed) {
    return null; // Another worker instance or thread already claimed or renewed this job
  }

  const currentFencingToken = claimed.fencingToken;

  try {
    let result;
    if (claimed.payload?.isCompanyAlert) {
      result = await sendCompanyNotification({
        replyTo: claimed.payload.replyTo,
        subject: claimed.payload.subject,
        text: claimed.payload.text,
        html: claimed.payload.html,
      });
    } else {
      result = await sendEmail({
        to: claimed.payload.to,
        replyTo: claimed.payload.replyTo,
        subject: claimed.payload.subject,
        text: claimed.payload.text,
        html: claimed.payload.html,
      });
    }

    if (result && result.accepted === false && !result.simulated) {
      throw new Error(result.error || "Email delivery was rejected by mailer transport");
    }

    // Atomic completion with fencing token validation: prevents stale workers from overwriting reclaimed jobs
    const finalUpdate = await OutboxJob.findOneAndUpdate(
      {
        _id: claimed._id,
        fencingToken: currentFencingToken,
      },
      {
        $set: {
          status: "sent",
          processedAt: new Date(),
          lastError: null,
          lockedBy: null,
          leaseExpiresAt: null,
        },
      },
      { returnDocument: "after" }
    );

    if (!finalUpdate) {
      console.warn(`[Outbox Worker] Job ${claimed._id} was reclaimed by another worker (fenced out).`);
      return { success: false, jobId: claimed._id, fenced: true };
    }

    return { success: true, jobId: claimed._id, result };
  } catch (error) {
    const errorMessage = error?.message || String(error);
    const isDeadLetter = claimed.attempts >= claimed.maxAttempts;
    const delayMs = Math.min(60000, Math.pow(2, claimed.attempts) * 2000);
    const nextAttemptAt = new Date(Date.now() + delayMs);

    await OutboxJob.findOneAndUpdate(
      {
        _id: claimed._id,
        fencingToken: currentFencingToken,
      },
      {
        $set: {
          status: isDeadLetter ? "dead_letter" : "failed",
          lastError: errorMessage,
          nextAttemptAt,
          lockedBy: null,
          leaseExpiresAt: null,
        },
      }
    );

    return { success: false, jobId: claimed._id, error: errorMessage };
  }
};

/**
 * Polls and drains pending/failed outbox jobs that are due for delivery,
 * including crashed worker jobs with expired leases.
 */
export const processPendingOutbox = async ({ batchSize = 10 } = {}) => {
  if (isProcessing) {
    hasPendingWork = true;
    return;
  }
  isProcessing = true;

  try {
    let hasMore = true;
    while (hasMore) {
      const now = new Date();

      const candidateJobs = await OutboxJob.find({
        $or: [
          {
            status: { $in: ["pending", "failed"] },
            nextAttemptAt: { $lte: now },
          },
          {
            status: "processing",
            leaseExpiresAt: { $lte: now },
          },
        ],
      })
        .sort({ nextAttemptAt: 1, createdAt: 1 })
        .limit(batchSize)
        .lean();

      if (!candidateJobs || candidateJobs.length === 0) {
        hasMore = false;
        break;
      }

      for (const job of candidateJobs) {
        await processOutboxJob(job);
      }

      if (candidateJobs.length < batchSize) {
        hasMore = false;
      }
    }
  } catch (error) {
    console.warn("[Outbox Worker] Batch processing error:", error.message);
  } finally {
    isProcessing = false;
    if (hasPendingWork) {
      hasPendingWork = false;
      triggerOutboxProcessing();
    }
  }
};

/**
 * Triggers an immediate asynchronous drain on next event-loop tick.
 */
export const triggerOutboxProcessing = () => {
  setImmediate(() => {
    processPendingOutbox().catch(() => {});
  });
};

/**
 * Starts the background outbox polling worker.
 */
export const startOutboxWorker = (intervalMs = 5000) => {
  if (workerTimer) return;

  workerTimer = setInterval(() => {
    processPendingOutbox().catch((err) => {
      console.warn("[Outbox Worker] Interval error:", err.message);
    });
  }, intervalMs);

  if (workerTimer.unref) {
    workerTimer.unref();
  }

  // Initial immediate drain on startup
  triggerOutboxProcessing();
};

/**
 * Gracefully terminates the background outbox worker.
 */
export const stopOutboxWorker = () => {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
};
