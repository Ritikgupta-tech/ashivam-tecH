import { useState, useEffect, useCallback } from 'react';
import {
  getGoogleIntegrationStatus,
  getGoogleOAuthUrl,
  triggerGlobalReconciliation,
} from '../../../api';

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
      setReconcileResult(res.message || 'Global reconciliation completed');
      loadIntegrationStatus();
    } catch (err) {
      setReconcileResult(`Reconciliation failed: ${err.message}`);
    } finally {
      setReconciling(false);
    }
  };

  return (
    <div className="admin-tab-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#F8FAFC' }}>Google Workspace & Meet API Integration</h2>
          <p style={{ margin: '0.25rem 0 0', color: '#94A3B8', fontSize: '0.9rem' }}>
            OAuth 2.0 authorization, Google Cloud Pub/Sub subscriptions, and CloudEvent webhooks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleGlobalReconcile} className="btn btn-secondary" disabled={reconciling}>
            <span>{reconciling ? 'Reconciling...' : 'Run Global Reconciliation'}</span>
          </button>
          <button onClick={handleConnectOAuth} className="btn btn-primary">
            <span>Connect / Reauthorize Google</span>
          </button>
        </div>
      </div>

      {reconcileResult && (
        <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', color: '#93C5FD', fontSize: '0.9rem' }}>
          {reconcileResult}
        </div>
      )}

      {/* Integration Status Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="stat-card" style={{ textAlign: 'left', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            OAuth Connection
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem', fontWeight: 700, color: health?.isConnected ? '#10B981' : '#F59E0B' }}>
            <span style={{ height: '10px', width: '10px', borderRadius: '50%', background: health?.isConnected ? '#10B981' : '#F59E0B' }} />
            <span>{health?.status || (loading ? 'Checking...' : 'DISCONNECTED')}</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.5rem' }}>
            {health?.connectedAccountEmail ? `Account: ${health.connectedAccountEmail}` : 'No Google account linked'}
          </div>
        </div>

        <div className="stat-card" style={{ textAlign: 'left', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Pub/Sub Subscription
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600, color: '#38BDF8' }}>
            <span>ashivam-meet-events-sub</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.5rem' }}>
            Topic: projects/ashivam-meet-attendance/topics/ashivam-meet-events
          </div>
        </div>

        <div className="stat-card" style={{ textAlign: 'left', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Webhook Push Receiver
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600, color: '#10B981' }}>
            <span>/api/v1/google/events/pubsub</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.5rem' }}>
            Format: CloudEvents v1.0 • Idempotent Inbox
          </div>
        </div>
      </div>

      {/* Detailed Technical Specifications Card */}
      <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: '10px', padding: '1.5rem', border: '1px solid rgba(148, 163, 184, 0.1)' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.15rem', color: '#F8FAFC' }}>Active API Configuration & Permissions</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Granted OAuth Scopes:</div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#E2E8F0', fontSize: '0.85rem', lineHeight: 1.7 }}>
              <li><code>https://www.googleapis.com/auth/meetings.space.created</code> (Create & manage app meeting spaces)</li>
              <li><code>https://www.googleapis.com/auth/meetings.space.readonly</code> (Authoritative conference participant records)</li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '0.25rem' }}>Security & Token Encryption:</div>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#E2E8F0', fontSize: '0.85rem', lineHeight: 1.7 }}>
              <li>AES-256-GCM symmetric encryption for persistent refresh tokens</li>
              <li>Token rotation with sliding session expiry (15m Access / 7d Refresh)</li>
              <li>Pub/Sub message verification token enforcement</li>
            </ul>
          </div>
        </div>

        {health?.lastError && (
          <div style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#FCA5A5', fontSize: '0.85rem' }}>
            <strong>Last Error:</strong> {health.lastError}
          </div>
        )}
      </div>
    </div>
  );
}
