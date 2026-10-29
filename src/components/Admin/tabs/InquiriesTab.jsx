import { useState, useEffect, useCallback, useMemo } from 'react';
import { getInquiries, updateInquiryStatus, deleteInquiry, exportInquiriesCsv } from '../../../api';
import { Panel, DataTable, FilterBar, PaginationBar, StatusBadge, EmptyState } from '../AdminUI';
import { useAdminFeedback } from '../AdminFeedback';
import {
  MessageIcon,
  DownloadIcon,
  EyeIcon,
  TrashIcon,
  RefreshIcon,
  XMarkIcon,
} from '../../icons';

const STATUS_TONE_MAP = {
  new: 'blue',
  in_progress: 'amber',
  resolved: 'green',
  spam: 'red',
  archived: 'slate',
};

export default function InquiriesTab() {
  const { toast, confirm } = useAdminFeedback();

  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Selected inquiry for detail modal
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [adminNoteText, setAdminNoteText] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  const fetchInquiriesList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await getInquiries(params);
      const items = res?.data?.items || res?.data || [];
      const total = res?.data?.total ?? items.length;
      const totalPages = res?.data?.totalPages ?? Math.max(1, Math.ceil(total / limit));

      setInquiries(items);
      setPagination({ total, totalPages });
    } catch (err) {
      setError(err.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, search]);

  useEffect(() => {
    fetchInquiriesList();
  }, [fetchInquiriesList]);

  // Open detail modal
  const handleOpenDetail = (inquiry) => {
    setSelectedInquiry(inquiry);
    setAdminNoteText(inquiry.adminNotes || '');
  };

  // Update status
  const handleStatusChange = async (inquiryId, newStatus) => {
    try {
      setActionInProgress(true);
      await updateInquiryStatus(inquiryId, { status: newStatus });
      toast.success(`Inquiry marked as ${newStatus.replace('_', ' ')}.`);

      setInquiries((prev) =>
        prev.map((item) =>
          item._id === inquiryId ? { ...item, status: newStatus } : item
        )
      );

      if (selectedInquiry?._id === inquiryId) {
        setSelectedInquiry((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update inquiry status');
    } finally {
      setActionInProgress(false);
    }
  };

  // Save admin notes
  const handleSaveNotes = async () => {
    if (!selectedInquiry) return;
    try {
      setActionInProgress(true);
      await updateInquiryStatus(selectedInquiry._id, { adminNotes: adminNoteText });
      toast.success('Internal notes updated successfully.');

      setInquiries((prev) =>
        prev.map((item) =>
          item._id === selectedInquiry._id
            ? { ...item, adminNotes: adminNoteText }
            : item
        )
      );
      setSelectedInquiry((prev) => ({ ...prev, adminNotes: adminNoteText }));
    } catch (err) {
      toast.error(err.message || 'Failed to save admin notes');
    } finally {
      setActionInProgress(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      await exportInquiriesCsv(params);
      toast.success('Inquiries exported to CSV successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to export inquiries');
    } finally {
      setExporting(false);
    }
  };

  // Delete inquiry with confirmation
  const handleDelete = async (inquiry) => {
    const ok = await confirm({
      title: 'Delete Inquiry Record',
      message: `Permanently delete contact inquiry from "${inquiry.name}" (${inquiry.email})? This action cannot be undone.`,
      confirmLabel: 'Delete Inquiry',
      tone: 'danger',
    });

    if (!ok) return;

    try {
      await deleteInquiry(inquiry._id);
      toast.success('Inquiry permanently deleted.');
      if (selectedInquiry?._id === inquiry._id) {
        setSelectedInquiry(null);
      }
      fetchInquiriesList();
    } catch (err) {
      toast.error(err.message || 'Failed to delete inquiry');
    }
  };

  const columns = useMemo(
    () => [
      { key: 'client', label: 'Submitter & Contact' },
      { key: 'subject', label: 'Subject / Service' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Received' },
      { key: 'actions', label: 'Actions', style: { textAlign: 'right' } },
    ],
    []
  );

  return (
    <div className="admin-tab-container">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Website Contact Inquiries</h1>
          <p className="admin-page-subtitle">
            Manage incoming business leads, technical consultation requests, and customer messages
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={handleExportCsv}
            disabled={exporting}
            aria-label="Export inquiries to CSV"
          >
            <DownloadIcon size={14} />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={fetchInquiriesList}
            aria-label="Refresh inquiries list"
          >
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <FilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        placeholder="Search by name, email, subject, or company..."
        filters={[
          {
            id: 'inquiry-status-filter',
            label: 'Filter by Status',
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
            },
            options: [
              { value: 'all', label: 'All Statuses' },
              { value: 'new', label: 'New / Unread' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'spam', label: 'Spam' },
              { value: 'archived', label: 'Archived' },
            ],
          },
        ]}
        onClear={
          search || statusFilter !== 'all'
            ? () => {
                setSearch('');
                setStatusFilter('all');
                setPage(1);
              }
            : undefined
        }
      />

      {/* Table Panel */}
      <Panel>
        <DataTable
          caption="Contact Inquiries"
          columns={columns}
          data={inquiries}
          isLoading={loading}
          emptyMessage="No inquiries match your current filters."
          renderRow={(item) => {
            const dateStr = item.createdAt
              ? new Date(item.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—';

            const tone = STATUS_TONE_MAP[item.status] || 'slate';

            return (
              <tr key={item._id} className="admin-table-row">
                <td>
                  <div className="admin-table-user-cell">
                    <span className="admin-cell-title">{item.name || 'Anonymous'}</span>
                    <span className="admin-cell-sub">{item.email}</span>
                    {item.company && (
                      <span className="admin-cell-muted">{item.company}</span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="admin-cell-content">
                    <span className="admin-cell-title">
                      {item.subject || item.service || 'General Inquiry'}
                    </span>
                    <p className="admin-cell-snippet">
                      {item.message?.slice(0, 75)}
                      {item.message?.length > 75 ? '...' : ''}
                    </p>
                  </div>
                </td>
                <td>
                  <StatusBadge
                    label={item.status ? item.status.replace('_', ' ') : 'new'}
                    tone={tone}
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
                      onClick={() => handleOpenDetail(item)}
                      title="View Details"
                      aria-label={`View details for inquiry from ${item.name}`}
                    >
                      <EyeIcon size={16} />
                    </button>

                    <select
                      className="admin-table-select"
                      value={item.status || 'new'}
                      onChange={(e) => handleStatusChange(item._id, e.target.value)}
                      aria-label="Change inquiry status"
                    >
                      <option value="new">New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="spam">Spam</option>
                      <option value="archived">Archived</option>
                    </select>

                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn--danger"
                      onClick={() => handleDelete(item)}
                      title="Delete Inquiry"
                      aria-label={`Delete inquiry from ${item.name}`}
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
          page={page}
          totalPages={pagination.totalPages}
          totalCount={pagination.total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      </Panel>

      {/* Inquiry Detail Modal */}
      {selectedInquiry && (
        <div
          className="admin-modal-overlay"
          onClick={() => setSelectedInquiry(null)}
        >
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-detail-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="inquiry-detail-title" className="admin-modal-title">
                  Inquiry Details
                </h3>
                <p className="admin-modal-subtitle">
                  Received on {new Date(selectedInquiry.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setSelectedInquiry(null)}
                aria-label="Close modal"
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Client Name</span>
                  <span className="admin-detail-val">{selectedInquiry.name}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Email Address</span>
                  <a
                    href={`mailto:${selectedInquiry.email}`}
                    className="admin-detail-link"
                  >
                    {selectedInquiry.email}
                  </a>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Phone</span>
                  <span className="admin-detail-val">
                    {selectedInquiry.phone || 'Not provided'}
                  </span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Company</span>
                  <span className="admin-detail-val">
                    {selectedInquiry.company || 'Not provided'}
                  </span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Service Area</span>
                  <span className="admin-detail-val">
                    {selectedInquiry.service || selectedInquiry.subject || 'General'}
                  </span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Status</span>
                  <StatusBadge
                    label={selectedInquiry.status}
                    tone={STATUS_TONE_MAP[selectedInquiry.status] || 'slate'}
                  />
                </div>
              </div>

              <div className="admin-detail-section">
                <h4 className="admin-detail-section-title">Message Transcript</h4>
                <div className="admin-transcript-box">
                  {selectedInquiry.message || 'No message body provided.'}
                </div>
              </div>

              <div className="admin-detail-section">
                <h4 className="admin-detail-section-title">Admin Internal Notes</h4>
                <textarea
                  className="admin-textarea"
                  rows={3}
                  value={adminNoteText}
                  onChange={(e) => setAdminNoteText(e.target.value)}
                  placeholder="Record call notes, status updates, or internal assignee details..."
                />
                <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                  <button
                    type="button"
                    className="admin-btn admin-btn--primary admin-btn--sm"
                    disabled={actionInProgress}
                    onClick={handleSaveNotes}
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setSelectedInquiry(null)}
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
