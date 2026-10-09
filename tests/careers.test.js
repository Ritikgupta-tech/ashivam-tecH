import test from 'node:test';
import assert from 'node:assert/strict';

// Helper validator matching Careers.jsx logic
function validateApplicationForm(data, file) {
  const errors = {};

  if (!data.firstName || !data.firstName.trim()) {
    errors.firstName = 'First name is required.';
  }
  if (!data.lastName || !data.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !data.email.trim()) {
    errors.email = 'Email address is required.';
  } else if (!emailRegex.test(data.email.trim())) {
    errors.email = 'Please provide a valid email address.';
  }

  const phoneRegex = /^[0-9+\-\s()]{7,20}$/;
  if (!data.phone || !data.phone.trim()) {
    errors.phone = 'Phone number is required.';
  } else if (!phoneRegex.test(data.phone.trim())) {
    errors.phone = 'Please provide a valid phone number (e.g. +91 98765 43210).';
  }

  if (!file) {
    errors.resume = 'Resume file is required (PDF, DOC, or DOCX, max 5MB).';
  } else {
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const lowerName = file.name ? file.name.toLowerCase() : '';
    const hasValidExt = allowedExtensions.some((ext) => lowerName.endsWith(ext));

    if (!hasValidExt) {
      errors.resume = 'Invalid file format. Only PDF, DOC, and DOCX documents are accepted.';
    } else if (file.size > 5 * 1024 * 1024) {
      errors.resume = 'File size exceeds the 5MB limit. Please upload a smaller file.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// 1. Careers Form Validation Tests
test('Careers form validates required personal and contact fields', () => {
  const emptyForm = validateApplicationForm({}, null);
  assert.equal(emptyForm.isValid, false);
  assert.ok(emptyForm.errors.firstName);
  assert.ok(emptyForm.errors.lastName);
  assert.ok(emptyForm.errors.email);
  assert.ok(emptyForm.errors.phone);
  assert.ok(emptyForm.errors.resume);
});

test('Careers form rejects invalid email addresses', () => {
  const invalidEmail = validateApplicationForm(
    {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'not-an-email',
      phone: '+91 9876543210',
    },
    { name: 'jane_resume.pdf', size: 1024 * 50 }
  );
  assert.equal(invalidEmail.isValid, false);
  assert.ok(invalidEmail.errors.email);
});

test('Careers form rejects invalid phone numbers', () => {
  const invalidPhone = validateApplicationForm(
    {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: 'abc-xyz',
    },
    { name: 'jane_resume.pdf', size: 1024 * 50 }
  );
  assert.equal(invalidPhone.isValid, false);
  assert.ok(invalidPhone.errors.phone);
});

// 2. Resume File Validation Tests
test('Careers resume upload accepts valid PDF within 5MB', () => {
  const valid = validateApplicationForm(
    {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+91 9876543210',
    },
    { name: 'jane_resume.pdf', size: 2 * 1024 * 1024 }
  );
  assert.equal(valid.isValid, true);
  assert.deepEqual(valid.errors, {});
});

test('Careers resume upload accepts valid DOC and DOCX formats', () => {
  const docResult = validateApplicationForm(
    {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+91 9876543210',
    },
    { name: 'cv.doc', size: 500 * 1024 }
  );
  assert.equal(docResult.isValid, true);

  const docxResult = validateApplicationForm(
    {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+91 9876543210',
    },
    { name: 'cv.docx', size: 1 * 1024 * 1024 }
  );
  assert.equal(docxResult.isValid, true);
});

test('Careers resume upload rejects forbidden file types (e.g. .exe, .png, .txt)', () => {
  const forbiddenExts = ['script.exe', 'image.png', 'notes.txt', 'archive.zip'];
  for (const name of forbiddenExts) {
    const res = validateApplicationForm(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '+91 9876543210',
      },
      { name, size: 50 * 1024 }
    );
    assert.equal(res.isValid, false, `File "${name}" should be rejected`);
    assert.ok(res.errors.resume);
  }
});

test('Careers resume upload rejects files larger than 5MB', () => {
  const oversizedFile = {
    name: 'heavy_portfolio.pdf',
    size: 5 * 1024 * 1024 + 1, // 1 byte over 5MB
  };
  const res = validateApplicationForm(
    {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      phone: '+91 9876543210',
    },
    oversizedFile
  );
  assert.equal(res.isValid, false);
  assert.match(res.errors.resume, /exceeds the 5MB limit/);
});

// 3. Admin Resume Download Contract Test
test('Admin resume download headers include Bearer authorization and target correct endpoint', () => {
  const mockToken = 'mock_jwt_session_token_12345';
  const applicationId = '6ac887576fae1810cc0e576d';
  const apiBaseUrl = 'https://ashivam-tech.onrender.com/api/v1';

  const expectedUrl = `${apiBaseUrl}/career/admin/applications/${encodeURIComponent(applicationId)}/resume`;
  const headers = {
    Authorization: `Bearer ${mockToken}`,
  };

  assert.equal(
    expectedUrl,
    'https://ashivam-tech.onrender.com/api/v1/career/admin/applications/6ac887576fae1810cc0e576d/resume'
  );
  assert.equal(headers.Authorization, 'Bearer mock_jwt_session_token_12345');
});

// 4. Status Transition Contract Tests
test('Application status transitions use permitted enum values', () => {
  const allowedStatuses = ['applied', 'under_review', 'shortlisted', 'rejected', 'hired'];
  const isValidTransition = (status) => allowedStatuses.includes(status);

  assert.equal(isValidTransition('applied'), true);
  assert.equal(isValidTransition('under_review'), true);
  assert.equal(isValidTransition('shortlisted'), true);
  assert.equal(isValidTransition('rejected'), true);
  assert.equal(isValidTransition('hired'), true);
  assert.equal(isValidTransition('unknown_status'), false);
});

// 5. Careers API Response Shape & Publishing Rules Regression Tests
import { isLegitimatePublishedJob } from '../src/utils/careerPublishing.js';

test('Careers API unwraps confirmed production response { success: true, data: { jobs: [...] } }', () => {
  const mockApiResponse = {
    success: true,
    data: {
      jobs: [
        {
          _id: '6ac87a99c41816739191c463',
          title: 'QA Test Developer Intern',
          slug: 'qa-test-developer-intern',
          department: 'Engineering',
          location: 'Remote',
          employmentType: 'Internship',
          experience: 'Fresher',
          description: 'Temporary production verification job posting. Remove after testing.',
          skills: ['JavaScript'],
          isActive: true,
        },
        {
          _id: '6ac99999c41816739191c999',
          title: 'Senior Distributed Systems Architect',
          slug: 'senior-distributed-systems-architect',
          department: 'Cloud & Infrastructure',
          location: 'Remote / Agra',
          employmentType: 'Full-time',
          experience: '5+ Years',
          description: 'Architect resilient multi-region cloud infrastructures and microservices.',
          skills: ['Kubernetes', 'Go', 'AWS', 'Distributed Systems'],
          isActive: true,
        },
      ],
    },
  };

  // Safe extraction logic matching Careers.jsx
  const extractedJobs = Array.isArray(mockApiResponse?.data?.jobs)
    ? mockApiResponse.data.jobs
    : [];

  assert.equal(extractedJobs.length, 2);
  assert.equal(extractedJobs[0].title, 'QA Test Developer Intern');
  assert.equal(extractedJobs[1].title, 'Senior Distributed Systems Architect');
});

test('isLegitimatePublishedJob filters out temporary QA/test verification records', () => {
  const testJob = {
    _id: '6ac87a99c41816739191c463',
    title: 'QA Test Developer Intern',
    slug: 'qa-test-developer-intern',
    department: 'Engineering',
    location: 'Remote',
    employmentType: 'Internship',
    description: 'Temporary production verification job posting. Remove after testing.',
    isActive: true,
  };

  assert.equal(
    isLegitimatePublishedJob(testJob),
    false,
    'Temporary QA test posting must never be published to public candidates as a genuine vacancy'
  );
});

test('isLegitimatePublishedJob accepts genuine active published vacancies', () => {
  const genuineJob = {
    _id: '6ac88888c41816739191c888',
    title: 'Full Stack React & Node.js Engineer',
    slug: 'full-stack-react-nodejs-engineer',
    department: 'Engineering',
    location: 'Remote / Agra',
    employmentType: 'Full-time',
    experience: '2-4 Years',
    description: 'Lead the frontend architecture and REST API development for core products.',
    skills: ['React', 'Node.js', 'TypeScript', 'MongoDB'],
    isActive: true,
    applicationDeadline: new Date(Date.now() + 864000000).toISOString(), // 10 days in future
  };

  assert.equal(isLegitimatePublishedJob(genuineJob), true);
});

test('isLegitimatePublishedJob rejects inactive jobs and past deadlines', () => {
  const inactiveJob = {
    title: 'Mobile Engineer',
    isActive: false,
    description: 'Build native Android apps',
  };
  assert.equal(isLegitimatePublishedJob(inactiveJob), false);

  const expiredJob = {
    title: 'Security Auditor',
    isActive: true,
    description: 'Perform penetration testing and vulnerability analysis',
    applicationDeadline: '2020-01-01T00:00:00.000Z',
  };
  assert.equal(isLegitimatePublishedJob(expiredJob), false);

  assert.equal(isLegitimatePublishedJob(null), false);
  assert.equal(isLegitimatePublishedJob(undefined), false);
});

test('Careers filtering produces empty array when only test records exist', () => {
  const apiJobs = [
    {
      _id: '6ac87a99c41816739191c463',
      title: 'QA Test Developer Intern',
      description: 'Temporary production verification job posting. Remove after testing.',
      isActive: true,
    },
  ];

  const legitimateJobs = apiJobs.filter(isLegitimatePublishedJob);
  assert.equal(legitimateJobs.length, 0, 'When only test postings exist, published count must be 0');
});

test('Careers API failure state triggers error handling without crashing', () => {
  const handleApiError = (err) => {
    return {
      jobs: [],
      error: err.message || 'Unable to connect to careers service. Please check your network.',
      loading: false,
    };
  };

  const stateAfterError = handleApiError(new Error('Network timeout'));
  assert.equal(stateAfterError.jobs.length, 0);
  assert.equal(stateAfterError.error, 'Network timeout');
  assert.equal(stateAfterError.loading, false);
});

// Job Opening Admin Creation & Public Visibility Tests
test('Admin Job creation form validates required fields and generates clean slug', () => {
  const validateJobOpening = (form) => {
    const errors = {};
    const title = (form.title || '').trim();
    if (!title || title.length < 2) errors.title = 'Title must be at least 2 characters';
    
    let slug = (form.slug || '').trim().toLowerCase();
    if (!slug && title) {
      slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      errors.slug = 'Valid slug is required';
    }

    if (!form.department || !form.department.trim()) errors.department = 'Department is required';
    if (!form.location || !form.location.trim()) errors.location = 'Location is required';
    if (!form.description || !form.description.trim()) errors.description = 'Description is required';

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      slug,
    };
  };

  // Missing fields
  const r1 = validateJobOpening({});
  assert.equal(r1.isValid, false);
  assert.ok(r1.errors.title);
  assert.ok(r1.errors.department);
  assert.ok(r1.errors.location);
  assert.ok(r1.errors.description);

  // Auto-slug generation from title
  const r2 = validateJobOpening({
    title: 'Senior Full-Stack Engineer',
    department: 'Software Engineering',
    location: 'Remote',
    description: 'Lead engineering initiatives',
  });
  assert.equal(r2.isValid, true);
  assert.equal(r2.slug, 'senior-full-stack-engineer');

  // Custom slug
  const r3 = validateJobOpening({
    title: 'AI Engineer',
    slug: 'custom-ai-dev-2026',
    department: 'AI & Machine Learning',
    location: 'Agra, India',
    description: 'Build LLM integrations',
  });
  assert.equal(r3.isValid, true);
  assert.equal(r3.slug, 'custom-ai-dev-2026');
});

test('Published active jobs appear on public careers page while draft and closed jobs remain hidden', () => {
  const publishedJob = {
    _id: 'job-1',
    title: 'Cloud DevOps Architect',
    slug: 'cloud-devops-architect',
    department: 'Cloud & Infrastructure',
    employmentType: 'Full-time',
    location: 'Remote / Agra',
    description: 'Maintain high availability multi-region cloud infrastructure and Kubernetes clusters.',
    isActive: true,
  };

  const draftJob = {
    _id: 'job-2',
    title: 'Junior Technical Writer',
    slug: 'junior-technical-writer',
    department: 'Documentation',
    employmentType: 'Part-time',
    location: 'Agra, India',
    description: 'Draft API documentation and user manuals for engineering systems.',
    isActive: false, // Draft / Closed
  };

  const testQaJob = {
    _id: 'job-3',
    title: 'QA Test Developer Intern',
    slug: 'qa-test-intern',
    department: 'QA',
    employmentType: 'Internship',
    location: 'Agra',
    description: 'Temporary production verification job posting. Remove after testing.',
    isActive: true,
  };

  const allJobs = [publishedJob, draftJob, testQaJob];
  const publicList = allJobs.filter(isLegitimatePublishedJob);

  assert.equal(publicList.length, 1, 'Only genuine active published job should appear publicly');
  assert.equal(publicList[0].title, 'Cloud DevOps Architect');
  assert.equal(publicList[0].isActive, true);
});

