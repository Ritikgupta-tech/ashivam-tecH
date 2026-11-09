import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateDatabaseSafety, extractDatabaseName, connectDatabase } from '../src/db/database.js';

describe('Website Database Safety & Test Isolation Defense Suite', () => {
  test('extractDatabaseName correctly extracts dbName across formats', () => {
    assert.strictEqual(extractDatabaseName('mongodb://127.0.0.1:27017/ashivam_technologies'), 'ashivam_technologies');
    assert.strictEqual(extractDatabaseName('mongodb://127.0.0.1:27017/ashivam_technologies_test?authSource=admin'), 'ashivam_technologies_test');
    assert.strictEqual(extractDatabaseName('mongodb+srv://cluster.mongodb.net/ashivam_prod_db'), 'ashivam_prod_db');
  });

  test('validateDatabaseSafety strictly rejects non-test database in test mode', () => {
    assert.throws(() => {
      validateDatabaseSafety('mongodb://127.0.0.1:27017/ashivam_technologies');
    }, {
      name: 'Error',
      message: /\[FATAL DATA SAFETY VIOLATION\].*Attempted to connect to non-test database.*ashivam_technologies/
    });
  });

  test('validateDatabaseSafety strictly rejects production DB names in test mode', () => {
    assert.throws(() => {
      validateDatabaseSafety('mongodb://127.0.0.1:27017/production_system');
    }, {
      name: 'Error',
      message: /\[FATAL DATA SAFETY VIOLATION\].*Attempted to connect to non-test database/
    });
  });

  test('validateDatabaseSafety strictly blocks remote cloud MongoDB clusters in test mode', () => {
    assert.throws(() => {
      validateDatabaseSafety('mongodb+srv://cluster0.mongodb.net/ashivam_technologies_test');
    }, {
      name: 'Error',
      message: /\[FATAL DATA SAFETY VIOLATION\].*remote cloud MongoDB host is blocked/
    });
  });

  test('validateDatabaseSafety allows approved test-only database naming', () => {
    assert.strictEqual(
      validateDatabaseSafety('mongodb://127.0.0.1:27017/ashivam_technologies_test'),
      'ashivam_technologies_test'
    );
    assert.strictEqual(
      validateDatabaseSafety('mongodb://127.0.0.1:27017/ashivam_technologies_test_worker1'),
      'ashivam_technologies_test_worker1'
    );
  });

  test('connectDatabase fails closed when supplied with a non-test database URI in test mode', async () => {
    await assert.rejects(async () => {
      await connectDatabase('mongodb://127.0.0.1:27017/ashivam_technologies_prod');
    }, {
      name: 'Error',
      message: /FATAL DATA SAFETY VIOLATION/
    });
  });
});
