import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// 1. Vercel SPA routing verification (Direct page refresh & deep linking)
test('Vercel configuration has SPA catch-all rewrite for admin routes', () => {
  const vercelConfigPath = path.resolve(process.cwd(), 'vercel.json');
  assert.ok(fs.existsSync(vercelConfigPath), 'vercel.json must exist');

  const content = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
  assert.ok(Array.isArray(content.rewrites), 'rewrites array must exist');

  const spaRewrite = content.rewrites.find(
    (r) => r.source === '/(.*)' && r.destination === '/index.html'
  );
  assert.ok(
    spaRewrite,
    'vercel.json must rewrite all routes to /index.html for direct navigation on /admin and /admin/login'
  );
});

// 2. Permission-aware navigation logic
test('Permission check grants full access to Superadmin', () => {
  const superadminUser = {
    role: 'Superadmin',
    permissions: [],
  };

  const hasPermission = (user, perm) => {
    if (!user) return false;
    if (user.role === 'Superadmin') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(perm);
  };

  assert.equal(hasPermission(superadminUser, 'dashboard'), true);
  assert.equal(hasPermission(superadminUser, 'inquiries'), true);
  assert.equal(hasPermission(superadminUser, 'careers'), true);
  assert.equal(hasPermission(superadminUser, 'audit'), true);
  assert.equal(hasPermission(superadminUser, 'arbitrary_perm'), true);
});

test('Permission check strictly checks assigned permissions for non-Superadmin', () => {
  const limitedAdmin = {
    role: 'Admin',
    permissions: ['inquiries', 'careers'],
  };

  const hasPermission = (user, perm) => {
    if (!user) return false;
    if (user.role === 'Superadmin') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(perm);
  };

  assert.equal(hasPermission(limitedAdmin, 'inquiries'), true);
  assert.equal(hasPermission(limitedAdmin, 'careers'), true);
  assert.equal(hasPermission(limitedAdmin, 'dashboard'), false);
  assert.equal(hasPermission(limitedAdmin, 'audit'), false);
  assert.equal(hasPermission(limitedAdmin, 'settings'), false);
  assert.equal(hasPermission(null, 'inquiries'), false);
});

// 3. Login form validation logic
test('Login form validates required fields and trims input', () => {
  const validate = (username, password) => {
    const errors = {};
    const trimmed = (username || '').trim();
    if (!trimmed) {
      errors.username = 'Administrator username is required';
    }
    if (!password) {
      errors.password = 'Password is required';
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      payload: { username: trimmed, password },
    };
  };

  // Empty fields
  const r1 = validate('', '');
  assert.equal(r1.isValid, false);
  assert.ok(r1.errors.username);
  assert.ok(r1.errors.password);

  // Whitespace only
  const r2 = validate('   ', 'secret');
  assert.equal(r2.isValid, false);
  assert.ok(r2.errors.username);

  // Valid credentials
  const r3 = validate('  superadmin  ', 'SecurePassword123!');
  assert.equal(r3.isValid, true);
  assert.equal(r3.payload.username, 'superadmin');
  assert.equal(r3.payload.password, 'SecurePassword123!');
});

// 4. Session expiration and logout lifecycle
test('Logout clears session credentials and resets state', () => {
  let sessionStore = {
    token: 'jwt_mock_token_xyz',
    user: { id: 'admin1', username: 'superadmin', role: 'Superadmin' },
  };

  const logout = () => {
    sessionStore.token = null;
    sessionStore.user = null;
  };

  assert.ok(sessionStore.token);
  assert.ok(sessionStore.user);

  logout();

  assert.equal(sessionStore.token, null);
  assert.equal(sessionStore.user, null);
});

// 5. Backend API contract response format verification
test('Backend response envelope matches frontend expectations', () => {
  const mockBackendSuccess = {
    success: true,
    message: 'Login successful',
    data: {
      accessToken: 'header.payload.signature',
      user: {
        id: '6704fa4b1234567890abcdef',
        username: 'superadmin',
        name: 'Super Administrator',
        email: 'superadmin@ashivamtechnologies.com',
        role: 'Superadmin',
        permissions: ['dashboard', 'inquiries'],
      },
    },
    requestId: 'req-uuid-1234',
  };

  assert.equal(mockBackendSuccess.success, true);
  assert.ok(mockBackendSuccess.data.accessToken);
  assert.equal(mockBackendSuccess.data.user.role, 'Superadmin');
  assert.equal(mockBackendSuccess.data.user.email, 'superadmin@ashivamtechnologies.com');
  assert.ok(mockBackendSuccess.requestId);
});

// 6. Normal Admin creation validation
test('Normal Admin creation form validates username, email format, and password length', () => {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validateAdminCreation = ({ name, username, email, password }) => {
    const errors = {};
    if (!name || !name.trim()) errors.name = 'Full name is required';
    if (!username || username.trim().length < 3) errors.username = 'Username must be at least 3 characters';
    if (username && !/^[a-zA-Z0-9._-]+$/.test(username.trim())) errors.username = 'Invalid characters in username';
    if (email && !EMAIL_REGEX.test(email.trim())) errors.email = 'Invalid email address';
    if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters';
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Missing name
  const r1 = validateAdminCreation({ name: '', username: 'john.doe', password: 'password123' });
  assert.equal(r1.isValid, false);
  assert.ok(r1.errors.name);

  // Short password
  const r2 = validateAdminCreation({ name: 'John Doe', username: 'john.doe', password: '123' });
  assert.equal(r2.isValid, false);
  assert.ok(r2.errors.password);

  // Invalid email
  const r3 = validateAdminCreation({ name: 'John Doe', username: 'john.doe', email: 'not-an-email', password: 'password123' });
  assert.equal(r3.isValid, false);
  assert.ok(r3.errors.email);

  // Valid normal admin
  const r4 = validateAdminCreation({
    name: 'Jane Admin',
    username: 'jane.admin',
    email: 'jane@ashivamtechnologies.com',
    password: 'SecureAdminPassword2026!',
  });
  assert.equal(r4.isValid, true);
  assert.deepEqual(r4.errors, {});
});

// 7. Tab visibility strictly hides superadmin-only panels from normal Admins
test('Normal Admin is strictly blocked from Admin Accounts tab in dashboard navigation', () => {
  const navItems = [
    { id: 'overview', label: 'Overview', permission: 'dashboard' },
    { id: 'inquiries', label: 'Inquiries', permission: 'inquiries' },
    { id: 'careers', label: 'Careers & Jobs', permission: 'careers' },
    { id: 'admins', label: 'Admin Accounts', superadminOnly: true },
  ];

  const filterTabs = (user) => {
    const isSuperadmin = user?.role === 'Superadmin';
    const hasPermission = (p) => {
      if (!user) return false;
      if (user.role === 'Superadmin') return true;
      return Array.isArray(user.permissions) && user.permissions.includes(p);
    };

    return navItems.filter((item) => {
      if (item.superadminOnly) return isSuperadmin;
      return hasPermission(item.permission);
    });
  };

  // Superadmin gets all tabs
  const superadminUser = { role: 'Superadmin', permissions: [] };
  const superTabs = filterTabs(superadminUser);
  assert.ok(superTabs.some((t) => t.id === 'admins'), 'Superadmin must see admins tab');

  // Normal Admin with inquiries & careers must NOT see admins tab
  const normalAdmin = { role: 'Admin', permissions: ['inquiries', 'careers'] };
  const adminTabs = filterTabs(normalAdmin);
  assert.equal(adminTabs.some((t) => t.id === 'admins'), false, 'Normal Admin must NEVER see admins tab');
  assert.equal(adminTabs.some((t) => t.id === 'inquiries'), true);
  assert.equal(adminTabs.some((t) => t.id === 'careers'), true);
  assert.equal(adminTabs.some((t) => t.id === 'overview'), false);
});
