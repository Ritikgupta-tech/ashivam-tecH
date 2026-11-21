import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
  exportEmployeesCsv,
  resendEmployeeInvitation,
  updateEmployeeAccountStatus,
  updateEmployeeEmploymentStatus,
  adminResetEmployeePassword,
  getDevActivationLink,
} from '../../../api';
import { Panel, DataTable, FilterBar, PaginationBar, StatusBadge, EmptyState } from '../AdminUI';
import { useAdminFeedback } from '../AdminFeedback';
import {
  UsersIcon,
  PlusIcon,
  TrashIcon,
  RefreshIcon,
  XMarkIcon,
  PencilSquareIcon,
  DownloadIcon,
  KeyIcon,
} from '../../icons';

const formatInvitationErrorMessage = (errorMsg) => {
  if (!errorMsg) return 'Email delivery rejected';
  if (/only send testing emails|resend\.com\/domains/i.test(errorMsg)) {
    return 'Resend Sandbox Mode: External recipients require domain verification or Brevo provider';
  }
  return errorMsg;
};

export default function EmployeesTab() {
  const { toast, confirm } = useAdminFeedback();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    employeeId: '',
    googleEmail: '',
    phone: '',
    designation: '',
    department: 'Software Engineering',
    employmentType: 'Full-time',
    employmentStatus: 'ACTIVE',
    accountStatus: 'INVITED',
    workLocation: 'Office',
    joiningDate: new Date().toISOString().split('T')[0],
    bio: '',
    skills: '',
    linkedin: '',
    github: '',
    isActive: true,
  });

  const fetchEmployeesList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit };
      if (deptFilter !== 'all') params.department = deptFilter;
      if (search.trim()) params.search = search.trim();

      const res = await getEmployees(params);
      const items = res?.data?.items || res?.data?.employees || res?.data || [];
      const total = res?.data?.total ?? items.length;
      const totalPages = res?.data?.totalPages ?? Math.max(1, Math.ceil(total / limit));

      setEmployees(items);
      setPagination({ total, totalPages });
    } catch (err) {
      setError(err.message || 'Failed to load employee records');
    } finally {
      setLoading(false);
    }
  }, [page, limit, deptFilter, search]);

  useEffect(() => {
    fetchEmployeesList();
  }, [fetchEmployeesList]);

  // Validation
  const validateForm = () => {
    const errors = {};
    if (!form.firstName?.trim()) errors.firstName = 'First name is required';
    if (!form.lastName?.trim()) errors.lastName = 'Last name is required';
    if (!form.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Valid corporate email is required';
    }
    if (!form.designation?.trim()) errors.designation = 'Designation is required';
    if (!form.department?.trim()) errors.department = 'Department is required';
    if (!form.joiningDate) errors.joiningDate = 'Joining date is required';

    const validEmploymentTypes = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Freelance'];
    if (!validEmploymentTypes.includes(form.employmentType)) {
      errors.employmentType = 'Invalid employment type';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreate = () => {
    setEditingEmp(null);
    setFormErrors({});
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      employeeId: '',
      googleEmail: '',
      phone: '',
      designation: '',
      department: 'Software Engineering',
      employmentType: 'Full-time',
      employmentStatus: 'ACTIVE',
      accountStatus: 'INVITED',
      workLocation: 'Office',
      joiningDate: new Date().toISOString().split('T')[0],
      bio: '',
      skills: '',
      linkedin: '',
      github: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmp(emp);
    setFormErrors({});
    setForm({
      firstName: emp.firstName || '',
      lastName: emp.lastName || '',
      email: emp.email || '',
      employeeId: emp.employeeId || '',
      googleEmail: emp.googleEmail || '',
      phone: emp.phone || '',
      designation: emp.designation || '',
      department: emp.department || 'Software Engineering',
      employmentType: emp.employmentType || 'Full-time',
      employmentStatus: emp.employmentStatus || (emp.isActive ? 'ACTIVE' : 'INACTIVE'),
      accountStatus: emp.accountStatus || (emp.isActive ? 'ACTIVE' : 'DEACTIVATED'),
      workLocation: emp.workLocation || 'Office',
      joiningDate: emp.joiningDate
        ? new Date(emp.joiningDate).toISOString().split('T')[0]
        : '',
      bio: emp.bio || '',
      skills: Array.isArray(emp.skills) ? emp.skills.join(', ') : emp.skills || '',
      linkedin: emp.linkedin || '',
      github: emp.github || '',
      isActive: emp.isActive !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const skillsArray = (form.skills || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        employeeId: form.employeeId?.trim() ? form.employeeId.trim().toUpperCase() : undefined,
        googleEmail: form.googleEmail?.trim() ? form.googleEmail.trim().toLowerCase() : undefined,
        phone: form.phone.trim(),
        designation: form.designation.trim(),
        department: form.department,
        employmentType: form.employmentType,
        employmentStatus: form.employmentStatus || 'ACTIVE',
        accountStatus: form.accountStatus || 'INVITED',
        workLocation: form.workLocation,
        joiningDate: form.joiningDate,
        bio: form.bio.trim(),
        skills: skillsArray,
        linkedin: form.linkedin.trim(),
        github: form.github.trim(),
        isActive: Boolean(form.isActive),
      };

      if (editingEmp) {
        await updateEmployee(editingEmp._id, payload);
        toast.success(`Employee profile for ${payload.firstName} ${payload.lastName} updated.`);
      } else {
        const createRes = await createEmployee(payload);
        const invitationStatus = createRes?.data?.invitationStatus || createRes?.data?.employee?.invitationStatus;
        const invitationError = createRes?.data?.invitationError || createRes?.data?.employee?.invitationError;
        const activationUrl = createRes?.data?.activationUrl || createRes?.data?.employee?.activationUrl;

        if (invitationStatus === 'FAILED') {
          if (activationUrl && navigator.clipboard) {
            try {
              await navigator.clipboard.writeText(activationUrl);
            } catch {
              // Ignore clipboard errors
            }
          }
          const cleanError = formatInvitationErrorMessage(invitationError);
          toast.warning(
            `Staff member ${payload.firstName} registered! Email delivery failed (${cleanError}).${activationUrl ? ' Direct activation link copied to clipboard!' : ''}`
          );
        } else {
          toast.success(`Employee ${payload.firstName} ${payload.lastName} registered and activation invitation sent.`);
        }
      }

      setShowModal(false);
      fetchEmployeesList();
    } catch (err) {
      toast.error(err.message || 'Failed to save employee profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvitation = async (emp) => {
    if (resendingId === emp._id) return;
    setResendingId(emp._id);
    try {
      const res = await resendEmployeeInvitation(emp._id);
      const activationUrl = res?.data?.activationUrl || res?.data?.employee?.activationUrl;
      if (res?.data?.invitationStatus === 'FAILED') {
        if (activationUrl && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(activationUrl);
          } catch {
            // Ignore clipboard errors
          }
        }
        const cleanError = formatInvitationErrorMessage(res?.data?.invitationError);
        toast.warning(
          `Token generated, but email delivery failed (${cleanError}).${activationUrl ? ' Activation link copied to clipboard!' : ''}`
        );
      } else {
        toast.success(`Activation invitation email dispatched to ${emp.email}.`);
      }
      fetchEmployeesList();
    } catch (err) {
      toast.error(err.message || 'Failed to resend activation invitation');
    } finally {
      setResendingId(null);
    }
  };

  const handleAdminResetPassword = async (emp) => {
    const ok = await confirm({
      title: 'Initiate Employee Password Reset',
      message: `Send an official password reset link to "${emp.firstName} ${emp.lastName}" (${emp.email})?`,
      confirmLabel: 'Send Reset Link',
      tone: 'primary',
    });
    if (!ok) return;

    try {
      await adminResetEmployeePassword(emp._id);
      toast.success(`Password reset link dispatched to ${emp.email}.`);
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch password reset link');
    }
  };

  const handleToggleStatus = async (emp) => {
    const nextStatus = !emp.isActive;
    try {
      await updateEmployeeStatus(emp._id, nextStatus);
      toast.success(
        `Staff member ${emp.firstName} ${emp.lastName} is now ${nextStatus ? 'Active' : 'Deactivated'}.`
      );
      setEmployees((prev) =>
        prev.map((e) => (e._id === emp._id ? { ...e, isActive: nextStatus } : e))
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update employee status');
    }
  };

  const handleDelete = async (emp) => {
    const ok = await confirm({
      title: 'Deactivate / Soft-Delete Employee',
      message: `Soft-delete employee record for "${emp.firstName} ${emp.lastName}" (${emp.email})? Historical audit records will be preserved.`,
      confirmLabel: 'Delete Record',
      tone: 'danger',
    });

    if (!ok) return;

    try {
      await deleteEmployee(emp._id);
      toast.success(`Employee ${emp.firstName} ${emp.lastName} soft-deleted.`);
      fetchEmployeesList();
    } catch (err) {
      toast.error(err.message || 'Failed to delete employee record');
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = {};
      if (deptFilter !== 'all') params.department = deptFilter;
      if (search.trim()) params.search = search.trim();
      await exportEmployeesCsv(params);
      toast.success('Employee directory exported successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to export employee directory');
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo(
    () => [
      { key: 'employee', label: 'Employee & Corporate ID' },
      { key: 'role', label: 'Role & Department' },
      { key: 'google', label: 'Google Meet Email' },
      { key: 'accountStatus', label: 'Security & Activation' },
      { key: 'status', label: 'Employment' },
      { key: 'actions', label: 'Actions', style: { textAlign: 'right' } },
    ],
    []
  );

  return (
    <div className="admin-tab-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Employee Directory</h1>
          <p className="admin-page-subtitle">
            Manage corporate staff, designations, active service status, and credentials
          </p>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={handleExportCsv}
            disabled={exporting}
            aria-label="Export employee directory as CSV"
          >
            <DownloadIcon size={14} />
            <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--primary admin-btn--sm"
            onClick={handleOpenCreate}
          >
            <PlusIcon size={16} />
            <span>Add Employee</span>
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={fetchEmployeesList}
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
        placeholder="Search staff by name, email, or designation..."
        filters={[
          {
            id: 'emp-dept-filter',
            label: 'Department',
            value: deptFilter,
            onChange: (val) => {
              setDeptFilter(val);
              setPage(1);
            },
            options: [
              { value: 'all', label: 'All Departments' },
              { value: 'Software Engineering', label: 'Software Engineering' },
              { value: 'Cloud Infrastructure', label: 'Cloud Infrastructure' },
              { value: 'AI & Machine Learning', label: 'AI & Machine Learning' },
              { value: 'UI/UX & Product Design', label: 'UI/UX & Design' },
              { value: 'Operations & Quality', label: 'Operations & Quality' },
            ],
          },
        ]}
        onClear={
          search || deptFilter !== 'all'
            ? () => {
                setSearch('');
                setDeptFilter('all');
                setPage(1);
              }
            : undefined
        }
      />

      <Panel>
        <DataTable
          caption="Staff Members"
          columns={columns}
          data={employees}
          isLoading={loading}
          emptyMessage="No employees found in directory."
          renderRow={(emp) => {
            const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();

            return (
              <tr key={emp._id} className="admin-table-row">
                <td>
                  <div className="admin-table-user-cell" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
                    <div className="admin-avatar-small" aria-hidden="true">
                      {initials || 'E'}
                    </div>
                    <div>
                      <span className="admin-cell-title">
                        {emp.firstName} {emp.lastName}
                      </span>
                      <span className="admin-cell-sub">{emp.email}</span>
                      {emp.employeeId && (
                        <span style={{ display: 'inline-block', fontSize: '0.7rem', padding: '1px 6px', background: '#f1f5f9', color: '#0f172a', borderRadius: '4px', marginTop: '2px', fontFamily: 'monospace', fontWeight: 600 }}>
                          {emp.employeeId}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <span className="admin-cell-title">{emp.designation}</span>
                  <span className="admin-cell-sub">{emp.department}</span>
                </td>
                <td>
                  <span className="admin-cell-title" style={{ fontSize: '0.85rem' }}>
                    {emp.googleEmail || emp.email}
                  </span>
                  <span className="admin-cell-sub" style={{ fontSize: '0.75rem', color: emp.googleEmail ? '#10b981' : '#64748b' }}>
                    {emp.googleEmail ? 'Mapped for Meet' : 'Default to Work Email'}
                  </span>
                </td>
                <td>
                  {(() => {
                    const st = emp.accountStatus || (emp.isActive ? 'ACTIVE' : 'DEACTIVATED');
                    if (st === 'ACTIVE') return <StatusBadge label="Active / Verified" tone="green" />;
                    if (emp.invitationStatus === 'FAILED') {
                      return (
                        <div>
                          <StatusBadge label="Invite Failed" tone="red" />
                          {emp.invitationError && (
                            <div
                              style={{
                                fontSize: '0.68rem',
                                color: '#ef4444',
                                marginTop: '3px',
                                maxWidth: '140px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={emp.invitationError}
                            >
                              {emp.invitationError}
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (emp.invitationStatus === 'SENT' || st === 'PENDING_ACTIVATION') {
                      return <StatusBadge label="Pending Activation" tone="amber" />;
                    }
                    if (st === 'INVITED') return <StatusBadge label="Invited" tone="blue" />;
                    if (st === 'SUSPENDED') return <StatusBadge label="Suspended" tone="amber" />;
                    return <StatusBadge label="Deactivated" tone="red" />;
                  })()}
                </td>
                <td>
                  <StatusBadge
                    label={emp.deletedAt ? 'Deleted' : emp.employmentStatus || (emp.isActive ? 'ACTIVE' : 'INACTIVE')}
                    tone={emp.deletedAt ? 'red' : (emp.employmentStatus === 'ACTIVE' || emp.isActive) ? 'green' : 'slate'}
                  />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="admin-table-actions">
                    {/* Resend Invitation if account is not active */}
                    {(emp.accountStatus === 'INVITED' || emp.accountStatus === 'PENDING_ACTIVATION') && !emp.deletedAt && (
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={() => handleResendInvitation(emp)}
                        disabled={resendingId === emp._id}
                        title="Resend Activation Invitation"
                        style={{
                          color: '#2563eb',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          opacity: resendingId === emp._id ? 0.6 : 1,
                          cursor: resendingId === emp._id ? 'wait' : 'pointer',
                        }}
                      >
                        {resendingId === emp._id ? 'Sending...' : 'Resend Invite'}
                      </button>
                    )}
                    {/* Direct activation link copy helper for Superadmins */}
                    {(emp.accountStatus === 'INVITED' || emp.accountStatus === 'PENDING_ACTIVATION') && !emp.deletedAt && (
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={async () => {
                          try {
                            const res = await getDevActivationLink(emp.employeeId || emp._id);
                            if (res?.data?.activationUrl) {
                              await navigator.clipboard.writeText(res.data.activationUrl);
                              toast.success(`Activation link for ${emp.firstName || 'employee'} copied to clipboard!`);
                            }
                          } catch (e) {
                            toast.error("Link Error: " + (e.message || "Failed to generate link"));
                          }
                        }}
                        title="Copy direct activation link to clipboard"
                        style={{ color: '#059669', fontWeight: 600, fontSize: '0.75rem' }}
                      >
                        Copy Link
                      </button>
                    )}
                    {/* Password reset for active accounts */}
                    {emp.accountStatus === 'ACTIVE' && !emp.deletedAt && (
                      <button
                        type="button"
                        className="admin-action-btn"
                        onClick={() => handleAdminResetPassword(emp)}
                        title="Dispatch Password Reset Link"
                      >
                        <KeyIcon size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-action-btn"
                      onClick={() => handleToggleStatus(emp)}
                      title={emp.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {emp.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn"
                      onClick={() => handleOpenEdit(emp)}
                      title="Edit Profile"
                    >
                      <PencilSquareIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="admin-action-btn admin-action-btn--danger"
                      onClick={() => handleDelete(emp)}
                      title="Soft-Delete"
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

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="admin-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="emp-modal-title"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '720px' }}
          >
            <div className="admin-modal-header">
              <div>
                <h3 id="emp-modal-title" className="admin-modal-title">
                  {editingEmp ? 'Edit Employee Profile' : 'Register New Employee'}
                </h3>
                <p className="admin-modal-subtitle">
                  Configure corporate credentials, designation, and staff details
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

            <form onSubmit={handleSubmit} className="admin-modal-form" noValidate>
              <div className="admin-modal-body">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="emp-fn-input">
                      First Name *
                    </label>
                    <input
                      id="emp-fn-input"
                      type="text"
                      required
                      className={`admin-form-input ${formErrors.firstName ? 'admin-form-input--error' : ''}`}
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="e.g. Rahul"
                    />
                    {formErrors.firstName && (
                      <span className="admin-form-error">{formErrors.firstName}</span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="emp-ln-input">
                      Last Name *
                    </label>
                    <input
                      id="emp-ln-input"
                      type="text"
                      required
                      className={`admin-form-input ${formErrors.lastName ? 'admin-form-input--error' : ''}`}
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="e.g. Sharma"
                    />
                    {formErrors.lastName && (
                      <span className="admin-form-error">{formErrors.lastName}</span>
                    )}
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="emp-email-input">
                      Company Email *
                    </label>
                    <input
                      id="emp-email-input"
                      type="email"
                      required
                      className={`admin-form-input ${formErrors.email ? 'admin-form-input--error' : ''}`}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="e.g. ritik95061@gmail.com"
                    />
                    {formErrors.email && (
                      <span className="admin-form-error">{formErrors.email}</span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="emp-phone-input">
                      Phone Number
                    </label>
                    <input
                      id="emp-phone-input"
                      type="text"
                      className="admin-form-input"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                    />
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="emp-id-input">
                      Corporate Employee ID (Optional)
                    </label>
                    <input
                      id="emp-id-input"
                      type="text"
                      className="admin-form-input"
                      value={form.employeeId}
                      onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                      placeholder="e.g. ASH-EMP-1001 (Auto-generated if empty)"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="emp-google-email-input">
                      Google Meet Account / Workspace Email
                    </label>
                    <input
                      id="emp-google-email-input"
                      type="email"
                      className="admin-form-input"
                      value={form.googleEmail}
                      onChange={(e) => setForm({ ...form, googleEmail: e.target.value })}
                      placeholder="Leave blank to use Company Email"
                    />
                  </div>
                </div>

                {editingEmp && (
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label className="admin-form-label" htmlFor="emp-acc-status-input">
                        Account Security Status
                      </label>
                      <select
                        id="emp-acc-status-input"
                        className="admin-form-input"
                        value={form.accountStatus}
                        onChange={(e) => setForm({ ...form, accountStatus: e.target.value })}
                      >
                        <option value="INVITED">INVITED (Awaiting Invitation)</option>
                        <option value="PENDING_ACTIVATION">PENDING_ACTIVATION (Email Sent)</option>
                        <option value="ACTIVE">ACTIVE (Verified & Allowed)</option>
                        <option value="SUSPENDED">SUSPENDED (Temporary Lockout)</option>
                        <option value="DEACTIVATED">DEACTIVATED (Offboarded)</option>
                      </select>
                    </div>

                    <div className="admin-form-group">
                      <label className="admin-form-label" htmlFor="emp-employment-status-input">
                        Employment Status
                      </label>
                      <select
                        id="emp-employment-status-input"
                        className="admin-form-input"
                        value={form.employmentStatus}
                        onChange={(e) => setForm({ ...form, employmentStatus: e.target.value })}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="TERMINATED">TERMINATED</option>
                        <option value="ON_LEAVE">ON_LEAVE</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="emp-desig-input">
                      Designation *
                    </label>
                    <input
                      id="emp-desig-input"
                      type="text"
                      required
                      className={`admin-form-input ${formErrors.designation ? 'admin-form-input--error' : ''}`}
                      value={form.designation}
                      onChange={(e) => setForm({ ...form, designation: e.target.value })}
                      placeholder="e.g. Senior Backend Engineer"
                    />
                    {formErrors.designation && (
                      <span className="admin-form-error">{formErrors.designation}</span>
                    )}
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="emp-dept-input">
                      Department *
                    </label>
                    <select
                      id="emp-dept-input"
                      className="admin-form-input"
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    >
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                      <option value="AI & Machine Learning">AI & Machine Learning</option>
                      <option value="UI/UX & Product Design">UI/UX & Product Design</option>
                      <option value="Operations & Quality">Operations & Quality</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="emp-type-input">
                      Employment Type *
                    </label>
                    <select
                      id="emp-type-input"
                      className="admin-form-input"
                      value={form.employmentType}
                      onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                      <option value="Intern">Intern</option>
                      <option value="Freelance">Freelance</option>
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label className="admin-form-label" htmlFor="emp-join-input">
                      Joining Date *
                    </label>
                    <input
                      id="emp-join-input"
                      type="date"
                      required
                      className="admin-form-input"
                      value={form.joiningDate}
                      onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="emp-skills-input">
                    Core Technical Skills (Comma-separated)
                  </label>
                  <input
                    id="emp-skills-input"
                    type="text"
                    className="admin-form-input"
                    value={form.skills}
                    onChange={(e) => setForm({ ...form, skills: e.target.value })}
                    placeholder="e.g. React, Node.js, Docker, MongoDB"
                  />
                </div>

                <div className="admin-form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                      Active Staff Member
                    </span>
                  </label>
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
                  {submitting ? 'Saving...' : editingEmp ? 'Update Profile' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
