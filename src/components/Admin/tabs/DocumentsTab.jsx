import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getHrDocuments,
  getEmployees,
  uploadHrDocument,
  updateHrDocumentStatus,
  deleteHrDocument,
  downloadHrDocument,
  exportHrDocumentsCsv,
} from '../../../api';
import { Panel, DataTable, FilterBar, PaginationBar, StatusBadge, EmptyState } from '../AdminUI';
import { useAdminFeedback } from '../AdminFeedback';
import {
  DocumentTextIcon,
  PlusIcon,
  DownloadIcon,
  TrashIcon,
  RefreshIcon,
  XMarkIcon,
} from '../../icons';

const DOC_STATUS_TONE_MAP = {
  verified: 'green',
  pending: 'amber',
  rejected: 'red',
  archived: 'slate',
};

export default function DocumentsTab() {
  const { toast, confirm } = useAdminFeedback();

  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [downloadingId, setDownloadingId] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [docForm, setDocForm] = useState({
    employee: '',
    documentType: 'Offer Letter',
    title: '',
    description: '',
    documentNumber: '',
    expiryDate: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchDocumentsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (typeFilter !== 'all') params.documentType = typeFilter;
      if (search.trim()) params.search = search.trim();

      const [docsRes, empsRes] = await Promise.allSettled([
        getHrDocuments(params),
        getEmployees({ page: 1, limit: 100 }),
      ]);

      const docItems =
        docsRes.status === 'fulfilled'
          ? docsRes.value?.data?.items || docsRes.value?.data || []
          : [];
      const total = docsRes.value?.data?.total ?? docItems.length;
      const totalPages =
        docsRes.value?.data?.totalPages ?? Math.max(1, Math.ceil(total / limit));

      const empItems =
        empsRes.status === 'fulfilled'
          ? empsRes.value?.data?.items || empsRes.value?.data || []
          : [];

      setDocuments(docItems);
      setEmployees(empItems);
      setPagination({ total, totalPages });
    } catch (err) {
      setError(err.message || 'Failed to load HR documents');
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter, search]);

  useEffect(() => {
    fetchDocumentsList();
  }, [fetchDocumentsList]);

  const handleOpenUpload = () => {
    setUploadError('');
    setSelectedFile(null);
    setDocForm({
      employee: employees[0]?._id || '',
      documentType: 'Offer Letter',
      title: '',
      description: '',
      documentNumber: '',
      expiryDate: '',
    });
    setShowUploadModal(true);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!docForm.employee) {
      setUploadError('Associated employee is required');
      return;
    }
    if (!docForm.title.trim()) {
      setUploadError('Document title is required');
      return;
    }
    if (!selectedFile) {
      setUploadError('Please select a file to upload (PDF or Doc)');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds 10MB maximum size limit');
      return;
    }

    const formData = new FormData();
    formData.append('employee', docForm.employee);
    formData.append('documentType', docForm.documentType);
    formData.append('title', docForm.title.trim());
    formData.append('description', docForm.description.trim());
    formData.append('documentNumber', docForm.documentNumber.trim());
    if (docForm.expiryDate) {
      formData.append('expiryDate', docForm.expiryDate);
    }
    formData.append('file', selectedFile);

    setUploadSubmitting(true);
    try {
      await uploadHrDocument(formData);
      toast.success('Document uploaded and indexed successfully.');
      setShowUploadModal(false);
      fetchDocumentsList();
    } catch (err) {
      setUploadError(err.message || 'Failed to upload document');
    } finally {
      setUploadSubmitting(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      setDownloadingId(doc._id);
      const fallback = `${doc.title || 'document'}.pdf`;
      await downloadHrDocument(doc._id, fallback);
      toast.success('Document download started.');
    } catch (err) {
      toast.error(err.message || 'Failed to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStatusChange = async (docId, newStatus) => {
    try {
      await updateHrDocumentStatus(docId, { status: newStatus });
      toast.success(`Document marked as ${newStatus}.`);
      setDocuments((prev) =>
        prev.map((d) => (d._id === docId ? { ...d, status: newStatus } : d))
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update document status');
    }
  };

  const handleDelete = async (doc) => {
    const ok = await confirm({
      title: 'Delete HR Document',
      message: `Permanently delete document "${doc.title}"? This action cannot be reversed.`,
      confirmLabel: 'Delete Document',
      tone: 'danger',
    });

    if (!ok) return;

    try {
      await deleteHrDocument(doc._id);
      toast.success('Document deleted successfully.');
      fetchDocumentsList();
    } catch (err) {
      toast.error(err.message || 'Failed to delete document');
    }
  };

  const columns = useMemo(
    () => [
      { key: 'title', label: 'Document Title & Type' },
      { key: 'employee', label: 'Employee' },
      { key: 'status', label: 'Verification Status' },
      { key: 'date', label: 'Date Added' },
      { key: 'actions', label: 'Actions', style: { textAlign: 'right' } },
    ],
    []
  );

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = {};
      if (typeFilter !== 'all') params.documentType = typeFilter;
      if (search.trim()) params.search = search.trim();
      await exportHrDocumentsCsv(params);
      toast.success('HR documents exported successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to export HR documents');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="admin-tab-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">HR & Corporate Documents</h1>
          <p className="admin-page-subtitle">
            Secure enterprise repository for offer letters, NDAs, contracts, and compliance forms
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={handleExportCsv}
            disabled={exporting}
            aria-label="Export HR documents list as CSV"
          >
            <DownloadIcon size={14} />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-btn--sm"
            onClick={handleOpenUpload}
          >
            <PlusIcon size={16} />
            <span>Upload Document</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={fetchDocumentsList}
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

      <FilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        placeholder="Search documents by title or description..."
        filters={[
          {
            id: 'doc-type-filter',
            label: 'Document Type',
            value: typeFilter,
            onChange: (val) => {
              setTypeFilter(val);
              setPage(1);
            },
            options: [
              { value: 'all', label: 'All Document Types' },
              { value: 'Offer Letter', label: 'Offer Letter' },
              { value: 'Joining Letter', label: 'Joining Letter' },
              { value: 'NDA', label: 'NDA' },
              { value: 'Salary Slip', label: 'Salary Slip' },
              { value: 'Experience Letter', label: 'Experience Letter' },
              { value: 'Relieving Letter', label: 'Relieving Letter' },
              { value: 'Education Certificate', label: 'Certificate' },
              { value: 'Other', label: 'Other Document' },
            ],
          },
        ]}
        onClear={
          search || typeFilter !== 'all'
            ? () => {
                setSearch('');
                setTypeFilter('all');
                setPage(1);
              }
            : undefined
        }
      />

      <Panel>
        <DataTable
          caption="HR Documents"
          columns={columns}
          data={documents}
          isLoading={loading}
          emptyMessage="No documents found."
          renderRow={(doc) => {
            const dateStr = doc.createdAt
              ? new Date(doc.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—';

            const empName = doc.employee
              ? typeof doc.employee === 'object'
                ? `${doc.employee.firstName || ''} ${doc.employee.lastName || ''}`.trim() || doc.employee.email
                : 'Assigned Staff'
              : 'Unassigned';

            return (
              <tr key={doc._id} className="admin-table-row">
                <td>
                  <div className="admin-table-user-cell">
                    <span className="admin-cell-title">{doc.title}</span>
                    <span className="admin-cell-sub">{doc.documentType}</span>
                    {doc.documentNumber && (
                      <span className="admin-cell-muted">Ref: {doc.documentNumber}</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className="admin-cell-title">{empName}</span>
                </td>
                <td>
                  <StatusBadge
                    label={doc.status || 'pending'}
                    tone={DOC_STATUS_TONE_MAP[doc.status] || 'slate'}
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
                      disabled={downloadingId === doc._id}
                      onClick={() => handleDownload(doc)}
                      title="Download File"
                    >
                      <DownloadIcon size={16} />
                    </button>

                    <select
                      className="admin-table-select"
                      value={doc.status || 'pending'}
                      onChange={(e) => handleStatusChange(doc._id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                      <option value="archived">Archived</option>
                    </select>

                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn--danger"
                      onClick={() => handleDelete(doc)}
                      title="Delete Document"
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

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && (
        <div className="admin-modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-doc-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="upload-doc-modal-title" className="admin-modal-title">
                  Upload Corporate Document
                </h3>
                <p className="admin-modal-subtitle">
                  Upload verified employment contracts, credentials, or compliance files
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setShowUploadModal(false)}
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            {uploadError && (
              <div className="admin-alert admin-alert--error" style={{ margin: '1rem 1.5rem 0' }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="admin-modal-form">
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="doc-emp-select">
                    Associated Employee *
                  </label>
                  <select
                    id="doc-emp-select"
                    className="admin-form-input"
                    value={docForm.employee}
                    onChange={(e) => setDocForm({ ...docForm, employee: e.target.value })}
                    required
                  >
                    <option value="">Select an employee...</option>
                    {employees.map((e) => (
                      <option key={e._id} value={e._id}>
                        {e.firstName} {e.lastName} ({e.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="doc-type-select">
                      Document Type *
                    </label>
                    <select
                      id="doc-type-select"
                      className="admin-form-input"
                      value={docForm.documentType}
                      onChange={(e) => setDocForm({ ...docForm, documentType: e.target.value })}
                    >
                      <option value="Offer Letter">Offer Letter</option>
                      <option value="Joining Letter">Joining Letter</option>
                      <option value="NDA">NDA</option>
                      <option value="Salary Slip">Salary Slip</option>
                      <option value="Experience Letter">Experience Letter</option>
                      <option value="Relieving Letter">Relieving Letter</option>
                      <option value="Education Certificate">Education Certificate</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="doc-num-input">
                      Document Reference Number
                    </label>
                    <input
                      id="doc-num-input"
                      type="text"
                      className="admin-form-input"
                      value={docForm.documentNumber}
                      onChange={(e) => setDocForm({ ...docForm, documentNumber: e.target.value })}
                      placeholder="e.g. AT-HR-2026-089"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="doc-title-input">
                    Document Title *
                  </label>
                  <input
                    id="doc-title-input"
                    type="text"
                    required
                    className="admin-form-input"
                    value={docForm.title}
                    onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                    placeholder="e.g. Senior Backend Engineer - Signed Offer Letter"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="doc-desc-input">
                    Description / Notes
                  </label>
                  <textarea
                    id="doc-desc-input"
                    className="admin-textarea"
                    rows={2}
                    value={docForm.description}
                    onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                    placeholder="Provide additional context or issuance notes..."
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="doc-file-input">
                    Document File Attachment (PDF, DOC, DOCX up to 10MB) *
                  </label>
                  <input
                    id="doc-file-input"
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,image/*"
                    className="admin-form-input"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={uploadSubmitting}
                >
                  {uploadSubmitting ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
