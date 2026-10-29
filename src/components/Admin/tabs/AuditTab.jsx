import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAuditLogs } from '../../../api';
import { Panel, DataTable, FilterBar, PaginationBar, StatusBadge, EmptyState } from '../AdminUI';
import {
  ShieldCheckIcon,
  EyeIcon,
  RefreshIcon,
  XMarkIcon,
} from '../../icons';

const ACTION_TONE_MAP = {
  LOGIN: 'blue',
  LOGOUT: 'slate',
  CREATE_ADMIN: 'green',
  UPDATE_ADMIN: 'amber',
  DELETE_ADMIN: 'red',
  CREATE_EMPLOYEE: 'green',
  UPDATE_EMPLOYEE: 'amber',
  DELETE_EMPLOYEE: 'red',
  CREATE_JOB: 'green',
  UPDATE_SETTINGS: 'amber',
  UPLOAD_DOC: 'blue',
};

export default function AuditTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [selectedLog, setSelectedLog] = useState(null);

  const fetchAuditLogsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (actionFilter !== 'all') params.action = actionFilter;
      if (search.trim()) params.search = search.trim();

      const res = await getAuditLogs(params);
      const items = res?.data?.items || res?.data?.logs || res?.data || [];
      const total = res?.data?.total ?? items.length;
      const totalPages = res?.data?.totalPages ?? Math.max(1, Math.ceil(total / limit));

      setLogs(items);
      setPagination({ total, totalPages });
    } catch (err) {
      setError(err.message || 'Failed to load security audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, limit, actionFilter, search]);

  useEffect(() => {
    fetchAuditLogsList();
  }, [fetchAuditLogsList]);

  const columns = useMemo(
    () => [
      { key: 'time', label: 'Timestamp (UTC/IST)' },
      { key: 'action', label: 'Event Action' },
      { key: 'actor', label: 'Actor & IP Address' },
      { key: 'target', label: 'Target Resource' },
      { key: 'actions', label: 'Details', style: { textAlign: 'right' } },
    ],
    []
  );

  return (
    <div className="admin-tab-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Audit Trail & Security Logs</h1>
          <p className="admin-page-subtitle">
            Immutable system audit logs tracking authentication, administrative mutations, and data access
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--sm"
          onClick={fetchAuditLogsList}
        >
          <RefreshIcon size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <span>{error}</span>
        </div>
      )}

      <FilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        placeholder="Search audit trail by actor, IP, or resource..."
        filters={[
          {
            id: 'audit-action-filter',
            label: 'Action Filter',
            value: actionFilter,
            onChange: (val) => {
              setActionFilter(val);
              setPage(1);
            },
            options: [
              { value: 'all', label: 'All Security Actions' },
              { value: 'LOGIN', label: 'LOGIN' },
              { value: 'LOGOUT', label: 'LOGOUT' },
              { value: 'CREATE_ADMIN', label: 'CREATE_ADMIN' },
              { value: 'UPDATE_ADMIN', label: 'UPDATE_ADMIN' },
              { value: 'DELETE_ADMIN', label: 'DELETE_ADMIN' },
              { value: 'CREATE_EMPLOYEE', label: 'CREATE_EMPLOYEE' },
              { value: 'UPDATE_EMPLOYEE', label: 'UPDATE_EMPLOYEE' },
              { value: 'DELETE_EMPLOYEE', label: 'DELETE_EMPLOYEE' },
              { value: 'UPDATE_SETTINGS', label: 'UPDATE_SETTINGS' },
            ],
          },
        ]}
        onClear={
          search || actionFilter !== 'all'
            ? () => {
                setSearch('');
                setActionFilter('all');
                setPage(1);
              }
            : undefined
        }
      />

      <Panel>
        <DataTable
          caption="Security Audit Logs"
          columns={columns}
          data={logs}
          isLoading={loading}
          emptyMessage="No security audit events recorded matching your filters."
          renderRow={(log) => {
            const dateStr = log.createdAt
              ? new Date(log.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'medium',
                })
              : '—';

            const actionName = log.action || 'EVENT';
            const tone = ACTION_TONE_MAP[actionName] || 'slate';

            return (
              <tr key={log._id} className="admin-table-row">
                <td>
                  <span className="admin-cell-date" style={{ fontFamily: 'monospace' }}>
                    {dateStr}
                  </span>
                </td>
                <td>
                  <StatusBadge label={actionName} tone={tone} />
                </td>
                <td>
                  <div className="admin-table-user-cell">
                    <span className="admin-cell-title">
                      {log.actorUsername || log.actorName || log.actorId || 'System'}
                    </span>
                    <span className="admin-cell-muted" style={{ fontFamily: 'monospace' }}>
                      {log.ipAddress || '127.0.0.1'}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="admin-cell-title">{log.targetModel || 'System'}</span>
                  {log.targetId && (
                    <span className="admin-cell-muted" style={{ fontFamily: 'monospace' }}>
                      ID: {String(log.targetId).slice(0, 10)}...
                    </span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="admin-action-btn"
                    onClick={() => setSelectedLog(log)}
                    title="View Full Audit Payload"
                  >
                    <EyeIcon size={16} />
                  </button>
                </td>
              </tr>
            );
          }}
        />

        <PaginationBar
          page={page}
          totalPages={pagination.totalPages}
          totalCount={pagination.total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      </Panel>

      {/* AUDIT LOG DETAIL MODAL */}
      {selectedLog && (
        <div className="admin-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="audit-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="audit-modal-title" className="admin-modal-title">
                  Security Event Log: {selectedLog.action}
                </h3>
                <p className="admin-modal-subtitle">
                  Recorded on {new Date(selectedLog.createdAt).toUTCString()}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setSelectedLog(null)}
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Action</span>
                  <StatusBadge
                    label={selectedLog.action}
                    tone={ACTION_TONE_MAP[selectedLog.action] || 'slate'}
                  />
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Actor</span>
                  <span className="admin-detail-val">
                    {selectedLog.actorUsername || 'System'}
                  </span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">IP Address</span>
                  <span className="admin-detail-val" style={{ fontFamily: 'monospace' }}>
                    {selectedLog.ipAddress || '127.0.0.1'}
                  </span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Target Model</span>
                  <span className="admin-detail-val">{selectedLog.targetModel || '—'}</span>
                </div>
              </div>

              <div className="admin-detail-section">
                <h4 className="admin-detail-section-title">Audit Metadata & Details</h4>
                <pre className="admin-json-viewer">
                  {JSON.stringify(selectedLog.details || selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setSelectedLog(null)}
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
