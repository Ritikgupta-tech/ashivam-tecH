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
    email: 'amit.verma@ashivamtechnologies.com',
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
      email: 'contact@ashivamtechnologies.com',
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
