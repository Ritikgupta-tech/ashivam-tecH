import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getCareerJobs,
  createJob,
  updateJob,
  deleteJob,
  getCareerApplications,
  updateApplicationStatus,
  downloadApplicationResume,
  exportCareerApplicationsCsv,
} from '../../../api';
import { Panel, DataTable, FilterBar, PaginationBar, StatusBadge, EmptyState } from '../AdminUI';
import { useAdminFeedback } from '../AdminFeedback';
import {
  BriefcaseIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  DownloadIcon,
  RefreshIcon,
  XMarkIcon,
  PencilSquareIcon,
} from '../../icons';

const APP_STATUS_TONE_MAP = {
  applied: 'blue',
  under_review: 'amber',
  shortlisted: 'green',
  interview_scheduled: 'blue',
  rejected: 'red',
  hired: 'green',
};

export default function CareersTab() {
  const { toast, confirm } = useAdminFeedback();

  const [activeSection, setActiveSection] = useState('jobs'); // 'jobs' | 'applications'

  // Jobs state
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobSearch, setJobSearch] = useState('');
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobSubmitting, setJobSubmitting] = useState(false);
  const [jobFormError, setJobFormError] = useState('');

  const [jobForm, setJobForm] = useState({
    title: '',
    slug: '',
    department: 'Software Engineering',
    employmentType: 'Full-time',
    location: 'Agra, India / Hybrid',
    experience: '1-3 Years',
    salary: '',
    applicationDeadline: '',
    isActive: true,
    description: '',
    responsibilities: '',
    skills: '',
    qualifications: '',
  });

  // Applications state
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('all');
  const [appPage, setAppPage] = useState(1);
  const [appLimit, setAppLimit] = useState(15);
  const [appPagination, setAppPagination] = useState({ total: 0, totalPages: 1 });
  const [downloadingResumeId, setDownloadingResumeId] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  // Fetch jobs
  const fetchJobsList = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await getCareerJobs({ page: 1, limit: 50 });
      const items = res?.data?.items || res?.data?.jobs || res?.data || [];
      setJobs(items);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch job postings');
    } finally {
      setJobsLoading(false);
    }
  }, [toast]);

  const [appsExporting, setAppsExporting] = useState(false);

  const handleExportApplicationsCsv = async () => {
    try {
      setAppsExporting(true);
      const params = {};
      if (appStatusFilter !== 'all') params.status = appStatusFilter;
      if (appSearch.trim()) params.search = appSearch.trim();
      await exportCareerApplicationsCsv(params);
      toast.success('Candidate applications exported to CSV successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to export applications');
    } finally {
      setAppsExporting(false);
    }
  };

  // Fetch applications
  const fetchAppsList = useCallback(async () => {
    setAppsLoading(true);
    try {
      const params = { page: appPage, limit: appLimit };
      if (appStatusFilter !== 'all') params.status = appStatusFilter;
      if (appSearch.trim()) params.search = appSearch.trim();

      const res = await getCareerApplications(params);
      const items = res?.data?.items || res?.data?.applications || res?.data || [];
      const total = res?.data?.total ?? items.length;
      const totalPages = res?.data?.totalPages ?? Math.max(1, Math.ceil(total / appLimit));

      setApplications(items);
      setAppPagination({ total, totalPages });
    } catch (err) {
      toast.error(err.message || 'Failed to fetch job applications');
    } finally {
      setAppsLoading(false);
    }
  }, [appPage, appLimit, appStatusFilter, appSearch, toast]);

  useEffect(() => {
    if (activeSection === 'jobs') {
      fetchJobsList();
    } else {
      fetchAppsList();
    }
  }, [activeSection, fetchJobsList, fetchAppsList]);

  // Open Create Job Modal
  const handleOpenCreateJob = () => {
    setEditingJob(null);
    setJobFormError('');
    setJobForm({
      title: '',
      slug: '',
      department: 'Software Engineering',
      employmentType: 'Full-time',
      location: 'Agra, India / Hybrid',
      experience: '1-3 Years',
      salary: '',
      applicationDeadline: '',
      isActive: true,
      description: '',
      responsibilities: '',
      skills: '',
      qualifications: '',
    });
    setShowJobModal(true);
  };

  // Open Edit Job Modal
  const handleOpenEditJob = (job) => {
    setEditingJob(job);
    setJobFormError('');
    setJobForm({
      title: job.title || '',
      slug: job.slug || '',
      department: job.department || 'Software Engineering',
      employmentType: job.employmentType || 'Full-time',
      location: job.location || 'Agra, India / Hybrid',
      experience: job.experience || '1-3 Years',
      salary: job.salary || '',
      applicationDeadline: job.applicationDeadline
        ? new Date(job.applicationDeadline).toISOString().split('T')[0]
        : '',
      isActive: Boolean(job.isActive),
      description: job.description || '',
      responsibilities: Array.isArray(job.responsibilities)
        ? job.responsibilities.join('\n')
        : job.responsibilities || '',
      skills: Array.isArray(job.skills) ? job.skills.join('\n') : job.skills || '',
      qualifications: Array.isArray(job.qualifications)
        ? job.qualifications.join('\n')
        : job.qualifications || '',
    });
    setShowJobModal(true);
  };

  // Submit Job
  const handleJobSubmit = async (e) => {
    e.preventDefault();
    setJobFormError('');

    const title = jobForm.title.trim();
    if (!title) {
      setJobFormError('Job title is required');
      return;
    }

    const parseList = (str) =>
      (str || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

    const payload = {
      title,
      slug: jobForm.slug.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      department: jobForm.department,
      employmentType: jobForm.employmentType,
      location: jobForm.location.trim(),
      experience: jobForm.experience.trim(),
      salary: jobForm.salary.trim(),
      applicationDeadline: jobForm.applicationDeadline || null,
      isActive: Boolean(jobForm.isActive),
      description: jobForm.description.trim(),
      responsibilities: parseList(jobForm.responsibilities),
      skills: parseList(jobForm.skills),
      qualifications: parseList(jobForm.qualifications),
    };

    setJobSubmitting(true);
    try {
      if (editingJob) {
        await updateJob(editingJob._id, payload);
        toast.success(`Job vacancy "${title}" updated successfully.`);
      } else {
        await createJob(payload);
        toast.success(`New vacancy "${title}" published successfully.`);
      }
      setShowJobModal(false);
      fetchJobsList();
    } catch (err) {
      setJobFormError(err.message || 'Failed to save job vacancy');
    } finally {
      setJobSubmitting(false);
    }
  };

  // Toggle Job Active Status
  const handleToggleJobActive = async (job) => {
    const nextStatus = !job.isActive;
    try {
      await updateJob(job._id, { isActive: nextStatus });
      toast.success(
        `Job "${job.title}" is now ${nextStatus ? 'Active' : 'Closed'}.`
      );
      setJobs((prev) =>
        prev.map((j) => (j._id === job._id ? { ...j, isActive: nextStatus } : j))
      );
    } catch (err) {
      toast.error(err.message || 'Failed to toggle job status');
    }
  };

  // Delete Job
  const handleDeleteJob = async (job) => {
    const ok = await confirm({
      title: 'Delete Job Opening',
      message: `Permanently delete vacancy for "${job.title}"? Candidates who already applied will have their records preserved, but new submissions will close.`,
      confirmLabel: 'Delete Job',
      tone: 'danger',
    });

    if (!ok) return;

    try {
      await deleteJob(job._id);
      toast.success(`Job "${job.title}" removed.`);
      fetchJobsList();
    } catch (err) {
      toast.error(err.message || 'Failed to delete job opening');
    }
  };

  // Download resume
  const handleDownloadResume = async (app) => {
    try {
      setDownloadingResumeId(app._id);
      const fallback = `${app.firstName}_${app.lastName}_Resume.pdf`;
      await downloadApplicationResume(app._id, fallback);
      toast.success('Resume download initiated.');
    } catch (err) {
      toast.error(err.message || 'Failed to download resume');
    } finally {
      setDownloadingResumeId(null);
    }
  };

  // Update application status
  const handleAppStatusChange = async (appId, newStatus) => {
    try {
      await updateApplicationStatus(appId, { status: newStatus });
      toast.success(`Candidate status updated to ${newStatus.replace('_', ' ')}.`);
      setApplications((prev) =>
        prev.map((a) => (a._id === appId ? { ...a, status: newStatus } : a))
      );
      if (selectedApp?._id === appId) {
        setSelectedApp((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update application status');
    }
  };

  const filteredJobs = useMemo(() => {
    if (!jobSearch.trim()) return jobs;
    const q = jobSearch.toLowerCase();
    return jobs.filter(
      (j) =>
        j.title?.toLowerCase().includes(q) ||
        j.department?.toLowerCase().includes(q) ||
        j.location?.toLowerCase().includes(q)
    );
  }, [jobs, jobSearch]);

  return (
    <div className="admin-tab-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Careers & Talent Acquisition</h1>
          <p className="admin-page-subtitle">
            Manage engineering vacancies, job descriptions, and candidate recruitment pipelines
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {activeSection === 'jobs' && (
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-btn--sm"
              onClick={handleOpenCreateJob}
            >
              <PlusIcon size={16} />
              <span>Post New Job</span>
            </button>
          )}
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={activeSection === 'jobs' ? fetchJobsList : fetchAppsList}
          >
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Section Switcher Tabs */}
      <div className="admin-segmented-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'jobs'}
          className={`admin-segmented-btn ${activeSection === 'jobs' ? 'admin-segmented-btn--active' : ''}`}
          onClick={() => setActiveSection('jobs')}
        >
          <span>Job Openings ({jobs.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSection === 'applications'}
          className={`admin-segmented-btn ${activeSection === 'applications' ? 'admin-segmented-btn--active' : ''}`}
          onClick={() => setActiveSection('applications')}
        >
          <span>Candidate Applications ({appPagination.total || applications.length})</span>
        </button>
      </div>

      {/* SECTION 1: JOBS MANAGEMENT */}
      {activeSection === 'jobs' && (
        <>
          <FilterBar
            search={jobSearch}
            onSearchChange={setJobSearch}
            placeholder="Search vacancies by title, department, or location..."
            onClear={jobSearch ? () => setJobSearch('') : undefined}
          />

          <Panel>
            <DataTable
              caption="Job Openings"
              columns={[
                { key: 'title', label: 'Position & Department' },
                { key: 'type', label: 'Type & Location' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: 'Actions', style: { textAlign: 'right' } },
              ]}
              data={filteredJobs}
              isLoading={jobsLoading}
              emptyMessage="No job openings posted yet. Click 'Post New Job' to publish a vacancy."
              renderRow={(job) => (
                <tr key={job._id} className="admin-table-row">
                  <td>
                    <div className="admin-table-user-cell">
                      <span className="admin-cell-title">{job.title}</span>
                      <span className="admin-cell-sub">{job.department}</span>
                      {job.experience && (
                        <span className="admin-cell-muted">Exp: {job.experience}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="admin-cell-title">{job.employmentType}</span>
                    <span className="admin-cell-sub">{job.location}</span>
                  </td>
                  <td>
                    <StatusBadge
                      label={job.isActive ? 'Active' : 'Closed'}
                      tone={job.isActive ? 'green' : 'slate'}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="admin-table-actions">
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={() => handleToggleJobActive(job)}
                        title={job.isActive ? 'Close Vacancy' : 'Reopen Vacancy'}
                      >
                        {job.isActive ? 'Close' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={() => handleOpenEditJob(job)}
                        title="Edit Job"
                      >
                        <PencilSquareIcon size={16} />
                      </button>
                      <button
                        type="button"
                        className="admin-action-btn admin-action-btn--danger"
                        onClick={() => handleDeleteJob(job)}
                        title="Delete Job"
                      >
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            />
          </Panel>
        </>
      )}

      {/* SECTION 2: CANDIDATE APPLICATIONS */}
      {activeSection === 'applications' && (
        <>
          <FilterBar
            search={appSearch}
            onSearchChange={(val) => {
              setAppSearch(val);
              setAppPage(1);
            }}
            placeholder="Search candidate by name, email, or applied position..."
            filters={[
              {
                id: 'app-status-filter',
                label: 'Status',
                value: appStatusFilter,
                onChange: (val) => {
                  setAppStatusFilter(val);
                  setAppPage(1);
                },
                options: [
                  { value: 'all', label: 'All Statuses' },
                  { value: 'applied', label: 'Applied (New)' },
                  { value: 'under_review', label: 'Under Review' },
                  { value: 'shortlisted', label: 'Shortlisted' },
                  { value: 'interview_scheduled', label: 'Interview Scheduled' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'hired', label: 'Hired' },
                ],
              },
            ]}
            onClear={
              appSearch || appStatusFilter !== 'all'
                ? () => {
                    setAppSearch('');
                    setAppStatusFilter('all');
                    setAppPage(1);
                  }
                : undefined
            }
          />

          <Panel>
            <DataTable
              caption="Candidate Applications"
              columns={[
                { key: 'candidate', label: 'Candidate' },
                { key: 'job', label: 'Position Applied' },
                { key: 'status', label: 'Recruitment Status' },
                { key: 'date', label: 'Applied On' },
                { key: 'actions', label: 'Actions', style: { textAlign: 'right' } },
              ]}
              data={applications}
              isLoading={appsLoading}
              emptyMessage="No job applications match your filters."
              renderRow={(app) => {
                const dateStr = app.createdAt
                  ? new Date(app.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <tr key={app._id} className="admin-table-row">
                    <td>
                      <div className="admin-table-user-cell">
                        <span className="admin-cell-title">
                          {app.firstName} {app.lastName}
                        </span>
                        <span className="admin-cell-sub">{app.email}</span>
                        {app.phone && <span className="admin-cell-muted">{app.phone}</span>}
                      </div>
                    </td>
                    <td>
                      <span className="admin-cell-title">
                        {app.jobTitle || app.job?.title || 'Open Application'}
                      </span>
                      {app.experience && (
                        <span className="admin-cell-muted">Exp: {app.experience}</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge
                        label={app.status ? app.status.replace('_', ' ') : 'applied'}
                        tone={APP_STATUS_TONE_MAP[app.status] || 'slate'}
                      />
                    </td>
                    <td>
                      <span className="admin-cell-date">{dateStr}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="admin-table-actions">
                        <button
                          type="button"
                          className="admin-action-btn"
                          onClick={() => setSelectedApp(app)}
                          title="View Application Details"
                        >
                          <EyeIcon size={16} />
                        </button>

                        <button
                          type="button"
                          className="admin-action-btn"
                          disabled={downloadingResumeId === app._id}
                          onClick={() => handleDownloadResume(app)}
                          title="Download Resume"
                        >
                          <DownloadIcon size={16} />
                        </button>

                        <select
                          className="admin-table-select"
                          value={app.status || 'applied'}
                          onChange={(e) => handleAppStatusChange(app._id, e.target.value)}
                        >
                          <option value="applied">Applied</option>
                          <option value="under_review">Under Review</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="interview_scheduled">Interview</option>
                          <option value="rejected">Rejected</option>
                          <option value="hired">Hired</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                );
              }}
            />

            <PaginationBar
              page={appPage}
              totalPages={appPagination.totalPages}
              totalCount={appPagination.total}
              limit={appLimit}
              onPageChange={setAppPage}
              onLimitChange={(l) => {
                setAppLimit(l);
                setAppPage(1);
              }}
            />
          </Panel>
        </>
      )}

      {/* CREATE / EDIT JOB MODAL */}
      {showJobModal && (
        <div className="admin-modal-overlay" onClick={() => setShowJobModal(false)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-form-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '720px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="job-form-modal-title" className="admin-modal-title">
                  {editingJob ? 'Edit Job Opening' : 'Post New Job Opening'}
                </h3>
                <p className="admin-modal-subtitle">
                  Configure job specs, department, requirements, and publishing status
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setShowJobModal(false)}
                aria-label="Close modal"
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            {jobFormError && (
              <div className="admin-alert admin-alert--error" style={{ margin: '1rem 1.5rem 0' }}>
                {jobFormError}
              </div>
            )}

            <form onSubmit={handleJobSubmit} className="admin-modal-form">
              <div className="admin-modal-body">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="job-title-input">
                      Position Title *
                    </label>
                    <input
                      id="job-title-input"
                      type="text"
                      required
                      className="admin-form-input"
                      value={jobForm.title}
                      onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                      placeholder="e.g. Senior Backend Engineer"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="job-dept-select">
                      Department *
                    </label>
                    <select
                      id="job-dept-select"
                      className="admin-form-input"
                      value={jobForm.department}
                      onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                    >
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                      <option value="AI & Machine Learning">AI & Machine Learning</option>
                      <option value="UI/UX & Product Design">UI/UX & Product Design</option>
                      <option value="Operations & Quality">Operations & Quality</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="job-type-select">
                      Employment Type
                    </label>
                    <select
                      id="job-type-select"
                      className="admin-form-input"
                      value={jobForm.employmentType}
                      onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Internship">Internship</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="job-loc-input">
                      Location
                    </label>
                    <input
                      id="job-loc-input"
                      type="text"
                      className="admin-form-input"
                      value={jobForm.location}
                      onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                      placeholder="e.g. Agra, India / Hybrid"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="job-exp-input">
                      Experience Requirement
                    </label>
                    <input
                      id="job-exp-input"
                      type="text"
                      className="admin-form-input"
                      value={jobForm.experience}
                      onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })}
                      placeholder="e.g. 2-5 Years"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="job-salary-input">
                      Salary / Compensation (Optional)
                    </label>
                    <input
                      id="job-salary-input"
                      type="text"
                      className="admin-form-input"
                      value={jobForm.salary}
                      onChange={(e) => setJobForm({ ...jobForm, salary: e.target.value })}
                      placeholder="e.g. ₹8 - 14 LPA / Commensurate"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="job-desc-input">
                    Job Description & Role Summary
                  </label>
                  <textarea
                    id="job-desc-input"
                    className="admin-textarea"
                    rows={3}
                    value={jobForm.description}
                    onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                    placeholder="Provide overview of the role and objectives..."
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="job-resp-input">
                    Key Responsibilities (One per line)
                  </label>
                  <textarea
                    id="job-resp-input"
                    className="admin-textarea"
                    rows={3}
                    value={jobForm.responsibilities}
                    onChange={(e) => setJobForm({ ...jobForm, responsibilities: e.target.value })}
                    placeholder="Lead backend architecture using Node.js&#10;Optimize database indexes on MongoDB&#10;Collaborate with cross-functional teams"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="job-skills-input">
                    Required Technical Skills (One per line)
                  </label>
                  <textarea
                    id="job-skills-input"
                    className="admin-textarea"
                    rows={2}
                    value={jobForm.skills}
                    onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                    placeholder="Node.js&#10;TypeScript&#10;MongoDB&#10;Docker"
                  />
                </div>

                <div className="admin-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={jobForm.isActive}
                      onChange={(e) => setJobForm({ ...jobForm, isActive: e.target.checked })}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      Publish Immediately as Active Vacancy
                    </span>
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowJobModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={jobSubmitting}
                >
                  {jobSubmitting ? 'Saving...' : editingJob ? 'Update Vacancy' : 'Post Vacancy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPLICATION DETAIL MODAL */}
      {selectedApp && (
        <div className="admin-modal-overlay" onClick={() => setSelectedApp(null)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-detail-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="app-detail-modal-title" className="admin-modal-title">
                  Candidate Profile: {selectedApp.firstName} {selectedApp.lastName}
                </h3>
                <p className="admin-modal-subtitle">
                  Applied for {selectedApp.jobTitle || 'Engineering Position'}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setSelectedApp(null)}
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Email</span>
                  <a href={`mailto:${selectedApp.email}`} className="admin-detail-link">
                    {selectedApp.email}
                  </a>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Phone</span>
                  <span className="admin-detail-val">{selectedApp.phone || '—'}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Experience</span>
                  <span className="admin-detail-val">{selectedApp.experience || '—'}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Status</span>
                  <StatusBadge
                    label={selectedApp.status || 'applied'}
                    tone={APP_STATUS_TONE_MAP[selectedApp.status] || 'slate'}
                  />
                </div>
              </div>

              {selectedApp.coverNote && (
                <div className="admin-detail-section">
                  <h4 className="admin-detail-section-title">Cover Note</h4>
                  <div className="admin-transcript-box">{selectedApp.coverNote}</div>
                </div>
              )}

              <div className="admin-detail-section" style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary admin-btn--sm"
                  disabled={downloadingResumeId === selectedApp._id}
                  onClick={() => handleDownloadResume(selectedApp)}
                >
                  <DownloadIcon size={16} />
                  <span>Download Resume Attachment</span>
                </button>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setSelectedApp(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
