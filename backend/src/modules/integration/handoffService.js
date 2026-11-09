import crypto from 'crypto';
import env from '../../config/env.js';
import { IntegrationHandoff, HANDOFF_STATUS } from '../../models/integrationHandoff.model.js';
import { sendServiceRequest } from '../../utils/serviceAuth.js';
import logger from '../../utils/logger.js';

export async function dispatchApplicationToInternship(application, job = {}) {
  const applicantName = `${application.firstName || ''} ${application.lastName || ''}`.trim() || 'Candidate';
  const correlationId = application.correlationId || crypto.randomUUID();
  const idempotencyKey = `web-app-${application._id.toString()}`;

  const payload = {
    websiteApplicationId: application._id.toString(),
    applicantName,
    email: (application.email || '').toLowerCase().trim(),
    phone: application.phone || '',
    program: job.title || 'Internship Program',
    university: application.university || application.institution || 'Unspecified University',
    graduationYear: application.graduationYear ? Number(application.graduationYear) : new Date().getFullYear(),
    resumeUrl: application.resume?.path || application.resume?.storageKey || null,
    correlationId,
    idempotencyKey
  };

  let handoff = await IntegrationHandoff.findOne({ idempotencyKey });
  if (!handoff) {
    handoff = new IntegrationHandoff({
      applicationId: application._id,
      candidateEmail: payload.email,
      candidateName: payload.applicantName,
      correlationId,
      idempotencyKey,
      payloadSnapshot: payload,
      deliveryStatus: HANDOFF_STATUS.PENDING
    });
    await handoff.save();
  }

  const targetUrl = `${env.internshipServiceUrl}/api/v1/integrations/receive-application`;

  const result = await sendServiceRequest(
    targetUrl,
    payload,
    env.internshipServiceSecret,
    'ashivam-website'
  );

  if (result.ok && result.data?.data?.applicationNumber) {
    handoff.deliveryStatus = HANDOFF_STATUS.DELIVERED;
    handoff.internshipReference = result.data.data.applicationNumber;
    handoff.deliveredAt = new Date();
    handoff.lastError = null;
    await handoff.save();

    logger.info(`[Integration] Application ${application._id} handed off to Internship: ${handoff.internshipReference}`);
    return { success: true, delivered: true, reference: handoff.internshipReference };
  } else {
    handoff.retryCount += 1;
    handoff.lastError = result.error || result.data?.message || `HTTP ${result.status}`;
    const delayMs = Math.min(1000 * Math.pow(2, handoff.retryCount), 3600000); // Bounded exponential backoff
    handoff.nextRetryAt = new Date(Date.now() + delayMs);
    handoff.deliveryStatus = handoff.retryCount >= 5 ? HANDOFF_STATUS.FAILED : HANDOFF_STATUS.RETRYING;
    await handoff.save();

    logger.warn(`[Integration] Handoff failed for application ${application._id}: ${handoff.lastError}. Next retry at: ${handoff.nextRetryAt}`);
    return { success: false, delivered: false, error: handoff.lastError, retryCount: handoff.retryCount };
  }
}

export async function reconcilePendingHandoffs(limit = 20) {
  const pending = await IntegrationHandoff.find({
    deliveryStatus: { $in: [HANDOFF_STATUS.PENDING, HANDOFF_STATUS.RETRYING] },
    $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: new Date() } }]
  }).limit(limit);

  const results = { processed: 0, delivered: 0, failed: 0 };

  for (const item of pending) {
    results.processed += 1;
    const targetUrl = `${env.internshipServiceUrl}/api/v1/integrations/receive-application`;

    const result = await sendServiceRequest(
      targetUrl,
      item.payloadSnapshot,
      env.internshipServiceSecret,
      'ashivam-website'
    );

    if (result.ok && result.data?.data?.applicationNumber) {
      item.deliveryStatus = HANDOFF_STATUS.DELIVERED;
      item.internshipReference = result.data.data.applicationNumber;
      item.deliveredAt = new Date();
      item.lastError = null;
      await item.save();
      results.delivered += 1;
    } else {
      item.retryCount += 1;
      item.lastError = result.error || result.data?.message || `HTTP ${result.status}`;
      const delayMs = Math.min(1000 * Math.pow(2, item.retryCount), 3600000);
      item.nextRetryAt = new Date(Date.now() + delayMs);
      item.deliveryStatus = item.retryCount >= 5 ? HANDOFF_STATUS.FAILED : HANDOFF_STATUS.RETRYING;
      await item.save();
      results.failed += 1;
    }
  }

  return results;
}
