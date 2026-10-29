import { useState, useEffect, useCallback, useMemo } from 'react';
import { getInternships, updateInternship, deleteInternship } from '../../../api';
import { Panel, DataTable, FilterBar, PaginationBar, StatusBadge, EmptyState } from '../AdminUI';
import { useAdminFeedback } from '../AdminFeedback';
import {
  AcademicCapIcon,
  EyeIcon,
  TrashIcon,
  RefreshIcon,
  XMarkIcon,
} from '../../icons';

const STATUS_TONE_MAP = {
  applied: 'blue',
  under_review: 'amber',
  shortlisted: 'blue',
  selected: 'green',
  rejected: 'red',
};

export default function InternshipsTab() {
  const { toast, confirm } = useAdminFeedback();

  const [internships, setInternships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [selectedIntern, setSelectedIntern] = useState(null);

  const fetchInternshipsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (domainFilter !== 'all') params.domain = domainFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await getInternships(params);
      const items = res?.data?.items || res?.data?.internships || res?.data || [];
      const total = res?.data?.total ?? items.length;
      const totalPages = res?.data?.totalPages ?? Math.max(1, Math.ceil(total / limit));

      setInternships(items);
      setPagination({ total, totalPages });
    } catch (err) {
      setError(err.message || 'Failed to load internship applications');
    } finally {
      setLoading(false);
    }
  }, [page, limit, domainFilter, statusFilter, search]);

  useEffect(() => {
    fetchInternshipsList();
  }, [fetchInternshipsList]);

  const handleStatusChange = async (internshipId, newStatus) => {
    try {
      await updateInternship(internshipId, { status: newStatus });
      toast.success(`Intern candidate status marked as ${newStatus.replace('_', ' ')}.`);
      setInternships((prev) =>
        prev.map((i) => (i._id === internshipId ? { ...i, status: newStatus } : i))
      );
      if (selectedIntern?._id === internshipId) {
        setSelectedIntern((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update internship status');
    }
  };

  const handleDelete = async (intern) => {
    const ok = await confirm({
      title: 'Delete Internship Application',
      message: `Permanently delete internship application from "${intern.name || intern.fullName}" (${intern.email})?`,
      confirmLabel: 'Delete Record',
      tone: 'danger',
    });

    if (!ok) return;

    try {
      await deleteInternship(intern._id);
      toast.success('Internship application deleted.');
      if (selectedIntern?._id === intern._id) {
        setSelectedIntern(null);
      }
      fetchInternshipsList();
    } catch (err) {
      toast.error(err.message || 'Failed to delete internship');
    }
  };

  const columns = useMemo(
    () => [
      { key: 'candidate', label: 'Candidate' },
      { key: 'domain', label: 'Domain & College' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Applied On' },
      { key: 'actions', label: 'Actions', style: { textAlign: 'right' } },
    ],
    []
  );

  return (
    <div className="admin-tab-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Internship Applications</h1>
          <p className="admin-page-subtitle">
            Review student candidates for engineering, cloud, and product development internships
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--sm"
          onClick={fetchInternshipsList}
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
        placeholder="Search by student name, college, or domain..."
        filters={[
          {
            id: 'intern-domain-filter',
            label: 'Domain',
            value: domainFilter,
            onChange: (val) => {
              setDomainFilter(val);
              setPage(1);
            },
            options: [
              { value: 'all', label: 'All Domains' },
              { value: 'web', label: 'Web Engineering' },
              { value: 'mobile', label: 'Mobile App Dev' },
              { value: 'cloud', label: 'Cloud & DevOps' },
              { value: 'ai', label: 'AI & Data Science' },
              { value: 'fullstack', label: 'Full Stack' },
            ],
          },
          {
            id: 'intern-status-filter',
            label: 'Status',
            value: statusFilter,
            onChange: (val) => {
              setStatusFilter(val);
              setPage(1);
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
        ]}
        onClear={
          search || domainFilter !== 'all' || statusFilter !== 'all'
            ? () => {
                setSearch('');
                setDomainFilter('all');
                setStatusFilter('all');
                setPage(1);
              }
            : undefined
        }
      />

      <Panel>
        <DataTable
          caption="Internship Applications"
          columns={columns}
          data={internships}
          isLoading={loading}
          emptyMessage="No internship applications found."
          renderRow={(intern) => {
            const dateStr = intern.createdAt
              ? new Date(intern.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—';

            return (
              <tr key={intern._id} className="admin-table-row">
                <td>
                  <div className="admin-table-user-cell">
                    <span className="admin-cell-title">
                      {intern.name || intern.fullName || 'Applicant'}
                    </span>
                    <span className="admin-cell-sub">{intern.email}</span>
                    {intern.phone && <span className="admin-cell-muted">{intern.phone}</span>}
                  </div>
                </td>
                <td>
                  <span className="admin-cell-title">{intern.domain || 'Engineering'}</span>
                  <span className="admin-cell-sub">{intern.college || intern.university || '—'}</span>
                </td>
                <td>
                  <StatusBadge
                    label={intern.status ? intern.status.replace('_', ' ') : 'applied'}
                    tone={STATUS_TONE_MAP[intern.status] || 'slate'}
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
                      onClick={() => setSelectedIntern(intern)}
                      title="View Details"
                    >
                      <EyeIcon size={16} />
                    </button>

                    <select
                      className="admin-table-select"
                      value={intern.status || 'applied'}
                      onChange={(e) => handleStatusChange(intern._id, e.target.value)}
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
                      onClick={() => handleDelete(intern)}
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

      {/* DETAIL MODAL */}
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
                  Intern Profile: {selectedIntern.name || selectedIntern.fullName}
                </h3>
                <p className="admin-modal-subtitle">
                  {selectedIntern.domain} Track • {selectedIntern.college || 'University'}
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
                  <span className="admin-detail-label">Graduation Year</span>
                  <span className="admin-detail-val">{selectedIntern.gradYear || selectedIntern.year || '—'}</span>
                </div>
                <div className="admin-detail-item">
                  <span className="admin-detail-label">Status</span>
                  <StatusBadge
                    label={selectedIntern.status}
                    tone={STATUS_TONE_MAP[selectedIntern.status] || 'slate'}
                  />
                </div>
              </div>

              {selectedIntern.statement && (
                <div className="admin-detail-section">
                  <h4 className="admin-detail-section-title">Objective / Statement</h4>
                  <div className="admin-transcript-box">{selectedIntern.statement}</div>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
