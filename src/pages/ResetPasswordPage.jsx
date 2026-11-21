import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, CheckCircleIcon } from '../components/icons';
import Logo from '../components/ui/Logo';
import { verifyResetPasswordToken, resetEmployeePassword } from '../api';
import '../components/Admin/AdminLogin.css';
import './ResetPasswordPage.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [isReset, setIsReset] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Set New Password | Ashivam Technologies';

    if (!token) {
      setVerifyError('No password reset token provided. Please submit a new reset request.');
      setVerifying(false);
      return;
    }

    const checkToken = async () => {
      try {
        const res = await verifyResetPasswordToken(token);
        if (res?.data?.email) {
          setEmail(res.data.email);
        }
      } catch (err) {
        setVerifyError(err.message || 'Invalid or expired password reset link.');
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
      setFormError('Please enter your new password.');
      return;
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetEmployeePassword({
        token,
        password,
        confirmPassword,
      });

      setIsReset(true);
    } catch (err) {
      setFormError(err.message || 'Failed to reset password. Please try requesting a new link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reset-password-page admin-login-wrapper">
      <div className="reset-password-card admin-login-card">
        {/* Brand */}
        <div className="admin-login-brand">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
            <Logo size={42} variant="horizontal" showText={true} />
          </div>
          <span className="admin-login-badge">Credential Update</span>
          <h1 className="admin-login-title" style={{ marginTop: '0.75rem', fontSize: '1.4rem' }}>
            Set New Password
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--clr-text-muted, #64748B)',
              margin: '0.35rem 0 0',
              lineHeight: 1.45,
            }}
          >
            Create a strong, unique password for your employee workspace account.
          </p>
        </div>

        {/* Verifying Token */}
        {verifying && (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <span className="admin-spinner" style={{ margin: '0 auto 1rem' }} aria-hidden="true" />
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Verifying your reset token...</p>
          </div>
        )}

        {/* Token Error */}
        {!verifying && verifyError && (
          <div style={{ margin: '1.5rem 0' }}>
            <div className="admin-login-error-alert" role="alert" style={{ marginBottom: '1.5rem' }}>
              <div>{verifyError}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link to="/forgot-password" className="admin-btn admin-btn--primary" style={{ textAlign: 'center' }}>
                Request New Reset Link
              </Link>
              <Link to="/employee-login/employee" className="admin-login-back-link" style={{ textAlign: 'center' }}>
                ← Return to Employee Login
              </Link>
            </div>
          </div>
        )}

        {/* Success State */}
        {!verifying && isReset && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ color: '#10b981', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircleIcon size={56} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Password Reset Complete!
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your password has been securely updated. All previous active sessions have been revoked. You can now log in with your new credentials.
            </p>
            <button
              type="button"
              className="admin-login-btn"
              onClick={() => navigate('/employee-login/employee', { replace: true })}
            >
              <span>Log In With New Password</span>
              <ArrowRightIcon size={16} />
            </button>
          </div>
        )}

        {/* Reset Form */}
        {!verifying && !verifyError && !isReset && (
          <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
            {formError && (
              <div className="admin-login-error-alert" role="alert" style={{ marginBottom: '1.25rem' }}>
                <div>{formError}</div>
              </div>
            )}

            {email && (
              <div style={{ background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem', color: '#0f172a' }}>
                Resetting credentials for: <strong>{email}</strong>
              </div>
            )}

            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="reset-new-password">
                New Password *
              </label>
              <div className="admin-input-wrapper">
                <input
                  id="reset-new-password"
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
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="reset-confirm-password">
                Confirm New Password *
              </label>
              <input
                id="reset-confirm-password"
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

            {/* Checklist */}
            <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '0.75rem 1rem', marginTop: '0.75rem' }}>
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
              style={{ marginTop: '1.25rem' }}
            >
              {submitting ? (
                <>
                  <span className="admin-spinner" aria-hidden="true" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRightIcon size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="admin-login-footer" style={{ marginTop: '1.5rem' }}>
          <Link to="/employee-login/employee" className="admin-login-back-link">
            ← Return to Employee Login
          </Link>
          <div style={{ marginTop: '0.5rem' }}>Ashivam Technologies &copy; {new Date().getFullYear()}</div>
        </div>
      </div>
    </div>
  );
}
