import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../ui/Logo';
import {
  getDashboardOverview,
  getDashboardRecentActivity,
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
  deleteInquiry,
  getCareerJobs,
  createJob,
  updateJob,
  deleteJob,
  getCareerApplications,
  updateApplicationStatus,
  deleteApplication,
  downloadApplicationResume,
  getInternships,
  getInternshipById,
  updateInternship,
  deleteInternship,
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
  getHrDocuments,
  uploadHrDocument,
  updateHrDocumentStatus,
  deleteHrDocument,
  downloadHrDocument,
  getContentBlocks,
  createContentBlock,
  updateContentBlock,
  publishContentBlock,
  unpublishContentBlock,
  deleteContentBlock,
  getMediaList,
  uploadMediaFile,
  deleteMediaFile,
  getSettings,
  updateSettings,
  getAuditLogs,
  getAdmins,
  createAdminAccount,
  updateAdminStatus,
  updateAdminPermissions,
  deleteAdminAccount,
} from '../../api';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout, hasPermission, isSuperadmin } = useAuth();

  // Navigation Items defined strictly by backend permission model
  const navItems = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: '📊', permission: 'dashboard' },
    { id: 'inquiries', label: 'Inquiries', icon: '💬', permission: 'inquiries' },
    { id: 'careers', label: 'Careers & Jobs', icon: '💼', permission: 'careers' },
    { id: 'internships', label: 'Internships', icon: '🎓', permission: 'careers' },
    { id: 'employees', label: 'Employees', icon: '👥', permission: 'employees' },
    { id: 'documents', label: 'HR Documents', icon: '📁', permission: 'employees' },
    { id: 'content', label: 'CMS Content', icon: '📝', permission: 'content' },
    { id: 'media', label: 'Media Library', icon: '🖼️', permission: 'media' },
    { id: 'audit', label: 'Audit Logs', icon: '🛡️', permission: 'audit' },
    { id: 'settings', label: 'Settings', icon: '⚙️', permission: 'settings' },
    { id: 'admins', label: 'Admin Accounts', icon: '👑', superadminOnly: true },
  ], []);

  // Filter allowed tabs based on real backend permissions
  const allowedTabs = useMemo(() => {
    return navItems.filter((item) => {
      if (item.superadminOnly) return isSuperadmin;
      return hasPermission(item.permission);
    });
  }, [navItems, isSuperadmin, hasPermission]);

  const [activeTab, setActiveTab] = useState('overview');
  const [tabData, setTabData] = useState(null);
  const [tabLoading, setTabLoading] = useState(false);
  const [tabError, setTabError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [downloadingResumeId, setDownloadingResumeId] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    permissions: ['dashboard', 'inquiries', 'careers'],
  });
  const [createAdminSubmitting, setCreateAdminSubmitting] = useState(false);
  const [createAdminError, setCreateAdminError] = useState('');
  const [showJobModal, setShowJobModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
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
  const [jobSubmitting, setJobSubmitting] = useState(false);
  const [jobFormError, setJobFormError] = useState('');

  // Filters & Search state
  const [inquirySearch, setInquirySearch] = useState('');
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState('all');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [inquiryNoteText, setInquiryNoteText] = useState('');

  const [jobSearch, setJobSearch] = useState('');
  const [appSearch, setAppSearch] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState(null);

  const [internSearch, setInternSearch] = useState('');
  const [internDomainFilter, setInternDomainFilter] = useState('all');
  const [internStatusFilter, setInternStatusFilter] = useState('all');
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [internNoteText, setInternNoteText] = useState('');

  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('all');
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [empForm, setEmpForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    department: 'Software Engineering',
    employmentType: 'Full-time',
    workLocation: 'Office',
    joiningDate: new Date().toISOString().split('T')[0],
    bio: '',
    skills: '',
    linkedin: '',
    github: '',
    isActive: true,
  });
  const [empSubmitting, setEmpSubmitting] = useState(false);
  const [empError, setEmpError] = useState('');
  const [selectedEmp, setSelectedEmp] = useState(null);

  const [docSearch, setDocSearch] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({
    employee: '',
    documentType: 'Offer Letter',
    title: '',
    description: '',
    documentNumber: '',
    expiryDate: '',
  });
  const [docFile, setDocFile] = useState(null);
  const [docSubmitting, setDocSubmitting] = useState(false);
  const [docError, setDocError] = useState('');
  const [downloadingDocId, setDownloadingDocId] = useState(null);

  const [contentSearch, setContentSearch] = useState('');
  const [contentSectionFilter, setContentSectionFilter] = useState('all');
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [contentForm, setContentForm] = useState({
    key: '',
    section: 'hero',
    title: '',
    content: '',
    status: 'draft',
  });
  const [contentSubmitting, setContentSubmitting] = useState(false);
  const [contentError, setContentError] = useState('');

  const [mediaCategoryFilter, setMediaCategoryFilter] = useState('all');
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaCategory, setMediaCategory] = useState('image');
  const [mediaSubmitting, setMediaSubmitting] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [copiedMediaId, setCopiedMediaId] = useState(null);

  const [auditSearch, setAuditSearch] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [selectedAudit, setSelectedAudit] = useState(null);

  const [settingsForm, setSettingsForm] = useState(null);
  const [settingsSubmitting, setSettingsSubmitting] = useState(false);

  const [editingAdminPermissions, setEditingAdminPermissions] = useState(null);
  const [adminPermissionsList, setAdminPermissionsList] = useState([]);
  const [adminPermsSubmitting, setAdminPermsSubmitting] = useState(false);

  // Redirect to login if unauthenticated once auth check finishes
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/admin/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Adjust active tab if current tab is not permitted
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.some((t) => t.id === activeTab)) {
      setActiveTab(allowedTabs[0].id);
    }
  }, [allowedTabs, activeTab]);

  // Fetch real data for current active tab
  const fetchTabData = useCallback(async () => {
    if (!isAuthenticated) return;
    setTabLoading(true);
    setTabError(null);

    try {
      let result = null;

      switch (activeTab) {
        case 'overview': {
          const [overviewRes, activityRes] = await Promise.allSettled([
            getDashboardOverview(),
            getDashboardRecentActivity(6),
          ]);
          result = {
            overview: overviewRes.status === 'fulfilled' ? overviewRes.value?.data : null,
            activity: activityRes.status === 'fulfilled' ? activityRes.value?.data?.items : [],
          };
          break;
        }
        case 'inquiries': {
          const res = await getInquiries({ page: 1, limit: 20 });
          result = res?.data;
          break;
        }
        case 'careers': {
          const [jobsRes, appsRes] = await Promise.allSettled([
            getCareerJobs({ page: 1, limit: 15 }),
            getCareerApplications({ page: 1, limit: 15 }),
          ]);
          result = {
            jobs: jobsRes.status === 'fulfilled' ? jobsRes.value?.data?.items : [],
            applications: appsRes.status === 'fulfilled' ? appsRes.value?.data?.items : [],
          };
          break;
        }
        case 'internships': {
          const res = await getInternships({ page: 1, limit: 20 });
          result = res?.data;
          break;
        }
        case 'employees': {
          const res = await getEmployees({ page: 1, limit: 20 });
          result = res?.data;
          break;
        }
        case 'documents': {
          const [docsRes, empsRes] = await Promise.allSettled([
            getHrDocuments({ page: 1, limit: 50 }),
            getEmployees({ page: 1, limit: 100 }),
          ]);
          result = {
            items: docsRes.status === 'fulfilled' ? docsRes.value?.data?.items : [],
            employees: empsRes.status === 'fulfilled' ? empsRes.value?.data?.items : [],
          };
          break;
        }
        case 'content': {
          const res = await getContentBlocks({ page: 1, limit: 20 });
          result = res?.data;
          break;
        }
        case 'media': {
          const res = await getMediaList({ page: 1, limit: 20 });
          result = res?.data;
          break;
        }
        case 'audit': {
          const res = await getAuditLogs({ page: 1, limit: 20 });
          result = res?.data;
          break;
        }
        case 'settings': {
          const res = await getSettings();
          const sData = res?.data?.settings || res?.data;
          result = sData;
          if (sData) {
            setSettingsForm(sData);
          }
          break;
        }
        case 'admins': {
          const res = await getAdmins({ page: 1, limit: 20 });
          result = res?.data;
          break;
        }
        default:
          result = null;
      }

      setTabData(result);
    } catch (err) {
      setTabError(err.message || 'Failed to load module data from server.');
    } finally {
      setTabLoading(false);
    }
  }, [activeTab, isAuthenticated]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  const showNotice = (type, message) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleDownloadResume = async (app) => {
    try {
      setDownloadingResumeId(app._id);
      const fallbackName = `${app.firstName}_${app.lastName}_Resume.pdf`;
      await downloadApplicationResume(app._id, fallbackName);
      showNotice('success', `Resume for ${app.firstName} ${app.lastName} downloaded successfully.`);
    } catch (err) {
      showNotice('error', err.message || 'Failed to download resume.');
    } finally {
      setDownloadingResumeId(null);
    }
  };

  const handleApplicationStatusChange = async (appId, newStatus) => {
    try {
      setActionInProgress(appId);
      await updateApplicationStatus(appId, { status: newStatus });
      setTabData((prev) => {
        if (!prev || !prev.applications) return prev;
        return {
          ...prev,
          applications: prev.applications.map((a) =>
            a._id === appId ? { ...a, status: newStatus } : a
          ),
        };
      });
      showNotice('success', `Application status updated to "${newStatus}".`);
    } catch (err) {
      showNotice('error', err.message || 'Failed to update application status.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleJobStatus = async (job) => {
    const nextActive = !job.isActive;
    try {
      setActionInProgress(job._id);
      await updateJob(job._id, {
        title: job.title,
        slug: job.slug,
        department: job.department,
        location: job.location,
        employmentType: job.employmentType,
        experience: job.experience,
        description: job.description,
        requirements: job.requirements || [],
        qualifications: job.qualifications || job.requirements || [],
        responsibilities: job.responsibilities || [],
        skills: job.skills || [],
        salary: job.salary,
        applicationDeadline: job.applicationDeadline || null,
        isActive: nextActive,
      });
      setTabData((prev) => {
        if (!prev || !prev.jobs) return prev;
        return {
          ...prev,
          jobs: prev.jobs.map((j) =>
            j._id === job._id ? { ...j, isActive: nextActive } : j
          ),
        };
      });
      showNotice('success', `Job "${job.title}" marked as ${nextActive ? 'Active / Published' : 'Closed / Deactivated'}.`);
    } catch (err) {
      showNotice('error', err.message || 'Failed to update job status.');
    } finally {
      setActionInProgress(null);
    }
  };

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

  const handleOpenEditJob = (job) => {
    setEditingJob(job);
    setJobFormError('');
    setJobForm({
      title: job.title || '',
      slug: job.slug || '',
      department: job.department || 'Software Engineering',
      employmentType: job.employmentType || 'Full-time',
      location: job.location || 'Agra, India / Hybrid',
      experience: job.experience || '',
      salary: job.salary || '',
      applicationDeadline: job.applicationDeadline
        ? new Date(job.applicationDeadline).toISOString().split('T')[0]
        : '',
      isActive: Boolean(job.isActive),
      description: job.description || '',
      responsibilities: Array.isArray(job.responsibilities)
        ? job.responsibilities.join('\n')
        : job.responsibilities || '',
      skills: Array.isArray(job.skills)
        ? job.skills.join(', ')
        : job.skills || '',
      qualifications: Array.isArray(job.qualifications) && job.qualifications.length > 0
        ? job.qualifications.join('\n')
        : Array.isArray(job.requirements)
          ? job.requirements.join('\n')
          : job.qualifications || job.requirements || '',
    });
    setShowJobModal(true);
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    setJobFormError('');

    const title = jobForm.title.trim();
    if (!title || title.length < 2) {
      setJobFormError('Job Title must be at least 2 characters.');
      return;
    }

    let slug = jobForm.slug.trim().toLowerCase();
    if (!slug) {
      slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setJobFormError('Slug must contain only lowercase letters, numbers, and hyphens.');
      return;
    }

    if (!jobForm.department.trim()) {
      setJobFormError('Department is required.');
      return;
    }

    if (!jobForm.location.trim()) {
      setJobFormError('Location is required.');
      return;
    }

    if (!jobForm.description.trim()) {
      setJobFormError('Job description is required.');
      return;
    }

    const parseList = (str) => {
      if (!str) return [];
      return str
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    };

    const responsibilities = parseList(jobForm.responsibilities);
    const skills = parseList(jobForm.skills);
    const qualifications = parseList(jobForm.qualifications);

    const payload = {
      title,
      slug,
      department: jobForm.department.trim(),
      employmentType: jobForm.employmentType,
      location: jobForm.location.trim(),
      experience: jobForm.experience.trim() || null,
      salary: jobForm.salary.trim() || null,
      applicationDeadline: jobForm.applicationDeadline ? jobForm.applicationDeadline : null,
      isActive: Boolean(jobForm.isActive),
      description: jobForm.description.trim(),
      responsibilities,
      skills,
      qualifications,
      requirements: qualifications,
    };

    setJobSubmitting(true);
    try {
      if (editingJob) {
        await updateJob(editingJob._id, payload);
        showNotice('success', `Job opening "${title}" updated successfully.`);
      } else {
        await createJob(payload);
        showNotice('success', `Job opening "${title}" created and ${payload.isActive ? 'published' : 'saved as draft'}.`);
      }
      setShowJobModal(false);
      await fetchTabData();
    } catch (err) {
      setJobFormError(err.message || 'Failed to save job opening.');
    } finally {
      setJobSubmitting(false);
    }
  };

  const handleInquiryStatusChange = async (inquiryId, newStatus) => {
    try {
      setActionInProgress(inquiryId);
      await updateInquiryStatus(inquiryId, { status: newStatus });
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i._id === inquiryId ? { ...i, status: newStatus } : i
          ),
        };
      });
      showNotice('success', `Inquiry status updated to "${newStatus}".`);
    } catch (err) {
      showNotice('error', err.message || 'Failed to update inquiry status.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleInternshipStatusChange = async (internshipId, newStatus) => {
    try {
      setActionInProgress(internshipId);
      await updateInternship(internshipId, { status: newStatus });
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i._id === internshipId ? { ...i, status: newStatus } : i
          ),
        };
      });
      showNotice('success', `Internship status updated to "${newStatus}".`);
    } catch (err) {
      showNotice('error', err.message || 'Failed to update internship status.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleAdminStatus = async (admin) => {
    if (admin._id === user?.id) {
      showNotice('error', 'You cannot change your own status.');
      return;
    }
    const nextActive = !admin.isActive;
    try {
      setActionInProgress(admin._id);
      await updateAdminStatus(admin._id, nextActive);
      setTabData((prev) => {
        if (!prev) return prev;
        const currentList = prev.admins || prev.items || [];
        const updated = currentList.map((a) =>
          a._id === admin._id ? { ...a, isActive: nextActive } : a
        );
        return prev.admins ? { ...prev, admins: updated } : { ...prev, items: updated };
      });
      showNotice('success', `Admin @${admin.username} ${nextActive ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      showNotice('error', err.message || 'Failed to update admin status.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreateAdminSubmit = async (e) => {
    e.preventDefault();
    setCreateAdminError('');

    const trimmedName = newAdminForm.name.trim();
    const trimmedUsername = newAdminForm.username.trim();
    const trimmedEmail = newAdminForm.email.trim();

    if (!trimmedName) {
      setCreateAdminError('Full name is required.');
      return;
    }
    if (!trimmedUsername || trimmedUsername.length < 3) {
      setCreateAdminError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmedUsername)) {
      setCreateAdminError('Username may only contain letters, numbers, dots, underscores, and dashes.');
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setCreateAdminError('Please provide a valid company email address.');
      return;
    }
    if (!newAdminForm.password || newAdminForm.password.length < 8) {
      setCreateAdminError('Password must be at least 8 characters long.');
      return;
    }

    setCreateAdminSubmitting(true);
    try {
      await createAdminAccount({
        name: trimmedName,
        username: trimmedUsername,
        email: trimmedEmail || undefined,
        password: newAdminForm.password,
        role: 'Admin', // Strictly Normal Admin
        permissions: newAdminForm.permissions,
      });

      showNotice('success', `Normal Admin @${trimmedUsername} created successfully.`);
      setShowCreateAdminModal(false);
      setNewAdminForm({
        name: '',
        username: '',
        email: '',
        password: '',
        permissions: ['dashboard', 'inquiries', 'careers'],
      });
      await fetchTabData();
    } catch (err) {
      setCreateAdminError(err.message || 'Failed to create admin account.');
    } finally {
      setCreateAdminSubmitting(false);
    }
  };

  const handleSaveInquiryNote = async (inquiryId, adminNote) => {
    try {
      setActionInProgress(inquiryId);
      await updateInquiryStatus(inquiryId, { adminNote });
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return {
          ...prev,
          items: prev.items.map((i) => (i._id === inquiryId ? { ...i, adminNote } : i)),
        };
      });
      if (selectedInquiry && selectedInquiry._id === inquiryId) {
        setSelectedInquiry((prev) => ({ ...prev, adminNote }));
      }
      showNotice('success', 'Admin note saved.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to save admin note.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteInquiry = async (inquiryId) => {
    if (!window.confirm('Are you sure you want to delete this inquiry?')) return;
    try {
      setActionInProgress(inquiryId);
      await deleteInquiry(inquiryId);
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return { ...prev, items: prev.items.filter((i) => i._id !== inquiryId) };
      });
      if (selectedInquiry?._id === inquiryId) setSelectedInquiry(null);
      showNotice('success', 'Inquiry deleted successfully.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to delete inquiry.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveInternNote = async (internshipId, adminNote) => {
    try {
      setActionInProgress(internshipId);
      await updateInternship(internshipId, { adminNote });
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return {
          ...prev,
          items: prev.items.map((i) => (i._id === internshipId ? { ...i, adminNote } : i)),
        };
      });
      if (selectedIntern && selectedIntern._id === internshipId) {
        setSelectedIntern((prev) => ({ ...prev, adminNote }));
      }
      showNotice('success', 'Internship admin note saved.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to save note.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteInternship = async (internshipId) => {
    if (!window.confirm('Are you sure you want to delete this internship application?')) return;
    try {
      setActionInProgress(internshipId);
      await deleteInternship(internshipId);
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return { ...prev, items: prev.items.filter((i) => i._id !== internshipId) };
      });
      if (selectedIntern?._id === internshipId) setSelectedIntern(null);
      showNotice('success', 'Internship application deleted.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to delete application.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenCreateEmp = () => {
    setEditingEmp(null);
    setEmpError('');
    setEmpForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      designation: '',
      department: 'Software Engineering',
      employmentType: 'Full-time',
      workLocation: 'Office',
      joiningDate: new Date().toISOString().split('T')[0],
      bio: '',
      skills: '',
      linkedin: '',
      github: '',
      isActive: true,
    });
    setShowEmpModal(true);
  };

  const handleOpenEditEmp = (emp) => {
    setEditingEmp(emp);
    setEmpError('');
    setEmpForm({
      firstName: emp.firstName || (emp.name ? emp.name.split(' ')[0] : ''),
      lastName: emp.lastName || (emp.name ? emp.name.split(' ').slice(1).join(' ') : ''),
      email: emp.email || '',
      phone: emp.phone || '',
      designation: emp.designation || '',
      department: emp.department || 'Software Engineering',
      employmentType: emp.employmentType || 'Full-time',
      workLocation: emp.workLocation || 'Office',
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
      bio: emp.bio || '',
      skills: Array.isArray(emp.skills) ? emp.skills.join(', ') : emp.skills || '',
      linkedin: emp.socialLinks?.linkedin || '',
      github: emp.socialLinks?.github || '',
      isActive: emp.isActive !== undefined ? emp.isActive : true,
    });
    setShowEmpModal(true);
  };

  const handleEmpSubmit = async (e) => {
    e.preventDefault();
    setEmpError('');

    if (!empForm.firstName.trim() || !empForm.lastName.trim()) {
      setEmpError('First and last name are required.');
      return;
    }
    if (!empForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empForm.email.trim())) {
      setEmpError('Valid email address is required.');
      return;
    }
    if (!empForm.designation.trim() || !empForm.department.trim()) {
      setEmpError('Designation and department are required.');
      return;
    }
    if (!empForm.joiningDate) {
      setEmpError('Joining date is required.');
      return;
    }

    const skillsArray = empForm.skills ? empForm.skills.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const payload = {
      firstName: empForm.firstName.trim(),
      lastName: empForm.lastName.trim(),
      email: empForm.email.trim().toLowerCase(),
      phone: empForm.phone.trim() || undefined,
      designation: empForm.designation.trim(),
      department: empForm.department.trim(),
      employmentType: empForm.employmentType,
      workLocation: empForm.workLocation,
      joiningDate: empForm.joiningDate,
      bio: empForm.bio.trim(),
      skills: skillsArray,
      socialLinks: {
        linkedin: empForm.linkedin.trim(),
        github: empForm.github.trim(),
      },
      isActive: Boolean(empForm.isActive),
    };

    setEmpSubmitting(true);
    try {
      if (editingEmp) {
        await updateEmployee(editingEmp._id, payload);
        showNotice('success', `Employee ${payload.firstName} ${payload.lastName} updated successfully.`);
      } else {
        await createEmployee(payload);
        showNotice('success', `Employee ${payload.firstName} ${payload.lastName} added to directory.`);
      }
      setShowEmpModal(false);
      await fetchTabData();
    } catch (err) {
      setEmpError(err.message || 'Failed to save employee profile.');
    } finally {
      setEmpSubmitting(false);
    }
  };

  const handleToggleEmpStatus = async (emp) => {
    const nextActive = !emp.isActive;
    try {
      setActionInProgress(emp._id);
      await updateEmployeeStatus(emp._id, nextActive);
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return {
          ...prev,
          items: prev.items.map((e) => (e._id === emp._id ? { ...e, isActive: nextActive } : e)),
        };
      });
      showNotice('success', `Employee status updated to ${nextActive ? 'Active' : 'Inactive'}.`);
    } catch (err) {
      showNotice('error', err.message || 'Failed to update employee status.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteEmp = async (empId) => {
    if (!window.confirm('Are you sure you want to permanently remove this employee record?')) return;
    try {
      setActionInProgress(empId);
      await deleteEmployee(empId);
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return { ...prev, items: prev.items.filter((e) => e._id !== empId) };
      });
      showNotice('success', 'Employee record removed.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to delete employee.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenUploadDoc = () => {
    setDocError('');
    setDocFile(null);
    setDocForm({
      employee: tabData?.employees?.[0]?._id || '',
      documentType: 'Offer Letter',
      title: '',
      description: '',
      documentNumber: '',
      expiryDate: '',
    });
    setShowDocModal(true);
  };

  const handleUploadDocSubmit = async (e) => {
    e.preventDefault();
    setDocError('');

    if (!docForm.employee) {
      setDocError('Please select an employee.');
      return;
    }
    if (!docForm.title.trim()) {
      setDocError('Document title is required.');
      return;
    }
    if (!docFile) {
      setDocError('Please select a document file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('document', docFile);
    formData.append('employee', docForm.employee);
    formData.append('documentType', docForm.documentType);
    formData.append('title', docForm.title.trim());
    if (docForm.description.trim()) formData.append('description', docForm.description.trim());
    if (docForm.documentNumber.trim()) formData.append('documentNumber', docForm.documentNumber.trim());
    if (docForm.expiryDate) formData.append('expiryDate', docForm.expiryDate);

    setDocSubmitting(true);
    try {
      await uploadHrDocument(formData);
      showNotice('success', `Document "${docForm.title}" uploaded securely.`);
      setShowDocModal(false);
      await fetchTabData();
    } catch (err) {
      setDocError(err.message || 'Failed to upload document.');
    } finally {
      setDocSubmitting(false);
    }
  };

  const handleDownloadDoc = async (doc) => {
    try {
      setDownloadingDocId(doc._id);
      const fallback = doc.originalName || `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      await downloadHrDocument(doc._id, fallback);
      showNotice('success', `Document "${doc.title}" downloaded.`);
    } catch (err) {
      showNotice('error', err.message || 'Failed to download HR document.');
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleDocStatusChange = async (docId, nextStatus) => {
    try {
      setActionInProgress(docId);
      await updateHrDocumentStatus(docId, { status: nextStatus });
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return {
          ...prev,
          items: prev.items.map((d) => (d._id === docId ? { ...d, status: nextStatus } : d)),
        };
      });
      showNotice('success', `Document status updated to "${nextStatus}".`);
    } catch (err) {
      showNotice('error', err.message || 'Failed to update document status.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to remove this HR document?')) return;
    try {
      setActionInProgress(docId);
      await deleteHrDocument(docId);
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return { ...prev, items: prev.items.filter((d) => d._id !== docId) };
      });
      showNotice('success', 'Document removed successfully.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to delete document.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenCreateContent = () => {
    setEditingContent(null);
    setContentError('');
    setContentForm({
      key: '',
      section: 'hero',
      title: '',
      content: '',
      status: 'draft',
    });
    setShowContentModal(true);
  };

  const handleOpenEditContent = (c) => {
    setEditingContent(c);
    setContentError('');
    setContentForm({
      key: c.key || '',
      section: c.section || 'hero',
      title: c.title || '',
      content: typeof c.content === 'object' ? JSON.stringify(c.content, null, 2) : c.content || '',
      status: c.status || (c.isPublished ? 'published' : 'draft'),
    });
    setShowContentModal(true);
  };

  const handleContentSubmit = async (e) => {
    e.preventDefault();
    setContentError('');

    if (!contentForm.key.trim()) {
      setContentError('Content Key is required.');
      return;
    }
    if (!contentForm.title.trim()) {
      setContentError('Title is required.');
      return;
    }
    if (!contentForm.content.trim()) {
      setContentError('Content body is required.');
      return;
    }

    let parsedContent = contentForm.content.trim();
    if (parsedContent.startsWith('{') || parsedContent.startsWith('[')) {
      try {
        parsedContent = JSON.parse(parsedContent);
      } catch {
        parsedContent = { text: parsedContent };
      }
    } else {
      parsedContent = { text: parsedContent };
    }

    const payload = {
      key: contentForm.key.trim().toLowerCase(),
      section: contentForm.section.trim().toLowerCase(),
      title: contentForm.title.trim(),
      content: parsedContent,
      status: contentForm.status,
    };

    setContentSubmitting(true);
    try {
      if (editingContent) {
        await updateContentBlock(editingContent._id, payload);
        showNotice('success', `Content block "${payload.title}" updated.`);
      } else {
        await createContentBlock(payload);
        showNotice('success', `Content block "${payload.title}" created.`);
      }
      setShowContentModal(false);
      await fetchTabData();
    } catch (err) {
      setContentError(err.message || 'Failed to save content block.');
    } finally {
      setContentSubmitting(false);
    }
  };

  const handleToggleContentPublish = async (c) => {
    const isCurrentlyPublished = c.status === 'published' || Boolean(c.isPublished);
    try {
      setActionInProgress(c._id);
      if (isCurrentlyPublished) {
        await unpublishContentBlock(c._id);
      } else {
        await publishContentBlock(c._id);
      }
      const nextStatus = isCurrentlyPublished ? 'draft' : 'published';
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return {
          ...prev,
          items: prev.items.map((item) => (item._id === c._id ? { ...item, status: nextStatus, isPublished: !isCurrentlyPublished } : item)),
        };
      });
      showNotice('success', `Content "${c.title}" marked as ${nextStatus}.`);
    } catch (err) {
      showNotice('error', err.message || 'Failed to toggle publish status.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteContent = async (cId) => {
    if (!window.confirm('Are you sure you want to delete this CMS content block?')) return;
    try {
      setActionInProgress(cId);
      await deleteContentBlock(cId);
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return { ...prev, items: prev.items.filter((item) => item._id !== cId) };
      });
      showNotice('success', 'Content block deleted.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to delete content block.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenUploadMedia = () => {
    setMediaError('');
    setMediaFile(null);
    setMediaCategory('image');
    setShowMediaModal(true);
  };

  const handleUploadMediaSubmit = async (e) => {
    e.preventDefault();
    setMediaError('');

    if (!mediaFile) {
      setMediaError('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', mediaFile);
    formData.append('category', mediaCategory);

    setMediaSubmitting(true);
    try {
      await uploadMediaFile(formData);
      showNotice('success', 'Media file uploaded successfully.');
      setShowMediaModal(false);
      await fetchTabData();
    } catch (err) {
      setMediaError(err.message || 'Failed to upload media file.');
    } finally {
      setMediaSubmitting(false);
    }
  };

  const handleCopyMediaUrl = (url, id) => {
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedMediaId(id);
      showNotice('success', 'Media URL copied to clipboard.');
      setTimeout(() => setCopiedMediaId(null), 3000);
    });
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!window.confirm('Are you sure you want to delete this media file?')) return;
    try {
      setActionInProgress(mediaId);
      await deleteMediaFile(mediaId);
      setTabData((prev) => {
        if (!prev || !prev.items) return prev;
        return { ...prev, items: prev.items.filter((m) => m._id !== mediaId) };
      });
      showNotice('success', 'Media file removed.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to delete media file.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!settingsForm) return;

    setSettingsSubmitting(true);
    try {
      await updateSettings(settingsForm);
      showNotice('success', 'System & company configuration saved successfully.');
    } catch (err) {
      showNotice('error', err.message || 'Failed to update settings.');
    } finally {
      setSettingsSubmitting(false);
    }
  };

  const handleOpenEditPermissions = (adm) => {
    setEditingAdminPermissions(adm);
    setAdminPermissionsList(adm.permissions || []);
  };

  const handleSaveAdminPermissions = async (e) => {
    e.preventDefault();
    if (!editingAdminPermissions) return;

    setAdminPermsSubmitting(true);
    try {
      await updateAdminPermissions(editingAdminPermissions._id, adminPermissionsList);
      setTabData((prev) => {
        if (!prev) return prev;
        const currentList = prev.admins || prev.items || [];
        const updated = currentList.map((a) =>
          a._id === editingAdminPermissions._id ? { ...a, permissions: adminPermissionsList } : a
        );
        return prev.admins ? { ...prev, admins: updated } : { ...prev, items: updated };
      });
      showNotice('success', `Permissions updated for @${editingAdminPermissions.username}.`);
      setEditingAdminPermissions(null);
    } catch (err) {
      showNotice('error', err.message || 'Failed to update admin permissions.');
    } finally {
      setAdminPermsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async (admId, username) => {
    if (!window.confirm(`Are you sure you want to permanently delete admin @${username}?`)) return;
    try {
      setActionInProgress(admId);
      await deleteAdminAccount(admId);
      setTabData((prev) => {
        if (!prev) return prev;
        const currentList = prev.admins || prev.items || [];
        const updated = currentList.filter((a) => a._id !== admId);
        return prev.admins ? { ...prev, admins: updated } : { ...prev, items: updated };
      });
      showNotice('success', `Admin @${username} removed.`);
    } catch (err) {
      showNotice('error', err.message || 'Failed to delete admin account.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="admin-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="admin-loading-state">
          <div className="admin-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
          <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.7)' }}>Verifying secure administrator session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="admin-layout">
      {/* Top Bar Header */}
      <header className="admin-header">
        <div className="admin-header-brand">
          <Logo size={28} variant="symbol" showText={false} alt="Ashivam Technologies" />
          <div className="admin-header-title-wrap">
            <span className="admin-header-title">Ashivam Admin Console</span>
            <span className={`admin-role-badge ${user.role?.toLowerCase() || 'admin'}`}>
              {user.role}
            </span>
          </div>
        </div>

        <div className="admin-header-actions">
          <div className="admin-user-profile">
            <span className="admin-user-name">{user.name}</span>
            <span className="admin-user-handle">@{user.username}</span>
          </div>
          <Link to="/" className="admin-btn-secondary" title="View Public Website">
            <span>Public Site</span>
            <span aria-hidden="true">↗</span>
          </Link>
          <button type="button" className="admin-btn-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="admin-body">
        {/* Navigation Sidebar */}
        <aside className="admin-sidebar" aria-label="Admin Navigation">
          {allowedTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="admin-nav-item-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Dynamic Content Area */}
        <main className="admin-content">
          <div className="admin-view-header">
            <div>
              <h2 className="admin-view-title">
                {allowedTabs.find((t) => t.id === activeTab)?.label || 'Console'}
              </h2>
              <p className="admin-view-desc">
                Authenticated session for {user.name} ({user.role})
              </p>
            </div>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={fetchTabData}
              disabled={tabLoading}
            >
              ↻ Refresh Data
            </button>
          </div>

          {actionNotice && (
            <div className={`admin-notice-banner ${actionNotice.type}`} role="alert">
              <span>{actionNotice.type === 'success' ? '✅' : '⚠️'}</span>
              <span>{actionNotice.message}</span>
            </div>
          )}

          {tabLoading && (
            <div className="admin-loading-state">
              <div className="admin-spinner" style={{ width: '28px', height: '28px' }} />
              <p>Fetching real records from backend API...</p>
            </div>
          )}

          {!tabLoading && tabError && (
            <div className="admin-error-state">
              <span className="admin-state-icon">⚠️</span>
              <p>{tabError}</p>
              <button type="button" className="admin-btn-retry" onClick={fetchTabData}>
                Try Again
              </button>
            </div>
          )}

          {!tabLoading && !tabError && (
            <>
              {/* TAB: OVERVIEW */}
              {activeTab === 'overview' && (
                <div>
                  <div className="admin-stats-grid">
                    <div className="admin-stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('inquiries')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-stat-label">Inquiries</span>
                        <span style={{ fontSize: '0.8rem', color: '#2aa8e0' }}>View 💬</span>
                      </div>
                      <span className="admin-stat-value">{tabData?.overview?.inquiries ?? 0}</span>
                      {tabData?.overview?.breakdown?.inquiries && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          <span className="admin-status-pill new" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.inquiries.new} New
                          </span>
                          <span className="admin-status-pill in_progress" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.inquiries.in_progress} In Progress
                          </span>
                          <span className="admin-status-pill resolved" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.inquiries.resolved} Resolved
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="admin-stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('careers')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-stat-label">Active Jobs</span>
                        <span style={{ fontSize: '0.8rem', color: '#2aa8e0' }}>Manage 💼</span>
                      </div>
                      <span className="admin-stat-value">{tabData?.overview?.jobs ?? 0}</span>
                      {tabData?.overview?.breakdown?.jobs && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          <span className="admin-status-pill active" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.jobs.active} Active
                          </span>
                          <span className="admin-status-pill closed" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.jobs.closed} Closed
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="admin-stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('careers')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-stat-label">Applications</span>
                        <span style={{ fontSize: '0.8rem', color: '#2aa8e0' }}>Review 📄</span>
                      </div>
                      <span className="admin-stat-value">{tabData?.overview?.applications ?? 0}</span>
                      {tabData?.overview?.breakdown?.applications && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          <span className="admin-status-pill applied" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.applications.applied} Applied
                          </span>
                          <span className="admin-status-pill shortlisted" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.applications.shortlisted} Shortlisted
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="admin-stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('internships')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-stat-label">Internships</span>
                        <span style={{ fontSize: '0.8rem', color: '#2aa8e0' }}>Pipeline 🎓</span>
                      </div>
                      <span className="admin-stat-value">{tabData?.overview?.internships ?? 0}</span>
                      {tabData?.overview?.breakdown?.internships && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          <span className="admin-status-pill selected" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.internships.selected} Selected
                          </span>
                          <span className="admin-status-pill in_progress" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.internships.in_progress} Active
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="admin-stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('employees')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-stat-label">Employees</span>
                        <span style={{ fontSize: '0.8rem', color: '#2aa8e0' }}>Directory 👥</span>
                      </div>
                      <span className="admin-stat-value">{tabData?.overview?.employees ?? 0}</span>
                      {tabData?.overview?.breakdown?.employees && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          <span className="admin-status-pill active" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.employees.active} Active
                          </span>
                          <span className="admin-status-pill inactive" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.employees.inactive} Inactive
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="admin-stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('documents')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-stat-label">HR Documents</span>
                        <span style={{ fontSize: '0.8rem', color: '#2aa8e0' }}>Files 📁</span>
                      </div>
                      <span className="admin-stat-value">{tabData?.overview?.hrDocuments ?? 0}</span>
                      {tabData?.overview?.breakdown?.hrDocuments && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          <span className="admin-status-pill verified" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.hrDocuments.verified} Verified
                          </span>
                          <span className="admin-status-pill pending" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.hrDocuments.pending} Pending
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="admin-stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('content')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-stat-label">CMS Blocks</span>
                        <span style={{ fontSize: '0.8rem', color: '#2aa8e0' }}>Manage 📝</span>
                      </div>
                      <span className="admin-stat-value">{tabData?.overview?.content ?? 0}</span>
                      {tabData?.overview?.breakdown?.content && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          <span className="admin-status-pill published" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.content.published} Published
                          </span>
                          <span className="admin-status-pill draft" style={{ fontSize: '0.7rem', padding: '1px 6px' }}>
                            {tabData.overview.breakdown.content.draft} Drafts
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="admin-stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('media')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="admin-stat-label">Media Assets</span>
                        <span style={{ fontSize: '0.8rem', color: '#2aa8e0' }}>Library 🖼️</span>
                      </div>
                      <span className="admin-stat-value">{tabData?.overview?.media ?? 0}</span>
                    </div>
                  </div>

                  <div className="admin-panel">
                    <h3 className="admin-panel-title">Recent System Activity</h3>
                    {tabData?.activity && tabData.activity.length > 0 ? (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Action</th>
                            <th>Resource</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tabData.activity.map((act) => (
                            <tr key={act._id}>
                              <td><strong>{act.action}</strong></td>
                              <td>{act.resource || 'System'}</td>
                              <td>
                                <span className={`admin-status-pill ${act.status || 'active'}`}>
                                  {act.status || 'logged'}
                                </span>
                              </td>
                              <td>{new Date(act.createdAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="admin-empty-state">
                        <span className="admin-state-icon">📋</span>
                        <p>No recent activity logs recorded yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB: INQUIRIES */}
              {activeTab === 'inquiries' && (() => {
                const inquiriesList = tabData?.items || [];
                const filteredInquiries = inquiriesList.filter((inq) => {
                  const q = inquirySearch.toLowerCase().trim();
                  const matchesSearch = !q ||
                    (inq.name && inq.name.toLowerCase().includes(q)) ||
                    (inq.email && inq.email.toLowerCase().includes(q)) ||
                    (inq.subject && inq.subject.toLowerCase().includes(q)) ||
                    (inq.message && inq.message.toLowerCase().includes(q));
                  const matchesStatus = inquiryStatusFilter === 'all' || (inq.status || 'new') === inquiryStatusFilter;
                  return matchesSearch && matchesStatus;
                });

                return (
                  <div className="admin-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 className="admin-panel-title" style={{ margin: 0 }}>Website Contact Inquiries</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>
                          Manage messages from client prospective partners, respond, and track ticket status.
                        </p>
                      </div>
                    </div>

                    <div className="admin-filter-bar">
                      <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Search by name, email, subject, or message..."
                        value={inquirySearch}
                        onChange={(e) => setInquirySearch(e.target.value)}
                      />
                      <select
                        className="admin-filter-select"
                        value={inquiryStatusFilter}
                        onChange={(e) => setInquiryStatusFilter(e.target.value)}
                      >
                        <option value="all">All Statuses ({inquiriesList.length})</option>
                        <option value="new">New</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    {filteredInquiries.length > 0 ? (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email & Phone</th>
                            <th>Subject</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInquiries.map((inq) => (
                            <tr key={inq._id}>
                              <td><strong>{inq.name}</strong></td>
                              <td>
                                <div>{inq.email}</div>
                                {inq.phone && <small style={{ color: 'rgba(255,255,255,0.45)' }}>{inq.phone}</small>}
                              </td>
                              <td>
                                <div>{inq.subject || 'General Inquiry'}</div>
                                {inq.message && (
                                  <small style={{ color: 'rgba(255,255,255,0.5)', display: 'block', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {inq.message}
                                  </small>
                                )}
                              </td>
                              <td>
                                <span className={`admin-status-pill ${inq.status || 'new'}`}>
                                  {inq.status || 'new'}
                                </span>
                              </td>
                              <td>{new Date(inq.createdAt).toLocaleDateString()}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className="admin-btn-secondary"
                                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                                    onClick={() => {
                                      setSelectedInquiry(inq);
                                      setInquiryNoteText(inq.adminNote || '');
                                    }}
                                    title="View full inquiry message"
                                  >
                                    👁️ Message
                                  </button>
                                  <select
                                    className="admin-action-select"
                                    value={inq.status || 'new'}
                                    disabled={actionInProgress === inq._id}
                                    onChange={(e) => handleInquiryStatusChange(inq._id, e.target.value)}
                                  >
                                    <option value="new">New</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="resolved">Resolved</option>
                                    <option value="closed">Closed</option>
                                  </select>
                                  {isSuperadmin && (
                                    <button
                                      type="button"
                                      className="admin-btn-danger"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                      onClick={() => handleDeleteInquiry(inq._id)}
                                      title="Delete inquiry"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="admin-empty-state">
                        <span className="admin-state-icon">💬</span>
                        <p>{inquirySearch || inquiryStatusFilter !== 'all' ? 'No inquiries matching your search criteria.' : 'No contact inquiries received yet.'}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: CAREERS */}
              {/* TAB: CAREERS */}
              {activeTab === 'careers' && (() => {
                const jobsList = tabData?.jobs || [];
                const filteredJobs = jobsList.filter((job) => {
                  const q = jobSearch.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    (job.title && job.title.toLowerCase().includes(q)) ||
                    (job.department && job.department.toLowerCase().includes(q)) ||
                    (job.location && job.location.toLowerCase().includes(q)) ||
                    (job.employmentType && job.employmentType.toLowerCase().includes(q))
                  );
                });

                const appsList = tabData?.applications || [];
                const filteredApps = appsList.filter((app) => {
                  const q = appSearch.toLowerCase().trim();
                  const matchesSearch = !q ||
                    (`${app.firstName || ''} ${app.lastName || ''}`.toLowerCase().includes(q)) ||
                    (app.email && app.email.toLowerCase().includes(q)) ||
                    (app.phone && app.phone.toLowerCase().includes(q));
                  const matchesStatus = appStatusFilter === 'all' || (app.status || 'applied') === appStatusFilter;
                  return matchesSearch && matchesStatus;
                });

                return (
                  <div>
                    <div className="admin-panel">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 className="admin-panel-title" style={{ margin: 0 }}>Job Openings</h3>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>
                            Manage company vacancies, review candidate pipelines, and publish opportunities.
                          </p>
                        </div>
                        <button
                          type="button"
                          className="admin-btn-primary"
                          id="btn-add-new-job"
                          onClick={handleOpenCreateJob}
                        >
                          + Add New Job
                        </button>
                      </div>

                      <div className="admin-filter-bar">
                        <input
                          type="text"
                          className="admin-search-input"
                          placeholder="Search jobs by title, department, or location..."
                          value={jobSearch}
                          onChange={(e) => setJobSearch(e.target.value)}
                        />
                      </div>

                      {filteredJobs.length > 0 ? (
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Title</th>
                              <th>Department</th>
                              <th>Type</th>
                              <th>Location</th>
                              <th>Status</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredJobs.map((job) => (
                              <tr key={job._id}>
                                <td>
                                  <strong>{job.title}</strong>
                                  {job.slug && (
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono, monospace)' }}>
                                      /{job.slug}
                                    </div>
                                  )}
                                </td>
                                <td>{job.department}</td>
                                <td>
                                  <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                    {job.employmentType}
                                  </span>
                                </td>
                                <td>{job.location}</td>
                                <td>
                                  <span className={`admin-status-pill ${job.isActive ? 'active' : 'closed'}`}>
                                    {job.isActive ? 'Active / Published' : 'Closed / Draft'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      className="admin-btn-secondary"
                                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                                      onClick={() => handleOpenEditJob(job)}
                                      title="Edit job opening details"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-btn-action"
                                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}
                                      disabled={actionInProgress === job._id}
                                      onClick={() => handleToggleJobStatus(job)}
                                      title={job.isActive ? 'Deactivate or close job opening' : 'Reopen and publish job opening'}
                                    >
                                      {actionInProgress === job._id
                                        ? 'Updating...'
                                        : job.isActive
                                          ? 'Close / Deactivate'
                                          : 'Reopen / Activate'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="admin-empty-state">
                          <span className="admin-state-icon">💼</span>
                          <p>{jobSearch ? 'No jobs match your search.' : 'No job postings found.'}</p>
                        </div>
                      )}
                    </div>

                    <div className="admin-panel">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 className="admin-panel-title" style={{ margin: 0 }}>Job Applications</h3>
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>
                            Review submitted candidate applications, download resumes, and manage applicant statuses.
                          </p>
                        </div>
                      </div>

                      <div className="admin-filter-bar">
                        <input
                          type="text"
                          className="admin-search-input"
                          placeholder="Search applicants by name, email, or phone..."
                          value={appSearch}
                          onChange={(e) => setAppSearch(e.target.value)}
                        />
                        <select
                          className="admin-filter-select"
                          value={appStatusFilter}
                          onChange={(e) => setAppStatusFilter(e.target.value)}
                        >
                          <option value="all">All Application Statuses ({appsList.length})</option>
                          <option value="applied">Applied</option>
                          <option value="under_review">Under Review</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="rejected">Rejected</option>
                          <option value="hired">Hired</option>
                        </select>
                      </div>

                      {filteredApps.length > 0 ? (
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Applicant</th>
                              <th>Email & Phone</th>
                              <th>Status</th>
                              <th>Applied Date</th>
                              <th>Resume</th>
                              <th>Update Status</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredApps.map((app) => (
                              <tr key={app._id}>
                                <td><strong>{app.firstName} {app.lastName}</strong></td>
                                <td>
                                  <div>{app.email}</div>
                                  <small style={{ color: 'rgba(255,255,255,0.5)' }}>{app.phone}</small>
                                </td>
                                <td>
                                  <span className={`admin-status-pill ${app.status || 'applied'}`}>
                                    {app.status || 'applied'}
                                  </span>
                                </td>
                                <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="admin-btn-action"
                                    disabled={downloadingResumeId === app._id}
                                    onClick={() => handleDownloadResume(app)}
                                    title="Download candidate resume securely"
                                  >
                                    {downloadingResumeId === app._id ? '⏳ Downloading...' : '📥 Resume'}
                                  </button>
                                </td>
                                <td>
                                  <select
                                    className="admin-action-select"
                                    value={app.status || 'applied'}
                                    disabled={actionInProgress === app._id}
                                    onChange={(e) => handleApplicationStatusChange(app._id, e.target.value)}
                                  >
                                    <option value="applied">Applied</option>
                                    <option value="under_review">Under Review</option>
                                    <option value="shortlisted">Shortlisted</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="hired">Hired</option>
                                  </select>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="admin-btn-secondary"
                                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                                    onClick={() => setSelectedApp(app)}
                                    title="View candidate details & cover letter"
                                  >
                                    👁️ Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="admin-empty-state">
                          <span className="admin-state-icon">📄</span>
                          <p>{appSearch || appStatusFilter !== 'all' ? 'No applications match your filter.' : 'No candidate applications submitted yet.'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* TAB: INTERNSHIPS */}
              {activeTab === 'internships' && (() => {
                const internList = tabData?.items || [];
                const filteredInterns = internList.filter((intern) => {
                  const q = internSearch.toLowerCase().trim();
                  const matchesSearch = !q ||
                    (intern.name && intern.name.toLowerCase().includes(q)) ||
                    (intern.email && intern.email.toLowerCase().includes(q)) ||
                    (intern.college && intern.college.toLowerCase().includes(q));
                  const matchesDomain = internDomainFilter === 'all' || intern.domain === internDomainFilter;
                  const matchesStatus = internStatusFilter === 'all' || (intern.status || 'applied') === internStatusFilter;
                  return matchesSearch && matchesDomain && matchesStatus;
                });

                const uniqueDomains = Array.from(new Set(internList.map((i) => i.domain).filter(Boolean)));

                return (
                  <div className="admin-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 className="admin-panel-title" style={{ margin: 0 }}>Internship Applications</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>
                          Review student candidate submissions, domain preferences, academic backgrounds, and pipeline progress.
                        </p>
                      </div>
                    </div>

                    <div className="admin-filter-bar">
                      <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Search by student name, email, or college..."
                        value={internSearch}
                        onChange={(e) => setInternSearch(e.target.value)}
                      />
                      <select
                        className="admin-filter-select"
                        value={internDomainFilter}
                        onChange={(e) => setInternDomainFilter(e.target.value)}
                      >
                        <option value="all">All Domains ({internList.length})</option>
                        {uniqueDomains.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <select
                        className="admin-filter-select"
                        value={internStatusFilter}
                        onChange={(e) => setInternStatusFilter(e.target.value)}
                      >
                        <option value="all">All Statuses</option>
                        <option value="applied">Applied</option>
                        <option value="under_review">Under Review</option>
                        <option value="selected">Selected</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    {filteredInterns.length > 0 ? (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Applicant</th>
                            <th>Domain</th>
                            <th>College</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredInterns.map((intern) => (
                            <tr key={intern._id}>
                              <td>
                                <strong>{intern.name}</strong>
                                <br />
                                <small style={{ color: 'rgba(255,255,255,0.5)' }}>{intern.email}</small>
                              </td>
                              <td>{intern.domain}</td>
                              <td>{intern.college}</td>
                              <td>{intern.duration}</td>
                              <td>
                                <span className={`admin-status-pill ${intern.status || 'applied'}`}>
                                  {intern.status || 'applied'}
                                </span>
                              </td>
                              <td>{new Date(intern.createdAt).toLocaleDateString()}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className="admin-btn-secondary"
                                    style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
                                    onClick={() => {
                                      setSelectedIntern(intern);
                                      setInternNoteText(intern.adminNote || '');
                                    }}
                                    title="View student application details"
                                  >
                                    👁️ Details
                                  </button>
                                  <select
                                    className="admin-action-select"
                                    value={intern.status || 'applied'}
                                    disabled={actionInProgress === intern._id}
                                    onChange={(e) => handleInternshipStatusChange(intern._id, e.target.value)}
                                  >
                                    <option value="applied">Applied</option>
                                    <option value="under_review">Under Review</option>
                                    <option value="selected">Selected</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="rejected">Rejected</option>
                                  </select>
                                  {isSuperadmin && (
                                    <button
                                      type="button"
                                      className="admin-btn-danger"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                      onClick={() => handleDeleteInternship(intern._id)}
                                      title="Delete internship application"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="admin-empty-state">
                        <span className="admin-state-icon">🎓</span>
                        <p>{internSearch || internDomainFilter !== 'all' || internStatusFilter !== 'all' ? 'No applications match your filter.' : 'No internship applications registered yet.'}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: EMPLOYEES */}
              {activeTab === 'employees' && (() => {
                const empList = tabData?.items || [];
                const filteredEmployees = empList.filter((emp) => {
                  const q = empSearch.toLowerCase().trim();
                  const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || '';
                  const matchesSearch = !q ||
                    fullName.toLowerCase().includes(q) ||
                    (emp.email && emp.email.toLowerCase().includes(q)) ||
                    (emp.designation && emp.designation.toLowerCase().includes(q));
                  const matchesDept = empDeptFilter === 'all' || (emp.department || '') === empDeptFilter;
                  return matchesSearch && matchesDept;
                });

                const uniqueDepts = Array.from(new Set(empList.map((e) => e.department).filter(Boolean)));

                return (
                  <div className="admin-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 className="admin-panel-title" style={{ margin: 0 }}>Employee Directory</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>
                          Manage company personnel, departmental assignments, employment profiles, and records.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="admin-btn-primary"
                        onClick={handleOpenCreateEmp}
                      >
                        + Add Employee
                      </button>
                    </div>

                    <div className="admin-filter-bar">
                      <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Search by name, email, or designation..."
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                      />
                      <select
                        className="admin-filter-select"
                        value={empDeptFilter}
                        onChange={(e) => setEmpDeptFilter(e.target.value)}
                      >
                        <option value="all">All Departments ({empList.length})</option>
                        {uniqueDepts.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {filteredEmployees.length > 0 ? (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Designation</th>
                            <th>Department</th>
                            <th>Type & Location</th>
                            <th>Status</th>
                            <th>Joined</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredEmployees.map((emp) => {
                            const displayName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.name || 'Unnamed';
                            return (
                              <tr key={emp._id}>
                                <td>
                                  <strong>{displayName}</strong>
                                  <br />
                                  <small style={{ color: 'rgba(255,255,255,0.5)' }}>{emp.email}</small>
                                </td>
                                <td>{emp.designation}</td>
                                <td>{emp.department}</td>
                                <td>
                                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                                    {emp.employmentType} • {emp.workLocation || 'Office'}
                                  </span>
                                </td>
                                <td>
                                  <span className={`admin-status-pill ${emp.isActive ? 'active' : 'inactive'}`}>
                                    {emp.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td>{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '—'}</td>
                                <td>
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      className="admin-btn-secondary"
                                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.8rem' }}
                                      onClick={() => setSelectedEmp(emp)}
                                      title="View employee profile"
                                    >
                                      👁️ View
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-btn-secondary"
                                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.8rem' }}
                                      onClick={() => handleOpenEditEmp(emp)}
                                      title="Edit employee details"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-btn-action"
                                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                      disabled={actionInProgress === emp._id}
                                      onClick={() => handleToggleEmpStatus(emp)}
                                      title={emp.isActive ? 'Mark inactive' : 'Mark active'}
                                    >
                                      {emp.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    {isSuperadmin && (
                                      <button
                                        type="button"
                                        className="admin-btn-danger"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                        onClick={() => handleDeleteEmp(emp._id)}
                                        title="Delete employee profile"
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="admin-empty-state">
                        <span className="admin-state-icon">👥</span>
                        <p>{empSearch || empDeptFilter !== 'all' ? 'No employees match your search.' : 'No employee records found in directory.'}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: DOCUMENTS */}
              {activeTab === 'documents' && (() => {
                const docList = tabData?.items || [];
                const filteredDocs = docList.filter((doc) => {
                  const q = docSearch.toLowerCase().trim();
                  const matchesSearch = !q ||
                    (doc.title && doc.title.toLowerCase().includes(q)) ||
                    (doc.documentNumber && doc.documentNumber.toLowerCase().includes(q)) ||
                    (doc.employee?.name && doc.employee.name.toLowerCase().includes(q));
                  const matchesType = docTypeFilter === 'all' || doc.documentType === docTypeFilter;
                  return matchesSearch && matchesType;
                });

                const uniqueTypes = Array.from(new Set(docList.map((d) => d.documentType).filter(Boolean)));

                return (
                  <div className="admin-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 className="admin-panel-title" style={{ margin: 0 }}>HR & Corporate Documents</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>
                          Manage confidential employee documentation, offer letters, NDAs, and verify compliance records.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="admin-btn-primary"
                        onClick={handleOpenUploadDoc}
                      >
                        + Upload HR Document
                      </button>
                    </div>

                    <div className="admin-filter-bar">
                      <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Search documents by title or employee..."
                        value={docSearch}
                        onChange={(e) => setDocSearch(e.target.value)}
                      />
                      <select
                        className="admin-filter-select"
                        value={docTypeFilter}
                        onChange={(e) => setDocTypeFilter(e.target.value)}
                      >
                        <option value="all">All Document Types ({docList.length})</option>
                        {uniqueTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {filteredDocs.length > 0 ? (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Document Title</th>
                            <th>Employee</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDocs.map((doc) => (
                            <tr key={doc._id}>
                              <td>
                                <strong>{doc.title}</strong>
                                {doc.documentNumber && (
                                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                                    #{doc.documentNumber}
                                  </div>
                                )}
                              </td>
                              <td>{doc.employee?.name || doc.employee?.firstName || 'Assigned Employee'}</td>
                              <td>
                                <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                                  {doc.documentType}
                                </span>
                              </td>
                              <td>
                                <span className={`admin-status-pill ${doc.status?.toLowerCase() || 'pending'}`}>
                                  {doc.status || 'Pending'}
                                </span>
                              </td>
                              <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                              <td>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className="admin-btn-action"
                                    disabled={downloadingDocId === doc._id}
                                    onClick={() => handleDownloadDoc(doc)}
                                    title="Download HR document securely"
                                  >
                                    {downloadingDocId === doc._id ? '⏳ Downloading...' : '📥 Download'}
                                  </button>
                                  <select
                                    className="admin-action-select"
                                    value={doc.status || 'Pending'}
                                    disabled={actionInProgress === doc._id}
                                    onChange={(e) => handleDocStatusChange(doc._id, e.target.value)}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Verified">Verified</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Expired">Expired</option>
                                  </select>
                                  {isSuperadmin && (
                                    <button
                                      type="button"
                                      className="admin-btn-danger"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                      onClick={() => handleDeleteDoc(doc._id)}
                                      title="Delete HR document"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="admin-empty-state">
                        <span className="admin-state-icon">📁</span>
                        <p>{docSearch || docTypeFilter !== 'all' ? 'No documents match your filter.' : 'No HR documents uploaded yet.'}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: CONTENT */}
              {activeTab === 'content' && (() => {
                const contentList = tabData?.items || [];
                const filteredContent = contentList.filter((c) => {
                  const q = contentSearch.toLowerCase().trim();
                  const matchesSearch = !q ||
                    (c.key && c.key.toLowerCase().includes(q)) ||
                    (c.title && c.title.toLowerCase().includes(q));
                  const matchesSection = contentSectionFilter === 'all' || c.section === contentSectionFilter;
                  return matchesSearch && matchesSection;
                });

                const uniqueSections = Array.from(new Set(contentList.map((c) => c.section).filter(Boolean)));

                return (
                  <div className="admin-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 className="admin-panel-title" style={{ margin: 0 }}>CMS Content Blocks</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>
                          Dynamically manage website marketing copy, hero banners, feature sections, and published status.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="admin-btn-primary"
                        onClick={handleOpenCreateContent}
                      >
                        + New Content Block
                      </button>
                    </div>

                    <div className="admin-filter-bar">
                      <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Search content by key or title..."
                        value={contentSearch}
                        onChange={(e) => setContentSearch(e.target.value)}
                      />
                      <select
                        className="admin-filter-select"
                        value={contentSectionFilter}
                        onChange={(e) => setContentSectionFilter(e.target.value)}
                      >
                        <option value="all">All Sections ({contentList.length})</option>
                        {uniqueSections.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {filteredContent.length > 0 ? (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Key</th>
                            <th>Section</th>
                            <th>Title</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredContent.map((c) => {
                            const isPub = c.status === 'published' || Boolean(c.isPublished);
                            return (
                              <tr key={c._id}>
                                <td><code>{c.key}</code></td>
                                <td>{c.section}</td>
                                <td><strong>{c.title}</strong></td>
                                <td>
                                  <span className={`admin-status-pill ${isPub ? 'published' : 'draft'}`}>
                                    {isPub ? 'Published' : 'Draft'}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      className="admin-btn-secondary"
                                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.8rem' }}
                                      onClick={() => handleOpenEditContent(c)}
                                      title="Edit CMS block"
                                    >
                                      ✏️ Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-btn-action"
                                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                                      disabled={actionInProgress === c._id}
                                      onClick={() => handleToggleContentPublish(c)}
                                      title={isPub ? 'Unpublish block' : 'Publish block'}
                                    >
                                      {isPub ? 'Unpublish' : 'Publish'}
                                    </button>
                                    {isSuperadmin && (
                                      <button
                                        type="button"
                                        className="admin-btn-danger"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                        onClick={() => handleDeleteContent(c._id)}
                                        title="Delete content block"
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      <div className="admin-empty-state">
                        <span className="admin-state-icon">📝</span>
                        <p>{contentSearch || contentSectionFilter !== 'all' ? 'No content blocks match your filter.' : 'No custom CMS blocks created yet.'}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: MEDIA */}
              {activeTab === 'media' && (() => {
                const mediaList = tabData?.items || [];
                const filteredMedia = mediaList.filter((m) => {
                  if (mediaCategoryFilter === 'all') return true;
                  return (m.category || 'other') === mediaCategoryFilter;
                });

                return (
                  <div className="admin-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 className="admin-panel-title" style={{ margin: 0 }}>Media Assets</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>
                          Central company asset repository for website imagery, logos, brochures, and CDN files.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="admin-btn-primary"
                        onClick={handleOpenUploadMedia}
                      >
                        + Upload Media Asset
                      </button>
                    </div>

                    <div className="admin-filter-bar">
                      <select
                        className="admin-filter-select"
                        value={mediaCategoryFilter}
                        onChange={(e) => setMediaCategoryFilter(e.target.value)}
                      >
                        <option value="all">All Categories ({mediaList.length})</option>
                        <option value="image">Images</option>
                        <option value="document">Documents</option>
                        <option value="video">Videos</option>
                        <option value="other">Other Assets</option>
                      </select>
                    </div>

                    {filteredMedia.length > 0 ? (
                      <div className="admin-media-grid">
                        {filteredMedia.map((m) => {
                          const isImg = m.mimeType?.startsWith('image/');
                          const sizeKb = m.size ? (m.size / 1024).toFixed(1) : '—';
                          return (
                            <div key={m._id} className="admin-media-card">
                              <div className="admin-media-thumb">
                                {isImg ? (
                                  <img src={m.url} alt={m.originalName || 'Asset preview'} loading="lazy" />
                                ) : (
                                  <span style={{ fontSize: '2.5rem' }}>📄</span>
                                )}
                              </div>
                              <div className="admin-media-info">
                                <div className="admin-media-name" title={m.originalName || m.fileName}>
                                  {m.originalName || m.fileName}
                                </div>
                                <div className="admin-media-meta">
                                  {m.category || 'Asset'} • {sizeKb} KB
                                </div>
                                <div className="admin-media-actions">
                                  <button
                                    type="button"
                                    className="admin-btn-secondary"
                                    style={{ flex: 1, padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                    onClick={() => handleCopyMediaUrl(m.url, m._id)}
                                  >
                                    {copiedMediaId === m._id ? '✅ Copied' : '📋 Copy URL'}
                                  </button>
                                  {isSuperadmin && (
                                    <button
                                      type="button"
                                      className="admin-btn-danger"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                      onClick={() => handleDeleteMedia(m._id)}
                                      title="Delete media asset"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="admin-empty-state">
                        <span className="admin-state-icon">🖼️</span>
                        <p>{mediaCategoryFilter !== 'all' ? 'No media found in this category.' : 'No media files uploaded yet.'}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: AUDIT */}
              {activeTab === 'audit' && (() => {
                const auditList = tabData?.items || [];
                const filteredLogs = auditList.filter((log) => {
                  const q = auditSearch.toLowerCase().trim();
                  const matchesSearch = !q ||
                    (log.action && log.action.toLowerCase().includes(q)) ||
                    (log.resource && log.resource.toLowerCase().includes(q)) ||
                    (log.ip && log.ip.toLowerCase().includes(q));
                  const matchesAction = auditActionFilter === 'all' || log.action === auditActionFilter;
                  return matchesSearch && matchesAction;
                });

                return (
                  <div className="admin-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h3 className="admin-panel-title" style={{ margin: 0 }}>Audit Trail & Security Logs</h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>
                          Immutable administrative log tracking state mutations, authentication events, and administrative actions.
                        </p>
                      </div>
                    </div>

                    <div className="admin-filter-bar">
                      <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Search logs by action, resource, or IP address..."
                        value={auditSearch}
                        onChange={(e) => setAuditSearch(e.target.value)}
                      />
                      <select
                        className="admin-filter-select"
                        value={auditActionFilter}
                        onChange={(e) => setAuditActionFilter(e.target.value)}
                      >
                        <option value="all">All Action Types</option>
                        <option value="LOGIN">LOGIN</option>
                        <option value="CREATE">CREATE</option>
                        <option value="UPDATE">UPDATE</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>

                    {filteredLogs.length > 0 ? (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Timestamp</th>
                            <th>Action</th>
                            <th>Resource</th>
                            <th>IP Address</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredLogs.map((log) => (
                            <tr key={log._id}>
                              <td>{new Date(log.createdAt).toLocaleString()}</td>
                              <td>
                                <span className={`admin-status-pill ${log.action === 'DELETE' ? 'rejected' : log.action === 'CREATE' ? 'published' : 'active'}`}>
                                  {log.action}
                                </span>
                              </td>
                              <td><strong>{log.resource || log.entity || 'System'}</strong></td>
                              <td><code>{log.ip || '—'}</code></td>
                              <td>
                                <button
                                  type="button"
                                  className="admin-btn-secondary"
                                  style={{ padding: '0.25rem 0.55rem', fontSize: '0.8rem' }}
                                  onClick={() => setSelectedAudit(log)}
                                >
                                  🔍 Inspect
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="admin-empty-state">
                        <span className="admin-state-icon">🛡️</span>
                        <p>{auditSearch || auditActionFilter !== 'all' ? 'No audit logs match your search.' : 'No security audit logs found.'}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: SETTINGS */}
              {activeTab === 'settings' && (
                <div className="admin-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 className="admin-panel-title" style={{ margin: 0 }}>System & Website Configuration</h3>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>
                        Manage corporate profile, contact metadata, social links, and live platform features with direct MongoDB persistence.
                      </p>
                    </div>
                  </div>

                  {settingsForm ? (
                    <form onSubmit={handleSaveSettings}>
                      <div className="admin-settings-grid">
                        {/* Group 1: Company Profile */}
                        <div className="admin-settings-group">
                          <h4 className="admin-settings-title">🏢 Company Profile</h4>
                          <p className="admin-settings-desc">Official corporate entity information displayed across the site.</p>
                          
                          <div className="admin-form-group">
                            <label className="admin-form-label" htmlFor="settings-company-name">Company Name</label>
                            <input
                              id="settings-company-name"
                              type="text"
                              className="admin-form-input"
                              value={settingsForm.company?.name ?? settingsForm.companyName ?? ''}
                              onChange={(e) => setSettingsForm((prev) => ({
                                ...prev,
                                company: { ...(prev.company || {}), name: e.target.value },
                              }))}
                            />
                          </div>

                          <div className="admin-form-group">
                            <label className="admin-form-label" htmlFor="settings-tagline">Tagline</label>
                            <input
                              id="settings-tagline"
                              type="text"
                              className="admin-form-input"
                              value={settingsForm.company?.tagline ?? ''}
                              onChange={(e) => setSettingsForm((prev) => ({
                                ...prev,
                                company: { ...(prev.company || {}), tagline: e.target.value },
                              }))}
                            />
                          </div>

                          <div className="admin-form-group">
                            <label className="admin-form-label" htmlFor="settings-email">Corporate Email</label>
                            <input
                              id="settings-email"
                              type="email"
                              className="admin-form-input"
                              value={settingsForm.company?.email ?? settingsForm.contactEmail ?? ''}
                              onChange={(e) => setSettingsForm((prev) => ({
                                ...prev,
                                company: { ...(prev.company || {}), email: e.target.value },
                              }))}
                            />
                          </div>

                          <div className="admin-form-group">
                            <label className="admin-form-label" htmlFor="settings-phone">Corporate Phone</label>
                            <input
                              id="settings-phone"
                              type="text"
                              className="admin-form-input"
                              value={settingsForm.company?.phone ?? settingsForm.phone ?? ''}
                              onChange={(e) => setSettingsForm((prev) => ({
                                ...prev,
                                company: { ...(prev.company || {}), phone: e.target.value },
                              }))}
                            />
                          </div>

                          <div className="admin-form-group">
                            <label className="admin-form-label" htmlFor="settings-address">Registered Address</label>
                            <input
                              id="settings-address"
                              type="text"
                              className="admin-form-input"
                              value={settingsForm.company?.address ?? settingsForm.address ?? ''}
                              onChange={(e) => setSettingsForm((prev) => ({
                                ...prev,
                                company: { ...(prev.company || {}), address: e.target.value },
                              }))}
                            />
                          </div>
                        </div>

                        {/* Group 2: Social Media & Presence */}
                        <div className="admin-settings-group">
                          <h4 className="admin-settings-title">🌐 Social Presence</h4>
                          <p className="admin-settings-desc">Official channels linked in the website header and footer.</p>

                          <div className="admin-form-group">
                            <label className="admin-form-label" htmlFor="settings-linkedin">LinkedIn URL</label>
                            <input
                              id="settings-linkedin"
                              type="text"
                              className="admin-form-input"
                              placeholder="https://linkedin.com/company/ashivam-technologies"
                              value={settingsForm.social?.linkedin ?? ''}
                              onChange={(e) => setSettingsForm((prev) => ({
                                ...prev,
                                social: { ...(prev.social || {}), linkedin: e.target.value },
                              }))}
                            />
                          </div>

                          <div className="admin-form-group">
                            <label className="admin-form-label" htmlFor="settings-github">GitHub Organization</label>
                            <input
                              id="settings-github"
                              type="text"
                              className="admin-form-input"
                              placeholder="https://github.com/ashivam-technologies"
                              value={settingsForm.social?.github ?? ''}
                              onChange={(e) => setSettingsForm((prev) => ({
                                ...prev,
                                social: { ...(prev.social || {}), github: e.target.value },
                              }))}
                            />
                          </div>

                          <div className="admin-form-group">
                            <label className="admin-form-label" htmlFor="settings-twitter">Twitter / X</label>
                            <input
                              id="settings-twitter"
                              type="text"
                              className="admin-form-input"
                              placeholder="https://x.com/AshivamTech"
                              value={settingsForm.social?.twitter ?? ''}
                              onChange={(e) => setSettingsForm((prev) => ({
                                ...prev,
                                social: { ...(prev.social || {}), twitter: e.target.value },
                              }))}
                            />
                          </div>

                          <div className="admin-form-group">
                            <label className="admin-form-label" htmlFor="settings-instagram">Instagram</label>
                            <input
                              id="settings-instagram"
                              type="text"
                              className="admin-form-input"
                              placeholder="https://instagram.com/ashivamtechnologies"
                              value={settingsForm.social?.instagram ?? ''}
                              onChange={(e) => setSettingsForm((prev) => ({
                                ...prev,
                                social: { ...(prev.social || {}), instagram: e.target.value },
                              }))}
                            />
                          </div>
                        </div>

                        {/* Group 3: Features & Maintenance */}
                        <div className="admin-settings-group">
                          <h4 className="admin-settings-title">⚡ Platform Features</h4>
                          <p className="admin-settings-desc">Enable or disable dynamic website capability modules.</p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#e2e8f0', fontSize: '0.9rem' }}>
                              <input
                                type="checkbox"
                                checked={settingsForm.features?.contactForm ?? true}
                                onChange={(e) => setSettingsForm((prev) => ({
                                  ...prev,
                                  features: { ...(prev.features || {}), contactForm: e.target.checked },
                                }))}
                              />
                              Enable Public Contact Form
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#e2e8f0', fontSize: '0.9rem' }}>
                              <input
                                type="checkbox"
                                checked={settingsForm.features?.careerApplications ?? true}
                                onChange={(e) => setSettingsForm((prev) => ({
                                  ...prev,
                                  features: { ...(prev.features || {}), careerApplications: e.target.checked },
                                }))}
                              />
                              Enable Public Career Applications
                            </label>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#e2e8f0', fontSize: '0.9rem' }}>
                              <input
                                type="checkbox"
                                checked={settingsForm.features?.publicContent ?? true}
                                onChange={(e) => setSettingsForm((prev) => ({
                                  ...prev,
                                  features: { ...(prev.features || {}), publicContent: e.target.checked },
                                }))}
                              />
                              Serve Dynamic CMS Content
                            </label>
                          </div>

                          <h4 className="admin-settings-title" style={{ marginTop: '1.5rem' }}>🔧 Maintenance Mode</h4>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                            <input
                              type="checkbox"
                              checked={settingsForm.maintenance?.enabled ?? false}
                              onChange={(e) => setSettingsForm((prev) => ({
                                ...prev,
                                maintenance: { ...(prev.maintenance || {}), enabled: e.target.checked },
                              }))}
                            />
                            Activate Maintenance Mode
                          </label>

                          {settingsForm.maintenance?.enabled && (
                            <div className="admin-form-group">
                              <label className="admin-form-label" htmlFor="settings-maint-msg">Maintenance Message</label>
                              <textarea
                                id="settings-maint-msg"
                                rows={2}
                                className="admin-form-input"
                                placeholder="We are currently upgrading our platform. Please check back shortly."
                                value={settingsForm.maintenance?.message ?? ''}
                                onChange={(e) => setSettingsForm((prev) => ({
                                  ...prev,
                                  maintenance: { ...(prev.maintenance || {}), message: e.target.value },
                                }))}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button
                          type="submit"
                          className="admin-btn-primary"
                          disabled={settingsSubmitting}
                        >
                          {settingsSubmitting ? 'Saving Configuration...' : '💾 Save System Configuration'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="admin-empty-state">
                      <span className="admin-state-icon">⚙️</span>
                      <p>Settings configuration not available.</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: ADMINS (Superadmin Only) */}
              {activeTab === 'admins' && isSuperadmin && (
                <div className="admin-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h3 className="admin-panel-title" style={{ margin: 0 }}>Administrator Accounts</h3>
                      <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)' }}>
                        Superadmin-only console. Create and manage operational admin access with role-based restrictions.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="admin-btn-primary"
                      onClick={() => {
                        setCreateAdminError('');
                        setShowCreateAdminModal(true);
                      }}
                    >
                      + Create Normal Admin
                    </button>
                  </div>

                  {(() => {
                    const adminsList = tabData?.admins || tabData?.items || [];
                    if (adminsList.length === 0) {
                      return (
                        <div className="admin-empty-state">
                          <span className="admin-state-icon">👑</span>
                          <p>No administrator records found.</p>
                        </div>
                      );
                    }

                    return (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Admin Name</th>
                            <th>Username</th>
                            <th>Company Email</th>
                            <th>Role</th>
                            <th>Permissions</th>
                            <th>Status</th>
                            <th>Last Login</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {adminsList.map((adm) => (
                            <tr key={adm._id}>
                              <td><strong>{adm.name}</strong></td>
                              <td>@{adm.username}</td>
                              <td>{adm.email || <span style={{ color: 'rgba(255,255,255,0.4)' }}>—</span>}</td>
                              <td>
                                <span className={`admin-role-badge ${adm.role?.toLowerCase()}`}>
                                  {adm.role}
                                </span>
                              </td>
                              <td>
                                {adm.role === 'Superadmin' ? (
                                  <span style={{ color: '#60a5fa', fontSize: '0.85rem' }}>Full System Access</span>
                                ) : adm.permissions && adm.permissions.length > 0 ? (
                                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                    {adm.permissions.map((p) => (
                                      <span
                                        key={p}
                                        style={{
                                          background: 'rgba(255,255,255,0.08)',
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          fontSize: '0.75rem',
                                          color: 'rgba(255,255,255,0.85)',
                                        }}
                                      >
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>None</span>
                                )}
                              </td>
                              <td>
                                <span className={`admin-status-pill ${adm.isActive ? 'active' : 'inactive'}`}>
                                  {adm.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>{adm.lastLoginAt ? new Date(adm.lastLoginAt).toLocaleString() : 'Never'}</td>
                              <td>
                                {adm._id === user?.id ? (
                                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Current Session</span>
                                ) : (
                                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button
                                      type="button"
                                      className="admin-btn-secondary"
                                      style={{ padding: '0.25rem 0.55rem', fontSize: '0.8rem' }}
                                      disabled={actionInProgress === adm._id}
                                      onClick={() => handleToggleAdminStatus(adm)}
                                    >
                                      {adm.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    {adm.role !== 'Superadmin' && (
                                      <>
                                        <button
                                          type="button"
                                          className="admin-btn-secondary"
                                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.8rem' }}
                                          onClick={() => handleOpenEditPermissions(adm)}
                                          title="Customize module permissions"
                                        >
                                          🔑
                                        </button>
                                        <button
                                          type="button"
                                          className="admin-btn-danger"
                                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                          onClick={() => handleDeleteAdmin(adm._id, adm.username)}
                                          title="Permanently remove admin account"
                                        >
                                          🗑️
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Create Normal Admin Modal (Superadmin Only) */}
      {showCreateAdminModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCreateAdminModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Create Normal Admin Account</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                  Restricted to operational tasks. Cannot manage other admin accounts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateAdminModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', cursor: 'pointer' }}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {createAdminError && (
              <div className="admin-login-error-alert" style={{ marginBottom: '1rem' }} role="alert">
                {createAdminError}
              </div>
            )}

            <form onSubmit={handleCreateAdminSubmit}>
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="new-admin-name">Full Name *</label>
                <input
                  id="new-admin-name"
                  name="name"
                  type="text"
                  required
                  className="admin-form-input"
                  placeholder="e.g. Rahul Sharma"
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="new-admin-username">Username *</label>
                  <input
                    id="new-admin-username"
                    name="username"
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. rahul.admin"
                    value={newAdminForm.username}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, username: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="new-admin-email">Company Email</label>
                  <input
                    id="new-admin-email"
                    name="email"
                    type="email"
                    className="admin-form-input"
                    placeholder="e.g. rahul@ashivamtechnologies.com"
                    value={newAdminForm.email}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="new-admin-password">Password (min 8 chars) *</label>
                <input
                  id="new-admin-password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  className="admin-form-input"
                  placeholder="••••••••••••"
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, password: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="new-admin-role">Role</label>
                <input
                  id="new-admin-role"
                  name="role"
                  type="text"
                  disabled
                  readOnly
                  className="admin-form-input"
                  value="Admin (Normal Administrator - Restricted)"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#93c5fd' }}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Assigned Permissions</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                  {[
                    { key: 'dashboard', label: '📊 Dashboard Overview' },
                    { key: 'inquiries', label: '💬 Inquiries' },
                    { key: 'careers', label: '💼 Careers & Jobs' },
                    { key: 'employees', label: '👥 Employees' },
                    { key: 'content', label: '📝 CMS Content' },
                    { key: 'media', label: '🖼️ Media Assets' },
                    { key: 'audit', label: '🛡️ Audit Trail' },
                    { key: 'settings', label: '⚙️ Settings' },
                  ].map((perm) => (
                    <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#e2e8f0', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="permissions"
                        checked={newAdminForm.permissions.includes(perm.key)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setNewAdminForm((prev) => ({
                            ...prev,
                            permissions: checked
                              ? [...prev.permissions, perm.key]
                              : prev.permissions.filter((p) => p !== perm.key),
                          }));
                        }}
                      />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setShowCreateAdminModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={createAdminSubmitting}
                >
                  {createAdminSubmitting ? 'Creating Admin...' : 'Create Admin Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Creation and Edit Modal */}
      {showJobModal && (
        <div className="admin-modal-overlay" onClick={() => setShowJobModal(false)}>
          <div
            className="admin-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '780px', width: '94%' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-modal-title"
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 id="job-modal-title" style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>
                  {editingJob ? 'Edit Job Opening' : 'Add New Job Opening'}
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                  {editingJob
                    ? `Update position details, requirements, and live status for "${editingJob.title}".`
                    : 'Publish a new engineering vacancy or internship to the careers portal.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowJobModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', cursor: 'pointer' }}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            {jobFormError && (
              <div className="admin-login-error-alert" style={{ marginBottom: '1.25rem' }} role="alert">
                {jobFormError}
              </div>
            )}

            <form onSubmit={handleJobSubmit} noValidate>
              {/* Row 1: Title and Slug */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="job-title">
                    Job Title *
                  </label>
                  <input
                    id="job-title"
                    name="title"
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. Senior Full-Stack Engineer"
                    value={jobForm.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setJobForm((prev) => {
                        const oldAutoSlug = prev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                        const shouldUpdateSlug = !prev.slug || prev.slug === oldAutoSlug;
                        return {
                          ...prev,
                          title: newTitle,
                          slug: shouldUpdateSlug
                            ? newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
                            : prev.slug,
                        };
                      });
                    }}
                  />
                </div>

                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="job-slug">
                    URL Slug *
                  </label>
                  <input
                    id="job-slug"
                    name="slug"
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. senior-full-stack-engineer"
                    value={jobForm.slug}
                    onChange={(e) => setJobForm({ ...jobForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  />
                </div>
              </div>

              {/* Row 2: Department and Employment Type */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="job-department">
                    Department *
                  </label>
                  <input
                    id="job-department"
                    name="department"
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. Software Engineering"
                    value={jobForm.department}
                    onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                  />
                </div>

                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="job-employment-type">
                    Employment Type *
                  </label>
                  <select
                    id="job-employment-type"
                    name="employmentType"
                    className="admin-form-input"
                    style={{ background: '#0a1425', color: '#fff' }}
                    value={jobForm.employmentType}
                    onChange={(e) => setJobForm({ ...jobForm, employmentType: e.target.value })}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Internship">Internship</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Location and Experience */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="job-location">
                    Location *
                  </label>
                  <input
                    id="job-location"
                    name="location"
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. Agra, India / Hybrid or Remote"
                    value={jobForm.location}
                    onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                  />
                </div>

                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="job-experience">
                    Experience Level
                  </label>
                  <input
                    id="job-experience"
                    name="experience"
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. 1-3 Years, 3-5 Years, or Fresher"
                    value={jobForm.experience}
                    onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 4: Salary and Deadline */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="job-salary">
                    Salary / Compensation (Optional)
                  </label>
                  <input
                    id="job-salary"
                    name="salary"
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. ₹8,00,000 - ₹14,00,000 PA or Competitive"
                    value={jobForm.salary}
                    onChange={(e) => setJobForm({ ...jobForm, salary: e.target.value })}
                  />
                </div>

                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="job-deadline">
                    Application Deadline (Optional)
                  </label>
                  <input
                    id="job-deadline"
                    name="applicationDeadline"
                    type="date"
                    className="admin-form-input"
                    value={jobForm.applicationDeadline}
                    onChange={(e) => setJobForm({ ...jobForm, applicationDeadline: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 5: Publication Status */}
              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label" htmlFor="job-status-select">
                  Publication Status *
                </label>
                <select
                  id="job-status-select"
                  name="isActive"
                  className="admin-form-input"
                  style={{ background: '#0a1425', color: '#fff' }}
                  value={jobForm.isActive ? 'active' : 'draft'}
                  onChange={(e) => setJobForm({ ...jobForm, isActive: e.target.value === 'active' })}
                >
                  <option value="active">🟢 Published & Active (Visible on Public Careers Page)</option>
                  <option value="draft">🟡 Draft / Closed (Hidden from Public Careers Page)</option>
                </select>
              </div>

              {/* Row 6: Description */}
              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label" htmlFor="job-description">
                  Job Description *
                </label>
                <textarea
                  id="job-description"
                  name="description"
                  rows={4}
                  required
                  className="admin-form-input"
                  style={{ resize: 'vertical' }}
                  placeholder="Comprehensive overview of the position, team mission, and high-impact deliverables..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                />
              </div>

              {/* Row 7: Key Responsibilities */}
              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label" htmlFor="job-responsibilities">
                  Key Responsibilities (One item per line)
                </label>
                <textarea
                  id="job-responsibilities"
                  name="responsibilities"
                  rows={3}
                  className="admin-form-input"
                  style={{ resize: 'vertical' }}
                  placeholder="Architect scalable microservices&#10;Implement responsive UI components&#10;Lead sprint planning and code reviews"
                  value={jobForm.responsibilities}
                  onChange={(e) => setJobForm({ ...jobForm, responsibilities: e.target.value })}
                />
              </div>

              {/* Row 8: Required Skills */}
              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label" htmlFor="job-skills">
                  Required Skills (Comma or line separated)
                </label>
                <input
                  id="job-skills"
                  name="skills"
                  type="text"
                  className="admin-form-input"
                  placeholder="e.g. React, Node.js, TypeScript, MongoDB, Docker, AWS"
                  value={jobForm.skills}
                  onChange={(e) => setJobForm({ ...jobForm, skills: e.target.value })}
                />
              </div>

              {/* Row 9: Qualifications */}
              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="admin-form-label" htmlFor="job-qualifications">
                  Qualifications & Requirements (One item per line)
                </label>
                <textarea
                  id="job-qualifications"
                  name="qualifications"
                  rows={3}
                  className="admin-form-input"
                  style={{ resize: 'vertical' }}
                  placeholder="B.Tech/B.E. in Computer Science or equivalent practical experience&#10;Strong understanding of data structures and distributed systems&#10;Prior experience with RESTful APIs"
                  value={jobForm.qualifications}
                  onChange={(e) => setJobForm({ ...jobForm, qualifications: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setShowJobModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={jobSubmitting}
                >
                  {jobSubmitting ? 'Saving...' : editingJob ? 'Save Changes' : 'Publish Job Opening'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Inquiry Message & Note Modal */}
      {selectedInquiry && (
        <div className="admin-modal-overlay" onClick={() => setSelectedInquiry(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Contact Inquiry</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                  From {selectedInquiry.name} ({new Date(selectedInquiry.createdAt).toLocaleDateString()})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInquiry(null)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', cursor: 'pointer' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="admin-detail-grid">
              <div className="admin-detail-item">
                <div className="admin-detail-label">Email</div>
                <div className="admin-detail-value">{selectedInquiry.email}</div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">Phone</div>
                <div className="admin-detail-value">{selectedInquiry.phone || 'Not provided'}</div>
              </div>
              <div className="admin-detail-item" style={{ gridColumn: '1 / -1' }}>
                <div className="admin-detail-label">Subject</div>
                <div className="admin-detail-value">{selectedInquiry.subject || 'General Inquiry'}</div>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div className="admin-detail-label" style={{ marginBottom: '0.5rem' }}>Message Body</div>
              <div style={{ background: '#070d19', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'pre-wrap', color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.6' }}>
                {selectedInquiry.message || 'No message text provided.'}
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div className="admin-detail-label" style={{ marginBottom: '0.5rem' }}>Internal Admin Note</div>
              <textarea
                rows={3}
                className="admin-form-input"
                placeholder="Add private staff notes on this prospect, phone calls, or follow-up status..."
                value={inquiryNoteText}
                onChange={(e) => setInquiryNoteText(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  disabled={actionInProgress === selectedInquiry._id}
                  onClick={() => handleSaveInquiryNote(selectedInquiry._id, inquiryNoteText)}
                >
                  {actionInProgress === selectedInquiry._id ? 'Saving Note...' : '💾 Save Admin Note'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => setSelectedInquiry(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Application Details Modal */}
      {selectedApp && (
        <div className="admin-modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Candidate Application</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                  {selectedApp.firstName} {selectedApp.lastName} • Applied {new Date(selectedApp.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', cursor: 'pointer' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="admin-detail-grid">
              <div className="admin-detail-item">
                <div className="admin-detail-label">Email</div>
                <div className="admin-detail-value">{selectedApp.email}</div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">Phone</div>
                <div className="admin-detail-value">{selectedApp.phone || '—'}</div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">Applied Role / Job ID</div>
                <div className="admin-detail-value">{selectedApp.job?.title || selectedApp.jobTitle || 'General Application'}</div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">Current Pipeline Status</div>
                <div className="admin-detail-value">
                  <span className={`admin-status-pill ${selectedApp.status || 'applied'}`}>
                    {selectedApp.status || 'applied'}
                  </span>
                </div>
              </div>
            </div>

            {selectedApp.coverLetter && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div className="admin-detail-label" style={{ marginBottom: '0.5rem' }}>Cover Letter / Candidate Statement</div>
                <div style={{ background: '#070d19', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'pre-wrap', color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {selectedApp.coverLetter}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <button
                type="button"
                className="admin-btn-action"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                disabled={downloadingResumeId === selectedApp._id}
                onClick={() => handleDownloadResume(selectedApp)}
              >
                {downloadingResumeId === selectedApp._id ? '⏳ Downloading...' : '📥 Download Candidate Resume'}
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setSelectedApp(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Internship Application Details Modal */}
      {selectedIntern && (
        <div className="admin-modal-overlay" onClick={() => setSelectedIntern(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Internship Candidate</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                  {selectedIntern.name} • {selectedIntern.domain} ({new Date(selectedIntern.createdAt).toLocaleDateString()})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIntern(null)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', cursor: 'pointer' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="admin-detail-grid">
              <div className="admin-detail-item">
                <div className="admin-detail-label">Email</div>
                <div className="admin-detail-value">{selectedIntern.email}</div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">Phone</div>
                <div className="admin-detail-value">{selectedIntern.phone || '—'}</div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">College / University</div>
                <div className="admin-detail-value">{selectedIntern.college}</div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">Duration & Year</div>
                <div className="admin-detail-value">{selectedIntern.duration || 'Flexible'} {selectedIntern.year ? `• Year ${selectedIntern.year}` : ''}</div>
              </div>
            </div>

            {selectedIntern.portfolioUrl && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="admin-detail-label" style={{ marginBottom: '0.25rem' }}>Portfolio / GitHub</div>
                <a
                  href={selectedIntern.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2aa8e0', textDecoration: 'underline', fontSize: '0.9rem' }}
                >
                  {selectedIntern.portfolioUrl} ↗
                </a>
              </div>
            )}

            {selectedIntern.statement && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div className="admin-detail-label" style={{ marginBottom: '0.5rem' }}>Candidate Statement</div>
                <div style={{ background: '#070d19', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'pre-wrap', color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.6' }}>
                  {selectedIntern.statement}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <div className="admin-detail-label" style={{ marginBottom: '0.5rem' }}>Admin Review Notes</div>
              <textarea
                rows={2}
                className="admin-form-input"
                placeholder="Internal interview feedback, mentor assignment notes..."
                value={internNoteText}
                onChange={(e) => setInternNoteText(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  disabled={actionInProgress === selectedIntern._id}
                  onClick={() => handleSaveInternNote(selectedIntern._id, internNoteText)}
                >
                  {actionInProgress === selectedIntern._id ? 'Saving Note...' : '💾 Save Review Note'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => setSelectedIntern(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {showEmpModal && (
        <div className="admin-modal-overlay" onClick={() => setShowEmpModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>
                  {editingEmp ? 'Edit Employee Profile' : 'Add New Employee'}
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                  {editingEmp ? `Update organizational records for ${editingEmp.firstName || editingEmp.name}.` : 'Register a new employee into the company directory.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEmpModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', cursor: 'pointer' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {empError && (
              <div className="admin-login-error-alert" style={{ marginBottom: '1rem' }} role="alert">
                {empError}
              </div>
            )}

            <form onSubmit={handleEmpSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="emp-fname">First Name *</label>
                  <input
                    id="emp-fname"
                    type="text"
                    required
                    className="admin-form-input"
                    value={empForm.firstName}
                    onChange={(e) => setEmpForm({ ...empForm, firstName: e.target.value })}
                  />
                </div>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="emp-lname">Last Name *</label>
                  <input
                    id="emp-lname"
                    type="text"
                    required
                    className="admin-form-input"
                    value={empForm.lastName}
                    onChange={(e) => setEmpForm({ ...empForm, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="emp-email">Corporate Email *</label>
                  <input
                    id="emp-email"
                    type="email"
                    required
                    className="admin-form-input"
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                  />
                </div>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="emp-phone">Phone Number</label>
                  <input
                    id="emp-phone"
                    type="text"
                    className="admin-form-input"
                    placeholder="+91 98765 43210"
                    value={empForm.phone}
                    onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="emp-designation">Designation / Role *</label>
                  <input
                    id="emp-designation"
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. Senior Software Engineer"
                    value={empForm.designation}
                    onChange={(e) => setEmpForm({ ...empForm, designation: e.target.value })}
                  />
                </div>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="emp-dept">Department *</label>
                  <input
                    id="emp-dept"
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. Software Engineering"
                    value={empForm.department}
                    onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="emp-emptype">Employment Type *</label>
                  <select
                    id="emp-emptype"
                    className="admin-form-input"
                    style={{ background: '#0a1425', color: '#fff' }}
                    value={empForm.employmentType}
                    onChange={(e) => setEmpForm({ ...empForm, employmentType: e.target.value })}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Intern">Intern</option>
                    <option value="Freelance">Freelance</option>
                  </select>
                </div>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="emp-loc">Work Location</label>
                  <select
                    id="emp-loc"
                    className="admin-form-input"
                    style={{ background: '#0a1425', color: '#fff' }}
                    value={empForm.workLocation}
                    onChange={(e) => setEmpForm({ ...empForm, workLocation: e.target.value })}
                  >
                    <option value="Office">Office</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="emp-date">Joining Date *</label>
                  <input
                    id="emp-date"
                    type="date"
                    required
                    className="admin-form-input"
                    value={empForm.joiningDate}
                    onChange={(e) => setEmpForm({ ...empForm, joiningDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label" htmlFor="emp-skills">Skills (comma separated)</label>
                <input
                  id="emp-skills"
                  type="text"
                  className="admin-form-input"
                  placeholder="React, Node.js, MongoDB, AWS, Docker"
                  value={empForm.skills}
                  onChange={(e) => setEmpForm({ ...empForm, skills: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="emp-linkedin">LinkedIn Profile URL</label>
                  <input
                    id="emp-linkedin"
                    type="text"
                    className="admin-form-input"
                    placeholder="https://linkedin.com/in/..."
                    value={empForm.linkedin}
                    onChange={(e) => setEmpForm({ ...empForm, linkedin: e.target.value })}
                  />
                </div>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="emp-github">GitHub Profile URL</label>
                  <input
                    id="emp-github"
                    type="text"
                    className="admin-form-input"
                    placeholder="https://github.com/..."
                    value={empForm.github}
                    onChange={(e) => setEmpForm({ ...empForm, github: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label" htmlFor="emp-bio">Professional Biography</label>
                <textarea
                  id="emp-bio"
                  rows={2}
                  className="admin-form-input"
                  placeholder="Brief summary of professional experience and domain expertise..."
                  value={empForm.bio}
                  onChange={(e) => setEmpForm({ ...empForm, bio: e.target.value })}
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#e2e8f0' }}>
                  <input
                    type="checkbox"
                    checked={empForm.isActive}
                    onChange={(e) => setEmpForm({ ...empForm, isActive: e.target.checked })}
                  />
                  Active Employee Status
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setShowEmpModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={empSubmitting}
                >
                  {empSubmitting ? 'Saving Profile...' : editingEmp ? 'Update Employee' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Profile Modal */}
      {selectedEmp && (
        <div className="admin-modal-overlay" onClick={() => setSelectedEmp(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div className="admin-profile-header">
                <div className="admin-profile-avatar">
                  {selectedEmp.firstName ? selectedEmp.firstName[0].toUpperCase() : selectedEmp.name ? selectedEmp.name[0].toUpperCase() : 'E'}
                </div>
                <div className="admin-profile-meta">
                  <div className="admin-profile-name">
                    {`${selectedEmp.firstName || ''} ${selectedEmp.lastName || ''}`.trim() || selectedEmp.name}
                  </div>
                  <div className="admin-profile-role">{selectedEmp.designation} • {selectedEmp.department}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmp(null)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', cursor: 'pointer' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="admin-detail-grid">
              <div className="admin-detail-item">
                <div className="admin-detail-label">Email</div>
                <div className="admin-detail-value">{selectedEmp.email}</div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">Phone</div>
                <div className="admin-detail-value">{selectedEmp.phone || '—'}</div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">Employment</div>
                <div className="admin-detail-value">{selectedEmp.employmentType} ({selectedEmp.workLocation || 'Office'})</div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">Status & Joined</div>
                <div className="admin-detail-value">
                  <span className={`admin-status-pill ${selectedEmp.isActive ? 'active' : 'inactive'}`}>
                    {selectedEmp.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                    {selectedEmp.joiningDate ? new Date(selectedEmp.joiningDate).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            </div>

            {selectedEmp.bio && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div className="admin-detail-label" style={{ marginBottom: '0.35rem' }}>Biography</div>
                <div style={{ background: '#070d19', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: '0.875rem', lineHeight: '1.5' }}>
                  {selectedEmp.bio}
                </div>
              </div>
            )}

            {selectedEmp.skills && (Array.isArray(selectedEmp.skills) ? selectedEmp.skills.length > 0 : selectedEmp.skills.trim()) && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div className="admin-detail-label" style={{ marginBottom: '0.35rem' }}>Core Competencies</div>
                <div className="admin-tags-wrap">
                  {(Array.isArray(selectedEmp.skills) ? selectedEmp.skills : selectedEmp.skills.split(',')).map((s, idx) => (
                    <span key={idx} className="admin-tag">{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {(selectedEmp.socialLinks?.linkedin || selectedEmp.socialLinks?.github) && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
                {selectedEmp.socialLinks?.linkedin && (
                  <a href={selectedEmp.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#2aa8e0', fontSize: '0.85rem' }}>
                    LinkedIn Profile ↗
                  </a>
                )}
                {selectedEmp.socialLinks?.github && (
                  <a href={selectedEmp.socialLinks.github} target="_blank" rel="noopener noreferrer" style={{ color: '#2aa8e0', fontSize: '0.85rem' }}>
                    GitHub Profile ↗
                  </a>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => setSelectedEmp(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload HR Document Modal */}
      {showDocModal && (
        <div className="admin-modal-overlay" onClick={() => setShowDocModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Upload HR Document</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                  Upload verified employment contracts, identification, or appraisal records.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', cursor: 'pointer' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {docError && (
              <div className="admin-login-error-alert" style={{ marginBottom: '1rem' }} role="alert">
                {docError}
              </div>
            )}

            <form onSubmit={handleUploadDocSubmit}>
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="doc-emp">Associated Employee *</label>
                <select
                  id="doc-emp"
                  required
                  className="admin-form-input"
                  style={{ background: '#0a1425', color: '#fff' }}
                  value={docForm.employee}
                  onChange={(e) => setDocForm({ ...docForm, employee: e.target.value })}
                >
                  <option value="">Select Employee...</option>
                  {(tabData?.employees || []).map((e) => (
                    <option key={e._id} value={e._id}>
                      {`${e.firstName || ''} ${e.lastName || ''}`.trim() || e.name} ({e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="doc-type">Document Type *</label>
                  <select
                    id="doc-type"
                    required
                    className="admin-form-input"
                    style={{ background: '#0a1425', color: '#fff' }}
                    value={docForm.documentType}
                    onChange={(e) => setDocForm({ ...docForm, documentType: e.target.value })}
                  >
                    {[
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
                    ].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="doc-title">Document Title *</label>
                  <input
                    id="doc-title"
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. FY2026 Offer Letter"
                    value={docForm.title}
                    onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="doc-num">Document Number (Optional)</label>
                  <input
                    id="doc-num"
                    type="text"
                    className="admin-form-input"
                    placeholder="e.g. DOC-98745"
                    value={docForm.documentNumber}
                    onChange={(e) => setDocForm({ ...docForm, documentNumber: e.target.value })}
                  />
                </div>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="doc-exp">Expiry Date (Optional)</label>
                  <input
                    id="doc-exp"
                    type="date"
                    className="admin-form-input"
                    value={docForm.expiryDate}
                    onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label" htmlFor="doc-desc">Description</label>
                <input
                  id="doc-desc"
                  type="text"
                  className="admin-form-input"
                  placeholder="Additional context or notes..."
                  value={docForm.description}
                  onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                />
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="admin-form-label" htmlFor="doc-file">Document File * (PDF, JPG, PNG, DOC, DOCX up to 10MB)</label>
                <input
                  id="doc-file"
                  type="file"
                  required
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                  className="admin-form-input"
                  style={{ padding: '0.4rem' }}
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setShowDocModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={docSubmitting}
                >
                  {docSubmitting ? 'Uploading Securely...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit CMS Content Block Modal */}
      {showContentModal && (
        <div className="admin-modal-overlay" onClick={() => setShowContentModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>
                  {editingContent ? 'Edit Content Block' : 'Create Content Block'}
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                  Manage dynamic marketing content rendered on the public website.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowContentModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', cursor: 'pointer' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {contentError && (
              <div className="admin-login-error-alert" style={{ marginBottom: '1rem' }} role="alert">
                {contentError}
              </div>
            )}

            <form onSubmit={handleContentSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="cnt-key">Content Key * (Unique)</label>
                  <input
                    id="cnt-key"
                    type="text"
                    required
                    disabled={Boolean(editingContent)}
                    className="admin-form-input"
                    placeholder="e.g. hero_heading"
                    value={contentForm.key}
                    onChange={(e) => setContentForm({ ...contentForm, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                  />
                </div>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="cnt-sec">Section *</label>
                  <input
                    id="cnt-sec"
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. hero, about, services"
                    value={contentForm.section}
                    onChange={(e) => setContentForm({ ...contentForm, section: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="cnt-title">Title *</label>
                  <input
                    id="cnt-title"
                    type="text"
                    required
                    className="admin-form-input"
                    placeholder="e.g. Enterprise Engineering Header"
                    value={contentForm.title}
                    onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
                  />
                </div>
                <div className="admin-form-group" style={{ margin: 0 }}>
                  <label className="admin-form-label" htmlFor="cnt-status">Publication Status</label>
                  <select
                    id="cnt-status"
                    className="admin-form-input"
                    style={{ background: '#0a1425', color: '#fff' }}
                    value={contentForm.status}
                    onChange={(e) => setContentForm({ ...contentForm, status: e.target.value })}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="admin-form-label" htmlFor="cnt-body">Content Body * (Plain text or JSON object)</label>
                <textarea
                  id="cnt-body"
                  rows={6}
                  required
                  className="admin-form-input"
                  style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.85rem' }}
                  placeholder="Enter text copy, markdown, or valid JSON object..."
                  value={contentForm.content}
                  onChange={(e) => setContentForm({ ...contentForm, content: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setShowContentModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={contentSubmitting}
                >
                  {contentSubmitting ? 'Saving Block...' : editingContent ? 'Update Block' : 'Create Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Media Asset Modal */}
      {showMediaModal && (
        <div className="admin-modal-overlay" onClick={() => setShowMediaModal(false)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Upload Media Asset</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                  Upload images, documents, or branding materials to the official media library.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', cursor: 'pointer' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {mediaError && (
              <div className="admin-login-error-alert" style={{ marginBottom: '1rem' }} role="alert">
                {mediaError}
              </div>
            )}

            <form onSubmit={handleUploadMediaSubmit}>
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="med-cat">Category *</label>
                <select
                  id="med-cat"
                  className="admin-form-input"
                  style={{ background: '#0a1425', color: '#fff' }}
                  value={mediaCategory}
                  onChange={(e) => setMediaCategory(e.target.value)}
                >
                  <option value="image">Image</option>
                  <option value="document">Document</option>
                  <option value="video">Video</option>
                  <option value="other">Other Asset</option>
                </select>
              </div>

              <div className="admin-form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="admin-form-label" htmlFor="med-file">Choose File * (up to 10MB)</label>
                <input
                  id="med-file"
                  type="file"
                  required
                  className="admin-form-input"
                  style={{ padding: '0.4rem' }}
                  onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setShowMediaModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={mediaSubmitting}
                >
                  {mediaSubmitting ? 'Uploading Asset...' : 'Upload Media'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Audit Log Modal */}
      {selectedAudit && (
        <div className="admin-modal-overlay" onClick={() => setSelectedAudit(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Security Audit Log Entry</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                  Action: {selectedAudit.action} • {new Date(selectedAudit.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', cursor: 'pointer' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="admin-detail-grid">
              <div className="admin-detail-item">
                <div className="admin-detail-label">Action</div>
                <div className="admin-detail-value">
                  <span className={`admin-status-pill ${selectedAudit.action === 'DELETE' ? 'rejected' : selectedAudit.action === 'CREATE' ? 'published' : 'active'}`}>
                    {selectedAudit.action}
                  </span>
                </div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">Resource</div>
                <div className="admin-detail-value">{selectedAudit.resource || selectedAudit.entity || 'System'}</div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">Origin IP</div>
                <div className="admin-detail-value">{selectedAudit.ip || '—'}</div>
              </div>
              <div className="admin-detail-item">
                <div className="admin-detail-label">Actor ID</div>
                <div className="admin-detail-value" style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono, monospace)' }}>
                  {selectedAudit.admin || selectedAudit.user || selectedAudit.actor || 'System'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <div className="admin-detail-label" style={{ marginBottom: '0.5rem' }}>Full Structured Metadata</div>
              <pre className="admin-code-inspector">
                {JSON.stringify(selectedAudit.metadata || selectedAudit, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => setSelectedAudit(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Permissions Modal (Superadmin Only) */}
      {editingAdminPermissions && (
        <div className="admin-modal-overlay" onClick={() => setEditingAdminPermissions(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '92%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>Edit Admin Permissions</h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>
                  Manage module access for @{editingAdminPermissions.username} ({editingAdminPermissions.name}).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdminPermissions(null)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.5rem', cursor: 'pointer' }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAdminPermissions}>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  {[
                    { key: 'dashboard', label: '📊 Dashboard Overview' },
                    { key: 'inquiries', label: '💬 Inquiries' },
                    { key: 'careers', label: '💼 Careers & Jobs' },
                    { key: 'employees', label: '👥 Employees & HR Docs' },
                    { key: 'content', label: '📝 CMS Content' },
                    { key: 'media', label: '🖼️ Media Assets' },
                    { key: 'audit', label: '🛡️ Audit Trail' },
                    { key: 'settings', label: '⚙️ Settings' },
                  ].map((perm) => (
                    <label key={perm.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#e2e8f0', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={adminPermissionsList.includes(perm.key)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAdminPermissionsList((prev) =>
                            checked ? [...prev, perm.key] : prev.filter((p) => p !== perm.key)
                          );
                        }}
                      />
                      {perm.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setEditingAdminPermissions(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={adminPermsSubmitting}
                >
                  {adminPermsSubmitting ? 'Saving Permissions...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
