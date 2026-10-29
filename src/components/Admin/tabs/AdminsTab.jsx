import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAdmins,
  createAdminAccount,
  updateAdminStatus,
  updateAdminPermissions,
  deleteAdminAccount,
} from '../../../api';
import { Panel, DataTable, FilterBar, PaginationBar, StatusBadge } from '../AdminUI';
import { useAdminFeedback } from '../AdminFeedback';
import {
  CrownIcon,
  PlusIcon,
  TrashIcon,
  RefreshIcon,
  XMarkIcon,
  PencilSquareIcon,
} from '../../icons';

const ALL_PERMISSIONS = [
  { id: 'dashboard', label: 'Executive Dashboard (Overview)' },
  { id: 'inquiries', label: 'Contact Inquiries' },
  { id: 'careers', label: 'Careers & Applications' },
  { id: 'employees', label: 'Employees & HR Documents' },
  { id: 'content', label: 'CMS Content Blocks' },
  { id: 'media', label: 'Media Library' },
  { id: 'audit', label: 'Security Audit Logs' },
  { id: 'settings', label: 'Site Settings & Config' },
];

export default function AdminsTab({ currentUser }) {
  const { toast, confirm } = useAdminFeedback();

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Create admin modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    permissions: ['dashboard', 'inquiries', 'careers'],
  });

  // Edit permissions modal state
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [permsList, setPermsList] = useState([]);
  const [permsSubmitting, setPermsSubmitting] = useState(false);

  const fetchAdminsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (search.trim()) params.search = search.trim();

      const res = await getAdmins(params);
      const items = res?.data?.items || res?.data?.admins || res?.data || [];
      const total = res?.data?.total ?? items.length;
      const totalPages = res?.data?.totalPages ?? Math.max(1, Math.ceil(total / limit));

      setAdmins(items);
      setPagination({ total, totalPages });
    } catch (err) {
      setError(err.message || 'Failed to load administrator accounts');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchAdminsList();
  }, [fetchAdminsList]);

  // Create normal admin
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    const trimmedName = newAdminForm.name.trim();
    const trimmedUsername = newAdminForm.username.trim();
    const trimmedEmail = newAdminForm.email.trim();

    if (!trimmedName) {
      setCreateError('Full name is required');
      return;
    }
    if (!trimmedUsername || trimmedUsername.length < 3) {
      setCreateError('Username must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmedUsername)) {
      setCreateError('Username can only contain alphanumeric characters, dots, underscores, or hyphens');
      return;
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setCreateError('Invalid corporate email address');
      return;
    }
    if (!newAdminForm.password || newAdminForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters long');
      return;
    }

    setCreateSubmitting(true);
    try {
      await createAdminAccount({
        name: trimmedName,
        username: trimmedUsername,
        email: trimmedEmail || undefined,
        password: newAdminForm.password,
        role: 'Admin',
        permissions: newAdminForm.permissions,
      });

      toast.success(`Admin account "${trimmedUsername}" created successfully.`);
      setShowCreateModal(false);
      setNewAdminForm({
        name: '',
        username: '',
        email: '',
        password: '',
        permissions: ['dashboard', 'inquiries', 'careers'],
      });
      fetchAdminsList();
    } catch (err) {
      setCreateError(err.message || 'Failed to create administrator account');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleStatus = async (admin) => {
    if (admin._id === currentUser?.id || admin.username === currentUser?.username) {
      toast.error('You cannot deactivate your own active session.');
      return;
    }

    const nextStatus = !admin.isActive;
    try {
      await updateAdminStatus(admin._id, nextStatus);
      toast.success(
        `Admin "${admin.username}" is now ${nextStatus ? 'Active' : 'Deactivated'}.`
      );
      setAdmins((prev) =>
        prev.map((a) => (a._id === admin._id ? { ...a, isActive: nextStatus } : a))
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update admin status');
    }
  };

  // Open permissions editor
  const handleOpenPerms = (admin) => {
    setEditingAdmin(admin);
    setPermsList(Array.isArray(admin.permissions) ? [...admin.permissions] : []);
  };

  // Save permissions
  const handleSavePerms = async () => {
    if (!editingAdmin) return;
    setPermsSubmitting(true);
    try {
      await updateAdminPermissions(editingAdmin._id, permsList);
      toast.success(`Permissions updated for ${editingAdmin.username}.`);
      setAdmins((prev) =>
        prev.map((a) =>
          a._id === editingAdmin._id ? { ...a, permissions: permsList } : a
        )
      );
      setEditingAdmin(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save permissions');
    } finally {
      setPermsSubmitting(false);
    }
  };

  // Delete admin
  const handleDeleteAdmin = async (admin) => {
    if (admin._id === currentUser?.id || admin.username === currentUser?.username) {
      toast.error('You cannot delete your own account.');
      return;
    }

    const ok = await confirm({
      title: 'Delete Administrator Account',
      message: `Permanently delete admin account "${admin.username}" (${admin.name})? All access credentials and active tokens will be immediately invalidated.`,
      confirmLabel: 'Delete Admin',
      tone: 'danger',
    });

    if (!ok) return;

    try {
      await deleteAdminAccount(admin._id);
      toast.success(`Admin account "${admin.username}" deleted.`);
      fetchAdminsList();
    } catch (err) {
      toast.error(err.message || 'Failed to delete admin account');
    }
  };

  const columns = useMemo(
    () => [
      { key: 'user', label: 'Admin Identity' },
      { key: 'role', label: 'Role & Role Level' },
      { key: 'perms', label: 'Active Permissions' },
      { key: 'status', label: 'Status' },
      { key: 'actions', label: 'Actions', style: { textAlign: 'right' } },
    ],
    []
  );

  return (
    <div className="admin-tab-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Administrator Accounts & Access Control</h1>
          <p className="admin-page-subtitle">
            Superadmin governance: provision operational admin accounts, configure granular permissions, and manage access
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-btn--sm"
            onClick={() => {
              setCreateError('');
              setShowCreateModal(true);
            }}
          >
            <PlusIcon size={16} />
            <span>Create Admin</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={fetchAdminsList}
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
        placeholder="Search admins by username, name, or email..."
        onClear={search ? () => setSearch('') : undefined}
      />

      <Panel>
        <DataTable
          caption="Administrator Accounts"
          columns={columns}
          data={admins}
          isLoading={loading}
          emptyMessage="No administrator accounts found."
          renderRow={(admin) => {
            const isSuper = admin.role === 'Superadmin';
            const isSelf =
              admin._id === currentUser?.id || admin.username === currentUser?.username;

            return (
              <tr key={admin._id} className="admin-table-row">
                <td>
                  <div className="admin-table-user-cell">
                    <span className="admin-cell-title">
                      {admin.name} {isSelf && <span className="admin-self-pill">(You)</span>}
                    </span>
                    <span className="admin-cell-sub" style={{ fontFamily: 'monospace' }}>
                      @{admin.username}
                    </span>
                    {admin.email && <span className="admin-cell-muted">{admin.email}</span>}
                  </div>
                </td>
                <td>
                  <StatusBadge
                    label={admin.role || 'Admin'}
                    tone={isSuper ? 'amber' : 'blue'}
                  />
                </td>
                <td>
                  {isSuper ? (
                    <span className="admin-cell-muted">Full Platform Access (Root)</span>
                  ) : (
                    <div className="admin-perms-tags">
                      {(admin.permissions || []).slice(0, 4).map((p) => (
                        <span key={p} className="admin-perm-tag">
                          {p}
                        </span>
                      ))}
                      {(admin.permissions || []).length > 4 && (
                        <span className="admin-perm-tag admin-perm-tag--more">
                          +{(admin.permissions || []).length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td>
                  <StatusBadge
                    label={admin.isActive ? 'Active' : 'Inactive'}
                    tone={admin.isActive ? 'green' : 'slate'}
                  />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="admin-table-actions">
                    {!isSuper && (
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={() => handleOpenPerms(admin)}
                        title="Edit Permissions"
                      >
                        <PencilSquareIcon size={16} />
                      </button>
                    )}

                    <button
                      type="button"
                      className="admin-action-btn"
                      disabled={isSelf}
                      onClick={() => handleToggleStatus(admin)}
                      title={admin.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {admin.isActive ? 'Deactivate' : 'Activate'}
                    </button>

                    {!isSuper && !isSelf && (
                      <button
                        type="button"
                        className="admin-action-btn admin-action-btn--danger"
                        onClick={() => handleDeleteAdmin(admin)}
                        title="Delete Admin"
                      >
                        <TrashIcon size={16} />
                      </button>
                    )}
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

      {/* CREATE NORMAL ADMIN MODAL */}
      {showCreateModal && (
        <div className="admin-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-admin-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '580px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="create-admin-modal-title" className="admin-modal-title">
                  Create Operational Admin Account
                </h3>
                <p className="admin-modal-subtitle">
                  Provision restricted administrative access with granular permissions
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            {createError && (
              <div className="admin-alert admin-alert--error" style={{ margin: '1rem 1.5rem 0' }}>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} noValidate>
              <div className="admin-modal-body">
                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="create-admin-name">
                    Full Legal Name *
                  </label>
                  <input
                    id="create-admin-name"
                    type="text"
                    required
                    className="admin-form-input"
                    value={newAdminForm.name}
                    onChange={(e) =>
                      setNewAdminForm({ ...newAdminForm, name: e.target.value })
                    }
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="create-admin-username">
                      Username *
                    </label>
                    <input
                      id="create-admin-username"
                      type="text"
                      required
                      className="admin-form-input"
                      value={newAdminForm.username}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, username: e.target.value })
                      }
                      placeholder="e.g. john.admin"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="create-admin-email">
                      Company Email
                    </label>
                    <input
                      id="create-admin-email"
                      type="email"
                      className="admin-form-input"
                      value={newAdminForm.email}
                      onChange={(e) =>
                        setNewAdminForm({ ...newAdminForm, email: e.target.value })
                      }
                      placeholder="e.g. john@ashivamtechnologies.com"
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="create-admin-password">
                    Initial Password (min 8 characters) *
                  </label>
                  <input
                    id="create-admin-password"
                    type="password"
                    required
                    minLength={8}
                    className="admin-form-input"
                    value={newAdminForm.password}
                    onChange={(e) =>
                      setNewAdminForm({ ...newAdminForm, password: e.target.value })
                    }
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">
                    Granted Module Permissions
                  </label>
                  <div className="admin-checkbox-list">
                    {ALL_PERMISSIONS.map((perm) => (
                      <label key={perm.id} className="admin-checkbox-label">
                        <input
                          type="checkbox"
                          checked={newAdminForm.permissions.includes(perm.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewAdminForm({
                                ...newAdminForm,
                                permissions: [...newAdminForm.permissions, perm.id],
                              });
                            } else {
                              setNewAdminForm({
                                ...newAdminForm,
                                permissions: newAdminForm.permissions.filter(
                                  (p) => p !== perm.id
                                ),
                              });
                            }
                          }}
                        />
                        <span>{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="admin-btn admin-btn--secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={createSubmitting}
                >
                  {createSubmitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PERMISSIONS MODAL */}
      {editingAdmin && (
        <div className="admin-modal-overlay" onClick={() => setEditingAdmin(null)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-perms-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="edit-perms-title" className="admin-modal-title">
                  Edit Admin Permissions
                </h3>
                <p className="admin-modal-subtitle">
                  Configure feature privileges for @{editingAdmin.username}
                </p>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setEditingAdmin(null)}
              >
                <XMarkIcon size={18} />
              </button>
            </div>

            <div className="admin-modal-body">
              <div className="admin-checkbox-list">
                {ALL_PERMISSIONS.map((perm) => (
                  <label key={perm.id} className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={permsList.includes(perm.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPermsList([...permsList, perm.id]);
                        } else {
                          setPermsList(permsList.filter((p) => p !== perm.id));
                        }
                      }}
                    />
                    <span>{perm.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="admin-modal-footer">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => setEditingAdmin(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={permsSubmitting}
                onClick={handleSavePerms}
              >
                {permsSubmitting ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
