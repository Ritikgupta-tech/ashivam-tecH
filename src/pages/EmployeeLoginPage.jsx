import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import { ShieldIcon, ServerIcon, ArrowRightIcon } from '../components/icons';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useAuth } from '../context/AuthContext';
import './EmployeeLoginPage.css';

export default function EmployeeLoginPage() {
  useScrollReveal();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Employee Workspace Login | Ashivam Technologies';
  }, []);

  useEffect(() => {
    // If already authenticated with active session, redirect to admin/workspace
    if (isAuthenticated) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const errors = {};

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      errors.identifier = 'Work email or Employee ID is required.';
    }
    if (!password) {
      errors.password = 'Workspace password is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      // Connect to real server authentication
      await login(trimmedId, password);
      navigate('/admin', { replace: true });
    } catch (err) {
      setErrorMessage(
        err.message ||
          'Authentication failed. Please verify your employee credentials with Ashivam IT Administration.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employee-login-page">
      <Navbar />

      <main className="employee-login-main" id="main-content">
        <div className="container employee-login-container">
          <div className="employee-login-card">
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

            <div className="employee-login-card__header text-center">
              <div className="employee-login-card__icon" aria-hidden="true">
                <ShieldIcon size={26} />
              </div>
              <span className="employee-login-card__badge">Staff Portal</span>
              <h1>Employee Workspace</h1>
              <p>Sign in to access your staff profile, documents, and project workspaces.</p>
            </div>

            {errorMessage && (
              <div className="employee-login-alert" role="alert">
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="employee-login-form" noValidate>
              <div className="form-group">
                <label htmlFor="employee-identifier">Work Email or Employee Username</label>
                <input
                  id="employee-identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. name@ashivamtechnologies.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={`form-input${fieldErrors.identifier ? ' form-input--error' : ''}`}
                  disabled={loading}
                  required
                />
                {fieldErrors.identifier && (
                  <span className="field-error">{fieldErrors.identifier}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="employee-password">Workspace Password</label>
                <input
                  id="employee-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`form-input${fieldErrors.password ? ' form-input--error' : ''}`}
                  disabled={loading}
                  required
                />
                {fieldErrors.password && (
                  <span className="field-error">{fieldErrors.password}</span>
                )}
              </div>

              <button
                type="submit"
                className="btn btn-primary employee-login-submit"
                disabled={loading}
              >
                <span>{loading ? 'Authenticating with Server...' : 'Sign In to Workspace'}</span>
                {!loading && <ArrowRightIcon size={16} />}
              </button>
            </form>

            <div className="employee-login-card__support">
              <p>
                <strong>Need access assistance?</strong> Employee credentials are provisioned by Ashivam IT Administration. Contact your coordinator or email{' '}
                <a href="mailto:it-support@ashivamtechnologies.com">it-support@ashivamtechnologies.com</a>.
              </p>
            </div>

            <div className="employee-login-card__footer">
              <Link to="/employee-login/admin" className="switch-portal-link">
                Looking for Superadmin Console? Switch to Admin Login →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
