import { useState, useEffect, useCallback, useMemo } from 'react';
import { getMediaList, uploadMediaFile, deleteMediaFile } from '../../../api';
import { Panel, FilterBar, PaginationBar, EmptyState } from '../AdminUI';
import { useAdminFeedback } from '../AdminFeedback';
import {
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  RefreshIcon,
  XMarkIcon,
  CheckIcon,
} from '../../icons';

export default function MediaTab() {
  const { toast, confirm } = useAdminFeedback();

  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(16);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [copiedId, setCopiedId] = useState(null);

  // Upload modal state
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('image');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const res = await getMediaList(params);
      const items = res?.data?.items || res?.data?.media || res?.data || [];
      const total = res?.data?.total ?? items.length;
      const totalPages = res?.data?.totalPages ?? Math.max(1, Math.ceil(total / limit));

      setMediaList(items);
      setPagination({ total, totalPages });
    } catch (err) {
      setError(err.message || 'Failed to load media assets');
    } finally {
      setLoading(false);
    }
  }, [page, limit, categoryFilter]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleCopyUrl = (m) => {
    if (!m.url) return;
    navigator.clipboard.writeText(m.url);
    setCopiedId(m._id);
    toast.success('Asset URL copied to clipboard.');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!file) {
      setUploadError('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    setUploading(true);
    try {
      await uploadMediaFile(formData);
      toast.success('Media asset uploaded successfully.');
      setShowModal(false);
      setFile(null);
      fetchMedia();
    } catch (err) {
      setUploadError(err.message || 'Failed to upload asset');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (m) => {
    const ok = await confirm({
      title: 'Delete Media Asset',
      message: `Permanently delete media file "${m.originalName || m.filename}"? Public references to this asset URL will return 404.`,
      confirmLabel: 'Delete File',
      tone: 'danger',
    });

    if (!ok) return;

    try {
      await deleteMediaFile(m._id);
      toast.success('Asset deleted successfully.');
      fetchMedia();
    } catch (err) {
      toast.error(err.message || 'Failed to delete asset');
    }
  };

  return (
    <div className="admin-tab-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Media Library</h1>
          <p className="admin-page-subtitle">
            Upload and manage images, branding logos, icons, and public web assets
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-btn--sm"
            onClick={() => {
              setUploadError('');
              setFile(null);
              setShowModal(true);
            }}
          >
            <PlusIcon size={16} />
            <span>Upload Asset</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={fetchMedia}
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
        filters={[
          {
            id: 'media-category-filter',
            label: 'Category',
            value: categoryFilter,
            onChange: (val) => {
              setCategoryFilter(val);
              setPage(1);
            },
            options: [
              { value: 'all', label: 'All Media Categories' },
              { value: 'image', label: 'Images & Photos' },
              { value: 'icon', label: 'Icons & Vectors' },
              { value: 'document', label: 'Documents' },
              { value: 'other', label: 'Other Assets' },
            ],
          },
        ]}
        onClear={
          categoryFilter !== 'all'
            ? () => {
                setCategoryFilter('all');
                setPage(1);
              }
            : undefined
        }
      />

      <Panel>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div className="admin-spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '0.875rem', color: '#64748B' }}>Loading media assets...</p>
          </div>
        ) : mediaList.length === 0 ? (
          <EmptyState
            icon={PhotoIcon}
            title="No Media Assets Found"
            description="Your media library is empty. Click 'Upload Asset' to add brand assets."
          />
        ) : (
          <div className="admin-media-grid">
            {mediaList.map((m) => {
              const isImage =
                m.mimeType?.startsWith('image/') ||
                /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(m.url || m.filename);

              const sizeKb = m.size ? Math.round(m.size / 1024) : null;

              return (
                <div key={m._id} className="admin-media-card">
                  <div className="admin-media-thumb">
                    {isImage && m.url ? (
                      <img
                        src={m.url}
                        alt={m.originalName || 'Asset preview'}
                        loading="lazy"
                        className="admin-media-img"
                      />
                    ) : (
                      <div className="admin-media-placeholder">
                        <PhotoIcon size={32} />
                      </div>
                    )}
                  </div>

                  <div className="admin-media-info">
                    <span className="admin-media-name" title={m.originalName || m.filename}>
                      {m.originalName || m.filename || 'asset'}
                    </span>
                    <span className="admin-media-meta">
                      {m.category || 'Asset'} {sizeKb ? `• ${sizeKb} KB` : ''}
                    </span>
                  </div>

                  <div className="admin-media-actions">
                    <button
                      type="button"
                      className="admin-btn admin-btn--secondary admin-btn--xs"
                      onClick={() => handleCopyUrl(m)}
                    >
                      {copiedId === m._id ? (
                        <>
                          <CheckIcon size={12} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <span>Copy URL</span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn--danger"
                      onClick={() => handleDelete(m)}
                      title="Delete Asset"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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

      {/* UPLOAD MODAL */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-media-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="upload-media-title" className="admin-modal-title">
                  Upload Media Asset
                </h3>
                <p className="admin-modal-subtitle">
                  Upload images, icons, or brand materials to the cloud
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setShowModal(false)}
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            {uploadError && (
              <div className="admin-alert admin-alert--error" style={{ margin: '1rem 1.5rem 0' }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit}>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="media-cat-select">
                    Category *
                  </label>
                  <select
                    id="media-cat-select"
                    className="admin-form-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="image">Image (Web banner, portrait, asset)</option>
                    <option value="icon">Icon / Vector</option>
                    <option value="document">Public Document</option>
                    <option value="other">Other Asset</option>
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="media-file-input">
                    Select File *
                  </label>
                  <input
                    id="media-file-input"
                    type="file"
                    required
                    className="admin-form-input"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
