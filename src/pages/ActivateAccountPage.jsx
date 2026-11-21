import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ShieldIcon, ArrowRightIcon, CheckCircleIcon } from '../components/icons';
import Logo from '../components/ui/Logo';
import { verifyActivationToken, activateEmployeeAccount, setToken, setSessionHint } from '../api';
import '../components/Admin/AdminLogin.css';
import './ActivateAccountPage.css';

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState('');
  const [employee, setEmployee] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Activate Employee Account | Ashivam Technologies';

    if (!token) {
      setVerifyError('No activation token provided. Please use the activation link sent to your corporate email.');
      setVerifying(false);
      return;
    }

    const checkToken = async () => {
      try {
        const res = await verifyActivationToken(token);
        if (res?.data?.employee) {
          setEmployee(res.data.employee);
        }
      } catch (err) {
        setVerifyError(err.message || 'Invalid or expired activation link.');
      } finally {
        setVerifying(false);
      }
    };

    checkToken();
  }, [token]);

  const passwordRequirements = [
    { label: 'At least 8 characters long', valid: password.length >= 8 },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'Contains number or special character', valid: /[0-9!@#$%^&*(),.?":{}|<>]/.test(password) },
    { label: 'Passwords match', valid: Boolean(password && password === confirmPassword) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.valid);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!password) {
      setFormError('Please create a secure workspace password.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify your entries.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await activateEmployeeAccount({
        token,
        password,
        confirmPassword,
      });

      if (res?.data?.accessToken) {
        // Save session credentials for seamless auto-login
        if (typeof setToken === 'function') {
          setToken(res.data.accessToken);
        }
        if (typeof setSessionHint === 'function') {
          setSessionHint();
        }
      }

      setIsActivated(true);
    } catch (err) {
      setFormError(err.message || 'Failed to activate account. Please contact IT Administration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="activate-account-page admin-login-wrapper">
      <div className="activate-account-card admin-login-card">
        {/* Brand */}
        <div className="admin-login-brand">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
            <Logo size={42} variant="horizontal" showText={true} />
          </div>
          <span className="admin-login-badge">Staff Onboarding & Security</span>
          <h1 className="admin-login-title" style={{ marginTop: '0.75rem', fontSize: '1.4rem' }}>
            Activate Employee Account
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--clr-text-muted, #64748B)',
              margin: '0.35rem 0 0',
              lineHeight: 1.45,
            }}
          >
            Welcome to Ashivam Technologies. Set up your secure credentials to activate your workspace access.
          </p>
        </div>

        {/* Loading State */}
        {verifying && (
          <div className="activate-state-box" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <span className="admin-spinner" style={{ margin: '0 auto 1rem' }} aria-hidden="true" />
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Verifying your single-use invitation token...</p>
          </div>
        )}

        {/* Token Error State */}
        {!verifying && verifyError && (
          <div className="activate-state-box">
            <div className="admin-login-error-alert" role="alert" style={{ marginBottom: '1.5rem' }}>
              <div>{verifyError}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/employee-login/employee" className="admin-login-btn" style={{ textAlign: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                Go to Employee Login
              </Link>
              <Link to="/" className="admin-login-back-link" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                ← Return to Public Website
              </Link>
            </div>
          </div>
        )}

        {/* Success State */}
        {!verifying && isActivated && (
          <div className="activate-state-box" style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ color: '#10b981', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircleIcon size={56} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Account Successfully Activated!
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your credentials have been securely stored. You now have full access to your employee profile, internal
              attendance records, and meeting schedules.
            </p>
            <button
              type="button"
              className="admin-login-btn"
              onClick={() => navigate('/employee', { replace: true })}
            >
              <span>Enter Employee Workspace</span>
              <ArrowRightIcon size={16} />
            </button>
          </div>
        )}

        {/* Setup Password Form */}
        {!verifying && !verifyError && !isActivated && (
          <form className="admin-login-form activate-form" onSubmit={handleSubmit} noValidate>
            {formError && (
              <div className="admin-login-error-alert" role="alert" style={{ marginBottom: '1.25rem' }}>
                <div>{formError}</div>
              </div>
            )}

            {/* Profile Confirmation Card */}
            {employee && (
              <div className="activate-emp-preview">
                <div className="emp-name">{employee.name}</div>
                <div className="emp-meta">
                  {employee.email} {employee.employeeId ? `• ${employee.employeeId}` : ''}
                </div>
                <div className="emp-role">
                  {employee.designation} • {employee.department}
                </div>
              </div>
            )}

            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="new-password">
                New Workspace Password *
              </label>
              <div className="admin-input-wrapper">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  disabled={submitting}
                  className="admin-form-input"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="confirm-password">
                Confirm Password *
              </label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="new-password"
                disabled={submitting}
                className="admin-form-input"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {/* Requirements Checklist */}
            <div className="activate-checklist">
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Security Standards:</span>
              <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0', fontSize: '0.75rem' }}>
                {passwordRequirements.map((req, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: req.valid ? '#10b981' : '#94a3b8',
                      marginTop: '3px',
                    }}
                  >
                    <span>{req.valid ? '✓' : '○'}</span>
                    <span>{req.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="submit"
              className="admin-login-btn"
              disabled={submitting || !allRequirementsMet}
              style={{ marginTop: '1.25rem', width: '100%', justifyContent: 'center' }}
            >
              {submitting ? (
                <>
                  <span className="admin-spinner" aria-hidden="true" />
                  <span>Activating Account...</span>
                </>
              ) : (
                <>
                  <span>Activate Workspace Account</span>
                  <ArrowRightIcon size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="admin-login-footer" style={{ marginTop: '1.5rem' }}>
          <Link to="/employee-login/employee" className="admin-login-back-link">
            Already have an active account? Sign In →
          </Link>
          <div style={{ marginTop: '0.5rem' }}>Ashivam Technologies &copy; {new Date().getFullYear()}</div>
        </div>
      </div>
    </div>
  );
}
