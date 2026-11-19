import { useState, useEffect, useCallback } from 'react';
import {
  getAdminAttendanceDashboard,
  getAdminAttendanceRecords,
  listAdminMeetings,
  createAdminMeeting,
  deleteAdminMeeting,
  triggerMeetingReconciliation,
  getAdminCorrectionRequests,
  resolveAdminCorrectionRequest,
  updateAdminAttendanceCorrection,
  exportAttendanceReportCsv,
} from '../../../api';

export default function AttendanceTab() {
  const [dashboard, setDashboard] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [records, setRecords] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create meeting modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [meetingType, setMeetingType] = useState('Daily Standup');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [departments, setDepartments] = useState('');
  const [meetingUri, setMeetingUri] = useState('');
  const [autoCreateSpace, setAutoCreateSpace] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Manual correction modal state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [overrideStatus, setOverrideStatus] = useState('PRESENT');
  const [overrideNotes, setOverrideNotes] = useState('');

  const loadAttendanceData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, meetRes, recRes, dispRes] = await Promise.all([
        getAdminAttendanceDashboard().catch(() => ({ data: null })),
        listAdminMeetings({ limit: 20 }).catch(() => ({ data: { meetings: [] } })),
        getAdminAttendanceRecords({ meetingId: selectedMeetingId, status: statusFilter, limit: 30 }).catch(() => ({
          data: { records: [] },
        })),
        getAdminCorrectionRequests({ status: 'PENDING' }).catch(() => ({ data: [] })),
      ]);

      if (dashRes?.data) setDashboard(dashRes.data);
      if (meetRes?.data?.meetings) setMeetings(meetRes.data.meetings);
      if (recRes?.data?.records) setRecords(recRes.data.records);
      if (dispRes?.data) setDisputes(dispRes.data);
    } finally {
      setLoading(false);
    }
  }, [selectedMeetingId, statusFilter]);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;

    setSubmitting(true);
    try {
      await createAdminMeeting({
        title,
        meetingType,
        scheduledStartTime: new Date(startTime).toISOString(),
        scheduledEndTime: new Date(endTime).toISOString(),
        assignedDepartments: departments ? departments.split(',').map((d) => d.trim()).filter(Boolean) : [],
        googleMeetingUri: meetingUri.trim() || undefined,
        createGoogleMeetSpace: autoCreateSpace,
      });
      setIsCreateOpen(false);
      setTitle('');
      setStartTime('');
      setEndTime('');
      setDepartments('');
      setMeetingUri('');
      loadAttendanceData();
    } catch (err) {
      alert(`Error creating meeting: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReconcile = async (meetingId) => {
    try {
      await triggerMeetingReconciliation(meetingId);
      alert('Reconciliation completed. Attendance records updated from Google Meet API.');
      loadAttendanceData();
    } catch (err) {
      alert(`Reconciliation error: ${err.message}`);
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled meeting?')) return;
    try {
      await deleteAdminMeeting(meetingId);
      loadAttendanceData();
    } catch (err) {
      alert(`Error cancelling meeting: ${err.message}`);
    }
  };

  const handleResolveDispute = async (disputeId, action) => {
    const notes = prompt(`Optional ${action.toLowerCase()} notes:`) || '';
    try {
      await resolveAdminCorrectionRequest(disputeId, { action, reviewNotes: notes });
      loadAttendanceData();
    } catch (err) {
      alert(`Error resolving dispute: ${err.message}`);
    }
  };

  const handleManualOverride = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      await updateAdminAttendanceCorrection(selectedRecord._id, {
        status: overrideStatus,
        notes: overrideNotes || 'Administrative manual correction',
      });
      setSelectedRecord(null);
      loadAttendanceData();
    } catch (err) {
      alert(`Error updating record: ${err.message}`);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return <span className="status-badge status-badge--success">Present</span>;
      case 'LATE':
        return <span className="status-badge status-badge--warning">Late</span>;
      case 'SHORT_ATTENDANCE':
        return <span className="status-badge status-badge--attention">Short</span>;
      case 'ABSENT':
        return <span className="status-badge status-badge--danger">Absent</span>;
      case 'EXEMPTED':
        return <span className="status-badge">Exempted</span>;
      case 'PENDING_VERIFICATION':
      default:
        return <span className="status-badge status-badge--info">Pending Verification</span>;
    }
  };

  return (
    <div className="admin-tab-content">
      {/* 1. Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#F8FAFC' }}>Google Meet Attendance Management</h2>
          <p style={{ margin: '0.25rem 0 0', color: '#94A3B8', fontSize: '0.9rem' }}>
            Authoritative conference participant tracking, standup schedules, and attendance reconciliation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => exportAttendanceReportCsv({ meetingId: selectedMeetingId })} className="btn btn-secondary">
            <span>Export CSV</span>
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="btn btn-primary">
            <span>+ Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* 2. Top Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-card__val" style={{ color: '#EAB308' }}>
            {dashboard?.averageAttendancePercentage ?? 0}%
          </div>
          <div className="stat-card__label">Avg Attendance</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__val" style={{ color: '#10B981' }}>
            {dashboard?.presentToday ?? 0}
          </div>
          <div className="stat-card__label">Present Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__val" style={{ color: '#F59E0B' }}>
            {dashboard?.lateToday ?? 0}
          </div>
          <div className="stat-card__label">Late Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__val" style={{ color: '#F97316' }}>
            {dashboard?.shortToday ?? 0}
          </div>
          <div className="stat-card__label">Short Attendance</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__val" style={{ color: '#EF4444' }}>
            {dashboard?.absentToday ?? 0}
          </div>
          <div className="stat-card__label">Absent Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__val" style={{ color: '#818CF8' }}>
            {dashboard?.pendingVerification ?? 0}
          </div>
          <div className="stat-card__label">Pending Verify</div>
        </div>
      </div>

      {/* 3. Pending Disputes Drawer (if any) */}
      {disputes.length > 0 && (
        <div style={{ background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', padding: '1.25rem', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠️</span> Pending Attendance Disputes ({disputes.length})
          </h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {disputes.map((d) => (
              <div
                key={d._id}
                style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderRadius: '6px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <strong style={{ color: '#F8FAFC' }}>
                    {d.employeeId?.firstName} {d.employeeId?.lastName}
                  </strong>{' '}
                  <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>({d.employeeId?.department})</span>
                  <div style={{ fontSize: '0.85rem', color: '#CBD5E1', marginTop: '0.25rem' }}>
                    Meeting: {d.meetingId?.title} • Reason: <em>"{d.reason}"</em>
                  </div>
                  {d.alternativeEmailUsed && (
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                      Alt Email: {d.alternativeEmailUsed}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleResolveDispute(d._id, 'APPROVE')} className="btn btn-secondary" style={{ borderColor: '#10B981', color: '#10B981', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                    Approve
                  </button>
                  <button onClick={() => handleResolveDispute(d._id, 'REJECT')} className="btn btn-secondary" style={{ borderColor: '#EF4444', color: '#EF4444', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Meetings Management Table */}
      <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '10px', padding: '1.25rem', border: '1px solid rgba(148, 163, 184, 0.1)', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: '#F8FAFC' }}>Scheduled & Recent Meetings</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Title & Type</th>
                <th>Scheduled Time</th>
                <th>Departments</th>
                <th>Status</th>
                <th>Google Meet URL</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {meetings.length > 0 ? (
                meetings.map((m) => (
                  <tr key={m._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{m.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{m.meetingType}</div>
                    </td>
                    <td>
                      {new Date(m.scheduledStartTime).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{m.assignedDepartments?.length > 0 ? m.assignedDepartments.join(', ') : 'All Company'}</td>
                    <td>
                      <span className={`status-badge ${m.status === 'COMPLETED' ? 'status-badge--success' : m.status === 'IN_PROGRESS' ? 'status-badge--warning' : ''}`}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      {m.googleMeetingUri ? (
                        <a href={m.googleMeetingUri} target="_blank" rel="noopener noreferrer" style={{ color: '#60A5FA', fontSize: '0.85rem' }}>
                          meet.google.com
                        </a>
                      ) : (
                        <span style={{ color: '#64748B', fontSize: '0.85rem' }}>None</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleReconcile(m._id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} title="Reconcile with Google Meet API">
                          Reconcile
                        </button>
                        {m.status !== 'CANCELLED' && m.status !== 'COMPLETED' && (
                          <button onClick={() => handleCancelMeeting(m._id)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#EF4444' }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '1.5rem', color: '#94A3B8' }}>
                    No meetings found. Click "+ Schedule Meeting" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Live Attendance & Records Table */}
      <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '10px', padding: '1.25rem', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#F8FAFC' }}>Participant Attendance Records</h3>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ background: '#0F172A', border: '1px solid rgba(148, 163, 184, 0.2)', color: '#F8FAFC', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}
            >
              <option value="">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="SHORT_ATTENDANCE">Short Attendance</option>
              <option value="ABSENT">Absent</option>
              <option value="PENDING_VERIFICATION">Pending</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Meeting</th>
                <th>Duration</th>
                <th>Late</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length > 0 ? (
                records.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#F8FAFC' }}>
                        {r.employeeId ? `${r.employeeId.firstName} ${r.employeeId.lastName}` : 'Unknown'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                        {r.employeeId?.employeeId || 'STAFF'} • {r.employeeId?.department || 'General'}
                      </div>
                    </td>
                    <td>{r.meetingId?.title || 'Daily Standup'}</td>
                    <td>{r.totalConnectedDurationMinutes || 0} mins</td>
                    <td>{r.lateArrivalMinutes > 0 ? `${r.lateArrivalMinutes} mins` : '--'}</td>
                    <td>{getStatusBadge(r.status)}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: r.isProvisional ? '#818CF8' : '#10B981' }}>
                        {r.isProvisional ? 'Provisional' : r.verifiedVia || 'Finalized'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedRecord(r);
                          setOverrideStatus(r.status);
                          setOverrideNotes(r.notes || '');
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                      >
                        Override
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                    {loading ? 'Loading attendance logs...' : 'No attendance records match the selected filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Schedule Meeting Modal */}
      {isCreateOpen && (
        <div className="emp-modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            <h3 className="emp-modal__title">Schedule Google Meet Daily Meeting</h3>
            <form onSubmit={handleCreateMeeting}>
              <div className="emp-form-group">
                <label className="emp-form-label">Meeting Title *</label>
                <input
                  type="text"
                  required
                  className="emp-form-input"
                  placeholder="e.g. Engineering Daily Standup"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="emp-form-group">
                  <label className="emp-form-label">Meeting Type</label>
                  <select
                    className="emp-form-input"
                    value={meetingType}
                    onChange={(e) => setMeetingType(e.target.value)}
                  >
                    <option value="Daily Standup">Daily Standup</option>
                    <option value="Weekly Sync">Weekly Sync</option>
                    <option value="Department Meeting">Department Meeting</option>
                    <option value="Project Review">Project Review</option>
                  </select>
                </div>
                <div className="emp-form-group">
                  <label className="emp-form-label">Assigned Departments</label>
                  <input
                    type="text"
                    className="emp-form-input"
                    placeholder="e.g. Engineering, Product"
                    value={departments}
                    onChange={(e) => setDepartments(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="emp-form-group">
                  <label className="emp-form-label">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    className="emp-form-input"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div className="emp-form-group">
                  <label className="emp-form-label">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    className="emp-form-input"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="emp-form-group">
                <label className="emp-form-label">Google Meet Link (Optional if Auto-Creating)</label>
                <input
                  type="url"
                  className="emp-form-input"
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
                  value={meetingUri}
                  onChange={(e) => setMeetingUri(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <input
                  type="checkbox"
                  id="autoCreate"
                  checked={autoCreateSpace}
                  onChange={(e) => setAutoCreateSpace(e.target.checked)}
                />
                <label htmlFor="autoCreate" style={{ fontSize: '0.85rem', color: '#CBD5E1', cursor: 'pointer' }}>
                  Auto-create Google Meet space via Google Meet REST API v2
                </label>
              </div>

              <div className="emp-modal__actions">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="emp-btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="emp-btn-submit" disabled={submitting}>
                  {submitting ? 'Scheduling...' : 'Save & Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Manual Override Modal */}
      {selectedRecord && (
        <div className="emp-modal-backdrop" onClick={() => setSelectedRecord(null)}>
          <div className="emp-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="emp-modal__title">Manual Attendance Correction</h3>
            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1rem' }}>
              Employee: <strong>{selectedRecord.employeeId?.firstName} {selectedRecord.employeeId?.lastName}</strong>
            </p>
            <form onSubmit={handleManualOverride}>
              <div className="emp-form-group">
                <label className="emp-form-label">Status</label>
                <select
                  className="emp-form-input"
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                >
                  <option value="PRESENT">Present</option>
                  <option value="LATE">Late</option>
                  <option value="SHORT_ATTENDANCE">Short Attendance</option>
                  <option value="ABSENT">Absent</option>
                  <option value="EXEMPTED">Exempted</option>
                </select>
              </div>

              <div className="emp-form-group">
                <label className="emp-form-label">Audit Reason / Notes</label>
                <textarea
                  className="emp-form-textarea"
                  rows="2"
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  placeholder="e.g. Verified manual check-in via Slack team call"
                />
              </div>

              <div className="emp-modal__actions">
                <button type="button" onClick={() => setSelectedRecord(null)} className="emp-btn-cancel">
                  Cancel
                </button>
                <button type="submit" className="emp-btn-submit">
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
