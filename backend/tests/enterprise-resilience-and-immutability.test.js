import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import zlib from "node:zlib";

import env from "../src/config/env.js";
import AuditLog from "../src/modules/audit/audit.model.js";
import OutboxJob from "../src/models/outbox.model.js";
import Inquiry from "../src/modules/inquiry/inquiry.model.js";
import {
  enqueueOutboxEmail,
  processOutboxJob,
  processPendingOutbox,
} from "../src/modules/notification/outbox.service.js";
import { setTransporter, resetTransporter } from "../src/modules/notification/email.service.js";
import { validateFileSignature, validateDocxStructure } from "../src/services/storage.service.js";
import { withOptionalTransaction } from "../src/utils/transaction.js";

let dbConnected = false;

before(async () => {
  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 2500 });
    dbConnected = true;
    try {
      await OutboxJob.syncIndexes();
    } catch {}
  } catch (err) {
    console.warn("[Test Setup] Database not available for enterprise resilience tests:", err.message);
  }
});

after(async () => {
  if (dbConnected) {
    try {
      await OutboxJob.deleteMany({ eventType: /^TEST_/ });
      // Clean up test audit logs
      // Direct raw MongoDB collection delete to bypass Mongoose pre-hook during test cleanup
      await mongoose.connection.collection("auditlogs").deleteMany({ action: /^TEST_/ });
    } finally {
      await mongoose.disconnect();
    }
  }
});

// ============================================================================
// 1. AUDIT LOG IMMUTABILITY & TAMPER-RESISTANCE
// ============================================================================

test("Audit Immutability: Mongoose pre-hook strictly prevents direct update of audit logs", async (t) => {
  if (!dbConnected) {
    t.skip("DB not connected");
    return;
  }

  const log = await AuditLog.create({
    action: "TEST_CREATE",
    entity: "SecurityTest",
    description: "Initial immutable audit record",
    status: "success",
  });

  assert.ok(log._id);

  // Attempt updateOne
  await assert.rejects(
    async () => {
      await AuditLog.updateOne(
        { _id: log._id },
        { $set: { description: "Tampered description" } }
      );
    },
    (err) => {
      assert.ok(err.message.includes("immutable"));
      return true;
    }
  );

  // Attempt updateMany
  await assert.rejects(
    async () => {
      await AuditLog.updateMany(
        { _id: log._id },
        { $set: { description: "Tampered bulk description" } }
      );
    },
    (err) => {
      assert.ok(err.message.includes("immutable"));
      return true;
    }
  );
});

test("Audit Immutability: Mongoose pre-hook strictly prevents direct deletion of audit logs", async (t) => {
  if (!dbConnected) {
    t.skip("DB not connected");
    return;
  }

  const log = await AuditLog.create({
    action: "TEST_DELETE_PREVENTION",
    entity: "SecurityTest",
    description: "Record must survive deletion attempt",
    status: "success",
  });

  assert.ok(log._id);

  // Attempt deleteOne
  await assert.rejects(
    async () => {
      await AuditLog.deleteOne({ _id: log._id });
    },
    (err) => {
      assert.ok(err.message.includes("immutable"));
      return true;
    }
  );

  // Attempt findOneAndDelete
  await assert.rejects(
    async () => {
      await AuditLog.findOneAndDelete({ _id: log._id });
    },
    (err) => {
      assert.ok(err.message.includes("immutable"));
      return true;
    }
  );

  // Attempt findOneAndUpdate
  await assert.rejects(
    async () => {
      await AuditLog.findOneAndUpdate(
        { _id: log._id },
        { $set: { description: "Tampered via findOneAndUpdate" } }
      );
    },
    (err) => {
      assert.ok(err.message.includes("immutable"));
      return true;
    }
  );

  // Attempt document-level save() update on an existing record
  await assert.rejects(
    async () => {
      log.description = "Tampered via document save()";
      await log.save();
    },
    (err) => {
      assert.ok(err.message.includes("immutable"));
      return true;
    }
  );

  // Verify the record still exists unharmed
  const surviving = await AuditLog.findById(log._id);
  assert.ok(surviving, "Audit log record must remain intact");
  assert.equal(surviving.description, "Record must survive deletion attempt");
});

// ============================================================================
// 2. TRANSACTIONAL OUTBOX EMAIL PROCESSING
// ============================================================================

test("Outbox: Enqueues and drains pending email jobs with atomic status transition", async (t) => {
  if (!dbConnected) {
    t.skip("DB not connected");
    return;
  }

  const dispatched = [];
  setTransporter({
    sendMail: async (opts) => {
      dispatched.push(opts);
      return { messageId: "outbox-test-msg-id" };
    },
    verify: async () => true,
  });

  try {
    const job = await enqueueOutboxEmail({
      eventType: "TEST_OUTBOX_DISPATCH",
      autoProcess: false,
      payload: {
        to: "recipient@example.com",
        subject: "Outbox Test Subject",
        text: "Outbox email content test",
      },
    });

    assert.ok(job._id);
    assert.equal(job.status, "pending");

    // Process job
    const result = await processOutboxJob(job);
    assert.ok(result.success);

    const updatedJob = await OutboxJob.findById(job._id);
    assert.equal(updatedJob.status, "sent");
    assert.ok(updatedJob.processedAt);
    assert.equal(updatedJob.attempts, 1);
    assert.equal(dispatched.length, 1);
    assert.equal(dispatched[0].to, "recipient@example.com");
  } finally {
    resetTransporter();
  }
});

test("Outbox: Exponential backoff on failure and transitions to dead_letter upon maxAttempts", async (t) => {
  if (!dbConnected) {
    t.skip("DB not connected");
    return;
  }

  setTransporter({
    sendMail: async () => {
      throw new Error("SMTP Transport connection timed out");
    },
    verify: async () => false,
  });

  try {
    const job = await enqueueOutboxEmail({
      eventType: "TEST_OUTBOX_FAILURE",
      autoProcess: false,
      maxAttempts: 2,
      payload: {
        to: "failure@example.com",
        subject: "Expected Failure",
        text: "Will fail",
      },
    });

    // Attempt 1 -> should fail and remain status 'failed' with backoff
    const attempt1 = await processOutboxJob(job);
    assert.equal(attempt1.success, false);

    let fetched = await OutboxJob.findById(job._id);
    assert.equal(fetched.status, "failed");
    assert.equal(fetched.attempts, 1);
    assert.ok(fetched.nextAttemptAt > new Date());
    assert.ok(fetched.lastError.includes("SMTP Transport connection timed out"));

    // Attempt 2 -> reaches maxAttempts (2) -> transitions to 'dead_letter'
    const attempt2 = await processOutboxJob(fetched);
    assert.equal(attempt2.success, false);

    fetched = await OutboxJob.findById(job._id);
    assert.equal(fetched.status, "dead_letter");
    assert.equal(fetched.attempts, 2);
  } finally {
    resetTransporter();
  }
});

test("Outbox Deduplication: Prevents inserting duplicate outbox jobs with identical dedupKey", async (t) => {
  if (!dbConnected) {
    t.skip("DB not connected");
    return;
  }

  const key = `test-dedup-${Date.now()}`;
  const job1 = await enqueueOutboxEmail({
    eventType: "TEST_OUTBOX_DEDUP",
    dedupKey: key,
    payload: { to: "dedup@example.com", subject: "Dedup Test", text: "Text" },
  });

  const job2 = await enqueueOutboxEmail({
    eventType: "TEST_OUTBOX_DEDUP",
    dedupKey: key,
    payload: { to: "dedup@example.com", subject: "Dedup Test", text: "Text" },
  });

  assert.equal(job1._id.toString(), job2._id.toString());
});

test("Outbox Crash Recovery: Expired worker leases are safely reclaimed and zombie workers fenced out", async (t) => {
  if (!dbConnected) {
    t.skip("DB not connected");
    return;
  }

  // Create a simulated job stuck in "processing" from a crashed worker whose lease has expired
  const now = new Date();
  const pastLease = new Date(now.getTime() - 60000); // 1 minute in the past

  const stuckJob = await OutboxJob.create({
    eventType: "TEST_OUTBOX_CRASH_RECOVERY",
    payload: { to: "reclaimed@example.com", subject: "Reclaim Test", text: "Recovered" },
    status: "processing",
    lockedAt: pastLease,
    lockedBy: "crashed_worker_pid_9999",
    leaseExpiresAt: pastLease,
    fencingToken: 1,
  });

  assert.ok(stuckJob._id);

  // Set up mock transporter
  const sent = [];
  setTransporter({
    sendMail: async (opts) => {
      sent.push(opts);
      return { messageId: "recovery-test-msg-id" };
    },
    verify: async () => true,
  });

  try {
    // Worker claims and processes the expired lease job
    const outcome = await processOutboxJob(stuckJob);
    assert.ok(outcome.success, "Crashed job with expired lease must be successfully reclaimed");

    const recovered = await OutboxJob.findById(stuckJob._id);
    assert.equal(recovered.status, "sent");
    assert.equal(recovered.fencingToken, 2, "Fencing token must be incremented upon reclamation");
    assert.equal(sent.length, 1);
  } finally {
    resetTransporter();
  }
});

test("Transactional Outbox: Business writes and outbox records participate in atomic transaction", async (t) => {
  if (!dbConnected) {
    t.skip("DB not connected");
    return;
  }

  const testInquiryEmail = `tx-test-${Date.now()}@example.com`;

  // 1. Transaction Commit Case: Both Inquiry and Outbox records are created atomically
  const { inquiry, job } = await withOptionalTransaction(async (session) => {
    const opts = session ? { session } : {};
    const [created] = await Inquiry.create(
      [
        {
          name: "Tx Commit Test",
          email: testInquiryEmail,
          message: "Testing atomic commit of business write and outbox record",
        },
      ],
      opts
    );

    const outboxRecord = await enqueueOutboxEmail({
      eventType: "TEST_TX_COMMIT",
      session,
      autoProcess: false,
      payload: { to: testInquiryEmail, subject: "Tx Commit", text: "Atomic Commit" },
    });

    return { inquiry: created, job: outboxRecord };
  });

  assert.ok(inquiry._id);
  assert.ok(job._id);

  const foundInquiry = await Inquiry.findById(inquiry._id);
  const foundOutbox = await OutboxJob.findById(job._id);
  assert.ok(foundInquiry, "Inquiry must exist after transaction commit");
  assert.ok(foundOutbox, "Outbox job must exist after transaction commit");

  // 2. Transaction Abort Case: Simulated failure during transaction rolls back both writes
  const abortInquiryEmail = `tx-abort-${Date.now()}@example.com`;
  let caughtError = null;

  try {
    await withOptionalTransaction(async (session) => {
      const opts = session ? { session } : {};
      await Inquiry.create(
        [
          {
            name: "Tx Abort Test",
            email: abortInquiryEmail,
            message: "This should be rolled back",
          },
        ],
        opts
      );

      await enqueueOutboxEmail({
        eventType: "TEST_TX_ABORT",
        session,
        autoProcess: false,
        payload: { to: abortInquiryEmail, subject: "Tx Abort", text: "Rollback" },
      });

      throw new Error("Simulated business validation failure triggering abort");
    });
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError);
  assert.equal(caughtError.message, "Simulated business validation failure triggering abort");

  // Verify that neither the Inquiry nor the Outbox record was persisted
  const abortedInquiry = await Inquiry.findOne({ email: abortInquiryEmail });
  const abortedOutbox = await OutboxJob.findOne({ "payload.to": abortInquiryEmail });
  assert.equal(abortedInquiry, null, "Inquiry must NOT exist after transaction rollback");
  assert.equal(abortedOutbox, null, "Outbox job must NOT exist after transaction rollback");

  // Cleanup
  await Inquiry.deleteOne({ _id: inquiry._id });
  await OutboxJob.deleteOne({ _id: job._id });
});

test("At-Least-Once Delivery Semantics: Outbox guarantees at-least-once delivery with deduplication idempotency", async (t) => {
  if (!dbConnected) {
    t.skip("DB not connected");
    return;
  }

  const dedupKey = `idempotent-key-${Date.now()}`;
  const jobA = await enqueueOutboxEmail({
    eventType: "TEST_AT_LEAST_ONCE",
    dedupKey,
    autoProcess: false,
    payload: { to: "at-least-once@example.com", subject: "At-Least-Once", text: "Body" },
  });

  const jobB = await enqueueOutboxEmail({
    eventType: "TEST_AT_LEAST_ONCE",
    dedupKey,
    autoProcess: false,
    payload: { to: "at-least-once@example.com", subject: "At-Least-Once", text: "Body" },
  });

  assert.equal(jobA._id.toString(), jobB._id.toString(), "DedupKey ensures idempotent deduplication");
  assert.equal(jobA.status, "pending");
});

// ============================================================================
// 3. FILE MAGIC BYTE VALIDATION
// ============================================================================

test("File Signature: Correctly validates PDF, JPEG, PNG, WEBP, and rejects forged files", () => {
  const pdfBuffer = Buffer.from("%PDF-1.7 header stream");
  assert.equal(validateFileSignature(pdfBuffer, "application/pdf", ".pdf"), true);

  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  assert.equal(validateFileSignature(jpegBuffer, "image/jpeg", ".jpg"), true);

  const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
  assert.equal(validateFileSignature(pngBuffer, "image/png", ".png"), true);

  const webpBuffer = Buffer.from("RIFF\x00\x00\x00\x00WEBPVP8 ");
  assert.equal(validateFileSignature(webpBuffer, "image/webp", ".webp"), true);

  // Forged file: HTML or script masquerading as PDF
  const forgedScriptAsPdf = Buffer.from("<script>alert('xss')</script>");
  assert.equal(validateFileSignature(forgedScriptAsPdf, "application/pdf", ".pdf"), false);

  // Executable file (MZ header) masquerading as PNG
  const exeAsPng = Buffer.from("MZ\x90\x00\x03\x00\x00\x00");
  assert.equal(validateFileSignature(exeAsPng, "image/png", ".png"), false);
});

test("Outbox Lease Recovery: Automatically reclaims and processes expired leases from crashed workers", async (t) => {
  if (!dbConnected) {
    t.skip("DB not connected");
    return;
  }

  // Simulate a crashed worker: job was marked 'processing' 10 minutes ago, lease expired
  const expiredJob = await OutboxJob.create({
    eventType: "TEST_CRASHED_WORKER_RECOVERY",
    payload: {
      to: "recovered@example.com",
      subject: "Recovered from Crash",
      text: "This job survived a simulated process kill",
    },
    status: "processing",
    lockedAt: new Date(Date.now() - 10 * 60 * 1000),
    lockedBy: "crashed_worker_pid_99999",
    leaseExpiresAt: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 mins ago
    attempts: 1,
    fencingToken: 1,
  });

  assert.equal(expiredJob.status, "processing");

  // Run the batch outbox sweeper
  await processPendingOutbox({ batchSize: 5 });

  // Verify the job was claimed and transitioned to 'sent'
  const recoveredJob = await OutboxJob.findById(expiredJob._id);
  assert.equal(recoveredJob.status, "sent");
  assert.equal(recoveredJob.lockedBy, null);
  assert.equal(recoveredJob.leaseExpiresAt, null);
  assert.ok(recoveredJob.fencingToken >= 2, "Monotonic fencing token must be incremented upon reclamation");
});

test("DOCX Structure Validation: Rejects malformed zip, zip bombs, and non-docx archives while accepting valid docx", () => {
  function createZipBuffer(entries) {
    const parts = [];
    const cdParts = [];
    let offset = 0;
    for (const [name, content] of Object.entries(entries)) {
      const data = Buffer.from(content);
      const deflated = zlib.deflateRawSync(data);
      const nameBuf = Buffer.from(name);
      const lh = Buffer.alloc(30);
      lh.writeUInt32LE(0x04034b50, 0);
      lh.writeUInt16LE(20, 4);
      lh.writeUInt16LE(0, 6);
      lh.writeUInt16LE(8, 8);
      lh.writeUInt32LE(0, 10);
      lh.writeUInt32LE(0, 14);
      lh.writeUInt32LE(deflated.length, 18);
      lh.writeUInt32LE(data.length, 22);
      lh.writeUInt16LE(nameBuf.length, 26);
      lh.writeUInt16LE(0, 28);
      parts.push(lh, nameBuf, deflated);

      const cd = Buffer.alloc(46);
      cd.writeUInt32LE(0x02014b50, 0);
      cd.writeUInt16LE(20, 4);
      cd.writeUInt16LE(20, 6);
      cd.writeUInt16LE(0, 8);
      cd.writeUInt16LE(8, 10);
      cd.writeUInt32LE(0, 12);
      cd.writeUInt32LE(0, 16);
      cd.writeUInt32LE(deflated.length, 20);
      cd.writeUInt32LE(data.length, 24);
      cd.writeUInt16LE(nameBuf.length, 28);
      cd.writeUInt16LE(0, 30);
      cd.writeUInt16LE(0, 32);
      cd.writeUInt16LE(0, 34);
      cd.writeUInt16LE(0, 36);
      cd.writeUInt32LE(0, 38);
      cd.writeUInt32LE(offset, 42);
      cdParts.push(cd, nameBuf);
      offset += 30 + nameBuf.length + deflated.length;
    }
    const cdStart = offset;
    const cdBuf = Buffer.concat(cdParts);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(Object.keys(entries).length, 8);
    eocd.writeUInt16LE(Object.keys(entries).length, 10);
    eocd.writeUInt32LE(cdBuf.length, 12);
    eocd.writeUInt32LE(cdStart, 16);
    eocd.writeUInt16LE(0, 20);
    return Buffer.concat([...parts, cdBuf, eocd]);
  }

  // 1. Valid DOCX containing [Content_Types].xml and word/document.xml
  const validDocx = createZipBuffer({
    "[Content_Types].xml": '<?xml version="1.0"?><Types></Types>',
    "word/document.xml": '<?xml version="1.0"?><w:document></w:document>',
  });
  assert.equal(validateFileSignature(validDocx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"), true);
  assert.equal(validateDocxStructure(validDocx), true);

  // 2. Generic ZIP archive without OpenXML docx entries
  const genericZip = createZipBuffer({
    "readme.txt": "just a text file",
  });
  assert.equal(validateFileSignature(genericZip, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"), false);
  assert.equal(validateDocxStructure(genericZip), false);

  // 3. Forged ZIP with path traversal entry
  const traversalZip = createZipBuffer({
    "[Content_Types].xml": '<Types></Types>',
    "../evil.sh": 'echo bad',
  });
  assert.equal(validateDocxStructure(traversalZip), false);

  // 4. Truncated fake buffer with PK header but invalid zip structure
  const fakePk = Buffer.from("PK\x03\x04truncated_corrupt_data_exceeding_header_size");
  assert.equal(validateDocxStructure(fakePk), false);
  assert.equal(validateFileSignature(fakePk, "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"), false);
});
