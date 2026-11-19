import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/ui/Logo';
import { useAuth } from '../context/useAuth';
import {
  getMyAttendance,
  getMyAttendanceSummary,
  getMyAttendanceCalendar,
  getUpcomingMeetings,
  submitAttendanceDispute,
} from '../api';
import './EmployeePortalPage.css';

export default function EmployeePortalPage() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [history, setHistory] = useState([]);
  const [calendarItems, setCalendarItems] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Dispute modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [alternativeEmail, setAlternativeEmail] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Employee Attendance Workspace | Ashivam Technologies';
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/employee-login/employee', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  const loadPortalData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [sumRes, upRes, histRes, calRes] = await Promise.all([
        getMyAttendanceSummary().catch(() => ({ data: null })),
        getUpcomingMeetings().catch(() => ({ data: [] })),
        getMyAttendance({ limit: 15 }).catch(() => ({ data: { records: [] } })),
        getMyAttendanceCalendar({ month: selectedMonth, year: selectedYear }).catch(() => ({ data: { items: [] } })),
      ]);

      if (sumRes?.data) setSummary(sumRes.data);
      if (upRes?.data) setUpcoming(upRes.data);
      if (histRes?.data?.records) setHistory(histRes.data.records);
      if (calRes?.data?.items) setCalendarItems(calRes.data.items);
    } finally {
      setLoadingData(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPortalData();
    }
  }, [isAuthenticated, loadPortalData]);

  const handleOpenDispute = (record) => {
    setActiveRecord(record);
    setDisputeReason('');
    setAlternativeEmail(user?.googleEmail || '');
    setFeedbackMsg('');
    setIsModalOpen(true);
  };

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
      setFeedbackMsg('Dispute submitted successfully for administrative review.');
      setTimeout(() => {
        setIsModalOpen(false);
        loadPortalData();
      }, 1500);
    } catch (err) {
      setFeedbackMsg(err.message || 'Failed to submit dispute. Please try again.');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return <span className="emp-status-pill emp-status-pill--present">Present</span>;
      case 'LATE':
        return <span className="emp-status-pill emp-status-pill--late">Late Arrival</span>;
      case 'SHORT_ATTENDANCE':
        return <span className="emp-status-pill emp-status-pill--short">Short Duration</span>;
      case 'ABSENT':
        return <span className="emp-status-pill emp-status-pill--absent">Absent</span>;
      case 'EXEMPTED':
        return <span className="emp-status-pill">Exempted</span>;
      case 'PENDING_VERIFICATION':
      default:
        return <span className="emp-status-pill emp-status-pill--pending">Pending Verification</span>;
    }
  };

  const todayMeeting = upcoming.find((m) => {
    const meetingDate = new Date(m.scheduledStartTime).toDateString();
    return meetingDate === new Date().toDateString();
  }) || upcoming[0] || null;

  return (
    <div className="emp-portal">
      {/* Top Portal Navigation */}
      <header className="emp-portal__nav">
        <Logo size={36} variant="horizontal" showText={true} />
        <div className="emp-portal__user">
          <div className="emp-portal__user-info">
            <span className="emp-portal__user-name">{user?.name || 'Ashivam Team Member'}</span>
            <span className="emp-portal__user-meta">
              {user?.employeeId || 'STAFF'} • {user?.department || 'Engineering'}
            </span>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/employee-login');
            }}
            className="emp-btn-dispute"
            style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#EF4444' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="emp-portal__container">
        <div className="emp-portal__header">
          <h1 className="emp-portal__title">Employee Attendance Dashboard</h1>
          <p className="emp-portal__subtitle">
            Google Meet attendance tracking, standup schedules, and historical records.
          </p>
        </div>

        {/* 1. Today's Standup Meeting Card */}
        {todayMeeting ? (
          <div className="emp-today-card">
            <div className="emp-today-card__header">
              <div>
                <span className="emp-today-card__badge">{todayMeeting.meetingType || 'Daily Standup'}</span>
                <h2 className="emp-today-card__title">{todayMeeting.title}</h2>
                <div className="emp-today-card__time">
                  <span>🕒</span>
                  <span>
                    {new Date(todayMeeting.scheduledStartTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    –{' '}
                    {new Date(todayMeeting.scheduledEndTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    (Asia/Kolkata)
                  </span>
                </div>
              </div>
              <div>
                {getStatusBadge(todayMeeting.attendanceRecord?.status || 'PENDING_VERIFICATION')}
              </div>
            </div>

            <div className="emp-today-card__body">
              <div className="emp-verification-note">
                <span style={{ fontWeight: 600, color: '#E2E8F0' }}>Verified Attendance Policy:</span>
                <br />
                Attendance is verified automatically via Google Meet participant session records. Clicking the
                Join button alone does NOT grant attendance credit. Please join using your authorized company Google account.
              </div>

              {todayMeeting.googleMeetingUri ? (
                <a
                  href={todayMeeting.googleMeetingUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="emp-btn-join"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  <span>Join Google Meet</span>
                </a>
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Link pending assignment</span>
              )}
            </div>
          </div>
        ) : (
          <div className="emp-today-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <p style={{ color: '#94A3B8', margin: 0 }}>No standup meetings scheduled for today.</p>
          </div>
        )}

        {/* 2. Metrics Grid */}
        <div className="emp-metrics-grid">
          <div className="emp-metric-card" style={{ borderColor: 'rgba(234, 179, 8, 0.3)' }}>
            <div className="emp-metric-card__val" style={{ color: '#EAB308' }}>
              {summary ? `${summary.attendancePercentage}%` : '--'}
            </div>
            <div className="emp-metric-card__label">Attendance Score</div>
          </div>
          <div className="emp-metric-card">
            <div className="emp-metric-card__val" style={{ color: '#10B981' }}>
              {summary?.present ?? 0}
            </div>
            <div className="emp-metric-card__label">Present</div>
          </div>
          <div className="emp-metric-card">
            <div className="emp-metric-card__val" style={{ color: '#F59E0B' }}>
              {summary?.late ?? 0}
            </div>
            <div className="emp-metric-card__label">Late Arrivals</div>
          </div>
          <div className="emp-metric-card">
            <div className="emp-metric-card__val" style={{ color: '#F97316' }}>
              {summary?.shortAttendance ?? 0}
            </div>
            <div className="emp-metric-card__label">Short Attendance</div>
          </div>
          <div className="emp-metric-card">
            <div className="emp-metric-card__val" style={{ color: '#EF4444' }}>
              {summary?.absent ?? 0}
            </div>
            <div className="emp-metric-card__label">Absent Days</div>
          </div>
        </div>

        {/* 3. Monthly Calendar Snapshot */}
        <div className="emp-history" style={{ marginBottom: '2.5rem' }}>
          <div className="emp-history__header">
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#F8FAFC' }}>Monthly Attendance Overview</h3>
            <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
              {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.75rem' }}>
            {calendarItems.length > 0 ? (
              calendarItems.map((item) => (
                <div
                  key={item._id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    {new Date(item.meetingId?.scheduledStartTime || item.createdAt).toLocaleDateString([], {
                      weekday: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div style={{ marginTop: '0.35rem' }}>{getStatusBadge(item.status)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                    {item.totalConnectedDurationMinutes || 0} mins
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: '#94A3B8', fontSize: '0.85rem', gridColumn: '1/-1', textAlign: 'center', margin: '1rem 0' }}>
                No recorded meetings for this calendar month.
              </p>
            )}
          </div>
        </div>

        {/* 4. Attendance History Table */}
        <div className="emp-history">
          <div className="emp-history__header">
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#F8FAFC' }}>Recent Meeting Records</h3>
            <span style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Authoritative Google Meet Verification</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="emp-table">
              <thead>
                <tr>
                  <th>Meeting</th>
                  <th>Date & Time</th>
                  <th>Connected Time</th>
                  <th>Late Arrival</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {history.length > 0 ? (
                  history.map((record) => (
                    <tr key={record._id}>
                      <td style={{ fontWeight: 500 }}>{record.meetingId?.title || 'Daily Standup'}</td>
                      <td>
                        {record.meetingId?.scheduledStartTime
                          ? new Date(record.meetingId.scheduledStartTime).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </td>
                      <td>{record.totalConnectedDurationMinutes || 0} mins</td>
                      <td>{record.lateArrivalMinutes > 0 ? `${record.lateArrivalMinutes} mins` : '--'}</td>
                      <td>{getStatusBadge(record.status)}</td>
                      <td>
                        {record.status !== 'PRESENT' && record.correctionStatus === 'NONE' ? (
                          <button onClick={() => handleOpenDispute(record)} className="emp-btn-dispute">
                            Dispute Record
                          </button>
                        ) : record.correctionStatus === 'DISPUTED' ? (
                          <span style={{ fontSize: '0.8rem', color: '#EAB308' }}>Under Review</span>
                        ) : record.correctionStatus === 'RESOLVED_APPROVED' ? (
                          <span style={{ fontSize: '0.8rem', color: '#10B981' }}>Corrected</span>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Verified</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                      {loadingData ? 'Loading attendance logs...' : 'No historical attendance records found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 5. Attendance Dispute Modal */}
      {isModalOpen && (
        <div className="emp-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="emp-modal__title">Submit Attendance Correction Dispute</h3>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.25rem' }}>
              Meeting: <strong style={{ color: '#F8FAFC' }}>{activeRecord?.meetingId?.title}</strong>
            </p>

            {feedbackMsg && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  background: feedbackMsg.includes('success') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: feedbackMsg.includes('success') ? '#10B981' : '#EF4444',
                }}
              >
                {feedbackMsg}
              </div>
            )}

            <form onSubmit={handleSubmitDispute}>
              <div className="emp-form-group">
                <label className="emp-form-label">Justification / Reason *</label>
                <textarea
                  className="emp-form-textarea"
                  rows="3"
                  required
                  placeholder="e.g. My WiFi dropped at 8:15 PM and I rejoined from another device..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                />
              </div>

              <div className="emp-form-group">
                <label className="emp-form-label">Alternative Google Email Used (Optional)</label>
                <input
                  type="email"
                  className="emp-form-input"
                  placeholder="e.g. personal.email@gmail.com"
                  value={alternativeEmail}
                  onChange={(e) => setAlternativeEmail(e.target.value)}
                />
              </div>

              <div className="emp-modal__actions">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="emp-btn-cancel"
                  disabled={submittingDispute}
                >
                  Cancel
                </button>
                <button type="submit" className="emp-btn-submit" disabled={submittingDispute}>
                  {submittingDispute ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
