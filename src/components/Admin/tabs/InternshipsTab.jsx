import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getInternships,
  updateInternship,
  deleteInternship,
  convertInternshipApplication,
  getInterns,
  createIntern,
  updateIntern,
  updateInternStatus,
  updateInternOnboarding,
  deleteIntern,
  getInternshipPrograms,
  createInternshipProgram,
  updateInternshipProgram,
  deleteInternshipProgram,
  exportInternshipsCsv,
  exportInternsCsv,
} from '../../../api';
import {
  Panel,
  DataTable,
  FilterBar,
  PaginationBar,
  StatusBadge,
  StatCard,
  EmptyState,
} from '../AdminUI';
import { useAdminFeedback } from '../AdminFeedback';
import {
  AcademicCapIcon,
  UsersIcon,
  BriefcaseIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  DownloadIcon,
  EyeIcon,
  TrashIcon,
  RefreshIcon,
  XMarkIcon,
  PencilSquareIcon,
  CheckIcon,
} from '../../icons';

const APP_STATUS_TONE_MAP = {
  applied: 'blue',
  under_review: 'amber',
  shortlisted: 'blue',
  selected: 'green',
  rejected: 'red',
};

const INTERN_STATUS_TONE_MAP = {
  active: 'green',
  on_hold: 'amber',
  completed: 'blue',
  extended: 'purple',
  withdrawn: 'slate',
  terminated: 'red',
};

const PROGRAM_STATUS_TONE_MAP = {
  published: 'green',
  draft: 'slate',
  paused: 'amber',
  closed: 'red',
  archived: 'slate',
};

const DOMAIN_OPTIONS = [
  { value: 'all', label: 'All Domains' },
  { value: 'Web Engineering', label: 'Web Engineering' },
  { value: 'Mobile App Dev', label: 'Mobile App Dev' },
  { value: 'Cloud & DevOps', label: 'Cloud & DevOps' },
  { value: 'AI & Data Science', label: 'AI & Data Science' },
  { value: 'Full Stack Development', label: 'Full Stack Development' },
  { value: 'UI/UX Design', label: 'UI/UX Design' },
  { value: 'Software Testing', label: 'Software Testing / QA' },
];

export default function InternshipsTab({ currentUser }) {
  const { toast, confirm } = useAdminFeedback();

  // Active top-level subtab: 'interns' | 'applications' | 'programs'
  const [activeTab, setActiveTab] = useState('interns');

  /* ==========================================================================
     SUBTAB 1: ONBOARDED INTERNS DIRECTORY STATE
     ========================================================================== */
  const [interns, setInterns] = useState([]);
  const [internsLoading, setInternsLoading] = useState(true);
  const [internSearch, setInternSearch] = useState('');
  const [internStatusFilter, setInternStatusFilter] = useState('all');
  const [internDomainFilter, setInternDomainFilter] = useState('all');
  const [internPage, setInternPage] = useState(1);
  const [internLimit, setInternLimit] = useState(15);
  const [internPagination, setInternPagination] = useState({ total: 0, totalPages: 1 });
  const [exportingInterns, setExportingInterns] = useState(false);

  // Intern detail & management modal
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [manageSubmitting, setManageSubmitting] = useState(false);

  // Status transition modal (e.g. extension, completion)
  const [statusModalIntern, setStatusModalIntern] = useState(null);
  const [statusModalForm, setStatusModalForm] = useState({
    status: 'completed',
    actualEndDate: new Date().toISOString().split('T')[0],
    extensionReason: '',
    performanceNotes: '',
  });
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Direct "Add New Intern" Modal state
  const [showCreateInternModal, setShowCreateInternModal] = useState(false);
  const [createInternSubmitting, setCreateInternSubmitting] = useState(false);
  const [createInternError, setCreateInternError] = useState('');
  const [createInternForm, setCreateInternForm] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    course: 'B.Tech Computer Science',
    domain: 'Web Engineering',
    department: 'Software Engineering',
    designation: 'Software Engineering Intern',
    mentorName: '',
    joiningDate: new Date().toISOString().split('T')[0],
    duration: '3 Months',
    expectedEndDate: '',
    workLocation: 'Remote',
    stipend: 5000,
    isUnpaid: false,
    idProofVerified: false,
    collegeNocVerified: false,
    agreementSigned: false,
    ndaSigned: false,
    performanceNotes: '',
  });

  /* ==========================================================================
     SUBTAB 2: CANDIDATE APPLICATIONS STATE
     ========================================================================== */
  const [applications, setApplications] = useState([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('all');
  const [appDomainFilter, setAppDomainFilter] = useState('all');
  const [appPage, setAppPage] = useState(1);
  const [appLimit, setAppLimit] = useState(15);
  const [appPagination, setAppPagination] = useState({ total: 0, totalPages: 1 });
  const [exportingApps, setExportingApps] = useState(false);

  // Application Detail Modal
  const [selectedApp, setSelectedApp] = useState(null);

  // Candidate Conversion Modal
  const [convertingApp, setConvertingApp] = useState(null);
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [convertError, setConvertError] = useState('');
  const [convertForm, setConvertForm] = useState({
    mentorName: '',
    joiningDate: new Date().toISOString().split('T')[0],
    duration: '3 Months',
    expectedEndDate: '',
    workLocation: 'Remote',
    stipend: 5000,
    isUnpaid: false,
    idProofVerified: false,
    collegeNocVerified: false,
    agreementSigned: false,
    ndaSigned: false,
    performanceNotes: '',
  });

  /* ==========================================================================
     SUBTAB 3: INTERNSHIP PROGRAMMES / TRACKS STATE
     ========================================================================== */
  const [programs, setPrograms] = useState([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [programSubmitting, setProgramSubmitting] = useState(false);
  const [programError, setProgramError] = useState('');
  const [programForm, setProgramForm] = useState({
    title: '',
    slug: '',
    domain: 'Web Engineering',
    department: 'Software Engineering',
    description: '',
    duration: '3 Months',
    workLocation: 'Remote',
    openings: 2,
    stipend: 5000,
    isUnpaid: false,
    eligibility: 'B.Tech / BCA / MCA students or recent graduates',
    status: 'published',
  });

  /* ==========================================================================
     DATA FETCHERS
     ========================================================================== */
  const fetchInternsList = useCallback(async () => {
    setInternsLoading(true);
    try {
      const params = { page: internPage, limit: internLimit };
      if (internSearch.trim()) params.search = internSearch.trim();
      if (internStatusFilter !== 'all') params.status = internStatusFilter;
      if (internDomainFilter !== 'all') params.domain = internDomainFilter;

      const res = await getInterns(params);
      const items = res?.data?.items || res?.data || [];
      const total = res?.data?.pagination?.total ?? res?.data?.total ?? items.length;
      const totalPages =
        res?.data?.pagination?.totalPages ??
        res?.data?.totalPages ??
        Math.max(1, Math.ceil(total / internLimit));

      setInterns(items);
      setInternPagination({ total, totalPages });
    } catch (err) {
      toast.error(err.message || 'Failed to load intern directory');
    } finally {
      setInternsLoading(false);
    }
  }, [internPage, internLimit, internSearch, internStatusFilter, internDomainFilter, toast]);

  const fetchAppsList = useCallback(async () => {
    setAppsLoading(true);
    try {
      const params = { page: appPage, limit: appLimit };
      if (appSearch.trim()) params.search = appSearch.trim();
      if (appStatusFilter !== 'all') params.status = appStatusFilter;
      if (appDomainFilter !== 'all') params.domain = appDomainFilter;

      const res = await getInternships(params);
      const items = res?.data?.items || res?.data?.internships || res?.data || [];
      const total = res?.data?.total ?? res?.data?.pagination?.total ?? items.length;
      const totalPages =
        res?.data?.totalPages ??
        res?.data?.pagination?.totalPages ??
        Math.max(1, Math.ceil(total / appLimit));

      setApplications(items);
      setAppPagination({ total, totalPages });
    } catch (err) {
      toast.error(err.message || 'Failed to load internship applications');
    } finally {
      setAppsLoading(false);
    }
  }, [appPage, appLimit, appSearch, appStatusFilter, appDomainFilter, toast]);

  const fetchProgramsList = useCallback(async () => {
    setProgramsLoading(true);
    try {
      const res = await getInternshipPrograms();
      const items = res?.data?.items || res?.data || [];
      setPrograms(items);
    } catch (err) {
      toast.error(err.message || 'Failed to load internship tracks');
    } finally {
      setProgramsLoading(false);
    }
  }, [toast]);

  // Load based on active tab
  useEffect(() => {
    if (activeTab === 'interns') {
      fetchInternsList();
    } else if (activeTab === 'applications') {
      fetchAppsList();
    } else if (activeTab === 'programs') {
      fetchProgramsList();
    }
  }, [activeTab, fetchInternsList, fetchAppsList, fetchProgramsList]);

  /* ==========================================================================
     METRICS DERIVATION FOR INTERNS DIRECTORY
     ========================================================================== */
  const metrics = useMemo(() => {
    const total = internPagination.total || interns.length;
    const active = interns.filter((i) => i.status === 'active').length;
    const pendingOnboarding = interns.filter(
      (i) => i.onboarding?.status === 'pending' || i.onboarding?.status === 'in_progress'
    ).length;
    const completed = interns.filter((i) => i.status === 'completed').length;
    return { total, active, pendingOnboarding, completed };
  }, [interns, internPagination.total]);

  /* ==========================================================================
     DIRECT "ADD NEW INTERN" SUBMISSION
     ========================================================================== */
  const handleOpenCreateIntern = () => {
    setCreateInternError('');
    setCreateInternForm({
      name: '',
      email: '',
      phone: '',
      college: '',
      course: 'B.Tech Computer Science',
      domain: 'Web Engineering',
      department: 'Software Engineering',
      designation: 'Software Engineering Intern',
      mentorName: '',
      joiningDate: new Date().toISOString().split('T')[0],
      duration: '3 Months',
      expectedEndDate: '',
      workLocation: 'Remote',
      stipend: 5000,
      isUnpaid: false,
      idProofVerified: false,
      collegeNocVerified: false,
      agreementSigned: false,
      ndaSigned: false,
      performanceNotes: '',
    });
    setShowCreateInternModal(true);
  };

  const handleCreateInternSubmit = async (e) => {
    e.preventDefault();
    setCreateInternError('');

    if (!createInternForm.name.trim()) {
      setCreateInternError('Intern full name is required');
      return;
    }
    if (!createInternForm.email.trim()) {
      setCreateInternError('Valid email address is required');
      return;
    }
    if (!createInternForm.phone.trim()) {
      setCreateInternError('Contact phone number is required');
      return;
    }
    if (!createInternForm.college.trim()) {
      setCreateInternError('College or University name is required');
      return;
    }

    setCreateInternSubmitting(true);
    try {
      const res = await createIntern(createInternForm);
      const generatedId = res?.data?.internId || 'New Intern';
      toast.success(`Intern ${createInternForm.name} onboarded successfully with ID ${generatedId}!`);
      setShowCreateInternModal(false);
      fetchInternsList();
    } catch (err) {
      setCreateInternError(err.message || 'Failed to register intern');
    } finally {
      setCreateInternSubmitting(false);
    }
  };

  /* ==========================================================================
     CANDIDATE CONVERSION TO INTERN
     ========================================================================== */
  const handleOpenConvert = (app) => {
    setConvertingApp(app);
    setConvertError('');
    setConvertForm({
      mentorName: '',
      joiningDate: new Date().toISOString().split('T')[0],
      duration: app.duration || '3 Months',
      expectedEndDate: '',
      workLocation: 'Remote',
      stipend: 5000,
      isUnpaid: false,
      idProofVerified: false,
      collegeNocVerified: false,
      agreementSigned: false,
      ndaSigned: false,
      performanceNotes: `Converted from application submitted on ${
        app.createdAt ? new Date(app.createdAt).toLocaleDateString('en-IN') : 'portfolio portal'
      }.`,
    });
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertingApp) return;
    setConvertSubmitting(true);
    setConvertError('');

    try {
      const res = await convertInternshipApplication(convertingApp._id, convertForm);
      const internId = res?.data?.intern?.internId || 'Enrolled Intern';
      toast.success(
        `Candidate ${convertingApp.name || convertingApp.fullName} successfully converted to Intern (${internId})!`
      );
      setConvertingApp(null);
      if (selectedApp?._id === convertingApp._id) {
        setSelectedApp(null);
      }
      fetchAppsList();
    } catch (err) {
      setConvertError(err.message || 'Failed to convert candidate');
    } finally {
      setConvertSubmitting(false);
    }
  };

  /* ==========================================================================
     ONBOARDING COMPLIANCE CHECKLIST TOGGLE
     ========================================================================== */
  const handleToggleOnboardingCheck = async (intern, key) => {
    const currentValue = Boolean(intern.onboarding?.[key]);
    const nextValue = !currentValue;

    try {
      const updatePayload = { [key]: nextValue };
      const res = await updateInternOnboarding(intern._id, updatePayload);
      const updatedIntern = res?.data || {
        ...intern,
        onboarding: { ...intern.onboarding, [key]: nextValue },
      };

      setInterns((prev) => prev.map((i) => (i._id === intern._id ? updatedIntern : i)));
      if (selectedIntern?._id === intern._id) {
        setSelectedIntern(updatedIntern);
      }
      toast.success(`Checklist item updated.`);
    } catch (err) {
      toast.error(err.message || 'Failed to update onboarding checklist');
    }
  };

  /* ==========================================================================
     STATUS TRANSITION & EXTENSION MODAL
     ========================================================================== */
  const handleOpenStatusModal = (intern) => {
    setStatusModalIntern(intern);
    setStatusModalForm({
      status: intern.status === 'active' ? 'completed' : 'active',
      actualEndDate: new Date().toISOString().split('T')[0],
      extensionReason: intern.extensionReason || '',
      performanceNotes: intern.performanceNotes || '',
    });
  };

  const handleStatusModalSubmit = async (e) => {
    e.preventDefault();
    if (!statusModalIntern) return;
    setStatusSubmitting(true);

    try {
      const res = await updateInternStatus(statusModalIntern._id, statusModalForm);
      const updated = res?.data || { ...statusModalIntern, ...statusModalForm };

      setInterns((prev) => prev.map((i) => (i._id === statusModalIntern._id ? updated : i)));
      if (selectedIntern?._id === statusModalIntern._id) {
        setSelectedIntern(updated);
      }
      toast.success(`Intern ${statusModalIntern.internId} marked as ${statusModalForm.status}.`);
      setStatusModalIntern(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update intern status');
    } finally {
      setStatusSubmitting(false);
    }
  };

  /* ==========================================================================
     DELETE ACTIONS
     ========================================================================== */
  const handleDeleteIntern = async (intern) => {
    const ok = await confirm({
      title: 'Delete Intern Record',
      message: `Permanently delete enrolled intern record for "${intern.name}" (${intern.internId})? This action will archive their record.`,
      confirmLabel: 'Delete Record',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await deleteIntern(intern._id);
      toast.success(`Intern record ${intern.internId} deleted.`);
      if (selectedIntern?._id === intern._id) setSelectedIntern(null);
      fetchInternsList();
    } catch (err) {
      toast.error(err.message || 'Failed to delete intern');
    }
  };

  const handleDeleteApplication = async (app) => {
    const ok = await confirm({
      title: 'Delete Candidate Application',
      message: `Delete application from "${app.name || app.fullName}" (${app.email})?`,
      confirmLabel: 'Delete Application',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await deleteInternship(app._id);
      toast.success('Application deleted.');
      if (selectedApp?._id === app._id) setSelectedApp(null);
      fetchAppsList();
    } catch (err) {
      toast.error(err.message || 'Failed to delete application');
    }
  };

  const handleAppStatusChange = async (appId, newStatus) => {
    try {
      await updateInternship(appId, { status: newStatus });
      toast.success(`Candidate status marked as ${newStatus.replace('_', ' ')}.`);
      setApplications((prev) =>
        prev.map((i) => (i._id === appId ? { ...i, status: newStatus } : i))
      );
      if (selectedApp?._id === appId) {
        setSelectedApp((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update candidate status');
    }
  };

  /* ==========================================================================
     PROGRAMMES CRUD
     ========================================================================== */
  const handleOpenCreateProgram = () => {
    setEditingProgram(null);
    setProgramError('');
    setProgramForm({
      title: '',
      slug: '',
      domain: 'Web Engineering',
      department: 'Software Engineering',
      description: '',
      duration: '3 Months',
      workLocation: 'Remote',
      openings: 2,
      stipend: 5000,
      isUnpaid: false,
      eligibility: 'B.Tech / BCA / MCA students or recent graduates',
      status: 'published',
    });
    setShowProgramModal(true);
  };

  const handleOpenEditProgram = (prog) => {
    setEditingProgram(prog);
    setProgramError('');
    setProgramForm({
      title: prog.title || '',
      slug: prog.slug || '',
      domain: prog.domain || 'Web Engineering',
      department: prog.department || 'Software Engineering',
      description: prog.description || '',
      duration: prog.duration || '3 Months',
      workLocation: prog.workLocation || 'Remote',
      openings: prog.openings || 2,
      stipend: prog.stipend || 0,
      isUnpaid: Boolean(prog.isUnpaid),
      eligibility: prog.eligibility || '',
      status: prog.status || 'published',
    });
    setShowProgramModal(true);
  };

  const handleProgramSubmit = async (e) => {
    e.preventDefault();
    setProgramError('');

    if (!programForm.title.trim()) {
      setProgramError('Program track title is required');
      return;
    }
    if (!programForm.description.trim()) {
      setProgramError('Program description is required');
      return;
    }

    const payload = {
      ...programForm,
      slug:
        programForm.slug.trim() ||
        programForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    };

    setProgramSubmitting(true);
    try {
      if (editingProgram) {
        await updateInternshipProgram(editingProgram._id, payload);
        toast.success(`Track "${payload.title}" updated.`);
      } else {
        await createInternshipProgram(payload);
        toast.success(`Track "${payload.title}" created.`);
      }
      setShowProgramModal(false);
      fetchProgramsList();
    } catch (err) {
      setProgramError(err.message || 'Failed to save internship track');
    } finally {
      setProgramSubmitting(false);
    }
  };

  const handleDeleteProgram = async (prog) => {
    const ok = await confirm({
      title: 'Delete Internship Track',
      message: `Permanently delete track "${prog.title}"?`,
      confirmLabel: 'Delete Track',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await deleteInternshipProgram(prog._id);
      toast.success(`Track "${prog.title}" removed.`);
      fetchProgramsList();
    } catch (err) {
      toast.error(err.message || 'Failed to delete track');
    }
  };

  /* ==========================================================================
     CSV EXPORTS
     ========================================================================== */
  const handleExportInterns = async () => {
    try {
      setExportingInterns(true);
      const params = {};
      if (internStatusFilter !== 'all') params.status = internStatusFilter;
      if (internDomainFilter !== 'all') params.domain = internDomainFilter;
      if (internSearch.trim()) params.search = internSearch.trim();

      await exportInternsCsv(params);
      toast.success('Intern directory exported to CSV safely.');
    } catch (err) {
      toast.error(err.message || 'Failed to export intern directory');
    } finally {
      setExportingInterns(false);
    }
  };

  const handleExportApps = async () => {
    try {
      setExportingApps(true);
      const params = {};
      if (appStatusFilter !== 'all') params.status = appStatusFilter;
      if (appDomainFilter !== 'all') params.domain = appDomainFilter;
      if (appSearch.trim()) params.search = appSearch.trim();

      await exportInternshipsCsv(params);
      toast.success('Applications exported to CSV safely.');
    } catch (err) {
      toast.error(err.message || 'Failed to export applications');
    } finally {
      setExportingApps(false);
    }
  };

  /* ==========================================================================
     TABLE COLUMNS DEFINITIONS
     ========================================================================== */
  const internColumns = useMemo(
    () => [
      { key: 'internId', label: 'Intern & Contact' },
      { key: 'domain', label: 'Domain & College' },
      { key: 'mentor', label: 'Mentor & Dates' },
      { key: 'compliance', label: 'Onboarding Checklist' },
      { key: 'status', label: 'Status' },
      { key: 'actions', label: 'Actions', style: { textAlign: 'right' } },
    ],
    []
  );

  const appColumns = useMemo(
    () => [
      { key: 'candidate', label: 'Candidate' },
      { key: 'domain', label: 'Domain & College' },
      { key: 'status', label: 'Application Status' },
      { key: 'date', label: 'Applied On' },
      { key: 'actions', label: 'Actions', style: { textAlign: 'right' } },
    ],
    []
  );

  const programColumns = useMemo(
    () => [
      { key: 'track', label: 'Program Track' },
      { key: 'domain', label: 'Domain & Dept' },
      { key: 'capacity', label: 'Openings & Stipend' },
      { key: 'status', label: 'Status' },
      { key: 'actions', label: 'Actions', style: { textAlign: 'right' } },
    ],
    []
  );

  return (
    <div className="admin-tab-container">
      {/* PAGE HEADER */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Internship & Talent Management</h1>
          <p className="admin-page-subtitle">
            Manage candidate recruitment, enrolled intern roster, onboarding compliance, and technical tracks
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {activeTab === 'interns' && (
            <>
              <button
                type="button"
                className="admin-btn admin-btn--primary admin-btn--sm"
                onClick={handleOpenCreateIntern}
              >
                <PlusIcon size={16} />
                <span>Add New Intern</span>
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--secondary admin-btn--sm"
                disabled={exportingInterns}
                onClick={handleExportInterns}
              >
                <DownloadIcon size={14} />
                <span>{exportingInterns ? 'Exporting...' : 'Export CSV'}</span>
              </button>
            </>
          )}

          {activeTab === 'applications' && (
            <button
              type="button"
              className="admin-btn admin-btn--secondary admin-btn--sm"
              disabled={exportingApps}
              onClick={handleExportApps}
            >
              <DownloadIcon size={14} />
              <span>{exportingApps ? 'Exporting...' : 'Export CSV'}</span>
            </button>
          )}

          {activeTab === 'programs' && (
            <button
              type="button"
              className="admin-btn admin-btn--primary admin-btn--sm"
              onClick={handleOpenCreateProgram}
            >
              <PlusIcon size={16} />
              <span>New Track</span>
            </button>
          )}

          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={
              activeTab === 'interns'
                ? fetchInternsList
                : activeTab === 'applications'
                ? fetchAppsList
                : fetchProgramsList
            }
          >
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* SEGMENTED TAB NAVIGATION */}
      <div className="admin-segmented-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'interns'}
          className={`admin-segmented-btn ${activeTab === 'interns' ? 'admin-segmented-btn--active' : ''}`}
          onClick={() => setActiveTab('interns')}
        >
          <UsersIcon size={16} />
          <span>Onboarded Interns ({internPagination.total || interns.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'applications'}
          className={`admin-segmented-btn ${activeTab === 'applications' ? 'admin-segmented-btn--active' : ''}`}
          onClick={() => setActiveTab('applications')}
        >
          <AcademicCapIcon size={16} />
          <span>Candidate Applications ({appPagination.total || applications.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'programs'}
          className={`admin-segmented-btn ${activeTab === 'programs' ? 'admin-segmented-btn--active' : ''}`}
          onClick={() => setActiveTab('programs')}
        >
          <BriefcaseIcon size={16} />
          <span>Programs & Tracks ({programs.length})</span>
        </button>
      </div>

      {/* =====================================================================
          VIEW 1: ONBOARDED INTERNS DIRECTORY
          ===================================================================== */}
      {activeTab === 'interns' && (
        <>
          {/* STATS OVERVIEW */}
          <div className="admin-stats-grid" style={{ marginBottom: '1.25rem' }}>
            <StatCard
              label="Active Interns"
              value={metrics.active}
              subtext="Currently contributing to projects"
              icon={UsersIcon}
              tone="default"
            />
            <StatCard
              label="Onboarding Pending"
              value={metrics.pendingOnboarding}
              subtext="Awaiting verification documents"
              icon={ClockIcon}
              tone={metrics.pendingOnboarding > 0 ? 'attention' : 'default'}
            />
            <StatCard
              label="Completed Internships"
              value={metrics.completed}
              subtext="Graduated alumni"
              icon={CheckCircleIcon}
              tone="default"
            />
            <StatCard
              label="Total Enrolled"
              value={metrics.total}
              subtext="All recorded interns"
              icon={AcademicCapIcon}
              tone="default"
            />
          </div>

          <FilterBar
            search={internSearch}
            onSearchChange={(val) => {
              setInternSearch(val);
              setInternPage(1);
            }}
            placeholder="Search by ID (ASH-INT-...), intern name, email, college, or mentor..."
            filters={[
              {
                id: 'intern-status-filter',
                label: 'Status',
                value: internStatusFilter,
                onChange: (val) => {
                  setInternStatusFilter(val);
                  setInternPage(1);
                },
                options: [
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'on_hold', label: 'On Hold' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'extended', label: 'Extended' },
                  { value: 'terminated', label: 'Terminated' },
                ],
              },
              {
                id: 'intern-domain-filter',
                label: 'Domain',
                value: internDomainFilter,
                onChange: (val) => {
                  setInternDomainFilter(val);
                  setInternPage(1);
                },
                options: DOMAIN_OPTIONS,
              },
            ]}
            onClear={
              internSearch || internStatusFilter !== 'all' || internDomainFilter !== 'all'
                ? () => {
                    setInternSearch('');
                    setInternStatusFilter('all');
                    setInternDomainFilter('all');
                    setInternPage(1);
                  }
                : undefined
            }
          />

          <Panel>
            <DataTable
              caption="Enrolled Interns Roster"
              columns={internColumns}
              data={interns}
              isLoading={internsLoading}
              emptyMessage="No interns match your filters. Click 'Add New Intern' to onboard your first candidate."
              renderRow={(intern) => {
                const joinDateStr = intern.joiningDate
                  ? new Date(intern.joiningDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—';
                const expDateStr = intern.expectedEndDate
                  ? new Date(intern.expectedEndDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—';

                const ob = intern.onboarding || {};

                return (
                  <tr key={intern._id} className="admin-table-row">
                    <td>
                      <div className="admin-table-user-cell">
                        <span className="admin-cell-title" style={{ fontFamily: 'monospace', color: '#1D4ED8' }}>
                          {intern.internId}
                        </span>
                        <strong className="admin-cell-title">{intern.name}</strong>
                        <span className="admin-cell-sub">{intern.email}</span>
                        {intern.phone && <span className="admin-cell-muted">{intern.phone}</span>}
                      </div>
                    </td>

                    <td>
                      <span className="admin-cell-title">{intern.domain}</span>
                      <span className="admin-cell-sub">{intern.college}</span>
                      {intern.course && <span className="admin-cell-muted">{intern.course}</span>}
                    </td>

                    <td>
                      <span className="admin-cell-title">
                        {intern.mentorName ? `Mentor: ${intern.mentorName}` : 'Unassigned Mentor'}
                      </span>
                      <span className="admin-cell-sub">
                        {joinDateStr} → {expDateStr}
                      </span>
                      <span className="admin-cell-muted">
                        {intern.workLocation} • {intern.isUnpaid ? 'Unpaid' : `₹${intern.stipend || 0}/mo`}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          <span
                            className={`admin-check-pill ${ob.idProofVerified ? 'admin-check-pill--done' : ''}`}
                            title="Government ID Proof"
                          >
                            {ob.idProofVerified ? '✓ ID' : '✕ ID'}
                          </span>
                          <span
                            className={`admin-check-pill ${ob.collegeNocVerified ? 'admin-check-pill--done' : ''}`}
                            title="College NOC / Verification"
                          >
                            {ob.collegeNocVerified ? '✓ NOC' : '✕ NOC'}
                          </span>
                          <span
                            className={`admin-check-pill ${ob.agreementSigned ? 'admin-check-pill--done' : ''}`}
                            title="Internship Agreement"
                          >
                            {ob.agreementSigned ? '✓ Agmt' : '✕ Agmt'}
                          </span>
                          <span
                            className={`admin-check-pill ${ob.ndaSigned ? 'admin-check-pill--done' : ''}`}
                            title="Non-Disclosure Agreement"
                          >
                            {ob.ndaSigned ? '✓ NDA' : '✕ NDA'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: ob.status === 'completed' ? '#047857' : '#D97706' }}>
                          {ob.status === 'completed' ? 'All Verified' : 'Checklist Pending'}
                        </span>
                      </div>
                    </td>

                    <td>
                      <StatusBadge
                        label={intern.status}
                        tone={INTERN_STATUS_TONE_MAP[intern.status] || 'slate'}
                      />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div className="admin-table-actions">
                        <button
                          type="button"
                          className="admin-action-btn"
                          onClick={() => setSelectedIntern(intern)}
                          title="View & Manage Intern"
                        >
                          <EyeIcon size={16} />
                        </button>

                        <button
                          type="button"
                          className="admin-action-btn"
                          onClick={() => handleOpenStatusModal(intern)}
                          title="Update Status / Extension"
                        >
                          <PencilSquareIcon size={16} />
                        </button>

                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--danger"
                          onClick={() => handleDeleteIntern(intern)}
                          title="Delete Intern Record"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }}
            />

            <PaginationBar
              page={internPage}
              totalPages={internPagination.totalPages}
              totalCount={internPagination.total}
              limit={internLimit}
              onPageChange={setInternPage}
              onLimitChange={(l) => {
                setInternLimit(l);
                setInternPage(1);
              }}
            />
          </Panel>
        </>
      )}

      {/* =====================================================================
          VIEW 2: CANDIDATE APPLICATIONS
          ===================================================================== */}
      {activeTab === 'applications' && (
        <>
          <FilterBar
            search={appSearch}
            onSearchChange={(val) => {
              setAppSearch(val);
              setAppPage(1);
            }}
            placeholder="Search candidates by student name, email, college, or domain..."
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
                  { value: 'applied', label: 'Applied' },
                  { value: 'under_review', label: 'Under Review' },
                  { value: 'shortlisted', label: 'Shortlisted' },
                  { value: 'selected', label: 'Selected' },
                  { value: 'rejected', label: 'Rejected' },
                ],
              },
              {
                id: 'app-domain-filter',
                label: 'Domain',
                value: appDomainFilter,
                onChange: (val) => {
                  setAppDomainFilter(val);
                  setAppPage(1);
                },
                options: DOMAIN_OPTIONS,
              },
            ]}
            onClear={
              appSearch || appStatusFilter !== 'all' || appDomainFilter !== 'all'
                ? () => {
                    setAppSearch('');
                    setAppStatusFilter('all');
                    setAppDomainFilter('all');
                    setAppPage(1);
                  }
                : undefined
            }
          />

          <Panel>
            <DataTable
              caption="Internship Candidate Applications"
              columns={appColumns}
              data={applications}
              isLoading={appsLoading}
              emptyMessage="No internship applications found."
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
                        <strong className="admin-cell-title">{app.name || app.fullName}</strong>
                        <span className="admin-cell-sub">{app.email}</span>
                        {app.phone && <span className="admin-cell-muted">{app.phone}</span>}
                      </div>
                    </td>

                    <td>
                      <span className="admin-cell-title">{app.domain || 'Engineering'}</span>
                      <span className="admin-cell-sub">{app.college || app.university || '—'}</span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <StatusBadge
                          label={app.status ? app.status.replace('_', ' ') : 'applied'}
                          tone={APP_STATUS_TONE_MAP[app.status] || 'slate'}
                        />
                        {app.convertedToIntern && (
                          <span className="admin-check-pill admin-check-pill--done" title="Enrolled Intern">
                            ✓ Intern ({app.internId})
                          </span>
                        )}
                      </div>
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
                          title="View Details"
                        >
                          <EyeIcon size={16} />
                        </button>

                        {!app.convertedToIntern && (
                          <button
                            type="button"
                            className="admin-btn admin-btn--primary admin-btn--sm"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            onClick={() => handleOpenConvert(app)}
                            title="Convert candidate into onboarded intern"
                          >
                            <UsersIcon size={14} />
                            <span>Convert</span>
                          </button>
                        )}

                        <select
                          className="admin-table-select"
                          value={app.status || 'applied'}
                          onChange={(e) => handleAppStatusChange(app._id, e.target.value)}
                        >
                          <option value="applied">Applied</option>
                          <option value="under_review">Review</option>
                          <option value="shortlisted">Shortlist</option>
                          <option value="selected">Select</option>
                          <option value="rejected">Reject</option>
                        </select>

                        <button
                          type="button"
                          className="admin-action-btn admin-action-btn--danger"
                          onClick={() => handleDeleteApplication(app)}
                          title="Delete Record"
                        >
                          <TrashIcon size={16} />
                        </button>
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

      {/* =====================================================================
          VIEW 3: PROGRAMS & TRACKS
          ===================================================================== */}
      {activeTab === 'programs' && (
        <Panel>
          <DataTable
            caption="Internship Tracks & Programmes"
            columns={programColumns}
            data={programs}
            isLoading={programsLoading}
            emptyMessage="No internship programs created yet. Click 'New Track' to create a technical internship track."
            renderRow={(prog) => (
              <tr key={prog._id} className="admin-table-row">
                <td>
                  <div className="admin-table-user-cell">
                    <strong className="admin-cell-title">{prog.title}</strong>
                    <span className="admin-cell-sub">
                      /{prog.slug} • {prog.duration || '3 Months'} • {prog.workLocation || 'Remote'}
                    </span>
                  </div>
                </td>

                <td>
                  <span className="admin-cell-title">{prog.domain}</span>
                  <span className="admin-cell-sub">{prog.department || 'Engineering'}</span>
                </td>

                <td>
                  <span className="admin-cell-title">{prog.openings || 1} Openings</span>
                  <span className="admin-cell-sub">
                    {prog.isUnpaid ? 'Unpaid / Experience' : `₹${prog.stipend || 0} / month`}
                  </span>
                </td>

                <td>
                  <StatusBadge
                    label={prog.status}
                    tone={PROGRAM_STATUS_TONE_MAP[prog.status] || 'slate'}
                  />
                </td>

                <td style={{ textAlign: 'right' }}>
                  <div className="admin-table-actions">
                    <button
                      type="button"
                      className="admin-action-btn"
                      onClick={() => handleOpenEditProgram(prog)}
                      title="Edit Track"
                    >
                      <PencilSquareIcon size={16} />
                    </button>

                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn--danger"
                      onClick={() => handleDeleteProgram(prog)}
                      title="Delete Track"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          />
        </Panel>
      )}

      {/* =====================================================================
          MODAL: DIRECT "ADD NEW INTERN" (SCROLL-SAFE & VIEWPORT CONSTRAINED)
          ===================================================================== */}
      {showCreateInternModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCreateInternModal(false)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-intern-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '680px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="create-intern-title" className="admin-modal-title">
                  Onboard New Intern
                </h3>
                <p className="admin-modal-subtitle">
                  Provision collision-safe intern record, generate ASH-INT ID, assign mentor, and track compliance
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setShowCreateInternModal(false)}
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            {createInternError && (
              <div className="admin-alert admin-alert--error" style={{ margin: '1rem 1.5rem 0' }}>
                {createInternError}
              </div>
            )}

            <form onSubmit={handleCreateInternSubmit} className="admin-modal-form" noValidate>
              <div className="admin-modal-body">
                {/* CANDIDATE BASICS */}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="intern-name-input">
                      Full Name *
                    </label>
                    <input
                      id="intern-name-input"
                      type="text"
                      required
                      className="admin-form-input"
                      value={createInternForm.name}
                      onChange={(e) =>
                        setCreateInternForm({ ...createInternForm, name: e.target.value })
                      }
                      placeholder="e.g. Priya Verma"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="intern-email-input">
                      Email Address *
                    </label>
                    <input
                      id="intern-email-input"
                      type="email"
                      required
                      className="admin-form-input"
                      value={createInternForm.email}
                      onChange={(e) =>
                        setCreateInternForm({ ...createInternForm, email: e.target.value })
                      }
                      placeholder="e.g. priya.verma@example.com"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="intern-phone-input">
                      Phone Number *
                    </label>
                    <input
                      id="intern-phone-input"
                      type="text"
                      required
                      className="admin-form-input"
                      value={createInternForm.phone}
                      onChange={(e) =>
                        setCreateInternForm({ ...createInternForm, phone: e.target.value })
                      }
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="intern-college-input">
                      College / University *
                    </label>
                    <input
                      id="intern-college-input"
                      type="text"
                      required
                      className="admin-form-input"
                      value={createInternForm.college}
                      onChange={(e) =>
                        setCreateInternForm({ ...createInternForm, college: e.target.value })
                      }
                      placeholder="e.g. IIT Roorkee / Dayalbagh Educational Institute"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="intern-course-input">
                      Degree / Course
                    </label>
                    <input
                      id="intern-course-input"
                      type="text"
                      className="admin-form-input"
                      value={createInternForm.course}
                      onChange={(e) =>
                        setCreateInternForm({ ...createInternForm, course: e.target.value })
                      }
                      placeholder="e.g. B.Tech Computer Science (3rd Year)"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="intern-domain-input">
                      Internship Domain / Track *
                    </label>
                    <select
                      id="intern-domain-input"
                      className="admin-form-select"
                      value={createInternForm.domain}
                      onChange={(e) =>
                        setCreateInternForm({
                          ...createInternForm,
                          domain: e.target.value,
                          designation: `${e.target.value} Intern`,
                        })
                      }
                    >
                      <option value="Web Engineering">Web Engineering</option>
                      <option value="Mobile App Dev">Mobile App Dev</option>
                      <option value="Cloud & DevOps">Cloud & DevOps</option>
                      <option value="AI & Data Science">AI & Data Science</option>
                      <option value="Full Stack Development">Full Stack Development</option>
                      <option value="UI/UX Design">UI/UX Design</option>
                      <option value="Software Testing">Software Testing / QA</option>
                    </select>
                  </div>
                </div>

                {/* INTERNSHIP DETAILS */}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="intern-mentor-input">
                      Assigned Mentor / Lead
                    </label>
                    <input
                      id="intern-mentor-input"
                      type="text"
                      className="admin-form-input"
                      value={createInternForm.mentorName}
                      onChange={(e) =>
                        setCreateInternForm({ ...createInternForm, mentorName: e.target.value })
                      }
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="intern-location-input">
                      Work Location
                    </label>
                    <select
                      id="intern-location-input"
                      className="admin-form-select"
                      value={createInternForm.workLocation}
                      onChange={(e) =>
                        setCreateInternForm({ ...createInternForm, workLocation: e.target.value })
                      }
                    >
                      <option value="Remote">Remote</option>
                      <option value="Office">Office (Agra HQ)</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="intern-join-input">
                      Joining Date *
                    </label>
                    <input
                      id="intern-join-input"
                      type="date"
                      required
                      className="admin-form-input"
                      value={createInternForm.joiningDate}
                      onChange={(e) =>
                        setCreateInternForm({ ...createInternForm, joiningDate: e.target.value })
                      }
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="intern-duration-input">
                      Duration
                    </label>
                    <select
                      id="intern-duration-input"
                      className="admin-form-select"
                      value={createInternForm.duration}
                      onChange={(e) =>
                        setCreateInternForm({ ...createInternForm, duration: e.target.value })
                      }
                    >
                      <option value="1 Month">1 Month</option>
                      <option value="2 Months">2 Months</option>
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="intern-stipend-input">
                      Monthly Stipend (INR)
                    </label>
                    <input
                      id="intern-stipend-input"
                      type="number"
                      min="0"
                      step="500"
                      disabled={createInternForm.isUnpaid}
                      className="admin-form-input"
                      value={createInternForm.stipend}
                      onChange={(e) =>
                        setCreateInternForm({ ...createInternForm, stipend: Number(e.target.value) })
                      }
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', fontSize: '0.8rem', color: '#64748B' }}>
                      <input
                        type="checkbox"
                        checked={createInternForm.isUnpaid}
                        onChange={(e) =>
                          setCreateInternForm({ ...createInternForm, isUnpaid: e.target.checked })
                        }
                      />
                      <span>Unpaid / Academic Credit Track</span>
                    </label>
                  </div>
                </div>

                {/* ONBOARDING COMPLIANCE CHECKLIST */}
                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Initial Compliance & Onboarding Checklist
                  </label>
                  <div className="admin-checkbox-list">
                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={createInternForm.idProofVerified}
                        onChange={(e) =>
                          setCreateInternForm({
                            ...createInternForm,
                            idProofVerified: e.target.checked,
                          })
                        }
                      />
                      <span>Government ID Proof Verified</span>
                    </label>

                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={createInternForm.collegeNocVerified}
                        onChange={(e) =>
                          setCreateInternForm({
                            ...createInternForm,
                            collegeNocVerified: e.target.checked,
                          })
                        }
                      />
                      <span>College NOC / Student ID Verified</span>
                    </label>

                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={createInternForm.agreementSigned}
                        onChange={(e) =>
                          setCreateInternForm({
                            ...createInternForm,
                            agreementSigned: e.target.checked,
                          })
                        }
                      />
                      <span>Internship Agreement Signed</span>
                    </label>

                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={createInternForm.ndaSigned}
                        onChange={(e) =>
                          setCreateInternForm({
                            ...createInternForm,
                            ndaSigned: e.target.checked,
                          })
                        }
                      />
                      <span>NDA (Non-Disclosure Agreement) Signed</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowCreateInternModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={createInternSubmitting}
                >
                  {createInternSubmitting ? 'Registering Intern...' : 'Register & Onboard Intern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CONVERT CANDIDATE TO ONBOARDED INTERN
          ===================================================================== */}
      {convertingApp && (
        <div className="admin-modal-overlay" onClick={() => setConvertingApp(null)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="convert-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="convert-modal-title" className="admin-modal-title">
                  Convert Candidate to Enrolled Intern
                </h3>
                <p className="admin-modal-subtitle">
                  Enroll {convertingApp.name || convertingApp.fullName} ({convertingApp.domain}) as an active intern
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setConvertingApp(null)}
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            {convertError && (
              <div className="admin-alert admin-alert--error" style={{ margin: '1rem 1.5rem 0' }}>
                {convertError}
              </div>
            )}

            <form onSubmit={handleConvertSubmit} className="admin-modal-form" noValidate>
              <div className="admin-modal-body">
                <div className="admin-detail-grid" style={{ marginBottom: '1rem' }}>
                  <div className="admin-detail-item">
                    <span className="admin-detail-label">Candidate</span>
                    <span className="admin-detail-val">{convertingApp.name || convertingApp.fullName}</span>
                  </div>
                  <div className="admin-detail-item">
                    <span className="admin-detail-label">Email</span>
                    <span className="admin-detail-val">{convertingApp.email}</span>
                  </div>
                  <div className="admin-detail-item">
                    <span className="admin-detail-label">College</span>
                    <span className="admin-detail-val">{convertingApp.college || '—'}</span>
                  </div>
                  <div className="admin-detail-item">
                    <span className="admin-detail-label">Track</span>
                    <span className="admin-detail-val">{convertingApp.domain}</span>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="convert-mentor">
                      Assigned Mentor / Lead
                    </label>
                    <input
                      id="convert-mentor"
                      type="text"
                      className="admin-form-input"
                      value={convertForm.mentorName}
                      onChange={(e) =>
                        setConvertForm({ ...convertForm, mentorName: e.target.value })
                      }
                      placeholder="e.g. Lead Engineer"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="convert-join">
                      Official Start Date *
                    </label>
                    <input
                      id="convert-join"
                      type="date"
                      required
                      className="admin-form-input"
                      value={convertForm.joiningDate}
                      onChange={(e) =>
                        setConvertForm({ ...convertForm, joiningDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="convert-duration">
                      Duration
                    </label>
                    <select
                      id="convert-duration"
                      className="admin-form-select"
                      value={convertForm.duration}
                      onChange={(e) =>
                        setConvertForm({ ...convertForm, duration: e.target.value })
                      }
                    >
                      <option value="1 Month">1 Month</option>
                      <option value="2 Months">2 Months</option>
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="convert-stipend">
                      Monthly Stipend (INR)
                    </label>
                    <input
                      id="convert-stipend"
                      type="number"
                      min="0"
                      step="500"
                      disabled={convertForm.isUnpaid}
                      className="admin-form-input"
                      value={convertForm.stipend}
                      onChange={(e) =>
                        setConvertForm({ ...convertForm, stipend: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Compliance Documents</label>
                  <div className="admin-checkbox-list">
                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={convertForm.idProofVerified}
                        onChange={(e) =>
                          setConvertForm({ ...convertForm, idProofVerified: e.target.checked })
                        }
                      />
                      <span>ID Proof Received</span>
                    </label>
                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={convertForm.agreementSigned}
                        onChange={(e) =>
                          setConvertForm({ ...convertForm, agreementSigned: e.target.checked })
                        }
                      />
                      <span>Internship Agreement Signed</span>
                    </label>
                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={convertForm.ndaSigned}
                        onChange={(e) =>
                          setConvertForm({ ...convertForm, ndaSigned: e.target.checked })
                        }
                      />
                      <span>NDA Signed</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setConvertingApp(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={convertSubmitting}
                >
                  {convertSubmitting ? 'Converting...' : 'Generate ID & Enroll Intern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: INTERN PROFILE & COMPLIANCE DETAIL DRAWER/MODAL
          ===================================================================== */}
      {selectedIntern && (
        <div className="admin-modal-overlay" onClick={() => setSelectedIntern(null)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="intern-detail-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="intern-detail-title" className="admin-modal-title">
                  {selectedIntern.name} ({selectedIntern.internId})
                </h3>
                <p className="admin-modal-subtitle">
                  {selectedIntern.designation || 'Intern'} • {selectedIntern.department || 'Engineering'}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setSelectedIntern(null)}
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Status</span>
                  <StatusBadge
                    label={selectedIntern.status}
                    tone={INTERN_STATUS_TONE_MAP[selectedIntern.status] || 'slate'}
                  />
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Email</span>
                  <a href={`mailto:${selectedIntern.email}`} className="admin-detail-link">
                    {selectedIntern.email}
                  </a>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Phone</span>
                  <span className="admin-detail-val">{selectedIntern.phone || '—'}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">College</span>
                  <span className="admin-detail-val">{selectedIntern.college || '—'}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Course</span>
                  <span className="admin-detail-val">{selectedIntern.course || '—'}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Assigned Mentor</span>
                  <span className="admin-detail-val">{selectedIntern.mentorName || 'Unassigned'}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Duration</span>
                  <span className="admin-detail-val">{selectedIntern.duration || '3 Months'}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Work Location</span>
                  <span className="admin-detail-val">{selectedIntern.workLocation || 'Remote'}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Monthly Stipend</span>
                  <span className="admin-detail-val">
                    {selectedIntern.isUnpaid ? 'Unpaid' : `₹${selectedIntern.stipend || 0}`}
                  </span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Start Date</span>
                  <span className="admin-detail-val">
                    {selectedIntern.joiningDate
                      ? new Date(selectedIntern.joiningDate).toLocaleDateString('en-IN')
                      : '—'}
                  </span>
                </div>
              </div>

              {/* ONBOARDING COMPLIANCE CHECKLIST */}
              <div className="admin-detail-section">
                <h4 className="admin-detail-section-title">Onboarding Compliance & Document Verification</h4>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 0.5rem' }}>
                  Click to verify or revoke individual onboarding verification items:
                </p>
                <div className="admin-checkbox-list">
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedIntern.onboarding?.idProofVerified)}
                      onChange={() => handleToggleOnboardingCheck(selectedIntern, 'idProofVerified')}
                    />
                    <span>Government ID Proof Verified</span>
                  </label>
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedIntern.onboarding?.collegeNocVerified)}
                      onChange={() => handleToggleOnboardingCheck(selectedIntern, 'collegeNocVerified')}
                    />
                    <span>College NOC / Student ID Verified</span>
                  </label>
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedIntern.onboarding?.agreementSigned)}
                      onChange={() => handleToggleOnboardingCheck(selectedIntern, 'agreementSigned')}
                    />
                    <span>Internship Agreement Signed</span>
                  </label>
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={Boolean(selectedIntern.onboarding?.ndaSigned)}
                      onChange={() => handleToggleOnboardingCheck(selectedIntern, 'ndaSigned')}
                    />
                    <span>Non-Disclosure Agreement (NDA) Signed</span>
                  </label>
                </div>
              </div>

              {selectedIntern.performanceNotes && (
                <div className="admin-detail-section">
                  <h4 className="admin-detail-section-title">Performance Notes / Background</h4>
                  <div className="admin-transcript-box">{selectedIntern.performanceNotes}</div>
                </div>
              )}

              {selectedIntern.extensionReason && (
                <div className="admin-detail-section">
                  <h4 className="admin-detail-section-title">Extension / Status Reason</h4>
                  <div className="admin-transcript-box">{selectedIntern.extensionReason}</div>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setSelectedIntern(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                onClick={() => {
                  handleOpenStatusModal(selectedIntern);
                }}
              >
                <PencilSquareIcon size={14} />
                <span>Update Status / Extend</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: UPDATE INTERN STATUS / EXTENSION
          ===================================================================== */}
      {statusModalIntern && (
        <div className="admin-modal-overlay" onClick={() => setStatusModalIntern(null)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="status-modal-title" className="admin-modal-title">
                  Update Intern Status: {statusModalIntern.internId}
                </h3>
                <p className="admin-modal-subtitle">
                  Transition lifecycle stage for {statusModalIntern.name}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setStatusModalIntern(null)}
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleStatusModalSubmit} className="admin-modal-form">
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="status-select">
                    New Status *
                  </label>
                  <select
                    id="status-select"
                    className="admin-form-select"
                    value={statusModalForm.status}
                    onChange={(e) =>
                      setStatusModalForm({ ...statusModalForm, status: e.target.value })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="extended">Extended (Add Duration)</option>
                    <option value="completed">Completed / Graduated</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>

                {statusModalForm.status === 'extended' && (
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="status-extension-reason">
                      Extension Details & Duration Reason
                    </label>
                    <textarea
                      id="status-extension-reason"
                      rows={3}
                      className="admin-form-textarea"
                      placeholder="e.g. Extended by 2 months for cloud migration delivery"
                      value={statusModalForm.extensionReason}
                      onChange={(e) =>
                        setStatusModalForm({
                          ...statusModalForm,
                          extensionReason: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="status-notes">
                    Performance Notes / Evaluation Summary
                  </label>
                  <textarea
                    id="status-notes"
                    rows={3}
                    className="admin-form-textarea"
                    placeholder="e.g. Completed all React/Node milestones on schedule with positive code review feedback."
                    value={statusModalForm.performanceNotes}
                    onChange={(e) =>
                      setStatusModalForm({
                        ...statusModalForm,
                        performanceNotes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setStatusModalIntern(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={statusSubmitting}
                >
                  {statusSubmitting ? 'Updating...' : 'Save Lifecycle Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CANDIDATE APPLICATION DETAIL VIEW
          ===================================================================== */}
      {selectedApp && (
        <div className="admin-modal-overlay" onClick={() => setSelectedApp(null)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-detail-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="app-detail-title" className="admin-modal-title">
                  Candidate Profile: {selectedApp.name || selectedApp.fullName}
                </h3>
                <p className="admin-modal-subtitle">
                  {selectedApp.domain} Track • {selectedApp.college || 'University'}
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
                  <span className="admin-detail-label">Graduation Year</span>
                  <span className="admin-detail-val">
                    {selectedApp.gradYear || selectedApp.year || '—'}
                  </span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Status</span>
                  <StatusBadge
                    label={selectedApp.status}
                    tone={APP_STATUS_TONE_MAP[selectedApp.status] || 'slate'}
                  />
                </div>
              </div>

              {selectedApp.statement && (
                <div className="admin-detail-section">
                  <h4 className="admin-detail-section-title">Objective / Candidate Statement</h4>
                  <div className="admin-transcript-box">{selectedApp.statement}</div>
                </div>
              )}
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setSelectedApp(null)}
              >
                Close
              </button>

              {!selectedApp.convertedToIntern && (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary"
                  onClick={() => {
                    handleOpenConvert(selectedApp);
                  }}
                >
                  <UsersIcon size={14} />
                  <span>Convert to Intern</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: CREATE / EDIT INTERNSHIP PROGRAM TRACK
          ===================================================================== */}
      {showProgramModal && (
        <div className="admin-modal-overlay" onClick={() => setShowProgramModal(false)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="prog-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="prog-modal-title" className="admin-modal-title">
                  {editingProgram ? 'Edit Internship Track' : 'Create Internship Track'}
                </h3>
                <p className="admin-modal-subtitle">
                  Configure opportunities published on Ashivam Technologies career portal
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setShowProgramModal(false)}
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            {programError && (
              <div className="admin-alert admin-alert--error" style={{ margin: '1rem 1.5rem 0' }}>
                {programError}
              </div>
            )}

            <form onSubmit={handleProgramSubmit} className="admin-modal-form" noValidate>
              <div className="admin-modal-body">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="prog-title">
                      Track Title *
                    </label>
                    <input
                      id="prog-title"
                      type="text"
                      required
                      className="admin-form-input"
                      placeholder="e.g. Cloud & DevOps Engineering Internship"
                      value={programForm.title}
                      onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="prog-domain">
                      Domain *
                    </label>
                    <select
                      id="prog-domain"
                      className="admin-form-select"
                      value={programForm.domain}
                      onChange={(e) => setProgramForm({ ...programForm, domain: e.target.value })}
                    >
                      <option value="Web Engineering">Web Engineering</option>
                      <option value="Mobile App Dev">Mobile App Dev</option>
                      <option value="Cloud & DevOps">Cloud & DevOps</option>
                      <option value="AI & Data Science">AI & Data Science</option>
                      <option value="Full Stack Development">Full Stack Development</option>
                      <option value="UI/UX Design">UI/UX Design</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="prog-desc">
                    Track Description & Learning Outcomes *
                  </label>
                  <textarea
                    id="prog-desc"
                    rows={4}
                    required
                    className="admin-form-textarea"
                    placeholder="Describe mentoring, practical tech stack exposure, real-world project involvement..."
                    value={programForm.description}
                    onChange={(e) =>
                      setProgramForm({ ...programForm, description: e.target.value })
                    }
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="prog-openings">
                      Openings
                    </label>
                    <input
                      id="prog-openings"
                      type="number"
                      min="1"
                      className="admin-form-input"
                      value={programForm.openings}
                      onChange={(e) =>
                        setProgramForm({ ...programForm, openings: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="prog-duration">
                      Duration
                    </label>
                    <select
                      id="prog-duration"
                      className="admin-form-select"
                      value={programForm.duration}
                      onChange={(e) =>
                        setProgramForm({ ...programForm, duration: e.target.value })
                      }
                    >
                      <option value="1 Month">1 Month</option>
                      <option value="2 Months">2 Months</option>
                      <option value="3 Months">3 Months</option>
                      <option value="6 Months">6 Months</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="prog-location">
                      Work Location
                    </label>
                    <select
                      id="prog-location"
                      className="admin-form-select"
                      value={programForm.workLocation}
                      onChange={(e) =>
                        setProgramForm({ ...programForm, workLocation: e.target.value })
                      }
                    >
                      <option value="Remote">Remote</option>
                      <option value="Office">Office (Agra HQ)</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="prog-status">
                      Publishing Status
                    </label>
                    <select
                      id="prog-status"
                      className="admin-form-select"
                      value={programForm.status}
                      onChange={(e) =>
                        setProgramForm({ ...programForm, status: e.target.value })
                      }
                    >
                      <option value="published">Published (Accepting Applications)</option>
                      <option value="draft">Draft (Hidden)</option>
                      <option value="paused">Paused (Capacity Full)</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowProgramModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={programSubmitting}
                >
                  {programSubmitting
                    ? 'Saving...'
                    : editingProgram
                    ? 'Update Track'
                    : 'Create Track'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
