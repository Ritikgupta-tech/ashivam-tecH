import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../ui/Logo';
import './AdminLogin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to /admin or original requested path
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const targetPath = location.state?.from?.pathname || '/admin';
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location.state]);

  const validateForm = () => {
    const errors = {};
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      errors.username = 'Administrator username is required';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(username.trim(), password);
      const targetPath = location.state?.from?.pathname || '/admin';
      navigate(targetPath, { replace: true });
    } catch (err) {
      let friendlyMessage = 'Authentication failed. Please verify your credentials.';

      if (err.status === 401) {
        friendlyMessage = 'Invalid username or password. Please verify your administrator credentials.';
      } else if (err.status === 429) {
        friendlyMessage = 'Too many login attempts. Your IP has been temporarily rate limited. Please wait 15 minutes before retrying.';
      } else if (err.status === 408 || err.name === 'AbortError' || err.message?.includes('network')) {
        friendlyMessage = 'Network connection failed or timed out. Please check your connectivity and try again.';
      } else if (err.status >= 500) {
        friendlyMessage = 'The authentication server encountered an error. Please try again in a few moments.';
      } else if (err.message) {
        friendlyMessage = err.message;
      }

      setServerError(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
            <Logo size={42} variant="horizontal" showText={true} />
          </div>
          <span className="admin-login-badge">Admin & Management Portal</span>
        </div>

        {serverError && (
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
            <div>{serverError}</div>
          </div>
        )}

        <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="admin-username">
              Username
            </label>
            <input
              id="admin-username"
              name="username"
              type="text"
              autoComplete="username"
              autoFocus
              disabled={isSubmitting}
              className={`admin-form-input ${fieldErrors.username ? 'has-error' : ''}`}
              placeholder="e.g. admin.username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) {
                  setFieldErrors((prev) => ({ ...prev, username: '' }));
                }
              }}
              aria-invalid={Boolean(fieldErrors.username)}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
            />
            {fieldErrors.username && (
              <span id="username-error" className="admin-field-error" role="alert">
                {fieldErrors.username}
              </span>
            )}
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label" htmlFor="admin-password">
              Password
            </label>
            <div className="admin-input-wrapper">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={isSubmitting}
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
            className="admin-login-btn"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="admin-spinner" aria-hidden="true" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Console</span>
            )}
          </button>
        </form>

        <div className="admin-login-footer">
          <Link to="/" className="admin-login-back-link">
            ← Return to Public Website
          </Link>
          <div>Ashivam Technologies &copy; {new Date().getFullYear()}</div>
        </div>
      </div>
    </div>
  );
}
