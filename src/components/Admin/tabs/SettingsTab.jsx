import { useState, useEffect, useCallback } from 'react';
import { getSettings, updateSettings, resetSettings } from '../../../api';
import { Panel } from '../AdminUI';
import { useAdminFeedback } from '../AdminFeedback';
import {
  GearIcon,
  RefreshIcon,
} from '../../icons';

export default function SettingsTab() {
  const { toast, confirm } = useAdminFeedback();

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchSettingsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getSettings();
      const s = res?.data?.settings || res?.data || {};
      setSettings(s);
    } catch (err) {
      setError(err.message || 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettingsData();
  }, [fetchSettingsData]);

  const handleFieldChange = (section, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...(prev?.[section] || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      await updateSettings(settings);
      toast.success('System configuration saved successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    const ok = await confirm({
      title: 'Reset Site Settings',
      message: 'Restore all website settings, feature toggles, and corporate defaults?',
      confirmLabel: 'Reset Settings',
      tone: 'danger',
    });

    if (!ok) return;

    setSaving(true);
    try {
      await resetSettings();
      toast.success('Settings restored to system defaults.');
      fetchSettingsData();
    } catch (err) {
      toast.error(err.message || 'Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-tab-container">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">System Settings</h1>
            <p className="admin-page-subtitle">Configure company details, social channels, and feature flags</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="admin-spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '0.875rem', color: '#64748B' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  const company = settings?.company || {};
  const social = settings?.social || {};
  const features = settings?.features || {};
  const maintenance = settings?.maintenance || {};

  return (
    <div className="admin-tab-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">System Settings & Configuration</h1>
          <p className="admin-page-subtitle">
            Manage global company metadata, contact information, social links, and public feature flags
          </p>
        </div>
        <button
          type="button"
          className="admin-btn admin-btn--secondary admin-btn--sm"
          onClick={fetchSettingsData}
        >
          <RefreshIcon size={14} />
          <span>Reload</span>
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings}>
        <div className="admin-settings-stack">
          {/* SECTION 1: COMPANY CONTACT INFORMATION */}
          <Panel
            title="Corporate Information"
            description="Official company name, legal communication email, and headquarters address"
          >
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="company-name-input">
                  Company Name
                </label>
                <input
                  id="company-name-input"
                  type="text"
                  className="admin-form-input"
                  value={company.name || ''}
                  onChange={(e) => handleFieldChange('company', 'name', e.target.value)}
                  placeholder="Ashivam Technologies Private Limited"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="company-email-input">
                  Official Contact Email
                </label>
                <input
                  id="company-email-input"
                  type="email"
                  className="admin-form-input"
                  value={company.email || ''}
                  onChange={(e) => handleFieldChange('company', 'email', e.target.value)}
                  placeholder="team.ashivam@gmail.com"
                />
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="company-phone-input">
                  Corporate Phone Number
                </label>
                <input
                  id="company-phone-input"
                  type="text"
                  className="admin-form-input"
                  value={company.phone || ''}
                  onChange={(e) => handleFieldChange('company', 'phone', e.target.value)}
                  placeholder="+91 70885 67790"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="company-address-input">
                  Registered Headquarters Address
                </label>
                <input
                  id="company-address-input"
                  type="text"
                  className="admin-form-input"
                  value={company.address || ''}
                  onChange={(e) => handleFieldChange('company', 'address', e.target.value)}
                  placeholder="Sanjay Place, Civil Lines, Agra, UP, India"
                />
              </div>
            </div>
          </Panel>

          {/* SECTION 2: SOCIAL PROFILES */}
          <Panel
            title="Social Links & Verified Channels"
            description="Verified corporate social links displayed across footer and contact pages"
          >
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="social-linkedin-input">
                  LinkedIn URL
                </label>
                <input
                  id="social-linkedin-input"
                  type="url"
                  className="admin-form-input"
                  value={social.linkedin || ''}
                  onChange={(e) => handleFieldChange('social', 'linkedin', e.target.value)}
                  placeholder="https://linkedin.com/company/ashivam-technologies"
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="social-github-input">
                  GitHub Organization URL
                </label>
                <input
                  id="social-github-input"
                  type="url"
                  className="admin-form-input"
                  value={social.github || ''}
                  onChange={(e) => handleFieldChange('social', 'github', e.target.value)}
                  placeholder="https://github.com/ashivam-technologies"
                />
              </div>
            </div>
          </Panel>

          {/* SECTION 3: FEATURE FLAGS */}
          <Panel
            title="Public Website Feature Toggles"
            description="Enable or disable customer-facing submission endpoints and modules"
          >
            <div className="admin-toggles-grid">
              <label className="admin-toggle-card">
                <input
                  type="checkbox"
                  checked={features.contactForm !== false}
                  onChange={(e) => handleFieldChange('features', 'contactForm', e.target.checked)}
                />
                <div>
                  <span className="admin-toggle-title">Client Contact Inquiries</span>
                  <p className="admin-toggle-desc">
                    Allows prospective clients to submit inquiries via the public contact form
                  </p>
                </div>
              </label>

              <label className="admin-toggle-card">
                <input
                  type="checkbox"
                  checked={features.careerApplications !== false}
                  onChange={(e) =>
                    handleFieldChange('features', 'careerApplications', e.target.checked)
                  }
                />
                <div>
                  <span className="admin-toggle-title">Candidate Career Submissions</span>
                  <p className="admin-toggle-desc">
                    Allows applicants to submit resumes for open positions on the careers portal
                  </p>
                </div>
              </label>

              <label className="admin-toggle-card">
                <input
                  type="checkbox"
                  checked={features.publicContent !== false}
                  onChange={(e) =>
                    handleFieldChange('features', 'publicContent', e.target.checked)
                  }
                />
                <div>
                  <span className="admin-toggle-title">Dynamic CMS Blocks</span>
                  <p className="admin-toggle-desc">
                    Enables dynamic rendering of CMS blocks across marketing pages
                  </p>
                </div>
              </label>
            </div>
          </Panel>

          {/* SECTION 4: MAINTENANCE MODE */}
          <Panel
            title="Maintenance Mode"
            description="Temporarily display maintenance notice to non-admin visitors"
          >
            <label className="admin-toggle-card" style={{ marginBottom: '1rem' }}>
              <input
                type="checkbox"
                checked={Boolean(maintenance.enabled)}
                onChange={(e) =>
                  handleFieldChange('maintenance', 'enabled', e.target.checked)
                }
              />
              <div>
                <span className="admin-toggle-title">Enable Maintenance Mode</span>
                <p className="admin-toggle-desc">
                  When active, public visitors will see a maintenance screen. Admin portal remains accessible.
                </p>
              </div>
            </label>

            {maintenance.enabled && (
              <div className="admin-form-group">
                <label className="admin-form-label" htmlFor="maint-msg-input">
                  Maintenance Message to Display
                </label>
                <input
                  id="maint-msg-input"
                  type="text"
                  className="admin-form-input"
                  value={maintenance.message || ''}
                  onChange={(e) =>
                    handleFieldChange('maintenance', 'message', e.target.value)
                  }
                  placeholder="We are upgrading our systems. Please check back shortly."
                />
              </div>
            )}
          </Panel>

          {/* SUBMIT ACTIONS BAR */}
          <div className="admin-form-sticky-bar">
            <button
              type="button"
              className="admin-btn admin-btn--quiet"
              onClick={handleResetDefaults}
            >
              Reset to Defaults
            </button>
            <button
              type="submit"
              className="admin-btn admin-btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
