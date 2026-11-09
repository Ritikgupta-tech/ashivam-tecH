import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import env from '../src/config/env.js';
import { signServicePayload } from '../src/utils/serviceAuth.js';
import { IntegrationHandoff, HANDOFF_STATUS } from '../src/models/integrationHandoff.model.js';
import Admin from '../src/models/admin.model.js';
import { generateAccessToken } from '../src/utils/jwt.js';

describe('Website Integration & Service Authentication Suite', () => {
  let superadmin;
  let superadminToken;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.mongodbUri);
    }
    superadmin = await Admin.create({
      username: `test-int-sa-${Date.now()}`,
      email: `test-int-${Date.now()}@ashivam.com`,
      passwordHash: 'test_hashed_password_123',
      name: 'Integration Superadmin',
      role: 'Superadmin',
      isActive: true,
      permissions: ['*']
    });

    superadminToken = generateAccessToken(superadmin);
  });

  after(async () => {
    if (superadmin) {
      await Admin.deleteOne({ _id: superadmin._id });
    }
    await IntegrationHandoff.deleteMany({ candidateEmail: /test\.integration/i });
    await mongoose.disconnect();
  });

  test('signServicePayload generates cryptographically valid HMAC-SHA256 headers', () => {
    const payload = { test: 'data', correlationId: 'corr-123', idempotencyKey: 'idem-456' };
    const secret = 'test-secret-key-for-hmac-32chars!';
    const { headers, metadata } = signServicePayload(payload, secret, 'ashivam-website');

    assert.equal(headers['x-source-system'], 'ashivam-website');
    assert.equal(headers['x-correlation-id'], 'corr-123');
    assert.equal(headers['x-idempotency-key'], 'idem-456');
    assert.ok(headers['x-signature'].length === 64);
    assert.ok(metadata.requestId);
  });

  test('signServicePayload generates epoch millisecond timestamp by default', () => {
    const payload = { test: 'data' };
    const secret = 'test-secret-key-for-hmac-32chars!';
    const { headers } = signServicePayload(payload, secret, 'ashivam-website');

    assert.ok(/^\d{13}$/.test(headers['x-timestamp']), 'Timestamp should be 13-digit epoch milliseconds');
    const tsNumber = Number(headers['x-timestamp']);
    assert.ok(Math.abs(Date.now() - tsNumber) < 5000, 'Timestamp should be close to now');
  });

  test('signServicePayload supports explicit custom ISO 8601 timestamp string', () => {
    const payload = { test: 'data' };
    const secret = 'test-secret-key-for-hmac-32chars!';
    const customIso = new Date().toISOString();
    const { headers } = signServicePayload(payload, secret, 'ashivam-website', customIso);

    assert.equal(headers['x-timestamp'], customIso);
  });

  test('GET /api/v1/integrations/status returns delivery metrics and health', async () => {
    const res = await request(app)
      .get('/api/v1/integrations/status')
      .set('Authorization', `Bearer ${superadminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.service, 'ashivam-website');
    assert.ok(typeof res.body.data.metrics.total === 'number');
  });

  test('POST /api/v1/integrations/reconcile triggers reconciliation scan safely', async () => {
    const res = await request(app)
      .post('/api/v1/integrations/reconcile')
      .set('Authorization', `Bearer ${superadminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data.processed === 'number');
  });

  test('Unauthenticated access to /api/v1/integrations/status is rejected (401)', async () => {
    const res = await request(app)
      .get('/api/v1/integrations/status');

    assert.equal(res.status, 401);
  });
});
