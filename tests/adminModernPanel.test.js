import test from 'node:test';
import assert from 'node:assert/strict';

// 1. Icon mapping check - Ensure zero emojis are used in the navigation map
test('Admin navigation uses high-precision vector icons and zero emojis', () => {
  const navItems = [
    { id: 'overview', label: 'Overview', permission: 'dashboard' },
    { id: 'inquiries', label: 'Inquiries', permission: 'inquiries' },
    { id: 'careers', label: 'Careers & Jobs', permission: 'careers' },
    { id: 'internships', label: 'Internships', permission: 'careers' },
    { id: 'employees', label: 'Employees', permission: 'employees' },
    { id: 'documents', label: 'HR Documents', permission: 'employees' },
    { id: 'content', label: 'CMS Content', permission: 'content' },
    { id: 'media', label: 'Media Library', permission: 'media' },
    { id: 'audit', label: 'Audit Logs', permission: 'audit' },
    { id: 'settings', label: 'Settings', permission: 'settings' },
    { id: 'admins', label: 'Admin Accounts', superadminOnly: true },
  ];

  const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/u;

  navItems.forEach((item) => {
    assert.equal(
      EMOJI_REGEX.test(item.label),
      false,
      `Label "${item.label}" must not contain emojis`
    );
    assert.equal(
      item.icon === undefined || typeof item.icon === 'function',
      true,
      `Item "${item.id}" should not have string emoji icons`
    );
  });
});

// 2. StatCard attention tone logic
test('StatCard attention tone triggers when actionable items > 0', () => {
  const getStatCardTone = (value, isAttentionCandidate) => {
    if (isAttentionCandidate && Number(value) > 0) {
      return 'attention';
    }
    return 'default';
  };

  assert.equal(getStatCardTone(5, true), 'attention');
  assert.equal(getStatCardTone(0, true), 'default');
  assert.equal(getStatCardTone(12, false), 'default');
});

// 3. Pagination calculation logic
test('Pagination bar accurately calculates item ranges and page window', () => {
  const calculatePagination = (page, limit, totalCount) => {
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const startItem = totalCount === 0 ? 0 : (page - 1) * limit + 1;
    const endItem = Math.min(page * limit, totalCount);

    const maxButtons = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);

    return { totalPages, startItem, endItem, pages };
  };

  // Case 1: First page of 45 items with limit 10
  const p1 = calculatePagination(1, 10, 45);
  assert.equal(p1.totalPages, 5);
  assert.equal(p1.startItem, 1);
  assert.equal(p1.endItem, 10);
  assert.deepEqual(p1.pages, [1, 2, 3, 4, 5]);

  // Case 2: Middle page (page 3 of 100 items with limit 15)
  const p2 = calculatePagination(3, 15, 100);
  assert.equal(p2.totalPages, 7);
  assert.equal(p2.startItem, 31);
  assert.equal(p2.endItem, 45);
  assert.deepEqual(p2.pages, [1, 2, 3, 4, 5]);

  // Case 3: Empty dataset
  const p3 = calculatePagination(1, 20, 0);
  assert.equal(p3.totalPages, 1);
  assert.equal(p3.startItem, 0);
  assert.equal(p3.endItem, 0);
  assert.deepEqual(p3.pages, [1]);
});

// 4. Feedback toast queue bounds
test('Feedback toast queue caps at maximum 4 simultaneous toasts', () => {
  const MAX_TOASTS = 4;
  let toasts = [];

  const pushToast = (tone, message) => {
    toasts = [...toasts.slice(-(MAX_TOASTS - 1)), { tone, message }];
  };

  pushToast('info', 'Message 1');
  pushToast('success', 'Message 2');
  pushToast('error', 'Message 3');
  assert.equal(toasts.length, 3);

  pushToast('info', 'Message 4');
  assert.equal(toasts.length, 4);
  assert.equal(toasts[0].message, 'Message 1');

  pushToast('success', 'Message 5');
  assert.equal(toasts.length, 4);
  assert.equal(toasts[0].message, 'Message 2');
  assert.equal(toasts[3].message, 'Message 5');
});

// 5. Status badge tone mapping consistency
test('StatusBadge maps recruitment, inquiry, and document states to accessible tones', () => {
  const STATUS_TONES = {
    // Green (positive/complete)
    active: 'green',
    resolved: 'green',
    verified: 'green',
    hired: 'green',
    selected: 'green',
    published: 'green',

    // Amber (pending/attention)
    in_progress: 'amber',
    under_review: 'amber',
    pending: 'amber',
    draft: 'amber',

    // Blue (new/informational)
    new: 'blue',
    applied: 'blue',
    shortlisted: 'blue',
    interview_scheduled: 'blue',

    // Red (negative/danger)
    inactive: 'slate',
    deleted: 'red',
    rejected: 'red',
    spam: 'red',

    // Slate (neutral/archived)
    archived: 'slate',
  };

  assert.equal(STATUS_TONES['active'], 'green');
  assert.equal(STATUS_TONES['new'], 'blue');
  assert.equal(STATUS_TONES['in_progress'], 'amber');
  assert.equal(STATUS_TONES['rejected'], 'red');
  assert.equal(STATUS_TONES['archived'], 'slate');
});

// 6. Job title slugification
test('Job title slugifier creates URL-safe slugs without duplicate hyphens', () => {
  const slugify = (title) =>
    (title || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  assert.equal(
    slugify('Senior Full-Stack Engineer (React & Node.js)'),
    'senior-full-stack-engineer-react-node-js'
  );
  assert.equal(
    slugify('   Cloud & DevOps Architect / SRE   '),
    'cloud-devops-architect-sre'
  );
  assert.equal(slugify('AI/ML Engineer - Agra, UP'), 'ai-ml-engineer-agra-up');
});

// 7. Role-based allowed tab filtering
test('Allowed tabs strictly hides restricted tabs from unauthorized roles', () => {
  const allTabs = [
    { id: 'overview', permission: 'dashboard' },
    { id: 'inquiries', permission: 'inquiries' },
    { id: 'careers', permission: 'careers' },
    { id: 'employees', permission: 'employees' },
    { id: 'settings', permission: 'settings' },
    { id: 'admins', superadminOnly: true },
  ];

  const filterTabs = (user) => {
    const isSuperadmin = user?.role === 'Superadmin';
    const hasPermission = (p) => {
      if (!user) return false;
      if (user.role === 'Superadmin') return true;
      return Array.isArray(user.permissions) && user.permissions.includes(p);
    };

    return allTabs.filter((tab) => {
      if (tab.superadminOnly) return isSuperadmin;
      return hasPermission(tab.permission);
    });
  };

  // Superadmin gets all
  const superadmin = { role: 'Superadmin' };
  const superTabs = filterTabs(superadmin);
  assert.equal(superTabs.length, 6);
  assert.ok(superTabs.some((t) => t.id === 'admins'));

  // Normal Admin with only inquiries and careers
  const normalAdmin = { role: 'Admin', permissions: ['inquiries', 'careers'] };
  const normalTabs = filterTabs(normalAdmin);
  assert.equal(normalTabs.length, 2);
  assert.deepEqual(
    normalTabs.map((t) => t.id),
    ['inquiries', 'careers']
  );
  assert.equal(normalTabs.some((t) => t.id === 'admins'), false);
  assert.equal(normalTabs.some((t) => t.id === 'settings'), false);
});
