import React from 'react';

/**
 * Enterprise React Error Boundary.
 * Catches uncaught runtime exceptions in child component trees,
 * prevents white-screen crashes, safely logs context, and renders
 * an accessible recovery view with brand design system tokens.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Structured client-side logging (sanitized, zero token leakage)
    if (typeof console !== 'undefined' && console.error) {
      console.error('[ErrorBoundary caught error]', {
        message: error?.message || 'Unknown error',
        componentStack: errorInfo?.componentStack?.slice(0, 500),
      });
    }

    if (typeof this.props.onError === 'function') {
      try {
        this.props.onError(error, errorInfo);
      } catch {
        // Prevent recursive boundary errors
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({
              error: this.state.error,
              resetErrorBoundary: this.handleReset,
            })
          : this.props.fallback;
      }

      return (
        <main
          role="alert"
          aria-live="assertive"
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1.5rem',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              width: '100%',
              backgroundColor: 'var(--clr-white, #ffffff)',
              border: '1px solid var(--clr-neutral-200, #e2e8f0)',
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(11, 31, 58, 0.08), 0 8px 10px -6px rgba(11, 31, 58, 0.04)',
              padding: '2.5rem 2rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 1.5rem',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
              }}
              aria-hidden="true"
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--clr-navy, #0B1F3A)',
                margin: '0 0 0.75rem',
                letterSpacing: '-0.02em',
              }}
            >
              Something Went Wrong
            </h1>

            <p
              style={{
                fontSize: '0.95rem',
                lineHeight: 1.6,
                color: 'var(--clr-neutral-500, #475569)',
                margin: '0 0 2rem',
              }}
            >
              An unexpected error occurred while rendering this section. You can try recovering
              the view or navigating back to the home page.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  backgroundColor: 'var(--clr-navy, #0B1F3A)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Try Again
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  backgroundColor: 'var(--clr-neutral-100, #f8fafc)',
                  color: 'var(--clr-neutral-700, #1e293b)',
                  border: '1px solid var(--clr-neutral-300, #e2e8f0)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  padding: '0.625rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: 'var(--clr-neutral-600, #334155)',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Return to Home
              </button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
