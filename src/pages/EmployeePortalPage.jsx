import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import { useAuth } from '../context/useAuth';
import {
  getMyAttendance,
  getMyAttendanceSummary,
  getMyAttendanceCalendar,
  getUpcomingMeetings,
  submitAttendanceDispute,
  changeAdminPassword,
} from '../api';
import {
  CalendarIcon,
  VideoCameraIcon,
  ClockIcon,
  UsersIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  RefreshIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../components/icons';
import './EmployeePortalPage.css';

// Safe date formatting helpers that never throw RangeError
const formatSafeDate = (isoStr) => {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatSafeTime = (isoStr) => {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function EmployeePortalPage() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Navigation tab within the workspace
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'meetings' | 'attendance' | 'calendar' | 'profile'

  // Data states
  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [calendarItems, setCalendarItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Calendar month/year
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Attendance history status filter
  const [statusFilter, setStatusFilter] = useState('');

  // Dispute modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [alternativeEmail, setAlternativeEmail] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });

  // Change password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ type: '', text: '' });

  // Clear any scroll-reveal lock from public routes on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Employee Workspace & Attendance | Ashivam Technologies';
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('has-scroll-reveal');
    }
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/employee-login/employee', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Load all portal data safely
  const loadPortalData = useCallback(async () => {
    setLoadingData(true);
    setDataError(null);
    try {
      const [sumRes, upRes, histRes, calRes] = await Promise.allSettled([
        getMyAttendanceSummary(),
        getUpcomingMeetings(),
        getMyAttendance({ limit: 50, status: statusFilter || undefined }),
        getMyAttendanceCalendar({ month: selectedMonth, year: selectedYear }),
      ]);

      if (sumRes.status === 'fulfilled' && sumRes.value?.data) {
        setSummary(sumRes.value.data);
      }
      if (upRes.status === 'fulfilled') {
        const meetData = upRes.value?.data || upRes.value?.meetings || [];
        setUpcoming(Array.isArray(meetData) ? meetData : []);
      }
      if (histRes.status === 'fulfilled') {
        const recordsData = histRes.value?.data?.records || histRes.value?.records || [];
        setHistory(Array.isArray(recordsData) ? recordsData : []);
      }
      if (calRes.status === 'fulfilled') {
        const items = calRes.value?.data?.items || calRes.value?.items || [];
        setCalendarItems(Array.isArray(items) ? items : []);
      }
    } catch (err) {
      setDataError(err.message || 'Unable to sync some workspace records. Please retry.');
    } finally {
      setLoadingData(false);
    }
  }, [selectedMonth, selectedYear, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPortalData();
    }
  }, [isAuthenticated, loadPortalData]);

  // Open Dispute Modal
  const handleOpenDispute = (record) => {
    setActiveRecord(record);
    setDisputeReason('');
    setAlternativeEmail(user?.verifiedGoogleEmail || user?.email || '');
    setFeedbackMsg({ type: '', text: '' });
    setIsModalOpen(true);
  };

  // Submit Dispute
  const handleSubmitDispute = async (e) => {
    e.preventDefault();
    if (!activeRecord || !disputeReason.trim()) return;

    setSubmittingDispute(true);
    try {
      await submitAttendanceDispute({
        attendanceRecordId: activeRecord._id,
        reason: disputeReason.trim(),
        alternativeEmailUsed: alternativeEmail.trim(),
        requestedStatus: 'PRESENT',
      });
      setFeedbackMsg({
        type: 'success',
        text: 'Dispute submitted successfully. HR administration has been notified for verification.',
      });
      setTimeout(() => {
        setIsModalOpen(false);
        loadPortalData();
      }, 1800);
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to submit dispute. Please check connectivity and try again.',
      });
    } finally {
      setSubmittingDispute(false);
    }
  };

  // Change Password Submit Handler
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwdMsg({ type: '', text: '' });
    if (pwdNew !== pwdConfirm) {
      setPwdMsg({ type: 'error', text: 'New password and confirm password do not match.' });
      return;
    }
    if (pwdNew.length < 8) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (pwdCurrent === pwdNew) {
      setPwdMsg({ type: 'error', text: 'New password must be different from current password.' });
      return;
    }

    setPwdSubmitting(true);
    try {
      await changeAdminPassword({
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
      });
      setPwdMsg({ type: 'success', text: 'Workspace password updated successfully!' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPwdCurrent('');
        setPwdNew('');
        setPwdConfirm('');
        setPwdMsg({ type: '', text: '' });
      }, 1800);
    } catch (err) {
      setPwdMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setPwdSubmitting(false);
    }
  };

  // Calendar month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  // Status badge pill renderer with accessible WCAG AA contrast
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return <span className="emp-status-badge emp-status-badge--present">Present</span>;
      case 'LATE':
        return <span className="emp-status-badge emp-status-badge--late">Late Arrival</span>;
      case 'SHORT_ATTENDANCE':
        return <span className="emp-status-badge emp-status-badge--short">Short Duration</span>;
      case 'ABSENT':
        return <span className="emp-status-badge emp-status-badge--absent">Absent</span>;
      case 'EXEMPTED':
        return <span className="emp-status-badge emp-status-badge--exempted">Exempted</span>;
      case 'PENDING_VERIFICATION':
      default:
        return <span className="emp-status-badge emp-status-badge--pending">Pending Verification</span>;
    }
  };

  // Identify today's primary standup meeting
  const todayMeeting = useMemo(() => {
    if (!upcoming || upcoming.length === 0) return null;
    const todayStr = new Date().toDateString();
    return (
      upcoming.find((m) => {
        if (!m.scheduledStartTime) return false;
        return new Date(m.scheduledStartTime).toDateString() === todayStr;
      }) || upcoming[0]
    );
  }, [upcoming]);

  // Filtered history list
  const filteredHistory = useMemo(() => {
    if (!statusFilter) return history;
    return history.filter((r) => r.status === statusFilter);
  }, [history, statusFilter]);

  const employeeName =
    user?.name ||
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
    'Ashivam Team Member';
  const employeeId = user?.employeeId || 'ASH-EMP';
  const department = user?.department || 'Engineering';
  const designation = user?.designation || 'Staff Engineer';

  const userInitials = employeeName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'EM';

  return (
    <div className="emp-workspace-layout">
      {/* Top Application Header */}
      <header className="emp-header">
        <div className="emp-header__left">
          <Link to="/" className="emp-header__brand" aria-label="Ashivam Technologies Homepage">
            <Logo size={32} variant="symbol" showText={false} alt="Ashivam Technologies" />
            <div className="emp-brand-meta">
              <span className="emp-brand-name">Ashivam</span>
              <span className="emp-brand-sub">Employee Workspace</span>
            </div>
          </Link>
          <div className="emp-header__divider" aria-hidden="true" />
          <span className="emp-header__badge">Corporate Portal</span>
        </div>

        <div className="emp-header__right">
          <div className="emp-user-profile-badge">
            <div className="emp-user-avatar" aria-hidden="true">
              {userInitials}
            </div>
            <div className="emp-user-text">
              <span className="emp-user-name">{employeeName}</span>
              <span className="emp-user-role">
                <code>{employeeId}</code> • {designation}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/employee-login');
            }}
            className="emp-btn-signout"
            title="Sign out of employee session"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="emp-workspace-container">
        {/* Navigation Tabs */}
        <nav className="emp-nav-tabs" aria-label="Workspace Navigation">
          <button
            type="button"
            className={`emp-tab-btn ${activeTab === 'overview' ? 'emp-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <ClockIcon size={16} />
            <span>Workspace Overview</span>
          </button>

          <button
            type="button"
            className={`emp-tab-btn ${activeTab === 'meetings' ? 'emp-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('meetings')}
          >
            <VideoCameraIcon size={16} />
            <span>Scheduled Meetings ({upcoming.length})</span>
          </button>

          <button
            type="button"
            className={`emp-tab-btn ${activeTab === 'attendance' ? 'emp-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <CheckCircleIcon size={16} />
            <span>Attendance Records</span>
          </button>

          <button
            type="button"
            className={`emp-tab-btn ${activeTab === 'calendar' ? 'emp-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            <CalendarIcon size={16} />
            <span>Monthly Calendar</span>
          </button>

          <button
            type="button"
            className={`emp-tab-btn ${activeTab === 'profile' ? 'emp-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <UsersIcon size={16} />
            <span>Profile & Compliance</span>
          </button>
        </nav>

        {/* Global Error Notice if API Sync Failed */}
        {dataError && (
          <div className="emp-alert emp-alert--warning" role="alert">
            <span>{dataError}</span>
            <button type="button" onClick={loadPortalData} className="emp-btn-retry">
              <RefreshIcon size={14} />
              <span>Retry Sync</span>
            </button>
          </div>
        )}

        {/* ========================================================
            TAB 1: WORKSPACE OVERVIEW & STANDUP
            ======================================================== */}
        {activeTab === 'overview' && (
          <div className="emp-tab-pane">
            {/* Executive Welcome Banner */}
            <div className="emp-welcome-banner">
              <div>
                <span className="emp-welcome-badge">Active Session</span>
                <h1 className="emp-welcome-title">Welcome back, {user?.firstName || employeeName}</h1>
                <p className="emp-welcome-subtitle">
                  {designation} • {department} Division • Corporate ID: <code>{employeeId}</code>
                </p>
              </div>

              <div className="emp-system-indicator">
                <span className="emp-dot-indicator" aria-hidden="true" />
                <span>Attendance Engine Connected</span>
              </div>
            </div>

            {/* Today's Standup Meeting Card */}
            {todayMeeting ? (
              <div className="emp-card emp-card--featured">
                <div className="emp-card__header">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span className="emp-badge-type">{todayMeeting.meetingType || 'Daily Standup'}</span>
                      <span className="emp-badge-tz">Asia/Kolkata (IST)</span>
                    </div>
                    <h2 className="emp-card__title">{todayMeeting.title}</h2>
                    <div className="emp-card__time">
                      <ClockIcon size={16} />
                      <span>
                        {formatSafeDate(todayMeeting.scheduledStartTime)} • {formatSafeTime(todayMeeting.scheduledStartTime)} – {formatSafeTime(todayMeeting.scheduledEndTime)}
                      </span>
                    </div>
                  </div>

                  <div>
                    {getStatusBadge(todayMeeting.attendanceRecord?.status || 'PENDING_VERIFICATION')}
                  </div>
                </div>

                <div className="emp-card__body">
                  {todayMeeting.description && (
                    <p className="emp-card__agenda">
                      <strong>Agenda:</strong> {todayMeeting.description}
                    </p>
                  )}

                  {/* Verified Attendance Policy Callout */}
                  <div className="emp-policy-callout">
                    <div className="emp-policy-callout__icon">
                      <ShieldCheckIcon size={20} />
                    </div>
                    <div className="emp-policy-callout__text">
                      <strong>Authoritative Google Meet Verification Policy:</strong>
                      <p>
                        Attendance is determined exclusively through verified participant session records retrieved via
                        Google Meet REST API v2 and Pub/Sub telemetry. Clicking "Join Google Meet" alone does <em>not</em> mark
                        attendance credit. Please join from your authorized corporate email to ensure automatic reconciliation.
                      </p>
                    </div>
                  </div>

                  <div className="emp-card__actions">
                    {todayMeeting.googleMeetingUri ? (
                      <a
                        href={todayMeeting.googleMeetingUri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="emp-btn-join-meet"
                        id="emp-btn-join-primary"
                      >
                        <VideoCameraIcon size={18} />
                        <span>Join Google Meet</span>
                        <ArrowRightIcon size={14} />
                      </a>
                    ) : (
                      <span className="emp-pending-uri-text">
                        Google Meet space link will be attached prior to conference start.
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab('meetings')}
                      className="emp-btn-secondary"
                    >
                      View All Upcoming Meetings
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="emp-card emp-card--empty-today">
                <CalendarIcon size={32} className="emp-empty-icon" />
                <h3 className="emp-empty-title">No Standup Scheduled For Today</h3>
                <p className="emp-empty-desc">
                  You are all caught up! Check the Upcoming Meetings tab for future scheduled sessions.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('meetings')}
                  className="emp-btn-secondary"
                  style={{ marginTop: '0.75rem' }}
                >
                  View All Scheduled Meetings
                </button>
              </div>
            )}

            {/* Performance Metric Scorecards */}
            <div className="emp-section-heading">
              <h3 className="emp-section-title">Attendance Performance Scorecard</h3>
              <p className="emp-section-sub">Verified statistics for your profile</p>
            </div>

            <div className="emp-metrics-grid">
              <div className="emp-stat-card emp-stat-card--gold">
                <div className="emp-stat-card__val">
                  {summary ? `${summary.attendancePercentage}%` : '--'}
                </div>
                <div className="emp-stat-card__label">Attendance Score</div>
                <div className="emp-stat-card__sub">Evaluated participation</div>
              </div>

              <div className="emp-stat-card emp-stat-card--green">
                <div className="emp-stat-card__val">{summary?.present ?? 0}</div>
                <div className="emp-stat-card__label">Present (Full Credit)</div>
                <div className="emp-stat-card__sub">&ge; 70% connection duration</div>
              </div>

              <div className="emp-stat-card emp-stat-card--amber">
                <div className="emp-stat-card__val">{summary?.late ?? 0}</div>
                <div className="emp-stat-card__label">Late Arrivals</div>
                <div className="emp-stat-card__sub">Joined after grace period</div>
              </div>

              <div className="emp-stat-card emp-stat-card--orange">
                <div className="emp-stat-card__val">{summary?.shortAttendance ?? 0}</div>
                <div className="emp-stat-card__label">Short Attendance</div>
                <div className="emp-stat-card__sub">&lt; 70% connection time</div>
              </div>

              <div className="emp-stat-card emp-stat-card--red">
                <div className="emp-stat-card__val">{summary?.absent ?? 0}</div>
                <div className="emp-stat-card__label">Absent Days</div>
                <div className="emp-stat-card__sub">Zero connection recorded</div>
              </div>
            </div>

            {/* Recent History Preview */}
            <div className="emp-card" style={{ marginTop: '2rem' }}>
              <div className="emp-card__header-row">
                <div>
                  <h3 className="emp-card__title" style={{ fontSize: '1.1rem' }}>Recent Attendance Records</h3>
                  <p className="emp-card__subtitle">Latest automated Google Meet attendance reconciliations</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('attendance')}
                  className="emp-btn-link"
                >
                  View Full History &rarr;
                </button>
              </div>

              <div className="emp-table-wrapper">
                <table className="emp-table">
                  <thead>
                    <tr>
                      <th>Meeting Title</th>
                      <th>Date</th>
                      <th>Duration</th>
                      <th>Late</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 5).map((r) => (
                      <tr key={r._id}>
                        <td>
                          <strong>{r.meetingId?.title || 'Daily Standup'}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
                            {r.meetingId?.meetingType || 'Standup'}
                          </div>
                        </td>
                        <td>{formatSafeDate(r.meetingId?.scheduledStartTime || r.createdAt)}</td>
                        <td>{r.totalConnectedDurationMinutes || 0} mins</td>
                        <td>
                          {r.lateArrivalMinutes > 0 ? (
                            <span style={{ color: '#D97706', fontWeight: 600 }}>{r.lateArrivalMinutes} mins</span>
                          ) : (
                            '--'
                          )}
                        </td>
                        <td>{getStatusBadge(r.status)}</td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--clr-text-muted)' }}>
                          {loadingData ? 'Syncing attendance records...' : 'No recorded meeting attendances yet.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: SCHEDULED MEETINGS
            ======================================================== */}
        {activeTab === 'meetings' && (
          <div className="emp-tab-pane">
            <div className="emp-pane-header">
              <div>
                <h2 className="emp-pane-title">Upcoming Scheduled Meetings</h2>
                <p className="emp-pane-subtitle">
                  Company standups, department reviews, and syncs assigned to {department}
                </p>
              </div>

              <button
                type="button"
                onClick={loadPortalData}
                className="emp-btn-secondary"
                title="Refresh meetings"
              >
                <RefreshIcon size={14} />
                <span>Refresh Meetings</span>
              </button>
            </div>

            {upcoming.length > 0 ? (
              <div className="emp-meetings-grid">
                {upcoming.map((m) => (
                  <div key={m._id} className="emp-meeting-card">
                    <div className="emp-meeting-card__top">
                      <span className="emp-badge-type">{m.meetingType || 'Daily Standup'}</span>
                      <span className={`emp-status-badge ${m.status === 'IN_PROGRESS' ? 'emp-status-badge--late' : 'emp-status-badge--pending'}`}>
                        {m.status || 'SCHEDULED'}
                      </span>
                    </div>

                    <h3 className="emp-meeting-card__title">{m.title}</h3>

                    {m.description && (
                      <p className="emp-meeting-card__desc">{m.description}</p>
                    )}

                    <div className="emp-meeting-card__details">
                      <div className="emp-detail-row">
                        <CalendarIcon size={14} />
                        <span>{formatSafeDate(m.scheduledStartTime)}</span>
                      </div>
                      <div className="emp-detail-row">
                        <ClockIcon size={14} />
                        <span>
                          {formatSafeTime(m.scheduledStartTime)} – {formatSafeTime(m.scheduledEndTime)} ({m.timeZone || 'Asia/Kolkata'})
                        </span>
                      </div>
                      <div className="emp-detail-row">
                        <UsersIcon size={14} />
                        <span>
                          {m.assignedDepartments?.length > 0
                            ? m.assignedDepartments.join(', ')
                            : 'All Company'}
                        </span>
                      </div>
                    </div>

                    <div className="emp-meeting-card__footer">
                      {m.googleMeetingUri ? (
                        <a
                          href={m.googleMeetingUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="emp-btn-join-sm"
                        >
                          <VideoCameraIcon size={16} />
                          <span>Join Google Meet</span>
                        </a>
                      ) : (
                        <span className="emp-no-uri-label">Meet Link Pending</span>
                      )}

                      {m.attendanceRecord && (
                        <div style={{ marginLeft: 'auto' }}>
                          {getStatusBadge(m.attendanceRecord.status)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="emp-card emp-card--empty">
                <VideoCameraIcon size={36} className="emp-empty-icon" />
                <h3 className="emp-empty-title">No Upcoming Meetings Scheduled</h3>
                <p className="emp-empty-desc">
                  There are currently no upcoming meetings assigned to your department. Standups will appear here once scheduled.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: ATTENDANCE RECORDS & DISPUTE
            ======================================================== */}
        {activeTab === 'attendance' && (
          <div className="emp-tab-pane">
            <div className="emp-pane-header">
              <div>
                <h2 className="emp-pane-title">Personal Attendance Records</h2>
                <p className="emp-pane-subtitle">
                  Historical conference attendance records, connection durations, and dispute resolution
                </p>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="emp-filter-select"
                  aria-label="Filter records by status"
                >
                  <option value="">All Attendance Statuses</option>
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late Arrival</option>
                  <option value="SHORT_ATTENDANCE">Short Duration</option>
                  <option value="ABSENT">Absent</option>
                  <option value="PENDING_VERIFICATION">Pending Verification</option>
                  <option value="EXEMPTED">Exempted</option>
                </select>

                <button
                  type="button"
                  onClick={loadPortalData}
                  className="emp-btn-secondary"
                  title="Reload records"
                >
                  <RefreshIcon size={14} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            <div className="emp-card">
              <div className="emp-table-wrapper">
                <table className="emp-table">
                  <thead>
                    <tr>
                      <th>Meeting</th>
                      <th>Scheduled Date & Time</th>
                      <th>Connected Duration</th>
                      <th>Late Arrival</th>
                      <th>Status</th>
                      <th>Verification Source</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((record) => (
                      <tr key={record._id}>
                        <td>
                          <strong>{record.meetingId?.title || 'Daily Standup'}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
                            {record.meetingId?.meetingType || 'Standup'}
                          </div>
                        </td>
                        <td>
                          {formatSafeDate(record.meetingId?.scheduledStartTime || record.createdAt)}
                          <div style={{ fontSize: '0.75rem', color: 'var(--clr-text-muted)' }}>
                            {formatSafeTime(record.meetingId?.scheduledStartTime)}
                          </div>
                        </td>
                        <td>
                          <strong>{record.totalConnectedDurationMinutes || 0}</strong> mins
                        </td>
                        <td>
                          {record.lateArrivalMinutes > 0 ? (
                            <span style={{ color: '#D97706', fontWeight: 600 }}>{record.lateArrivalMinutes} mins</span>
                          ) : (
                            '--'
                          )}
                        </td>
                        <td>{getStatusBadge(record.status)}</td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: record.isProvisional ? '#6366F1' : '#059669' }}>
                            {record.isProvisional ? 'Provisional' : record.verifiedVia || 'Finalized API'}
                          </span>
                        </td>
                        <td>
                          {record.status !== 'PRESENT' && record.correctionStatus === 'NONE' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenDispute(record)}
                              className="emp-btn-dispute-action"
                            >
                              Dispute
                            </button>
                          ) : record.correctionStatus === 'DISPUTED' ? (
                            <span className="emp-status-badge emp-status-badge--pending">Under Review</span>
                          ) : record.correctionStatus === 'RESOLVED_APPROVED' ? (
                            <span className="emp-status-badge emp-status-badge--present">Corrected</span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>Verified</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {filteredHistory.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--clr-text-muted)' }}>
                          {loadingData ? 'Loading attendance logs...' : 'No attendance records match your filter criteria.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: MONTHLY ATTENDANCE CALENDAR
            ======================================================== */}
        {activeTab === 'calendar' && (
          <div className="emp-tab-pane">
            <div className="emp-pane-header">
              <div>
                <h2 className="emp-pane-title">Monthly Attendance Overview</h2>
                <p className="emp-pane-subtitle">
                  Visual calendar distribution of participation records and standups
                </p>
              </div>

              {/* Month Navigation */}
              <div className="emp-calendar-controls">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="emp-btn-secondary emp-btn-icon"
                  aria-label="Previous month"
                >
                  <ChevronLeftIcon size={16} />
                </button>

                <span className="emp-calendar-current">
                  {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="emp-btn-secondary emp-btn-icon"
                  aria-label="Next month"
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </div>

            <div className="emp-card">
              <div className="emp-calendar-grid">
                {calendarItems.length > 0 ? (
                  calendarItems.map((item) => (
                    <div key={item._id} className="emp-calendar-cell">
                      <div className="emp-calendar-cell__date">
                        {formatSafeDate(item.meetingId?.scheduledStartTime || item.createdAt)}
                      </div>
                      <div className="emp-calendar-cell__meeting">
                        {item.meetingId?.title || 'Daily Standup'}
                      </div>
                      <div style={{ marginTop: '0.4rem' }}>{getStatusBadge(item.status)}</div>
                      <div className="emp-calendar-cell__dur">
                        Duration: <strong>{item.totalConnectedDurationMinutes || 0}</strong> mins
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="emp-calendar-empty">
                    <CalendarIcon size={32} className="emp-empty-icon" />
                    <p>No recorded meetings for this calendar month.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: PROFILE & COMPLIANCE
            ======================================================== */}
        {activeTab === 'profile' && (
          <div className="emp-tab-pane">
            <div className="emp-pane-header">
              <div>
                <h2 className="emp-pane-title">Employee Dossier & Company Compliance</h2>
                <p className="emp-pane-subtitle">Official corporate profile data and attendance compliance rules</p>
              </div>
            </div>

            <div className="emp-profile-grid">
              {/* Profile Card */}
              <div className="emp-card">
                <h3 className="emp-card__title" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--clr-border)', paddingBottom: '0.75rem' }}>
                  Corporate Identity Dossier
                </h3>

                <div className="emp-profile-rows">
                  <div className="emp-profile-row">
                    <span className="emp-profile-label">Full Legal Name</span>
                    <span className="emp-profile-val">{employeeName}</span>
                  </div>

                  <div className="emp-profile-row">
                    <span className="emp-profile-label">Corporate Employee ID</span>
                    <span className="emp-profile-val"><code>{employeeId}</code></span>
                  </div>

                  <div className="emp-profile-row">
                    <span className="emp-profile-label">Department</span>
                    <span className="emp-profile-val">{department}</span>
                  </div>

                  <div className="emp-profile-row">
                    <span className="emp-profile-label">Designation</span>
                    <span className="emp-profile-val">{designation}</span>
                  </div>

                  <div className="emp-profile-row">
                    <span className="emp-profile-label">Official Work Email</span>
                    <span className="emp-profile-val"><code>{user?.email || 'corporate@ashivam.com'}</code></span>
                  </div>

                  <div className="emp-profile-row">
                    <span className="emp-profile-label">Employment Status</span>
                    <span className="emp-status-badge emp-status-badge--present">
                      {user?.employmentStatus || 'ACTIVE'}
                    </span>
                  </div>

                  <div className="emp-profile-row">
                    <span className="emp-profile-label">Account Security Status</span>
                    <span className="emp-status-badge emp-status-badge--pending">
                      {user?.accountStatus || 'ACTIVE'}
                    </span>
                  </div>

                  <div className="emp-profile-row">
                    <span className="emp-profile-label">Verified Google Meet Email</span>
                    <span className="emp-profile-val">
                      <code>{user?.verifiedGoogleEmail || user?.email || 'Same as official email'}</code>
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--clr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--clr-text-main)', display: 'block' }}>Account Security Credentials</strong>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--clr-text-muted)' }}>Update your workspace password and manage authentication</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPwdMsg({ type: '', text: '' });
                      setShowPasswordModal(true);
                    }}
                    className="emp-btn-secondary"
                  >
                    Change Workspace Password
                  </button>
                </div>
              </div>

              {/* Compliance & Guidelines Card */}
              <div className="emp-card">
                <h3 className="emp-card__title" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--clr-border)', paddingBottom: '0.75rem' }}>
                  Enterprise Meeting & Attendance Policy
                </h3>

                <div className="emp-guidelines-list">
                  <div className="emp-guideline-item">
                    <div className="emp-guideline-num">1</div>
                    <div>
                      <strong>Authoritative Telemetry:</strong>
                      <p>
                        Attendance is determined automatically via participant join/leave timestamps from the Google Meet REST API v2.
                        No frontend button clicks can fabricate attendance.
                      </p>
                    </div>
                  </div>

                  <div className="emp-guideline-item">
                    <div className="emp-guideline-num">2</div>
                    <div>
                      <strong>70% Minimum Duration Rule:</strong>
                      <p>
                        To be marked "Present (Full Credit)", an employee must be connected for at least 70% of the scheduled meeting duration.
                      </p>
                    </div>
                  </div>

                  <div className="emp-guideline-item">
                    <div className="emp-guideline-num">3</div>
                    <div>
                      <strong>Grace Period (5 Minutes):</strong>
                      <p>
                        Joining within the first 5 minutes grants punctual attendance. Joining between 5 and 15 minutes is recorded as "Late Arrival".
                      </p>
                    </div>
                  </div>

                  <div className="emp-guideline-item">
                    <div className="emp-guideline-num">4</div>
                    <div>
                      <strong>Dispute Resolution Window:</strong>
                      <p>
                        In the event of hardware failure, internet disruption, or joining from an alternative Google account, employees may submit a dispute within 48 hours for HR verification.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          DISPUTE FILING MODAL
          ======================================================== */}
      {isModalOpen && (
        <div className="emp-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="emp-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <div>
                <h3 className="emp-modal-title">Submit Attendance Dispute</h3>
                <p className="emp-modal-subtitle">
                  Meeting: <strong>{activeRecord?.meetingId?.title || 'Daily Standup'}</strong> ({formatSafeDate(activeRecord?.meetingId?.scheduledStartTime)})
                </p>
              </div>
              <button
                type="button"
                className="emp-modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close dialog"
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitDispute}>
              <div className="emp-modal-body">
                {feedbackMsg.text && (
                  <div
                    className={`emp-alert ${
                      feedbackMsg.type === 'success' ? 'emp-alert--success' : 'emp-alert--error'
                    }`}
                    role="alert"
                    style={{ marginBottom: '1rem' }}
                  >
                    <span>{feedbackMsg.text}</span>
                  </div>
                )}

                <div className="emp-form-group">
                  <label className="emp-form-label" htmlFor="dispute-reason">
                    Reason for Dispute *
                  </label>
                  <textarea
                    id="dispute-reason"
                    required
                    rows="3"
                    className="emp-form-textarea"
                    placeholder="e.g. Joined on time via mobile hotspot; laptop battery died at 10:14 AM and reconnected at 10:16 AM."
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                  />
                  <span className="emp-form-help">
                    Please provide an honest, detailed explanation for administrative review.
                  </span>
                </div>

                <div className="emp-form-group">
                  <label className="emp-form-label" htmlFor="alt-email">
                    Alternative Google Email Used (Optional)
                  </label>
                  <input
                    id="alt-email"
                    type="email"
                    className="emp-form-input"
                    placeholder="e.g. personal.email@gmail.com"
                    value={alternativeEmail}
                    onChange={(e) => setAlternativeEmail(e.target.value)}
                  />
                  <span className="emp-form-help">
                    If you joined from a non-corporate Google account, provide that email so participant logs can be cross-referenced.
                  </span>
                </div>
              </div>

              <div className="emp-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="emp-btn-secondary"
                  disabled={submittingDispute}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="emp-btn-primary"
                  disabled={submittingDispute}
                >
                  {submittingDispute ? 'Submitting Dispute...' : 'Submit Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ========================================================
          CHANGE PASSWORD MODAL
          ======================================================== */}
      {showPasswordModal && (
        <div className="emp-modal-overlay" onClick={() => !pwdSubmitting && setShowPasswordModal(false)}>
          <div className="emp-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <div>
                <h3 className="emp-modal-title">Change Workspace Password</h3>
                <p className="emp-modal-subtitle">Update credentials for {user?.email}</p>
              </div>
              <button
                type="button"
                className="emp-modal-close-btn"
                onClick={() => !pwdSubmitting && setShowPasswordModal(false)}
                aria-label="Close dialog"
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="emp-modal-body">
                {pwdMsg.text && (
                  <div
                    className={`emp-alert ${
                      pwdMsg.type === 'success' ? 'emp-alert--success' : 'emp-alert--error'
                    }`}
                    role="alert"
                    style={{ marginBottom: '1rem' }}
                  >
                    <span>{pwdMsg.text}</span>
                  </div>
                )}

                <div className="emp-form-group">
                  <label className="emp-form-label" htmlFor="emp-current-pwd">
                    Current Password *
                  </label>
                  <input
                    id="emp-current-pwd"
                    type="password"
                    required
                    className="emp-form-input"
                    value={pwdCurrent}
                    onChange={(e) => setPwdCurrent(e.target.value)}
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="emp-form-group">
                  <label className="emp-form-label" htmlFor="emp-new-pwd">
                    New Password *
                  </label>
                  <input
                    id="emp-new-pwd"
                    type="password"
                    required
                    className="emp-form-input"
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    placeholder="Minimum 8 characters"
                  />
                </div>

                <div className="emp-form-group">
                  <label className="emp-form-label" htmlFor="emp-confirm-pwd">
                    Confirm New Password *
                  </label>
                  <input
                    id="emp-confirm-pwd"
                    type="password"
                    required
                    className="emp-form-input"
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>

              <div className="emp-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="emp-btn-secondary"
                  disabled={pwdSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="emp-btn-primary"
                  disabled={pwdSubmitting}
                >
                  {pwdSubmitting ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
