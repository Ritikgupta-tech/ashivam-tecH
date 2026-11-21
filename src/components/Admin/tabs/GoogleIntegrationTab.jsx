import { useState, useEffect, useCallback } from 'react';
import {
  getGoogleIntegrationStatus,
  getGoogleOAuthUrl,
  triggerGlobalReconciliation,
  disconnectGoogleIntegration,
} from '../../../api';
import { Panel, StatCard, StatusBadge } from '../AdminUI';
import { ShieldCheckIcon, RefreshIcon, ArrowRightIcon } from '../../icons';

export default function GoogleIntegrationTab() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);

  const loadIntegrationStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getGoogleIntegrationStatus();
      if (res?.data) {
        setHealth(res.data);
      }
    } catch (err) {
      console.warn('Failed to fetch Google status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrationStatus();
  }, [loadIntegrationStatus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const message = params.get('message');

    if (status === 'connected') {
      setReconcileResult({
        type: 'success',
        text: 'Google Workspace successfully authorized and connected!',
      });
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=google');
    } else if (status === 'error') {
      setReconcileResult({
        type: 'error',
        text: message ? decodeURIComponent(message) : 'Google Workspace OAuth authorization was canceled or failed.',
      });
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=google');
    }
  }, []);

  const handleConnectOAuth = async () => {
    if (connecting) return;
    setConnecting(true);
    setReconcileResult(null);

    try {
      const res = await getGoogleOAuthUrl();
      const authUrl = res?.data?.url;

      if (!authUrl) {
        throw new Error(res?.message || 'Google authorization URL was not received from the server.');
      }

      // Verify that client_id parameter is present and non-empty
      const parsedUrl = new URL(authUrl);
      const clientId = parsedUrl.searchParams.get('client_id');
      if (!clientId || !clientId.trim()) {
        throw new Error('Backend configuration error: client_id is missing from authorization URL.');
      }

      window.location.href = authUrl;
    } catch (err) {
      setReconcileResult({
        type: 'error',
        text: `OAuth initialization failed: ${err.message}`,
      });
      setConnecting(false);
    }
  };

  const handleGlobalReconcile = async () => {
    setReconciling(true);
    setReconcileResult(null);
    try {
      const res = await triggerGlobalReconciliation();
      setReconcileResult({
        type: 'success',
        text: res.message || 'Global reconciliation completed successfully.',
      });
      loadIntegrationStatus();
    } catch (err) {
      setReconcileResult({
        type: 'error',
        text: `Reconciliation failed: ${err.message}`,
      });
    } finally {
      setReconciling(false);
    }
  };

  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect Google Workspace and revoke access tokens?")) {
      return;
    }
    setDisconnecting(true);
    try {
      await disconnectGoogleIntegration();
      setReconcileResult({
        type: 'success',
        text: 'Google Workspace disconnected and tokens successfully revoked.',
      });
      loadIntegrationStatus();
    } catch (err) {
      setReconcileResult({
        type: 'error',
        text: `Failed to disconnect: ${err.message}`,
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = Boolean(health?.isConnected);

  return (
    <div className="admin-tab-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Google Workspace & Meet Integration</h1>
          <p className="admin-page-subtitle">
            OAuth 2.0 authorization, Google Cloud Pub/Sub subscriptions, and CloudEvent webhooks
          </p>
        </div>

        <div className="admin-page-actions">
          <button
            type="button"
            onClick={handleGlobalReconcile}
            className="admin-btn admin-btn--secondary"
            disabled={reconciling}
          >
            <RefreshIcon size={16} />
            <span>{reconciling ? 'Reconciling...' : 'Run Global Reconciliation'}</span>
          </button>
          {isConnected && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="admin-btn admin-btn--danger"
              disabled={disconnecting}
            >
              <span>{disconnecting ? 'Disconnecting...' : 'Disconnect Google'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleConnectOAuth}
            className="admin-btn admin-btn--primary"
            disabled={connecting || loading || (health && health.clientIdConfigured === false)}
            title={health && health.clientIdConfigured === false ? 'Google Workspace OAuth is not configured on the backend' : ''}
          >
            <ShieldCheckIcon size={16} />
            <span>
              {connecting
                ? 'Initializing...'
                : (health && health.clientIdConfigured === false)
                ? 'OAuth Unconfigured'
                : (isConnected ? 'Reauthorize Google' : 'Connect Google Workspace')}
            </span>
          </button>
        </div>
      </div>

      {health && health.clientIdConfigured === false && !reconcileResult && (
        <div
          className="admin-alert admin-alert--warning"
          role="alert"
          style={{ marginBottom: '1.5rem' }}
        >
          <span>
            <strong>Configuration Notice:</strong> Google Workspace OAuth client ID is not configured on the backend. Please add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to your backend environment settings before connecting.
          </span>
        </div>
      )}

      {reconcileResult && (
        <div
          className={`admin-alert ${
            reconcileResult.type === 'error' ? 'admin-alert--error' : 'admin-alert--success'
          }`}
          role="alert"
          style={{ marginBottom: '1.5rem' }}
        >
          <span>{reconcileResult.text}</span>
          <button
            type="button"
            className="admin-search-clear"
            onClick={() => setReconcileResult(null)}
            style={{ marginLeft: 'auto' }}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {/* Integration Status Grid */}
      <div className="admin-stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          label="OAuth Authorization"
          value={isConnected ? 'CONNECTED' : (loading ? 'CHECKING...' : 'DISCONNECTED')}
          subtext={health?.connectedAccountEmail ? `Linked: ${health.connectedAccountEmail}` : 'No Google Workspace account linked'}
          icon={ShieldCheckIcon}
          tone={isConnected ? 'default' : 'attention'}
        />
        <StatCard
          label="Pub/Sub Subscription"
          value="ACTIVE"
          subtext="projects/ashivam-meet-attendance/topics/ashivam-meet-events"
          icon={ArrowRightIcon}
        />
        <StatCard
          label="Webhook Receiver"
          value="OPERATIONAL"
          subtext="CloudEvents v1.0 • Idempotent Inbox (/api/v1/google/events/pubsub)"
          icon={ShieldCheckIcon}
        />
      </div>

      {/* Technical Specifications Panel */}
      <Panel
        title="Active API Configuration & Security Architecture"
        description="Google Meet REST API v2 permissions, encryption standards, and event subscription rules"
      >
        <div className="admin-two-col-grid" style={{ gap: '1.5rem' }}>
          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#0F172A', fontWeight: 600 }}>
              Granted OAuth Scopes
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#334155', fontSize: '0.875rem', lineHeight: 1.8 }}>
              <li>
                <code style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                  https://www.googleapis.com/auth/meetings.space.created
                </code>
                <div style={{ color: '#64748B', fontSize: '0.8rem' }}>Create and manage authorized company meeting spaces</div>
              </li>
              <li style={{ marginTop: '0.5rem' }}>
                <code style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem' }}>
                  https://www.googleapis.com/auth/meetings.space.readonly
                </code>
                <div style={{ color: '#64748B', fontSize: '0.8rem' }}>Authoritative conference participant records and telemetry</div>
              </li>
            </ul>
          </div>

          <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#0F172A', fontWeight: 600 }}>
              Security & Token Encryption
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#334155', fontSize: '0.875rem', lineHeight: 1.8 }}>
              <li>
                <strong>AES-256-GCM Encryption:</strong> Persistent refresh tokens encrypted with unique IVs and auth tags.
              </li>
              <li>
                <strong>Sliding Expiry & Rotation:</strong> 15-minute access tokens with automatic rotation.
              </li>
              <li>
                <strong>Pub/Sub Verification:</strong> Secret token enforcement and idempotent deduplication cache.
              </li>
            </ul>
          </div>
        </div>

        {health?.lastError && (
          <div
            className="admin-alert admin-alert--error"
            role="alert"
            style={{ marginTop: '1.5rem' }}
          >
            <strong>Last Error:</strong> {health.lastError}
          </div>
        )}
      </Panel>
    </div>
  );
}
