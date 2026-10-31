import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Mock browser storage environment for unit tests
class MockStorage {
  constructor() {
    this.store = new Map();
    this.shouldThrow = false;
  }

  getItem(key) {
    if (this.shouldThrow) throw new Error('SecurityError: Access to storage is denied');
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    if (this.shouldThrow) throw new Error('SecurityError: Access to storage is denied');
    this.store.set(key, String(value));
  }

  removeItem(key) {
    if (this.shouldThrow) throw new Error('SecurityError: Access to storage is denied');
    this.store.delete(key);
  }

  clear() {
    if (this.shouldThrow) throw new Error('SecurityError: Access to storage is denied');
    this.store.clear();
  }
}

// -----------------------------------------------------------------------------
// Test Suite: Anonymous Visitor Session Hint & Authentication Optimization
// -----------------------------------------------------------------------------

test('Session Hint - Initial state for first-time anonymous visitor has no hint', async () => {
  const mockLocalStorage = new MockStorage();
  const mockSessionStorage = new MockStorage();
  global.window = {
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage,
    location: { pathname: '/solutions' },
  };

  const { hasSessionHint, SESSION_HINT_KEY } = await import('../src/api.js');

  assert.equal(hasSessionHint(), false);
  assert.equal(mockLocalStorage.getItem(SESSION_HINT_KEY), null);
  assert.equal(mockSessionStorage.getItem('ashivam_admin_session_token'), null);
});

test('Session Hint - Successful authentication creates non-sensitive session hint', async () => {
  const mockLocalStorage = new MockStorage();
  const mockSessionStorage = new MockStorage();
  global.window = {
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage,
  };

  const { setToken, hasSessionHint, SESSION_HINT_KEY } = await import('../src/api.js');

  const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockTokenPayload.signature';
  setToken(mockAccessToken);

  assert.equal(hasSessionHint(), true);
  assert.equal(mockLocalStorage.getItem(SESSION_HINT_KEY), 'active');

  // Strict Security Constraint: Hint must NEVER store JWTs, tokens, or credentials in localStorage
  assert.notEqual(mockLocalStorage.getItem(SESSION_HINT_KEY), mockAccessToken);
  assert.ok(!mockLocalStorage.getItem(SESSION_HINT_KEY).includes('eyJ'));
  assert.equal(mockLocalStorage.getItem(SESSION_HINT_KEY).length, 6); // exactly "active"
});

test('Session Hint - Explicit logout wipes session hint from localStorage', async () => {
  const mockLocalStorage = new MockStorage();
  const mockSessionStorage = new MockStorage();
  global.window = {
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage,
  };

  const { setToken, clearToken, hasSessionHint, SESSION_HINT_KEY } = await import('../src/api.js');

  setToken('valid_access_token');
  assert.equal(hasSessionHint(), true);

  clearToken();
  assert.equal(hasSessionHint(), false);
  assert.equal(mockLocalStorage.getItem(SESSION_HINT_KEY), null);
  assert.equal(mockSessionStorage.getItem('ashivam_admin_session_token'), null);
});

test('Session Hint - Storage access exception handles gracefully without throwing', async () => {
  const mockFaultyStorage = new MockStorage();
  mockFaultyStorage.shouldThrow = true;

  global.window = {
    localStorage: mockFaultyStorage,
    sessionStorage: mockFaultyStorage,
  };

  const { hasSessionHint, setSessionHint, clearSessionHint } = await import('../src/api.js');

  // Must not throw unhandled exceptions
  assert.doesNotThrow(() => {
    const hint = hasSessionHint();
    assert.equal(hint, false);
  });

  assert.doesNotThrow(() => {
    setSessionHint();
  });

  assert.doesNotThrow(() => {
    clearSessionHint();
  });
});

test('Session Hint - Browser restart preserves hint in localStorage while sessionStorage resets', async () => {
  // 1. User logs in (hint created in localStorage, token in sessionStorage)
  const mockLocalStorage = new MockStorage();
  let mockSessionStorage = new MockStorage();
  global.window = {
    localStorage: mockLocalStorage,
    sessionStorage: mockSessionStorage,
  };

  const { setToken, getToken, hasSessionHint, SESSION_HINT_KEY } = await import('../src/api.js');
  setToken('active_session_token');
  assert.equal(hasSessionHint(), true);
  assert.equal(getToken(), 'active_session_token');

  // 2. Browser restart: sessionStorage is discarded by browser, but localStorage persists
  mockSessionStorage = new MockStorage();
  global.window.sessionStorage = mockSessionStorage;

  assert.equal(mockSessionStorage.getItem('ashivam_admin_session_token'), null, 'sessionStorage token is gone on browser restart');
  assert.equal(hasSessionHint(), true, 'localStorage session hint survives browser restart');
  assert.equal(mockLocalStorage.getItem(SESSION_HINT_KEY), 'active');
});

test('Session Hint - Definitive refresh failure / rejection purges stale hint', async () => {
  const mockLocalStorage = new MockStorage();
  mockLocalStorage.setItem('ashivam_auth_hint', 'active'); // stale hint from previous expired session

  global.window = {
    localStorage: mockLocalStorage,
    sessionStorage: new MockStorage(),
  };

  const { hasSessionHint, clearSessionHint, SESSION_HINT_KEY } = await import('../src/api.js');
  assert.equal(hasSessionHint(), true);

  // When server rejects refresh (401), client calls clearSessionHint()
  clearSessionHint();
  assert.equal(hasSessionHint(), false);
  assert.equal(mockLocalStorage.getItem(SESSION_HINT_KEY), null);
});

test('AuthContext Integration - Verifies code architecture requirements', () => {
  const authContextPath = path.resolve(process.cwd(), 'src/context/AuthContext.jsx');
  assert.ok(fs.existsSync(authContextPath), 'AuthContext.jsx must exist');
  const content = fs.readFileSync(authContextPath, 'utf8');

  // Verify safe session hint import and usage
  assert.ok(content.includes('hasSessionHint'), 'Must import and check hasSessionHint');
  assert.ok(content.includes('setSessionHint'), 'Must setSessionHint on successful auth');
  assert.ok(content.includes('clearSessionHint'), 'Must clearSessionHint on rejection/logout');

  // Verify portal route awareness for admin/employee gateways
  assert.ok(content.includes('isPortalRoute'), 'Must evaluate portal routes to protect admin access');
  assert.ok(content.includes("pathname.startsWith('/admin')"), 'Must include /admin in portal check');
  assert.ok(content.includes("pathname.startsWith('/employee-login')"), 'Must include /employee-login in portal check');

  // Verify anonymous visitor skip condition
  assert.ok(content.includes('!hasHint && !isPortalRoute'), 'Must skip refresh when no hint and not on portal route');

  // Verify cross-tab synchronization
  assert.ok(content.includes("addEventListener('storage'"), 'Must synchronize multi-tab hint changes via storage event');
  assert.ok(content.includes('ashivam_auth_sync'), 'Must maintain BroadcastChannel cross-tab synchronization');
});

test('Portal Gateway Consumers - Both AdminLogin and EmployeeLoginPage consume unified login', () => {
  const adminLoginPath = path.resolve(process.cwd(), 'src/components/Admin/AdminLogin.jsx');
  const employeeLoginPath = path.resolve(process.cwd(), 'src/pages/EmployeeLoginPage.jsx');

  assert.ok(fs.existsSync(adminLoginPath), 'AdminLogin.jsx must exist');
  assert.ok(fs.existsSync(employeeLoginPath), 'EmployeeLoginPage.jsx must exist');

  const adminContent = fs.readFileSync(adminLoginPath, 'utf8');
  const employeeContent = fs.readFileSync(employeeLoginPath, 'utf8');

  // Both gateways must use useAuth and invoke login
  assert.ok(adminContent.includes('useAuth'), 'AdminLogin must use useAuth');
  assert.ok(adminContent.includes('login('), 'AdminLogin must invoke login()');

  assert.ok(employeeContent.includes('useAuth'), 'EmployeeLoginPage must use useAuth');
  assert.ok(employeeContent.includes('login('), 'EmployeeLoginPage must invoke login()');
});

test('Web Locks & Single-Flight Coordination - Architecture integrity preserved', () => {
  const apiPath = path.resolve(process.cwd(), 'src/api.js');
  const content = fs.readFileSync(apiPath, 'utf8');

  // Web Locks API
  assert.ok(content.includes('navigator.locks.request'), 'Must preserve Web Locks cross-tab synchronization');
  assert.ok(content.includes("'ashivam_auth_refresh_lock'"), 'Must preserve Web Lock name ashivam_auth_refresh_lock');

  // Single-flight promise
  assert.ok(content.includes('refreshInFlightPromise'), 'Must maintain in-flight refresh deduplication');

  // Exposed API inspection for testing
  assert.ok(content.includes('window.__ashivamApi'), 'Must expose test harness on window.__ashivamApi');
});

test('Concurrent Refresh Execution - Simultaneous refresh callers share a single in-flight promise without duplicates', async () => {
  let fetchCallCount = 0;
  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    if (url.includes('/auth/refresh')) {
      fetchCallCount++;
      // Simulate real-world network latency
      await new Promise((r) => setTimeout(r, 30));
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: { accessToken: 'concurrent.refreshed.access.token' },
        }),
      };
    }
    return { ok: true, json: async () => ({}) };
  };

  try {
    const { refreshSession } = await import('../src/api.js');

    // Trigger 4 concurrent refresh calls simultaneously
    const results = await Promise.all([
      refreshSession(),
      refreshSession(),
      refreshSession(),
      refreshSession(),
    ]);

    // Exactly 1 network fetch must be executed across all 4 concurrent requests
    assert.equal(fetchCallCount, 1, 'Concurrent refresh requests must be deduplicated into a single network fetch');
    assert.equal(results.length, 4);
    results.forEach((r) => {
      assert.equal(r.data.accessToken, 'concurrent.refreshed.access.token');
    });
  } finally {
    global.fetch = originalFetch;
  }
});
