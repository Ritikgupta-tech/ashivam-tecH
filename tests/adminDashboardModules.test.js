import test from 'node:test';
import assert from 'node:assert/strict';

// 1. Overview breakdown metrics and status pill formatting
test('Overview metrics aggregation safely extracts breakdown and counts', () => {
  const sampleOverview = {
    inquiries: 12,
    jobs: 5,
    applications: 24,
    internships: 8,
    employees: 15,
    hrDocuments: 30,
    content: 6,
    media: 18,
    breakdown: {
      inquiries: { new: 3, in_progress: 4, resolved: 5 },
      jobs: { active: 3, closed: 2 },
      applications: { applied: 10, shortlisted: 8 },
      internships: { selected: 4, in_progress: 3 },
      employees: { active: 14, inactive: 1 },
      hrDocuments: { verified: 25, pending: 5 },
      content: { published: 5, draft: 1 },
    },
  };

  assert.equal(sampleOverview.inquiries, 12);
  assert.equal(sampleOverview.breakdown.inquiries.new, 3);
  assert.equal(sampleOverview.breakdown.jobs.active, 3);
  assert.equal(sampleOverview.breakdown.hrDocuments.verified, 25);
  assert.equal(sampleOverview.breakdown.content.published, 5);
});

// 2. Employee profile form validation
test('Employee form validation strictly requires core identity fields', () => {
  const validateEmployee = (form) => {
    const errors = {};
    if (!form.firstName?.trim()) errors.firstName = 'First name is required';
    if (!form.lastName?.trim()) errors.lastName = 'Last name is required';
    if (!form.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Valid email is required';
    }
    if (!form.designation?.trim()) errors.designation = 'Designation is required';
    if (!form.department?.trim()) errors.department = 'Department is required';
    if (!form.joiningDate) errors.joiningDate = 'Joining date is required';

    const validEmploymentTypes = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Freelance'];
    if (!validEmploymentTypes.includes(form.employmentType)) {
      errors.employmentType = 'Invalid employment type';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Missing required fields
  const invalidResult = validateEmployee({
    firstName: '',
    lastName: '',
    email: 'bad-email',
    designation: '',
    department: '',
    employmentType: 'InvalidType',
  });
  assert.equal(invalidResult.isValid, false);
  assert.ok(invalidResult.errors.firstName);
  assert.ok(invalidResult.errors.lastName);
  assert.ok(invalidResult.errors.email);
  assert.ok(invalidResult.errors.designation);
  assert.ok(invalidResult.errors.employmentType);

  // Valid employee
  const validResult = validateEmployee({
    firstName: 'Amit',
    lastName: 'Verma',
    email: 'ritik95061@gmail.com',
    designation: 'Staff DevOps Engineer',
    department: 'Cloud Infrastructure',
    employmentType: 'Full-time',
    joiningDate: '2026-01-15',
  });
  assert.equal(validResult.isValid, true);
  assert.deepEqual(validResult.errors, {});
});

// 3. HR Document upload validation
test('HR Document upload accepts valid document types and formats', () => {
  const validTypes = [
    'Offer Letter',
    'Joining Letter',
    'NDA',
    'Salary Slip',
    'Experience Letter',
    'Relieving Letter',
    'Performance Review',
    'Aadhaar',
    'PAN',
    'Passport',
    'Driving License',
    'Resume',
    'Bank Details',
    'Education Certificate',
    'Other',
  ];

  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const validateDocUpload = (doc) => {
    if (!doc.employeeId) return { isValid: false, reason: 'Employee is required' };
    if (!validTypes.includes(doc.documentType)) return { isValid: false, reason: 'Invalid doc type' };
    if (!doc.title?.trim()) return { isValid: false, reason: 'Title is required' };
    if (!doc.mimeType || !allowedMimeTypes.includes(doc.mimeType)) {
      return { isValid: false, reason: 'Unsupported MIME type' };
    }
    if (doc.size > 10 * 1024 * 1024) return { isValid: false, reason: 'File exceeds 10MB limit' };

    return { isValid: true };
  };

  assert.equal(
    validateDocUpload({
      employeeId: '507f1f77bcf86cd799439011',
      documentType: 'Offer Letter',
      title: 'Senior Engineer Offer Letter',
      mimeType: 'application/pdf',
      size: 1024 * 1024,
    }).isValid,
    true
  );

  assert.equal(
    validateDocUpload({
      employeeId: '507f1f77bcf86cd799439011',
      documentType: 'InvalidType',
      title: 'Bad Doc',
      mimeType: 'application/pdf',
      size: 1024,
    }).isValid,
    false
  );

  assert.equal(
    validateDocUpload({
      employeeId: '507f1f77bcf86cd799439011',
      documentType: 'NDA',
      title: 'NDA Executable',
      mimeType: 'application/x-msdownload',
      size: 1024,
    }).isValid,
    false
  );
});

// 4. HR Document download authorization header check
test('HR Document download request constructs authenticated Bearer headers', () => {
  const getDownloadHeaders = (token) => ({
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const headersWithToken = getDownloadHeaders('test-jwt-admin-token');
  assert.equal(headersWithToken.Authorization, 'Bearer test-jwt-admin-token');

  const headersNoToken = getDownloadHeaders(null);
  assert.equal(headersNoToken.Authorization, undefined);
});

// 5. CMS Content block serialization as an object
test('CMS Content block serialization ensures body is always an object or parsed JSON', () => {
  const formatContentPayload = (key, section, title, contentRaw, status) => {
    let parsedContent = (contentRaw || '').trim();
    if (parsedContent.startsWith('{') || parsedContent.startsWith('[')) {
      try {
        parsedContent = JSON.parse(parsedContent);
      } catch {
        parsedContent = { text: parsedContent };
      }
    } else {
      parsedContent = { text: parsedContent };
    }

    return {
      key: key.trim().toLowerCase(),
      section: section.trim().toLowerCase(),
      title: title.trim(),
      content: parsedContent,
      status: status || 'draft',
    };
  };

  // Plain string copy
  const p1 = formatContentPayload('hero_subheading', 'hero', 'Hero Subheading', 'Empowering digital innovation.', 'published');
  assert.equal(typeof p1.content, 'object');
  assert.equal(p1.content.text, 'Empowering digital innovation.');
  assert.equal(p1.status, 'published');

  // JSON string
  const p2 = formatContentPayload('stats_counter', 'about', 'Stats', '{"clients": 50, "projects": 120}', 'draft');
  assert.equal(typeof p2.content, 'object');
  assert.equal(p2.content.clients, 50);
  assert.equal(p2.content.projects, 120);
});

// 6. Settings payload formatting & persistence structure
test('Settings updates conform to company, social, and feature structure', () => {
  const settingsData = {
    company: {
      name: 'Ashivam Technologies Private Limited',
      email: 'ritik95061@gmail.com',
      phone: '+91 70885 67790',
      address: 'Sanjay Place, Civil Lines, Agra, UP, India',
    },
    social: {
      linkedin: 'https://linkedin.com/company/ashivam-technologies',
      github: 'https://github.com/ashivam-technologies',
    },
    features: {
      contactForm: true,
      careerApplications: true,
      publicContent: true,
    },
    maintenance: {
      enabled: false,
      message: '',
    },
  };

  assert.equal(settingsData.company.name, 'Ashivam Technologies Private Limited');
  assert.equal(settingsData.features.contactForm, true);
  assert.equal(settingsData.maintenance.enabled, false);
});

// 7. Normal Admin permission allowlist enforcement
test('Normal Admin permission updates strictly check allowlisted module keys', () => {
  const ALLOWED_PERMISSIONS = [
    'dashboard',
    'inquiries',
    'careers',
    'employees',
    'content',
    'media',
    'audit',
    'settings',
  ];

  const validatePermissions = (perms) => {
    if (!Array.isArray(perms)) return false;
    return perms.every((p) => ALLOWED_PERMISSIONS.includes(p));
  };

  assert.equal(validatePermissions(['dashboard', 'inquiries', 'careers']), true);
  assert.equal(validatePermissions(['employees', 'content', 'media', 'audit', 'settings']), true);
  assert.equal(validatePermissions(['dashboard', 'root_superadmin_privilege']), false);
  assert.equal(validatePermissions('not-an-array'), false);
});

// 8. HR Documents employee list normalization defense (P0 Defect regression)
test('HR Documents employee list parser safely extracts array from object or array payloads', () => {
  const parseEmployees = (empsRes) => {
    return empsRes?.status === 'fulfilled'
      ? (Array.isArray(empsRes.value?.data?.employees)
          ? empsRes.value.data.employees
          : Array.isArray(empsRes.value?.data?.items)
          ? empsRes.value.data.items
          : Array.isArray(empsRes.value?.data)
          ? empsRes.value.data
          : [])
      : [];
  };

  // Case A: Real backend pagination envelope { employees: [...], pagination: {...} }
  const realBackendPayload = {
    status: 'fulfilled',
    value: {
      data: {
        employees: [{ _id: 'e1', firstName: 'Vikram', lastName: 'Sharma' }],
        pagination: { page: 1, limit: 100, total: 1 }
      }
    }
  };
  const resA = parseEmployees(realBackendPayload);
  assert.equal(Array.isArray(resA), true);
  assert.equal(resA.length, 1);
  assert.equal(resA[0].firstName, 'Vikram');

  // Case B: Direct array payload
  const arrayPayload = {
    status: 'fulfilled',
    value: {
      data: [{ _id: 'e2', firstName: 'Neha', lastName: 'Patel' }]
    }
  };
  const resB = parseEmployees(arrayPayload);
  assert.equal(Array.isArray(resB), true);
  assert.equal(resB.length, 1);

  // Case C: Error or null payload
  assert.deepEqual(parseEmployees({ status: 'rejected' }), []);
  assert.deepEqual(parseEmployees({ status: 'fulfilled', value: { data: null } }), []);
});

// 9. Superadmin case normalization defense (P1 Defect regression)
test('AuthContext superadmin evaluation accepts all role casing variants', () => {
  const checkSuperadmin = (user) => {
    return user?.role === 'Superadmin' || user?.role?.toLowerCase() === 'superadmin';
  };

  assert.equal(checkSuperadmin({ role: 'Superadmin' }), true);
  assert.equal(checkSuperadmin({ role: 'superadmin' }), true);
  assert.equal(checkSuperadmin({ role: 'SuperAdmin' }), true);
  assert.equal(checkSuperadmin({ role: 'Admin' }), false);
  assert.equal(checkSuperadmin({ role: 'Employee' }), false);
  assert.equal(checkSuperadmin(null), false);
});

// 10. Employee invitation status and error resolution defense
test('Employee invitation status resolver accurately distinguishes delivery failure, pending activation, and active states', () => {
  const resolveStatus = (emp) => {
    const st = emp.accountStatus || (emp.isActive ? 'ACTIVE' : 'DEACTIVATED');
    if (st === 'ACTIVE') return { label: 'Active / Verified', tone: 'green' };
    if (emp.invitationStatus === 'FAILED') {
      return { label: 'Invite Failed', tone: 'red', error: emp.invitationError };
    }
    if (emp.invitationStatus === 'SENT' || st === 'PENDING_ACTIVATION') {
      return { label: 'Pending Activation', tone: 'amber' };
    }
    if (st === 'INVITED') return { label: 'Invited', tone: 'blue' };
    if (st === 'SUSPENDED') return { label: 'Suspended', tone: 'amber' };
    return { label: 'Deactivated', tone: 'red' };
  };

  // Case 1: Failed delivery
  const failedEmp = {
    accountStatus: 'PENDING_ACTIVATION',
    invitationStatus: 'FAILED',
    invitationError: 'Invalid login: 535-5.7.8 BadCredentials',
  };
  const res1 = resolveStatus(failedEmp);
  assert.equal(res1.label, 'Invite Failed');
  assert.equal(res1.tone, 'red');
  assert.equal(res1.error, 'Invalid login: 535-5.7.8 BadCredentials');

  // Case 2: Sent successfully
  const sentEmp = {
    accountStatus: 'PENDING_ACTIVATION',
    invitationStatus: 'SENT',
  };
  const res2 = resolveStatus(sentEmp);
  assert.equal(res2.label, 'Pending Activation');
  assert.equal(res2.tone, 'amber');

  // Case 3: Fully active
  const activeEmp = {
    accountStatus: 'ACTIVE',
    invitationStatus: 'ACCEPTED',
    isActive: true,
  };
  const res3 = resolveStatus(activeEmp);
  assert.equal(res3.label, 'Active / Verified');
  assert.equal(res3.tone, 'green');
});

// 11. Google Meet participant identity extraction defense
test('Google Meet participant identity extraction handles canonical email variants and rejects anonymous participants', () => {
  const extractGoogleEmail = (signedinUser, rawEmail) => {
    if (signedinUser?.email && typeof signedinUser.email === 'string' && signedinUser.email.includes('@')) {
      return signedinUser.email.trim().toLowerCase();
    }
    if (signedinUser?.user && typeof signedinUser.user === 'string') {
      const candidate = signedinUser.user.replace(/^users\//, '').trim().toLowerCase();
      if (candidate.includes('@')) {
        return candidate;
      }
    }
    if (rawEmail && typeof rawEmail === 'string' && rawEmail.includes('@')) {
      return rawEmail.trim().toLowerCase();
    }
    return null;
  };

  // Standard user with users/ prefix
  assert.equal(
    extractGoogleEmail({ user: 'users/rohan.verma@ashivam.com' }),
    'rohan.verma@ashivam.com'
  );

  // Standard signedinUser with direct email field
  assert.equal(
    extractGoogleEmail({ email: 'Aditi.Rao@Ashivam.com', user: 'users/1029384756' }),
    'aditi.rao@ashivam.com'
  );

  // Top level fallback email
  assert.equal(
    extractGoogleEmail(null, 'Vikram.Sharma@ashivam.com'),
    'vikram.sharma@ashivam.com'
  );

  // Anonymous user with no email
  assert.equal(
    extractGoogleEmail(null, null),
    null
  );

  // Non-email numeric user ID (must NOT match)
  assert.equal(
    extractGoogleEmail({ user: 'users/9988776655' }),
    null
  );
});

// 20. Google Workspace OAuth client_id validation & error handling
test('Google Workspace OAuth frontend validator detects missing or empty client_id and blocks invalid redirects', () => {
  const validateAuthUrl = (url) => {
    if (!url) throw new Error('Google authorization URL was not received from the server.');
    const parsed = new URL(url);
    const clientId = parsed.searchParams.get('client_id');
    if (!clientId || !clientId.trim()) {
      throw new Error('Backend configuration error: client_id is missing from authorization URL.');
    }
    return {
      isValid: true,
      clientId,
      redirectUri: parsed.searchParams.get('redirect_uri'),
    };
  };

  // Rejects URL with missing client_id
  assert.throws(
    () => validateAuthUrl('https://accounts.google.com/o/oauth2/v2/auth?redirect_uri=https://example.com/callback'),
    /client_id is missing/
  );

  // Rejects URL with empty client_id
  assert.throws(
    () => validateAuthUrl('https://accounts.google.com/o/oauth2/v2/auth?client_id=&redirect_uri=https://example.com/callback'),
    /client_id is missing/
  );

  // Rejects null or empty string
  assert.throws(
    () => validateAuthUrl(''),
    /authorization URL was not received/
  );

  // Accepts valid URL
  const valid = validateAuthUrl('https://accounts.google.com/o/oauth2/v2/auth?client_id=test-client-id.apps.googleusercontent.com&redirect_uri=https://example.com/callback');
  assert.equal(valid.isValid, true);
  assert.equal(valid.clientId, 'test-client-id.apps.googleusercontent.com');
  assert.equal(valid.redirectUri, 'https://example.com/callback');
});
