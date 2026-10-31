import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShieldIcon, ServerIcon, ArrowRightIcon } from '../components/icons';
import Logo from '../components/ui/Logo';
import { useAuth } from '../context/useAuth';
import './EmployeeLoginPage.css';

export default function EmployeeLoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Employee Workspace Login | Ashivam Technologies';
  }, []);

  useEffect(() => {
    // If already authenticated with active session, redirect to admin/workspace
    if (!isLoading && isAuthenticated) {
      const targetPath = location.state?.from?.pathname || '/admin';
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location.state]);

  const validateForm = () => {
    const errors = {};
    const trimmedId = identifier.trim();

    if (!trimmedId) {
      errors.identifier = 'Work email or employee username is required';
    }
    if (!password) {
      errors.password = 'Workspace password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await login(identifier.trim(), password);
      const targetPath = location.state?.from?.pathname || '/admin';
      navigate(targetPath, { replace: true });
    } catch (err) {
      let friendlyMessage =
        'Authentication failed. Please verify your employee credentials with Ashivam IT Administration.';

      if (err.status === 401) {
        friendlyMessage =
          'Invalid work email or password. Please verify your employee credentials.';
      } else if (err.status === 429) {
        friendlyMessage =
          'Too many login attempts. Your IP has been temporarily rate limited. Please wait 15 minutes before retrying.';
      } else if (
        err.status === 408 ||
        err.name === 'AbortError' ||
        err.message?.includes('network')
      ) {
        friendlyMessage =
          'Network connection failed or timed out. Please check your connectivity and try again.';
      } else if (err.status >= 500) {
        friendlyMessage =
          'The authentication server encountered an error. Please try again in a few moments.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }

      setErrorMessage(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employee-login-page admin-login-wrapper">
      <div className="employee-login-card admin-login-card">
        {/* Top Gateway Switcher Tabs */}
        <div className="login-tabs-nav" role="tablist" aria-label="Portal selection">
          <Link
            to="/employee-login/employee"
            className="login-tab-btn login-tab-btn--active"
            role="tab"
            aria-selected="true"
          >
            <ShieldIcon size={16} />
            <span>Staff Workspace</span>
          </Link>
          <Link
            to="/employee-login/admin"
            className="login-tab-btn"
            role="tab"
            aria-selected="false"
          >
            <ServerIcon size={16} />
            <span>Admin Login</span>
          </Link>
        </div>

        {/* Brand & Heading aligned with Admin Login */}
        <div className="admin-login-brand">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
            <Logo size={42} variant="horizontal" showText={true} />
          </div>
          <span className="admin-login-badge">Staff & Employee Workspace</span>
          <h1 className="admin-login-title" style={{ marginTop: '0.75rem', fontSize: '1.4rem' }}>
            Employee Workspace
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--clr-text-muted, #64748B)',
              margin: '0.35rem 0 0',
              lineHeight: 1.45,
            }}
          >
            Sign in to access your employee profile, internal documents, and assigned resources.
          </p>
        </div>

        {/* Server Error Alert */}
        {errorMessage && (
          <div
            className="admin-login-error-alert"
            role="alert"
            aria-live="assertive"
            style={{ marginBottom: '1.25rem' }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0, marginTop: '2px' }}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Form aligned with Admin Login structure */}
        <form className="admin-login-form employee-login-form" onSubmit={handleSubmit} noValidate>
          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="employee-identifier">
              Work Email or Employee Username
            </label>
            <input
              id="employee-identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              autoFocus
              disabled={loading}
              className={`admin-form-input ${fieldErrors.identifier ? 'has-error' : ''}`}
              placeholder="e.g. name@ashivamtechnologies.com"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (fieldErrors.identifier) {
                  setFieldErrors((prev) => ({ ...prev, identifier: '' }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.identifier)}
              aria-describedby={fieldErrors.identifier ? 'identifier-error' : undefined}
            />
            {fieldErrors.identifier && (
              <span id="identifier-error" className="admin-field-error" role="alert">
                {fieldErrors.identifier}
              </span>
            )}
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="employee-password">
              Workspace Password
            </label>
            <div className="admin-input-wrapper">
              <input
                id="employee-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={loading}
                className={`admin-form-input ${fieldErrors.password ? 'has-error' : ''}`}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
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
            {fieldErrors.password && (
              <span id="password-error" className="admin-field-error" role="alert">
                {fieldErrors.password}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="admin-login-btn employee-login-submit"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <>
                <span className="admin-spinner" aria-hidden="true" />
                <span>Authenticating with Workspace...</span>
              </>
            ) : (
              <>
                <span>Sign In to Workspace</span>
                <ArrowRightIcon size={16} />
              </>
            )}
          </button>
        </form>

        {/* Access Support Note */}
        <div className="employee-login-card__support">
          <p>
            <strong>Need access assistance?</strong> Credentials are managed by Ashivam IT Administration. Contact your coordinator or email{' '}
            <a href="mailto:team.ashivam@gmail.com">team.ashivam@gmail.com</a>.
          </p>
        </div>

        {/* Footer Gateway Switcher */}
        <div className="admin-login-footer employee-login-card__footer">
          <Link to="/employee-login/admin" className="admin-login-back-link">
            Looking for Superadmin Console? Switch to Admin Login →
          </Link>
          <Link to="/" className="admin-login-back-link">
            ← Return to Public Website
          </Link>
          <div>Ashivam Technologies &copy; {new Date().getFullYear()}</div>
        </div>
      </div>
    </div>
  );
}
