import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
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
} from '../../icons';

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
  const [formErrors, setFormErrors] = useState({});

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    designation: '',
    department: 'Software Engineering',
    employmentType: 'Full-time',
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
      phone: '',
      designation: '',
      department: 'Software Engineering',
      employmentType: 'Full-time',
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
      phone: emp.phone || '',
      designation: emp.designation || '',
      department: emp.department || 'Software Engineering',
      employmentType: emp.employmentType || 'Full-time',
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
        phone: form.phone.trim(),
        designation: form.designation.trim(),
        department: form.department,
        employmentType: form.employmentType,
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
        await createEmployee(payload);
        toast.success(`Employee ${payload.firstName} ${payload.lastName} registered.`);
      }

      setShowModal(false);
      fetchEmployeesList();
    } catch (err) {
      toast.error(err.message || 'Failed to save employee profile');
    } finally {
      setSubmitting(false);
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

  const columns = useMemo(
    () => [
      { key: 'employee', label: 'Employee' },
      { key: 'role', label: 'Role & Department' },
      { key: 'work', label: 'Work & Location' },
      { key: 'status', label: 'Status' },
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                      {emp.phone && <span className="admin-cell-muted">{emp.phone}</span>}
                    </div>
                  </div>
                </td>
                <td>
                  <span className="admin-cell-title">{emp.designation}</span>
                  <span className="admin-cell-sub">{emp.department}</span>
                </td>
                <td>
                  <span className="admin-cell-title">{emp.employmentType}</span>
                  <span className="admin-cell-sub">{emp.workLocation}</span>
                </td>
                <td>
                  <StatusBadge
                    label={emp.deletedAt ? 'Deleted' : emp.isActive ? 'Active' : 'Inactive'}
                    tone={emp.deletedAt ? 'red' : emp.isActive ? 'green' : 'slate'}
                  />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <div className="admin-table-actions">
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

            <form onSubmit={handleSubmit} noValidate>
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
                      placeholder="e.g. rahul.sharma@ashivamtechnologies.com"
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
