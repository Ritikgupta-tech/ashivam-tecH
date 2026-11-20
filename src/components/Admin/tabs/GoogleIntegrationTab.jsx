import { useState, useEffect, useCallback } from 'react';
import {
  getGoogleIntegrationStatus,
  getGoogleOAuthUrl,
  triggerGlobalReconciliation,
} from '../../../api';
import { Panel, StatCard, StatusBadge } from '../AdminUI';
import { ShieldCheckIcon, RefreshIcon, ArrowRightIcon } from '../../icons';

export default function GoogleIntegrationTab() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
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

  const handleConnectOAuth = async () => {
    try {
      const res = await getGoogleOAuthUrl();
      if (res?.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      alert(`OAuth initialization error: ${err.message}`);
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

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleGlobalReconcile}
            className="admin-btn admin-btn--secondary"
            disabled={reconciling}
          >
            <RefreshIcon size={16} />
            <span>{reconciling ? 'Reconciling...' : 'Run Global Reconciliation'}</span>
          </button>
          <button
            type="button"
            onClick={handleConnectOAuth}
            className="admin-btn admin-btn--primary"
          >
            <ShieldCheckIcon size={16} />
            <span>Connect / Reauthorize Google</span>
          </button>
        </div>
      </div>

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
