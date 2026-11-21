import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAdminAttendanceDashboard,
  getAdminAttendanceRecords,
  listAdminMeetings,
  createAdminMeeting,
  updateAdminMeeting,
  deleteAdminMeeting,
  triggerMeetingReconciliation,
  getAdminCorrectionRequests,
  resolveAdminCorrectionRequest,
  updateAdminAttendanceCorrection,
  markAdminAttendanceManual,
  exportAttendanceReportCsv,
  getEmployees,
} from '../../../api';
import {
  StatCard,
  Panel,
  DataTable,
  EmptyState,
  StatusBadge,
  FilterBar,
  Modal,
} from '../AdminUI';
import {
  CalendarIcon,
  VideoCameraIcon,
  ClockIcon,
  PlusIcon,
  RefreshIcon,
  DownloadIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  TrashIcon,
  UsersIcon,
  EyeIcon,
  XMarkIcon,
  ExclamationCircleIcon,
} from '../../icons';

const MEETING_TYPES = [
  'Daily Standup',
  'Weekly Sync',
  'Department Meeting',
  'Project Review',
  'One-on-One',
  'Town Hall',
  'Custom',
];

const STANDARD_DEPARTMENTS = [
  'Software Engineering',
  'Cloud Infrastructure',
  'AI & Machine Learning',
  'UI/UX & Product Design',
  'Operations & Quality',
  'Product',
  'Design',
  'Engineering',
  'Marketing',
  'Sales',
  'HR',
];

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST — UTC+5:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New York (EST/EDT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST — UTC+4)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT — UTC+8)' },
];

export default function AttendanceTab() {
  const [dashboard, setDashboard] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [records, setRecords] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [employeesList, setEmployeesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchMeetingQuery, setSearchMeetingQuery] = useState('');
  const [meetingStatusFilter, setMeetingStatusFilter] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchRecordQuery, setSearchRecordQuery] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState(null);

  // Scheduling Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetingType: 'Daily Standup',
    startTime: '',
    endTime: '',
    timeZone: 'Asia/Kolkata',
    departments: [],
    allDepartments: true,
    assignedEmployees: [],
    meetingUri: '',
    autoCreateSpace: false,
    minAttendancePercent: 70,
    gracePeriodMinutes: 5,
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Meeting Form State
  const [editData, setEditData] = useState({
    id: '',
    title: '',
    description: '',
    meetingType: 'Daily Standup',
    startTime: '',
    endTime: '',
    status: 'SCHEDULED',
    googleMeetingUri: '',
  });
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Manual correction modal state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('PRESENT');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  // Feedback notifications
  const [feedback, setFeedback] = useState(null);

  const showToast = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadAttendanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, meetRes, recRes, dispRes, empRes] = await Promise.all([
        getAdminAttendanceDashboard().catch(() => ({ data: null })),
        listAdminMeetings({ limit: 50 }).catch(() => ({ data: { meetings: [] } })),
        getAdminAttendanceRecords({
          meetingId: selectedMeetingId || undefined,
          status: statusFilter || undefined,
          limit: 50,
        }).catch(() => ({ data: { records: [] } })),
        getAdminCorrectionRequests({ status: 'PENDING' }).catch(() => ({ data: [] })),
        getEmployees({ limit: 100 }).catch(() => ({ data: { employees: [] } })),
      ]);

      if (dashRes?.data) setDashboard(dashRes.data);
      if (meetRes?.data?.meetings) setMeetings(meetRes.data.meetings);
      if (recRes?.data?.records) setRecords(recRes.data.records);
      if (dispRes?.data) setDisputes(dispRes.data);
      if (empRes?.data?.employees) setEmployeesList(empRes.data.employees);
    } finally {
      setLoading(false);
    }
  }, [selectedMeetingId, statusFilter]);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  // Handle Preset Time Fill
  const setTimePreset = (type) => {
    const now = new Date();
    let start = new Date(now);
    if (type === 'today-10am') {
      start.setHours(10, 0, 0, 0);
      if (start < now) start.setDate(start.getDate() + 1);
    } else if (type === 'tomorrow-10am') {
      start.setDate(start.getDate() + 1);
      start.setHours(10, 0, 0, 0);
    } else if (type === 'next-hour') {
      start.setHours(now.getHours() + 1, 0, 0, 0);
    }

    const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min duration

    const formatToLocalISO = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setFormData((prev) => ({
      ...prev,
      startTime: formatToLocalISO(start),
      endTime: formatToLocalISO(end),
    }));
  };

  // Create Meeting Submit Handler
  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedTitle = formData.title.trim();
    if (!trimmedTitle) {
      setFormError('Meeting title is required.');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      setFormError('Both start time and end time are required.');
      return;
    }

    const start = new Date(formData.startTime);
    const end = new Date(formData.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setFormError('Please enter valid dates and times.');
      return;
    }

    if (end <= start) {
      setFormError('Scheduled end time must be after scheduled start time.');
      return;
    }

    if (formData.meetingUri && !formData.meetingUri.includes('meet.google.com/')) {
      setFormError('Google Meet link must be in the format: https://meet.google.com/xxx-yyyy-zzz');
      return;
    }

    setSubmitting(true);
    try {
      const assignedDeps = formData.allDepartments ? [] : formData.departments;

      await createAdminMeeting({
        title: trimmedTitle,
        description: formData.description.trim(),
        meetingType: formData.meetingType,
        scheduledStartTime: start.toISOString(),
        scheduledEndTime: end.toISOString(),
        timeZone: formData.timeZone,
        assignedDepartments: assignedDeps,
        assignedEmployees: formData.assignedEmployees,
        googleMeetingUri: formData.meetingUri.trim() || undefined,
        createGoogleMeetSpace: formData.autoCreateSpace,
      });

      showToast('success', `Meeting "${trimmedTitle}" scheduled successfully!`);
      setIsCreateOpen(false);
      setFormData({
        title: '',
        description: '',
        meetingType: 'Daily Standup',
        startTime: '',
        endTime: '',
        timeZone: 'Asia/Kolkata',
        departments: [],
        allDepartments: true,
        assignedEmployees: [],
        meetingUri: '',
        autoCreateSpace: false,
        minAttendancePercent: 70,
        gracePeriodMinutes: 5,
      });
      loadAttendanceData();
    } catch (err) {
      setFormError(err.message || 'Failed to schedule meeting. Please verify input.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Meeting Modal
  const handleOpenEdit = (m) => {
    const formatToLocalISO = (isoStr) => {
      if (!isoStr) return '';
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setEditData({
      id: m._id,
      title: m.title || '',
      description: m.description || '',
      meetingType: m.meetingType || 'Daily Standup',
      startTime: formatToLocalISO(m.scheduledStartTime),
      endTime: formatToLocalISO(m.scheduledEndTime),
      status: m.status || 'SCHEDULED',
      googleMeetingUri: m.googleMeetingUri || '',
    });
    setEditError('');
    setIsEditOpen(true);
  };

  // Edit Meeting Submit Handler
  const handleUpdateMeeting = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editData.title.trim()) {
      setEditError('Meeting title cannot be empty.');
      return;
    }

    const start = new Date(editData.startTime);
    const end = new Date(editData.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setEditError('Please enter valid dates and times.');
      return;
    }

    if (end <= start) {
      setEditError('Scheduled end time must be after scheduled start time.');
      return;
    }

    setEditSubmitting(true);
    try {
      await updateAdminMeeting(editData.id, {
        title: editData.title.trim(),
        description: editData.description.trim(),
        meetingType: editData.meetingType,
        scheduledStartTime: start.toISOString(),
        scheduledEndTime: end.toISOString(),
        status: editData.status,
        googleMeetingUri: editData.googleMeetingUri.trim() || null,
      });

      showToast('success', 'Meeting updated successfully.');
      setIsEditOpen(false);
      loadAttendanceData();
    } catch (err) {
      setEditError(err.message || 'Failed to update meeting.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Trigger Google Meet Reconciliation
  const handleReconcile = async (meetingId) => {
    try {
      await triggerMeetingReconciliation(meetingId);
      showToast('success', 'Reconciliation completed. Attendance records updated from Google Meet API.');
      loadAttendanceData();
    } catch (err) {
      showToast('error', `Reconciliation error: ${err.message}`);
    }
  };

  // Cancel Meeting
  const handleCancelMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled meeting? Attendance records will be marked as cancelled.')) return;
    try {
      await deleteAdminMeeting(meetingId);
      showToast('info', 'Meeting cancelled successfully.');
      loadAttendanceData();
    } catch (err) {
      showToast('error', `Error cancelling meeting: ${err.message}`);
    }
  };

  // Copy Meet Link
  const handleCopyLink = (uri) => {
    if (!uri) return;
    navigator.clipboard.writeText(uri).then(() => {
      showToast('success', 'Google Meet link copied to clipboard!');
    }).catch(() => {
      showToast('info', `Link: ${uri}`);
    });
  };

  // Resolve Dispute
  const handleResolveDispute = async (disputeId, action) => {
    const notes = prompt(`Optional ${action.toLowerCase()} review notes:`) || '';
    try {
      await resolveAdminCorrectionRequest(disputeId, { action, reviewNotes: notes });
      showToast('success', `Dispute ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully.`);
      loadAttendanceData();
    } catch (err) {
      showToast('error', `Error resolving dispute: ${err.message}`);
    }
  };

  // Manual Override Submit
  const handleManualOverride = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setOverrideSubmitting(true);
    try {
      await updateAdminAttendanceCorrection(selectedRecord._id, {
        status: overrideStatus,
        notes: overrideNotes.trim() || 'Administrative manual correction',
      });
      showToast('success', 'Attendance record updated successfully.');
      setSelectedRecord(null);
      loadAttendanceData();
    } catch (err) {
      showToast('error', `Error updating record: ${err.message}`);
    } finally {
      setOverrideSubmitting(false);
    }
  };

  // Quick 1-click toggle attendance between PRESENT and ABSENT
  const handleQuickToggleAttendance = async (record, newStatus) => {
    try {
      const meetingId = record.meetingId?._id || record.meetingId;
      const employeeId = record.employeeId?._id || record.employeeId;
      if (!meetingId || !employeeId) {
        await updateAdminAttendanceCorrection(record._id, {
          status: newStatus,
          notes: `Quick 1-click update to ${newStatus} by Admin`,
        });
      } else {
        await markAdminAttendanceManual(meetingId, {
          employeeId,
          status: newStatus,
          notes: `Quick 1-click update to ${newStatus} by Admin`,
        });
      }
      showToast('success', `Marked ${record.employeeId?.firstName || 'staff'} as ${newStatus}.`);
      loadAttendanceData();
    } catch (err) {
      showToast('error', `Failed to update attendance: ${err.message}`);
    }
  };

  // Safe Date Formatter
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filtered Meetings
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      const matchesSearch = searchMeetingQuery
        ? m.title?.toLowerCase().includes(searchMeetingQuery.toLowerCase()) ||
          m.meetingType?.toLowerCase().includes(searchMeetingQuery.toLowerCase())
        : true;
      const matchesStatus = meetingStatusFilter ? m.status === meetingStatusFilter : true;
      return matchesSearch && matchesStatus;
    });
  }, [meetings, searchMeetingQuery, meetingStatusFilter]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const empName = `${r.employeeId?.firstName || ''} ${r.employeeId?.lastName || ''}`.toLowerCase();
      const empId = (r.employeeId?.employeeId || '').toLowerCase();
      const matchesSearch = searchRecordQuery
        ? empName.includes(searchRecordQuery.toLowerCase()) || empId.includes(searchRecordQuery.toLowerCase())
        : true;
      return matchesSearch;
    });
  }, [records, searchRecordQuery]);

  // Status mapping for meeting badge
  const getMeetingStatusTone = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'green';
      case 'IN_PROGRESS':
        return 'amber';
      case 'SCHEDULED':
        return 'blue';
      case 'CANCELLED':
      default:
        return 'slate';
    }
  };

  // Status mapping for attendance record badge
  const getAttendanceStatusTone = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'green';
      case 'LATE':
        return 'amber';
      case 'SHORT_ATTENDANCE':
        return 'amber';
      case 'ABSENT':
        return 'red';
      case 'PENDING_VERIFICATION':
      default:
        return 'blue';
    }
  };

  return (
    <div className="admin-tab-container">
      {/* Toast Alert */}
      {feedback && (
        <div
          className={`admin-alert ${
            feedback.type === 'success'
              ? 'admin-alert--success'
              : feedback.type === 'error'
              ? 'admin-alert--error'
              : 'admin-alert--info'
          }`}
          style={{ marginBottom: '1.25rem' }}
          role="status"
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            className="admin-modal-close"
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer' }}
            onClick={() => setFeedback(null)}
            aria-label="Close message"
          >
            <XMarkIcon size={14} />
          </button>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Google Meet Attendance Management</h1>
          <p className="admin-page-subtitle">
            Authoritative conference participant tracking, standup schedules, and attendance reconciliation.
          </p>
        </div>

        <div className="admin-page-header-actions admin-page-actions">
          <button
            type="button"
            onClick={() => exportAttendanceReportCsv({ meetingId: selectedMeetingId || undefined })}
            className="admin-btn admin-btn--secondary"
            title="Download CSV attendance records"
          >
            <DownloadIcon size={16} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={loadAttendanceData}
            className="admin-btn admin-btn--secondary"
            title="Reload attendance data"
          >
            <RefreshIcon size={16} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="admin-btn admin-btn--primary"
            id="admin-btn-schedule-meeting"
          >
            <span> Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* 2. Top Analytics Metric Cards */}
      <div className="admin-stats-grid" style={{ marginBottom: '2rem' }}>
        <StatCard
          label="Avg Attendance Score"
          value={`${dashboard?.averageAttendancePercentage ?? 0}%`}
          subtext="Across active employee cohorts"
          icon={CheckCircleIcon}
        />
        <StatCard
          label="Present Today"
          value={dashboard?.presentToday ?? 0}
          subtext="Verified participants"
          icon={UsersIcon}
          tone="default"
        />
        <StatCard
          label="Late Today"
          value={dashboard?.lateToday ?? 0}
          subtext="Exceeded grace window"
          icon={ClockIcon}
          tone={dashboard?.lateToday > 0 ? 'attention' : 'default'}
        />
        <StatCard
          label="Short Attendance"
          value={dashboard?.shortToday ?? 0}
          subtext="Under 70% duration"
          icon={ExclamationCircleIcon}
          tone={dashboard?.shortToday > 0 ? 'attention' : 'default'}
        />
        <StatCard
          label="Absent Today"
          value={dashboard?.absentToday ?? 0}
          subtext="Zero connection records"
          icon={XMarkIcon}
          tone={dashboard?.absentToday > 0 ? 'attention' : 'default'}
        />
        <StatCard
          label="Pending Verification"
          value={dashboard?.pendingVerification ?? 0}
          subtext="Awaiting sync or event"
          icon={VideoCameraIcon}
        />
      </div>

      {/* 3. Pending Disputes Drawer (if any) */}
      {disputes.length > 0 && (
        <Panel
          title={`⚠️ Pending Attendance Disputes (${disputes.length})`}
          description="Employee correction requests requiring administrative verification."
          className="admin-panel--disputes"
        >
          <div style={{ display: 'grid', gap: '0.85rem' }}>
            {disputes.map((d) => (
              <div
                key={d._id}
                style={{
                  background: 'var(--clr-surface-hover, #F8FAFC)',
                  border: '1px solid var(--clr-border, #E2E8F0)',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--clr-navy, #0B1F3A)', fontSize: '0.95rem' }}>
                    {d.employeeId?.firstName} {d.employeeId?.lastName}{' '}
                    <span style={{ fontWeight: 400, color: 'var(--clr-text-muted, #475569)', fontSize: '0.85rem' }}>
                      ({d.employeeId?.department || 'General'} • {d.employeeId?.employeeId})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--clr-text-secondary, #334155)', marginTop: '0.25rem' }}>
                    Meeting: <strong>{d.meetingId?.title || 'Daily Standup'}</strong> — Reason: <em>"{d.reason}"</em>
                  </div>
                  {d.alternativeEmailUsed && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted, #475569)', marginTop: '0.15rem' }}>
                      Alternative Google Email Reported: <code>{d.alternativeEmailUsed}</code>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleResolveDispute(d._id, 'APPROVE')}
                    className="admin-btn admin-btn--sm"
                    style={{ background: '#10B981', color: '#ffffff', borderColor: '#059669' }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResolveDispute(d._id, 'REJECT')}
                    className="admin-btn admin-btn--secondary admin-btn--sm"
                    style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 4. Scheduled & Recent Meetings Section */}
      <Panel
        title="Scheduled & Recent Meetings"
        description="Upcoming standups, syncs, Google Meet space integration, and conference statuses."
        actions={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="admin-btn admin-btn--primary"
            id="panel-btn-schedule-meeting"
          >
            <span>Schedule Meeting</span>
          </button>
        }
        className="admin-panel--meetings"
      >
        <FilterBar
          search={searchMeetingQuery}
          onSearchChange={setSearchMeetingQuery}
          placeholder="Search meetings by title or type..."
          filters={[
            {
              id: 'meetingStatusFilter',
              label: 'Meeting Status',
              value: meetingStatusFilter,
              onChange: setMeetingStatusFilter,
              options: [
                { value: '', label: 'All Meeting Statuses' },
                { value: 'SCHEDULED', label: 'Scheduled' },
                { value: 'IN_PROGRESS', label: 'In Progress' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ],
            },
          ]}
          onClear={() => {
            setSearchMeetingQuery('');
            setMeetingStatusFilter('');
          }}
        />

        <div style={{ marginTop: '1rem' }}>
          <DataTable
            caption="Scheduled and Recent Google Meet Sessions"
            columns={[
              { label: 'Title & Agenda', key: 'title' },
              { label: 'Type', key: 'type' },
              { label: 'Scheduled Time (IST)', key: 'time' },
              { label: 'Scope', key: 'scope' },
              { label: 'Status', key: 'status' },
              { label: 'Google Meet Connection', key: 'meet' },
              { label: 'Actions', key: 'actions' },
            ]}
            data={filteredMeetings}
            isLoading={loading}
            emptyMessage={
              <EmptyState
                icon={CalendarIcon}
                title="No meetings scheduled yet"
                description="Schedule a daily standup, sync, or department meeting to begin tracking verified Google Meet attendance."
                action={
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="admin-btn admin-btn--primary"
                    id="empty-btn-schedule-first"
                  >
                    <PlusIcon size={16} />
                    <span>Schedule Your First Meeting</span>
                  </button>
                }
              />
            }
            renderRow={(m) => (
              <tr key={m._id} className="admin-table-row">
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--clr-navy, #0B1F3A)' }}>{m.title}</div>
                  {m.description && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--clr-text-muted, #475569)',
                        maxWidth: '280px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.description}
                    </div>
                  )}
                </td>
                <td>
                  <span className="admin-badge admin-badge--slate" style={{ fontSize: '0.75rem' }}>
                    {m.meetingType || 'Daily Standup'}
                  </span>
                </td>
                <td style={{ fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 500 }}>{formatDateTime(m.scheduledStartTime)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted, #475569)' }}>
                    to {new Date(m.scheduledEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: '0.85rem' }}>
                    {m.assignedDepartments?.length > 0
                      ? m.assignedDepartments.join(', ')
                      : 'All Company'}
                  </span>
                </td>
                <td>
                  <StatusBadge
                    label={m.status}
                    tone={getMeetingStatusTone(m.status)}
                    size="sm"
                  />
                </td>
                <td>
                  {m.googleMeetingUri ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <a
                        href={m.googleMeetingUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-table-link"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem' }}
                      >
                        <VideoCameraIcon size={14} />
                        <span>Open Meet</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(m.googleMeetingUri)}
                        className="admin-btn admin-btn--quiet admin-btn--sm"
                        title="Copy Meet link"
                        style={{ padding: '0.15rem 0.35rem' }}
                      >
                        Copy
                      </button>
                    </div>
                  ) : m.googleMeetingSpaceName ? (
                    <span className="admin-badge admin-badge--blue" style={{ fontSize: '0.75rem' }}>
                      Space Created
                    </span>
                  ) : (
                    <span style={{ color: 'var(--clr-text-subtle, #94A3B8)', fontSize: '0.85rem' }}>
                      Internal / Offline
                    </span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleReconcile(m._id)}
                      className="admin-btn admin-btn--secondary admin-btn--sm"
                      title="Reconcile with Google Meet API"
                    >
                      Reconcile
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(m)}
                      className="admin-btn admin-btn--quiet admin-btn--sm"
                      title="Edit meeting details"
                    >
                      <PencilSquareIcon size={14} />
                    </button>

                    {m.status !== 'CANCELLED' && m.status !== 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => handleCancelMeeting(m._id)}
                        className="admin-btn admin-btn--quiet admin-btn--sm"
                        style={{ color: '#EF4444' }}
                        title="Cancel meeting"
                      >
                        <TrashIcon size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          />
        </div>
      </Panel>

      {/* 5. Participant Attendance Records Section */}
      <Panel
        title="Participant Attendance Records"
        description="Verified Google Meet participant session durations, timestamps, and automated reconciliation logs."
        className="admin-panel--records"
      >
        <FilterBar
          search={searchRecordQuery}
          onSearchChange={setSearchRecordQuery}
          placeholder="Search by employee name or ID..."
          filters={[
            {
              id: 'selectedMeetingFilter',
              label: 'Filter by Meeting',
              value: selectedMeetingId,
              onChange: setSelectedMeetingId,
              options: [
                { value: '', label: 'All Scheduled Meetings' },
                ...meetings.map((m) => ({
                  value: m._id,
                  label: `${m.title} (${new Date(m.scheduledStartTime).toLocaleDateString([], { month: 'short', day: 'numeric' })})`,
                })),
              ],
            },
            {
              id: 'statusFilterSelect',
              label: 'Attendance Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: '', label: 'All Attendance Statuses' },
                { value: 'PRESENT', label: 'Present' },
                { value: 'LATE', label: 'Late Arrival' },
                { value: 'SHORT_ATTENDANCE', label: 'Short Duration' },
                { value: 'ABSENT', label: 'Absent' },
                { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
                { value: 'EXEMPTED', label: 'Exempted' },
              ],
            },
          ]}
          onClear={() => {
            setSearchRecordQuery('');
            setSelectedMeetingId('');
            setStatusFilter('');
          }}
        />

        <div style={{ marginTop: '1rem' }}>
          <DataTable
            caption="Employee Participant Attendance History"
            columns={[
              { label: 'Employee', key: 'employee' },
              { label: 'Meeting', key: 'meeting' },
              { label: 'Connected Duration', key: 'duration' },
              { label: 'Late Arrival', key: 'late' },
              { label: 'Status', key: 'status' },
              { label: 'Verification Source', key: 'verification' },
              { label: 'Actions', key: 'actions' },
            ]}
            data={filteredRecords}
            isLoading={loading}
            emptyMessage={
              <EmptyState
                icon={UsersIcon}
                title="No attendance records found"
                description={
                  selectedMeetingId || statusFilter || searchRecordQuery
                    ? 'No records match the active filters. Try resetting the filters above.'
                    : 'Attendance records are generated automatically during or after Google Meet conferences.'
                }
              />
            }
            renderRow={(r) => (
              <tr key={r._id} className="admin-table-row">
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--clr-navy, #0B1F3A)' }}>
                    {r.employeeId ? `${r.employeeId.firstName} ${r.employeeId.lastName}` : 'Unknown Staff'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted, #475569)' }}>
                    <code>{r.employeeId?.employeeId || 'STAFF'}</code> • {r.employeeId?.department || 'General'}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 500, color: 'var(--clr-text, #172B4D)' }}>
                    {r.meetingId?.title || 'Daily Standup'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted, #475569)' }}>
                    {formatDateTime(r.meetingId?.scheduledStartTime)}
                  </div>
                </td>
                <td>
                  <strong>{r.totalConnectedDurationMinutes || 0}</strong> mins
                </td>
                <td>
                  {r.lateArrivalMinutes > 0 ? (
                    <span style={{ color: '#F59E0B', fontWeight: 500 }}>{r.lateArrivalMinutes} mins</span>
                  ) : (
                    <span style={{ color: 'var(--clr-text-subtle, #94A3B8)' }}>--</span>
                  )}
                </td>
                <td>
                  <StatusBadge
                    label={r.status}
                    tone={getAttendanceStatusTone(r.status)}
                    size="sm"
                  />
                </td>
                <td style={{ fontSize: '0.8rem' }}>
                  <span style={{ color: r.isProvisional ? '#818CF8' : '#059669' }}>
                    {r.isProvisional ? 'Provisional Sync' : r.verifiedVia || 'Finalized API'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {r.status === 'ABSENT' && (
                      <button
                        type="button"
                        onClick={() => handleQuickToggleAttendance(r, 'PRESENT')}
                        className="admin-btn admin-btn--sm"
                        style={{
                          background: '#059669',
                          color: '#ffffff',
                          borderColor: '#059669',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                        title="Quick 1-Click: Mark this employee as Present"
                      >
                        ✓ Mark Present
                      </button>
                    )}
                    {r.status === 'PRESENT' && (
                      <button
                        type="button"
                        onClick={() => handleQuickToggleAttendance(r, 'ABSENT')}
                        className="admin-btn admin-btn--sm"
                        style={{
                          background: '#FEE2E2',
                          color: '#DC2626',
                          borderColor: '#FCA5A5',
                          padding: '0.25rem 0.65rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                        title="Quick 1-Click: Mark this employee as Absent"
                      >
                        ✕ Mark Absent
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecord(r);
                        setOverrideStatus(r.status);
                        setOverrideNotes(r.notes || '');
                      }}
                      className="admin-btn admin-btn--secondary admin-btn--sm"
                      style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      Override
                    </button>
                  </div>
                </td>
              </tr>
            )}
          />
        </div>
      </Panel>

      {/* 6. Schedule Meeting Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          if (!submitting) {
            setIsCreateOpen(false);
            setFormError('');
          }
        }}
        title="Schedule Google Meet Daily Meeting"
        subtitle="Configure standup agenda, target department scope, and verified Google Meet parameters."
        maxWidth="620px"
      >
        <form onSubmit={handleCreateMeeting} className="admin-modal-form">
          <div className="admin-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {formError && (
              <div className="admin-alert admin-alert--error" style={{ marginBottom: '1rem' }} role="alert">
                <span>{formError}</span>
              </div>
            )}

            {/* Quick Time Presets */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="admin-form-label" style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted, #475569)' }}>
                Quick Time Presets:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setTimePreset('today-10am')}
                  className="admin-btn admin-btn--quiet admin-btn--sm"
                >
                  Today 10:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => setTimePreset('tomorrow-10am')}
                  className="admin-btn admin-btn--quiet admin-btn--sm"
                >
                  Tomorrow 10:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => setTimePreset('next-hour')}
                  className="admin-btn admin-btn--quiet admin-btn--sm"
                >
                  Next Hour (30m)
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="meeting-title">
                Meeting Title *
              </label>
              <input
                id="meeting-title"
                type="text"
                required
                className="admin-form-input"
                placeholder="e.g. Engineering Daily Standup"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Agenda / Description */}
            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="meeting-desc">
                Agenda & Description (Optional)
              </label>
              <textarea
                id="meeting-desc"
                rows="2"
                className="admin-form-input"
                placeholder="Key sync topics, blockers, and deliverables to review..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Meeting Type & Timezone */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="meeting-type">
                  Meeting Type
                </label>
                <select
                  id="meeting-type"
                  className="admin-form-select"
                  value={formData.meetingType}
                  onChange={(e) => setFormData({ ...formData, meetingType: e.target.value })}
                >
                  {MEETING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="meeting-tz">
                  Timezone
                </label>
                <select
                  id="meeting-tz"
                  className="admin-form-select"
                  value={formData.timeZone}
                  onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Start and End Times */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="meeting-start">
                  Start Date & Time *
                </label>
                <input
                  id="meeting-start"
                  type="datetime-local"
                  required
                  className="admin-form-input"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="meeting-end">
                  End Date & Time *
                </label>
                <input
                  id="meeting-end"
                  type="datetime-local"
                  required
                  className="admin-form-input"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                />
              </div>
            </div>

            {/* Target Scope / Departments */}
            <div className="admin-form-group">
              <label className="admin-form-label">
                Department Assignment
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="all-departments-cb"
                  checked={formData.allDepartments}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allDepartments: e.target.checked,
                      departments: e.target.checked ? [] : formData.departments,
                    })
                  }
                />
                <label htmlFor="all-departments-cb" style={{ fontSize: '0.85rem', color: 'var(--clr-text, #172B4D)' }}>
                  All Company (All active employees eligible for attendance)
                </label>
              </div>

              {!formData.allDepartments && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {STANDARD_DEPARTMENTS.map((dept) => {
                    const isSelected = formData.departments.includes(dept);
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? formData.departments.filter((d) => d !== dept)
                            : [...formData.departments, dept];
                          setFormData({ ...formData, departments: next });
                        }}
                        className={`admin-badge ${
                          isSelected ? 'admin-badge--blue' : 'admin-badge--slate'
                        }`}
                        style={{ cursor: 'pointer', padding: '0.35rem 0.65rem' }}
                      >
                        {isSelected ? `✓ ${dept}` : `+ ${dept}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Google Meet Connection Mode */}
            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="meeting-uri">
                Google Meet Link (Optional if auto-creating)
              </label>
              <input
                id="meeting-uri"
                type="url"
                className="admin-form-input"
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                value={formData.meetingUri}
                onChange={(e) => setFormData({ ...formData, meetingUri: e.target.value })}
              />
              <span className="admin-form-help">
                Paste an existing company Google Meet link, or enable automated space creation below.
              </span>
            </div>

            {/* Auto Create Space Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'var(--clr-surface-hover, #F8FAFC)',
                border: '1px solid var(--clr-border, #E2E8F0)',
                marginBottom: '1rem',
              }}
            >
              <input
                type="checkbox"
                id="auto-create-space"
                style={{ marginTop: '0.2rem' }}
                checked={formData.autoCreateSpace}
                onChange={(e) => setFormData({ ...formData, autoCreateSpace: e.target.checked })}
              />
              <div>
                <label
                  htmlFor="auto-create-space"
                  style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--clr-navy, #0B1F3A)', cursor: 'pointer' }}
                >
                  Auto-create Google Meet space via Google Meet REST API v2
                </label>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--clr-text-muted, #475569)' }}>
                  Generates an authorized meeting code automatically using Ashivam Workspace credentials.
                </p>
              </div>
            </div>

            {/* Policies: Grace period & minimum attendance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="grace-period">
                  Grace Period (Minutes)
                </label>
                <input
                  id="grace-period"
                  type="number"
                  min="0"
                  max="30"
                  className="admin-form-input"
                  value={formData.gracePeriodMinutes}
                  onChange={(e) => setFormData({ ...formData, gracePeriodMinutes: Number(e.target.value) })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="min-attendance">
                  Min. Duration Required (%)
                </label>
                <input
                  id="min-attendance"
                  type="number"
                  min="10"
                  max="100"
                  className="admin-form-input"
                  value={formData.minAttendancePercent}
                  onChange={(e) => setFormData({ ...formData, minAttendancePercent: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="admin-modal-footer">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="admin-btn admin-btn--secondary"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={submitting}
              id="submit-schedule-meeting"
            >
              {submitting ? 'Scheduling Meeting...' : 'Schedule Meeting'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. Edit Meeting Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          if (!editSubmitting) {
            setIsEditOpen(false);
            setEditError('');
          }
        }}
        title="Edit Scheduled Meeting"
        subtitle="Update timing, title, or Google Meet URL for this session."
        maxWidth="540px"
      >
        <form onSubmit={handleUpdateMeeting} className="admin-modal-form">
          <div className="admin-modal-body">
            {editError && (
              <div className="admin-alert admin-alert--error" style={{ marginBottom: '1rem' }} role="alert">
                <span>{editError}</span>
              </div>
            )}

            <div className="admin-form-group">
              <label className="admin-form-label">Meeting Title *</label>
              <input
                type="text"
                required
                className="admin-form-input"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Agenda & Description</label>
              <textarea
                rows="2"
                className="admin-form-input"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="admin-form-group">
                <label className="admin-form-label">Meeting Type</label>
                <select
                  className="admin-form-select"
                  value={editData.meetingType}
                  onChange={(e) => setEditData({ ...editData, meetingType: e.target.value })}
                >
                  {MEETING_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Status</label>
                <select
                  className="admin-form-select"
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                >
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="admin-form-group">
                <label className="admin-form-label">Start Time *</label>
                <input
                  type="datetime-local"
                  required
                  className="admin-form-input"
                  value={editData.startTime}
                  onChange={(e) => setEditData({ ...editData, startTime: e.target.value })}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">End Time *</label>
                <input
                  type="datetime-local"
                  required
                  className="admin-form-input"
                  value={editData.endTime}
                  onChange={(e) => setEditData({ ...editData, endTime: e.target.value })}
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Google Meet Link</label>
              <input
                type="url"
                className="admin-form-input"
                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                value={editData.googleMeetingUri}
                onChange={(e) => setEditData({ ...editData, googleMeetingUri: e.target.value })}
              />
            </div>
          </div>

          <div className="admin-modal-footer">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="admin-btn admin-btn--secondary"
              disabled={editSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={editSubmitting}
            >
              {editSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 8. Manual Override Modal */}
      {selectedRecord && (
        <Modal
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          title="Manual Attendance Correction"
          subtitle={`Audited override for ${selectedRecord.employeeId?.firstName} ${selectedRecord.employeeId?.lastName} (${selectedRecord.employeeId?.employeeId})`}
          maxWidth="480px"
        >
          <form onSubmit={handleManualOverride} className="admin-modal-form">
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label className="admin-form-label">Updated Status</label>
                <select
                  className="admin-form-select"
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                >
                  <option value="PRESENT">Present (Full Credit)</option>
                  <option value="LATE">Late Arrival</option>
                  <option value="SHORT_ATTENDANCE">Short Attendance</option>
                  <option value="ABSENT">Absent</option>
                  <option value="EXEMPTED">Exempted</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Audit Reason & Justification *</label>
                <textarea
                  className="admin-form-input"
                  rows="3"
                  required
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="e.g. Verified manual check-in via Slack voice room during Google outage"
                />
                <span className="admin-form-help">
                  This justification will be permanently stored in the compliance audit log.
                </span>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="admin-btn admin-btn--secondary"
                disabled={overrideSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="admin-btn admin-btn--primary"
                disabled={overrideSubmitting}
              >
                {overrideSubmitting ? 'Saving Override...' : 'Save Override'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
