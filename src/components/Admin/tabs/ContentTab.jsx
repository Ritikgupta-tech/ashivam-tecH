import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getContentBlocks,
  createContentBlock,
  updateContentBlock,
  publishContentBlock,
  unpublishContentBlock,
  deleteContentBlock,
} from '../../../api';
import { Panel, DataTable, FilterBar, PaginationBar, StatusBadge, EmptyState } from '../AdminUI';
import { useAdminFeedback } from '../AdminFeedback';
import {
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  RefreshIcon,
  XMarkIcon,
} from '../../icons';

export default function ContentTab() {
  const { toast, confirm } = useAdminFeedback();

  const [contentList, setContentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    key: '',
    section: 'hero',
    title: '',
    content: '',
    status: 'draft',
  });

  const fetchContentList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (sectionFilter !== 'all') params.section = sectionFilter;
      if (search.trim()) params.search = search.trim();

      const res = await getContentBlocks(params);
      const items = res?.data?.items || res?.data?.content || res?.data || [];
      const total = res?.data?.total ?? items.length;
      const totalPages = res?.data?.totalPages ?? Math.max(1, Math.ceil(total / limit));

      setContentList(items);
      setPagination({ total, totalPages });
    } catch (err) {
      setError(err.message || 'Failed to load CMS content');
    } finally {
      setLoading(false);
    }
  }, [page, limit, sectionFilter, search]);

  useEffect(() => {
    fetchContentList();
  }, [fetchContentList]);

  const handleOpenCreate = () => {
    setEditingContent(null);
    setFormError('');
    setForm({
      key: '',
      section: 'hero',
      title: '',
      content: '',
      status: 'draft',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingContent(c);
    setFormError('');

    let contentString = '';
    if (typeof c.content === 'object' && c.content !== null) {
      if (c.content.text && Object.keys(c.content).length === 1) {
        contentString = c.content.text;
      } else {
        contentString = JSON.stringify(c.content, null, 2);
      }
    } else {
      contentString = String(c.content || '');
    }

    setForm({
      key: c.key || '',
      section: c.section || 'hero',
      title: c.title || '',
      content: contentString,
      status: c.status || 'draft',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const key = form.key.trim().toLowerCase();
    const title = form.title.trim();
    if (!key) {
      setFormError('Content block key is required');
      return;
    }
    if (!title) {
      setFormError('Content block title is required');
      return;
    }

    // Format content as verified by tests/adminDashboardModules.test.js
    let parsedContent = (form.content || '').trim();
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
      key,
      section: form.section.trim().toLowerCase(),
      title,
      content: parsedContent,
      status: form.status || 'draft',
    };

    setSubmitting(true);
    try {
      if (editingContent) {
        await updateContentBlock(editingContent._id, payload);
        toast.success(`Content block "${key}" updated.`);
      } else {
        await createContentBlock(payload);
        toast.success(`Content block "${key}" created.`);
      }

      setShowModal(false);
      fetchContentList();
    } catch (err) {
      setFormError(err.message || 'Failed to save content block');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (c) => {
    const isCurrentlyPublished = c.status === 'published';
    try {
      if (isCurrentlyPublished) {
        await unpublishContentBlock(c._id);
        toast.success(`Content block "${c.key}" reverted to draft.`);
      } else {
        await publishContentBlock(c._id);
        toast.success(`Content block "${c.key}" published live.`);
      }

      setContentList((prev) =>
        prev.map((item) =>
          item._id === c._id
            ? { ...item, status: isCurrentlyPublished ? 'draft' : 'published' }
            : item
        )
      );
    } catch (err) {
      toast.error(err.message || 'Failed to toggle publication status');
    }
  };

  const handleDelete = async (c) => {
    const ok = await confirm({
      title: 'Delete CMS Content Block',
      message: `Permanently delete content block "${c.key}"? This will remove its content from public website sections.`,
      confirmLabel: 'Delete Block',
      tone: 'danger',
    });

    if (!ok) return;

    try {
      await deleteContentBlock(c._id);
      toast.success(`Content block "${c.key}" deleted.`);
      fetchContentList();
    } catch (err) {
      toast.error(err.message || 'Failed to delete content block');
    }
  };

  const columns = useMemo(
    () => [
      { key: 'key', label: 'Key & Section' },
      { key: 'title', label: 'Title & Preview' },
      { key: 'status', label: 'Status' },
      { key: 'date', label: 'Updated' },
      { key: 'actions', label: 'Actions', style: { textAlign: 'right' } },
    ],
    []
  );

  return (
    <div className="admin-tab-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">CMS Content Blocks</h1>
          <p className="admin-page-subtitle">
            Manage dynamic marketing copy, section headers, announcements, and website messaging
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-btn--sm"
            onClick={handleOpenCreate}
          >
            <PlusIcon size={16} />
            <span>Create Block</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={fetchContentList}
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
        placeholder="Search content by key or title..."
        filters={[
          {
            id: 'content-section-filter',
            label: 'Section',
            value: sectionFilter,
            onChange: (val) => {
              setSectionFilter(val);
              setPage(1);
            },
            options: [
              { value: 'all', label: 'All Website Sections' },
              { value: 'hero', label: 'Hero Banner' },
              { value: 'about', label: 'About Company' },
              { value: 'solutions', label: 'Solutions & Services' },
              { value: 'industries', label: 'Industries' },
              { value: 'culture', label: 'Culture & Careers' },
              { value: 'contact', label: 'Contact Section' },
            ],
          },
        ]}
        onClear={
          search || sectionFilter !== 'all'
            ? () => {
                setSearch('');
                setSectionFilter('all');
                setPage(1);
              }
            : undefined
        }
      />

      <Panel>
        <DataTable
          caption="CMS Content Blocks"
          columns={columns}
          data={contentList}
          isLoading={loading}
          emptyMessage="No content blocks found. Click 'Create Block' to add dynamic copy."
          renderRow={(c) => {
            const dateStr = c.updatedAt || c.createdAt
              ? new Date(c.updatedAt || c.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—';

            const previewText =
              typeof c.content === 'object' && c.content !== null
                ? c.content.text || JSON.stringify(c.content).slice(0, 70)
                : String(c.content || '').slice(0, 70);

            return (
              <tr key={c._id} className="admin-table-row">
                <td>
                  <div className="admin-table-user-cell">
                    <span className="admin-cell-title">
                      <code>{c.key}</code>
                    </span>
                    <span className="admin-cell-sub">{c.section}</span>
                  </div>
                </td>
                <td>
                  <span className="admin-cell-title">{c.title}</span>
                  <p className="admin-cell-snippet">{previewText}</p>
                </td>
                <td>
                  <StatusBadge
                    label={c.status || 'draft'}
                    tone={c.status === 'published' ? 'green' : 'amber'}
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
                      onClick={() => handleTogglePublish(c)}
                      title={c.status === 'published' ? 'Unpublish' : 'Publish'}
                    >
                      {c.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn"
                      onClick={() => handleOpenEdit(c)}
                      title="Edit Block"
                    >
                      <PencilSquareIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn--danger"
                      onClick={() => handleDelete(c)}
                      title="Delete Block"
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

      {/* CREATE / EDIT CONTENT MODAL */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="content-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="content-modal-title" className="admin-modal-title">
                  {editingContent ? 'Edit Content Block' : 'Create Content Block'}
                </h3>
                <p className="admin-modal-subtitle">
                  Configure programmatic content key, title, and rich text or JSON body
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

            {formError && (
              <div className="admin-alert admin-alert--error" style={{ margin: '1rem 1.5rem 0' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="admin-modal-body">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="content-key-input">
                      Unique Key (slug) *
                    </label>
                    <input
                      id="content-key-input"
                      type="text"
                      required
                      className="admin-form-input"
                      value={form.key}
                      onChange={(e) => setForm({ ...form, key: e.target.value })}
                      placeholder="e.g. hero_subheading"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="content-section-select">
                      Section *
                    </label>
                    <select
                      id="content-section-select"
                      className="admin-form-input"
                      value={form.section}
                      onChange={(e) => setForm({ ...form, section: e.target.value })}
                    >
                      <option value="hero">Hero</option>
                      <option value="about">About</option>
                      <option value="solutions">Solutions</option>
                      <option value="industries">Industries</option>
                      <option value="culture">Culture</option>
                      <option value="contact">Contact</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="content-title-input">
                    Block Title *
                  </label>
                  <input
                    id="content-title-input"
                    type="text"
                    required
                    className="admin-form-input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Empowering Enterprise Innovation"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="content-body-input">
                    Content Body (Text or valid JSON)
                  </label>
                  <textarea
                    id="content-body-input"
                    className="admin-textarea"
                    rows={4}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Enter copy text or JSON object like: { &quot;subtitle&quot;: &quot;...&quot; }"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="content-status-select">
                    Publishing Status
                  </label>
                  <select
                    id="content-status-select"
                    className="admin-form-input"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="draft">Draft (Private)</option>
                    <option value="published">Published (Live)</option>
                  </select>
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
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : editingContent ? 'Update Block' : 'Save Block'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
