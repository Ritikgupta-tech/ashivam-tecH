import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRightIcon } from '../icons';
import { getPublicJobs, applyForJob } from '../../api';
import { isLegitimatePublishedJob } from '../../utils/careerPublishing';
import './Careers.css';

const PHONE_REGEX = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTS = ['.pdf', '.doc', '.docx'];

export default function Careers() {
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Application Modal State
  const [selectedJob, setSelectedJob] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Form Fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentLocation: '',
    experience: 'Fresher',
    coverLetter: '',
  });
  const [resumeFile, setResumeFile] = useState(null);

  const modalRef = useRef(null);

  // Fetch active jobs from live backend
  const fetchJobs = useCallback(async () => {
    setLoadingJobs(true);
    setFetchError(null);
    try {
      const res = await getPublicJobs();
      const rawJobs = Array.isArray(res?.data?.jobs)
        ? res.data.jobs
        : Array.isArray(res?.data)
          ? res.data
          : [];

      // Filter for strictly legitimate, published, non-test jobs
      const publishedJobs = rawJobs.filter(isLegitimatePublishedJob);
      setJobs(publishedJobs);
    } catch (err) {
      setFetchError(err.message || 'Unable to connect to careers service. Please check your network.');
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleOpenApply = (job) => {
    if (!job) return;
    setSelectedJob(job);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      currentLocation: '',
      experience: job.experience || 'Fresher',
      coverLetter: '',
    });
    setResumeFile(null);
    setFieldErrors({});
    setSubmitError('');
    setSubmitSuccess(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedJob(null);
    setSubmitSuccess(false);
    setSubmitError('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setFieldErrors((prev) => ({
        ...prev,
        resume: 'Only PDF, DOC, and DOCX resume formats are supported.',
      }));
      setResumeFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFieldErrors((prev) => ({
        ...prev,
        resume: 'Resume file size cannot exceed 5MB.',
      }));
      setResumeFile(null);
      return;
    }

    setFieldErrors((prev) => ({ ...prev, resume: '' }));
    setResumeFile(file);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required.';
    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      errors.email = 'Please provide a valid email address.';
    }
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (!PHONE_REGEX.test(formData.phone.trim())) {
      errors.phone = 'Please provide a valid phone number (7-20 digits).';
    }
    if (!resumeFile) {
      errors.resume = 'Resume document is required.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;
    if (!selectedJob || !selectedJob._id) {
      setSubmitError('Invalid job selection. Please try selecting the role again.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = new FormData();
      payload.append('firstName', formData.firstName.trim());
      payload.append('lastName', formData.lastName.trim());
      payload.append('email', formData.email.trim().toLowerCase());
      payload.append('phone', formData.phone.trim());
      if (formData.currentLocation.trim()) {
        payload.append('currentLocation', formData.currentLocation.trim());
      }
      if (formData.experience) {
        payload.append('experience', formData.experience);
      }
      if (formData.coverLetter.trim()) {
        payload.append('coverLetter', formData.coverLetter.trim());
      }
      payload.append('resume', resumeFile);

      await applyForJob(selectedJob._id, payload);
      setSubmitSuccess(true);
    } catch (err) {
      if (err.status === 409) {
        setSubmitError('You have already applied for this opening using this email address.');
      } else if (err.status === 429) {
        setSubmitError('Too many applications submitted recently. Please wait a few minutes before retrying.');
      } else if (err.status === 400 && err.details?.resume) {
        setSubmitError(err.details.resume);
      } else {
        setSubmitError(err.message || 'Unable to submit application. Please check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="careers section" id="careers" aria-labelledby="careers-heading">
      <div className="container">
        <div className="careers__inner">
          {/* Header */}
          <div className="careers__header">
            <p className="section-label reveal">Opportunities</p>
            <h2 id="careers-heading" className="reveal reveal--delay-1">
              Build Your Future{' '}
              <span className="gradient-text-gold">With Ashivam</span>
            </h2>
            <p className="careers__desc reveal reveal--delay-2">
              Ashivam Technologies is building an elite software engineering culture in Agra, India, 
              welcoming talented developers, architects, UI/UX designers, and innovative thinkers. 
              We offer contribution-based and internship roles engineered for deep technical growth.
            </p>
            <div className="careers__ctas reveal reveal--delay-3">
              <button
                type="button"
                className="btn btn-primary"
                id="careers-cta-join"
                onClick={() => {
                  if (jobs.length > 0) {
                    handleOpenApply(jobs[0]);
                  } else {
                    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <span>Join Our Engineering Team</span>
                <ArrowRightIcon size={16} />
              </button>
              <a
                href="#contact"
                className="btn btn-outline"
                id="careers-cta-view"
              >
                Inquire Positions
              </a>
            </div>
          </div>

          {/* Opportunities list */}
          <div className="careers__list" aria-label="Open positions">
            {/* Loading State */}
            {loadingJobs && (
              <div className="career-state-card" role="status" aria-live="polite">
                <div className="career-spinner" aria-hidden="true" />
                <p className="career-state-title">Loading Career Opportunities...</p>
                <p className="career-state-desc">Fetching active engineering roles from talent registry</p>
              </div>
            )}

            {/* Error State */}
            {!loadingJobs && fetchError && (
              <div className="career-state-card career-state-card--error" role="alert">
                <div className="career-state-icon" aria-hidden="true">⚠️</div>
                <p className="career-state-title">Unable to Load Vacancies</p>
                <p className="career-state-desc">{fetchError}</p>
                <button
                  type="button"
                  className="career-btn-retry"
                  onClick={fetchJobs}
                >
                  ↻ Try Again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!loadingJobs && !fetchError && jobs.length === 0 && (
              <div className="career-empty-card" role="region" aria-label="No current vacancies">
                <div className="career-empty-badge">Hiring Status: Open for Exceptional Talent</div>
                <h3 className="career-empty-title">No Current Open Vacancies</h3>
                <p className="career-empty-desc">
                  We do not have active public positions listed at this moment. However, Ashivam Technologies
                  is always eager to connect with exceptional software engineers, distributed systems architects,
                  and creative UI/UX visionaries.
                </p>
                <div className="career-empty-actions">
                  <a href="#contact" className="btn btn-primary">
                    <span>Send Open Inquiry</span>
                    <ArrowRightIcon size={14} />
                  </a>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={fetchJobs}
                    title="Refresh for newly published openings"
                  >
                    <span>Check for Updates</span>
                  </button>
                </div>
              </div>
            )}

            {/* Legitimate Jobs List */}
            {!loadingJobs && !fetchError && jobs.length > 0 &&
              jobs.map((job) => (
                <div
                  key={job._id}
                  className="career-card"
                  aria-label={`${job.title} — ${job.employmentType}`}
                >
                  <div className="career-card__header">
                    <div className="career-card__badges">
                      <span className="career-card__badge-status">Open Role</span>
                      <span className="career-card__badge-dept">{job.department || 'Engineering'}</span>
                      <span className="career-card__badge-type">{job.employmentType}</span>
                    </div>
                    {job.location && (
                      <span className="career-card__location">📍 {job.location}</span>
                    )}
                  </div>

                  <h3 className="career-card__title">{job.title}</h3>

                  {job.description && (
                    <p className="career-card__desc">{job.description}</p>
                  )}

                  {Array.isArray(job.skills) && job.skills.length > 0 && (
                    <div className="career-card__skills">
                      {job.skills.map((skill, sIdx) => (
                        <span key={sIdx} className="career-card__skill-tag">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="career-card__footer">
                    <div className="career-card__meta-details">
                      {job.experience && (
                        <span>🎯 Experience: <strong>{job.experience}</strong></span>
                      )}
                      {job.salary && (
                        <span>💼 Compensation: <strong>{job.salary}</strong></span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="career-card__apply-btn"
                      onClick={() => handleOpenApply(job)}
                      aria-label={`Apply for ${job.title}`}
                    >
                      <span>Apply Now</span>
                      <ArrowRightIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Online Job Application Modal */}
      {isModalOpen && selectedJob && (
        <div
          className="career-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="career-modal-title"
        >
          <div className="career-modal" ref={modalRef}>
            <div className="career-modal__header">
              <div className="career-modal__title-group">
                <h3 id="career-modal-title">{selectedJob.title || selectedJob.role}</h3>
                <div className="career-modal__meta">
                  <span className="career-modal__badge">{selectedJob.department || 'Engineering'}</span>
                  <span className="career-modal__badge">{selectedJob.employmentType || selectedJob.type}</span>
                  <span className="career-modal__badge">{selectedJob.location || 'Agra, India / Remote'}</span>
                </div>
              </div>
              <button
                type="button"
                className="career-modal__close"
                onClick={handleCloseModal}
                aria-label="Close application form"
              >
                ×
              </button>
            </div>

            <div className="career-modal__body">
              {submitSuccess ? (
                <div className="career-success-view">
                  <div className="career-success-icon" aria-hidden="true">
                    ✓
                  </div>
                  <h4 className="career-success-title">Application Submitted!</h4>
                  <p className="career-success-desc">
                    Thank you, <strong>{formData.firstName}</strong>. Your application and resume for{' '}
                    <strong>{selectedJob.title}</strong> have been securely received and recorded.
                  </p>
                  <p className="career-success-desc" style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.5)' }}>
                    Our engineering leadership team will review your qualifications and reach out via{' '}
                    <strong>{formData.email}</strong>.
                  </p>
                  <button
                    type="button"
                    className="career-submit-btn"
                    onClick={handleCloseModal}
                    style={{ minWidth: '160px' }}
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form className="career-modal__form" onSubmit={handleSubmit} noValidate>
                  {submitError && (
                    <div className="career-modal-alert" role="alert">
                      {submitError}
                    </div>
                  )}

                  <div className="career-form-row">
                    <div className="career-field-group">
                      <label className="career-field-label" htmlFor="app-firstName">
                        First Name *
                      </label>
                      <input
                        id="app-firstName"
                        type="text"
                        required
                        className="career-field-input"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))}
                      />
                      {fieldErrors.firstName && (
                        <span className="career-field-error">{fieldErrors.firstName}</span>
                      )}
                    </div>
                    <div className="career-field-group">
                      <label className="career-field-label" htmlFor="app-lastName">
                        Last Name *
                      </label>
                      <input
                        id="app-lastName"
                        type="text"
                        required
                        className="career-field-input"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))}
                      />
                      {fieldErrors.lastName && (
                        <span className="career-field-error">{fieldErrors.lastName}</span>
                      )}
                    </div>
                  </div>

                  <div className="career-form-row">
                    <div className="career-field-group">
                      <label className="career-field-label" htmlFor="app-email">
                        Email Address *
                      </label>
                      <input
                        id="app-email"
                        type="email"
                        required
                        className="career-field-input"
                        placeholder="john.doe@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                      />
                      {fieldErrors.email && (
                        <span className="career-field-error">{fieldErrors.email}</span>
                      )}
                    </div>
                    <div className="career-field-group">
                      <label className="career-field-label" htmlFor="app-phone">
                        Mobile Phone *
                      </label>
                      <input
                        id="app-phone"
                        type="tel"
                        required
                        className="career-field-input"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                      />
                      {fieldErrors.phone && (
                        <span className="career-field-error">{fieldErrors.phone}</span>
                      )}
                    </div>
                  </div>

                  <div className="career-form-row">
                    <div className="career-field-group">
                      <label className="career-field-label" htmlFor="app-location">
                        Current City / Location
                      </label>
                      <input
                        id="app-location"
                        type="text"
                        className="career-field-input"
                        placeholder="e.g. Agra, UP"
                        value={formData.currentLocation}
                        onChange={(e) => setFormData((p) => ({ ...p, currentLocation: e.target.value }))}
                      />
                    </div>
                    <div className="career-field-group">
                      <label className="career-field-label" htmlFor="app-experience">
                        Experience Level
                      </label>
                      <select
                        id="app-experience"
                        className="career-field-select"
                        value={formData.experience}
                        onChange={(e) => setFormData((p) => ({ ...p, experience: e.target.value }))}
                      >
                        <option value="Fresher">Fresher / Student</option>
                        <option value="1-2 Years">1 – 2 Years</option>
                        <option value="3-5 Years">3 – 5 Years</option>
                        <option value="5+ Years">5+ Years</option>
                      </select>
                    </div>
                  </div>

                  <div className="career-field-group">
                    <label className="career-field-label" htmlFor="app-coverLetter">
                      Short Note or Notable Projects (Optional)
                    </label>
                    <textarea
                      id="app-coverLetter"
                      className="career-field-textarea"
                      placeholder="Share a link to your GitHub, portfolio, or brief summary of your tech stack..."
                      value={formData.coverLetter}
                      onChange={(e) => setFormData((p) => ({ ...p, coverLetter: e.target.value }))}
                    />
                  </div>

                  {/* Resume Upload Zone */}
                  <div className="career-field-group">
                    <label className="career-field-label" htmlFor="app-resume">
                      Resume Attachment (PDF, DOC, DOCX — Max 5MB) *
                    </label>
                    <div className="career-upload-zone">
                      <input
                        id="app-resume"
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange}
                        disabled={submitting}
                      />
                      <div className="career-upload-icon" aria-hidden="true">
                        📎
                      </div>
                      <div className="career-upload-text">
                        {resumeFile ? resumeFile.name : 'Click to select or drag and drop your resume'}
                      </div>
                      <div className="career-upload-hint">
                        {resumeFile
                          ? `${(resumeFile.size / 1024 / 1024).toFixed(2)} MB — Ready to submit`
                          : 'Supported: PDF, DOC, DOCX up to 5MB'}
                      </div>
                    </div>
                    {fieldErrors.resume && (
                      <span className="career-field-error">{fieldErrors.resume}</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="career-submit-btn"
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    {submitting ? 'Encrypting & Submitting Application...' : 'Submit Application'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
