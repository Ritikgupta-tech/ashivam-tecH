import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CheckCircleIcon } from '../components/icons';
import Logo from '../components/ui/Logo';
import { requestForgotPassword } from '../api';
import './ForgotPasswordPage.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Forgot Password | Ashivam Technologies';
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid corporate email address.');
      return;
    }

    setLoading(true);
    try {
      await requestForgotPassword({ email: cleanEmail });
      setSubmitted(true);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to process password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page admin-login-wrapper">
      <div className="forgot-password-card admin-login-card">
        {/* Brand */}
        <div className="admin-login-brand">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
            <Logo size={42} variant="horizontal" showText={true} />
          </div>
          <span className="admin-login-badge">Credential Recovery</span>
          <h1 className="admin-login-title" style={{ marginTop: '0.75rem', fontSize: '1.4rem' }}>
            Reset Workspace Password
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--clr-text-muted, #64748B)',
              margin: '0.35rem 0 0',
              lineHeight: 1.45,
            }}
          >
            Enter your official corporate email to receive a single-use password reset link.
          </p>
        </div>

        {submitted ? (
          <div className="forgot-state-box" style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ color: '#10b981', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircleIcon size={52} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
              Check Your Inbox
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              If an active employee account exists for <strong>{email}</strong>, you will receive password reset instructions shortly. The link expires in 1 hour.
            </p>
            <Link to="/employee-login/employee" className="admin-btn admin-btn--primary" style={{ display: 'inline-block', textAlign: 'center' }}>
              Return to Employee Login
            </Link>
          </div>
        ) : (
          <form className="admin-login-form" onSubmit={handleSubmit} noValidate>
            {errorMessage && (
              <div className="admin-login-error-alert" role="alert" style={{ marginBottom: '1.25rem' }}>
                <div>{errorMessage}</div>
              </div>
            )}

            <div className="admin-form-group">
              <label className="admin-form-label" htmlFor="forgot-email">
                Official Corporate Email *
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                autoFocus
                disabled={loading}
                className="admin-form-input"
                placeholder="e.g. ritik95061@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="admin-login-btn"
              disabled={loading}
              style={{ marginTop: '0.5rem' }}
            >
              {loading ? (
                <>
                  <span className="admin-spinner" aria-hidden="true" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <span>Send Password Reset Instructions</span>
                  <ArrowRightIcon size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="admin-login-footer" style={{ marginTop: '1.5rem' }}>
          <Link to="/employee-login/employee" className="admin-login-back-link">
            ← Back to Employee Login
          </Link>
          <div style={{ marginTop: '0.5rem' }}>Ashivam Technologies &copy; {new Date().getFullYear()}</div>
        </div>
      </div>
    </div>
  );
}
