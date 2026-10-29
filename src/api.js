export const CLOUD_PROD_API_URL = 'https://ashivam-tech.onrender.com/api/v1';

const resolveApiBaseUrl = () => {
  const configured = import.meta.env?.VITE_API_URL;

  // When running on localhost / 127.0.0.1 in the browser, direct cross-origin calls
  // to production Render are blocked by production CORS (AUD-02).
  // Route through Vite's local dev proxy (/api/v1) unless an explicit local backend URL is specified.
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    if (
      !configured ||
      configured === CLOUD_PROD_API_URL ||
      configured.includes('ashivam-tech.onrender.com')
    ) {
      return '/api/v1';
    }
    return configured;
  }

  return configured || CLOUD_PROD_API_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();

const DEFAULT_TIMEOUT_MS = 35000;
const TOKEN_KEY = 'ashivam_admin_session_token';

// In-memory fallback if sessionStorage is inaccessible
let inMemoryToken = null;

export const getToken = () => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || inMemoryToken;
  } catch {
    return inMemoryToken;
  }
};

export const setToken = (token) => {
  inMemoryToken = token;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // SessionStorage unavailable, in-memory preserved
  }
};

export const clearToken = () => {
  setToken(null);
};

export const request = async (path, options = {}) => {
  const {
    headers: customHeaders = {},
    timeout = DEFAULT_TIMEOUT_MS,
    signal: externalSignal,
    ...restOptions
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort());
  }

  const token = getToken();
  const headers = { ...customHeaders };

  // Set Content-Type only if body is not FormData
  if (!(restOptions.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Inject Authorization Bearer token if session exists
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...restOptions,
        headers,
        signal: controller.signal,
      });
    } catch (networkErr) {
      // If configured endpoint is unreachable (e.g. local backend refused connection), failover to live cloud backend
      if (
        API_BASE_URL !== CLOUD_PROD_API_URL &&
        !API_BASE_URL.startsWith('/') &&
        networkErr.name !== 'AbortError'
      ) {
        response = await fetch(`${CLOUD_PROD_API_URL}${path}`, {
          ...restOptions,
          headers,
          signal: controller.signal,
        });
      } else {
        throw networkErr;
      }
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Auto-clear token on 401 Unauthorized for authenticated requests
      if (response.status === 401 && token && path !== '/auth/login') {
        clearToken();
      }

      const error = new Error(result.message || 'Request failed');
      error.status = response.status;
      error.details = result.errors || {};
      error.requestId = result.requestId;
      throw error;
    }

    return result;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutError = new Error('Request timed out. Please check your connection and try again.');
      timeoutError.status = 408;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

/* -------------------------------------------------------------
 * Public Endpoints
 * ----------------------------------------------------------- */
export const submitInquiry = (data) =>
  request('/inquiries', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getPublicJobs = () => request('/career/jobs');

export const getPublicJobById = (id) =>
  request(`/career/jobs/${encodeURIComponent(id)}`);

export const applyForJob = (jobId, formData) =>
  request(`/career/jobs/${encodeURIComponent(jobId)}/apply`, {
    method: 'POST',
    body: formData,
  });

export const getPublicEmployees = () => request('/employees/public');

export const getPublicSettings = () => request('/settings/public');

export const getPublicContentBySection = (section) =>
  request(`/content/public/section/${encodeURIComponent(section)}`);

export const getPublicContentByKey = (key) =>
  request(`/content/public/key/${encodeURIComponent(key)}`);

/* -------------------------------------------------------------
 * Authentication Endpoints
 * ----------------------------------------------------------- */
export const loginAdmin = ({ username, password }) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const getMe = () => request('/auth/me');

/* -------------------------------------------------------------
 * Query Helper
 * ----------------------------------------------------------- */
const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query.append(key, val);
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
};

/* -------------------------------------------------------------
 * Dashboard Endpoints
 * ----------------------------------------------------------- */
export const getDashboardOverview = (params) =>
  request(`/dashboard/overview${buildQuery(params)}`);

export const getDashboardSummary = (params) =>
  request(`/dashboard/summary${buildQuery(params)}`);

export const getDashboardRecentActivity = (limit = 10) =>
  request(`/dashboard/recent-activity?limit=${encodeURIComponent(limit)}`);

/* -------------------------------------------------------------
 * Module Management Endpoints
 * ----------------------------------------------------------- */

export const getInquiries = (params) =>
  request(`/inquiries${buildQuery(params)}`);

export const updateInquiryStatus = (id, data) =>
  request(`/inquiries/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const getCareerJobs = (params) =>
  request(`/career/admin/jobs${buildQuery(params)}`);

export const createJob = (data) =>
  request('/career/admin/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateJob = (id, data) =>
  request(`/career/admin/jobs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteJob = (id) =>
  request(`/career/admin/jobs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const getCareerApplications = (params) =>
  request(`/career/admin/applications${buildQuery(params)}`);

export const getCareerApplicationById = (id) =>
  request(`/career/admin/applications/${encodeURIComponent(id)}`);

export const updateApplicationStatus = (id, data) =>
  request(`/career/admin/applications/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteApplication = (id) =>
  request(`/career/admin/applications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const downloadApplicationResume = async (applicationId, fallbackFileName = 'resume.pdf') => {
  const token = getToken();
  const response = await fetch(
    `${API_BASE_URL}/career/admin/applications/${encodeURIComponent(applicationId)}/resume`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.message || 'Failed to download resume');
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition');
  let filename = fallbackFileName;

  if (contentDisposition) {
    const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);

  return { success: true, filename };
};

export const getInquiryById = (id) =>
  request(`/inquiries/${encodeURIComponent(id)}`);

export const deleteInquiry = (id) =>
  request(`/inquiries/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const getInternships = (params) =>
  request(`/internships${buildQuery(params)}`);

export const getInternshipById = (id) =>
  request(`/internships/${encodeURIComponent(id)}`);

export const updateInternship = (id, data) =>
  request(`/internships/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteInternship = (id) =>
  request(`/internships/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const convertInternshipApplication = (id, data) =>
  request(`/internships/applications/${encodeURIComponent(id)}/convert`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getInterns = (params) =>
  request(`/internships/interns${buildQuery(params)}`);

export const getInternById = (id) =>
  request(`/internships/interns/${encodeURIComponent(id)}`);

export const createIntern = (data) =>
  request('/internships/interns', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateIntern = (id, data) =>
  request(`/internships/interns/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const updateInternStatus = (id, data) =>
  request(`/internships/interns/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const updateInternOnboarding = (id, data) =>
  request(`/internships/interns/${encodeURIComponent(id)}/onboarding`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteIntern = (id) =>
  request(`/internships/interns/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const getInternshipPrograms = (params) =>
  request(`/internships/programs${buildQuery(params)}`);

export const getPublicInternshipPrograms = () =>
  request('/internships/programs/public');

export const createInternshipProgram = (data) =>
  request('/internships/programs', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateInternshipProgram = (id, data) =>
  request(`/internships/programs/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteInternshipProgram = (id) =>
  request(`/internships/programs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const getEmployees = (params) =>
  request(`/employees${buildQuery(params)}`);

export const getEmployeeById = (id) =>
  request(`/employees/${encodeURIComponent(id)}`);

export const createEmployee = (data) =>
  request('/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateEmployee = (id, data) =>
  request(`/employees/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const updateEmployeeStatus = (id, isActive) =>
  request(`/employees/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });

export const deleteEmployee = (id) =>
  request(`/employees/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const getEmployeeDocuments = (employeeId) =>
  request(`/employee-documents/${encodeURIComponent(employeeId)}`);

export const getHrDocuments = (params) =>
  request(`/hr-documents${buildQuery(params)}`);

export const uploadHrDocument = (formData) =>
  request('/hr-documents', {
    method: 'POST',
    body: formData,
  });

export const updateHrDocumentStatus = (id, data) =>
  request(`/hr-documents/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteHrDocument = (id) =>
  request(`/hr-documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const downloadHrDocument = async (id, fallbackFileName = 'document.pdf') => {
  const token = getToken();
  const response = await fetch(
    `${API_BASE_URL}/hr-documents/${encodeURIComponent(id)}/download`,
    {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.message || 'Failed to download HR document');
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition');
  let filename = fallbackFileName;

  if (contentDisposition) {
    const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);

  return { success: true, filename };
};

export const getContentBlocks = (params) =>
  request(`/content${buildQuery(params)}`);

export const createContentBlock = (data) =>
  request('/content', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateContentBlock = (id, data) =>
  request(`/content/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const publishContentBlock = (id) =>
  request(`/content/${encodeURIComponent(id)}/publish`, {
    method: 'PATCH',
  });

export const unpublishContentBlock = (id) =>
  request(`/content/${encodeURIComponent(id)}/unpublish`, {
    method: 'PATCH',
  });

export const deleteContentBlock = (id) =>
  request(`/content/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const getMediaList = (params) =>
  request(`/media${buildQuery(params)}`);

export const uploadMediaFile = (formData) =>
  request('/media', {
    method: 'POST',
    body: formData,
  });

export const deleteMediaFile = (id) =>
  request(`/media/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

export const getSettings = () => request('/settings');

export const updateSettings = (data) =>
  request('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const resetSettings = () =>
  request('/settings/reset', {
    method: 'POST',
  });

export const getAuditLogs = (params) =>
  request(`/audit${buildQuery(params)}`);

export const getAdmins = (params) =>
  request(`/admin${buildQuery(params)}`);

export const createAdminAccount = (data) =>
  request('/admin', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateAdminAccount = (id, data) =>
  request(`/admin/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const updateAdminStatus = (id, isActive) =>
  request(`/admin/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });

export const updateAdminPermissions = (id, permissions) =>
  request(`/admin/${encodeURIComponent(id)}/permissions`, {
    method: 'PATCH',
    body: JSON.stringify({ permissions }),
  });

export const deleteAdminAccount = (id) =>
  request(`/admin/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

/* -------------------------------------------------------------
 * Authenticated CSV Export Helpers
 * ----------------------------------------------------------- */
export const downloadAuthenticatedCsv = async (endpoint, fallbackFilename) => {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.message || 'Failed to download CSV export');
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition');
  let filename = fallbackFilename;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(blobUrl);

  return { success: true, filename };
};

export const exportInquiriesCsv = (params) =>
  downloadAuthenticatedCsv(`/inquiries/export${buildQuery(params)}`, 'inquiries_export.csv');

export const exportCareerApplicationsCsv = (params) =>
  downloadAuthenticatedCsv(
    `/career/admin/applications/export${buildQuery(params)}`,
    'job_applications_export.csv'
  );

export const exportAuditLogsCsv = (params) =>
  downloadAuthenticatedCsv(`/audit/export${buildQuery(params)}`, 'security_audit_export.csv');

export const exportInternshipsCsv = (params) =>
  downloadAuthenticatedCsv(`/internships/export${buildQuery(params)}`, 'internship_applications.csv');

export const exportInternsCsv = (params) =>
  downloadAuthenticatedCsv(`/internships/interns/export${buildQuery(params)}`, 'interns_roster.csv');
