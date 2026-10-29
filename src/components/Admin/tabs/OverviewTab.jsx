import { useEffect, useState, useCallback } from 'react';
import { getDashboardOverview, getDashboardRecentActivity } from '../../../api';
import { StatCard, Panel, LoadingSkeleton, EmptyState } from '../AdminUI';
import {
  MessageIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  UsersIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  PhotoIcon,
  ActivityIcon,
  RefreshIcon,
  ArrowRightIcon,
} from '../../icons';

export default function OverviewTab({ onNavigateTab }) {
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("all");

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, activityRes] = await Promise.allSettled([
        getDashboardOverview({ range: timeRange }),
        getDashboardRecentActivity(8),
      ]);

      const overviewData =
        overviewRes.status === 'fulfilled' ? overviewRes.value?.data : null;
      const activityData =
        activityRes.status === 'fulfilled'
          ? activityRes.value?.data?.items || []
          : [];

      setData(overviewData);
      setActivity(activityData);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard overview');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  if (loading) {
    return (
      <div className="admin-tab-container">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Executive Overview</h1>
            <p className="admin-page-subtitle">Aggregated system metrics and operational activity</p>
          </div>
        </div>
        <LoadingSkeleton rows={5} height={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-tab-container">
        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title">Executive Overview</h1>
            <p className="admin-page-subtitle">Aggregated system metrics and operational activity</p>
          </div>
        </div>
        <div className="admin-alert admin-alert--error" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={fetchOverview}
          >
            <RefreshIcon size={14} />
            <span>Retry</span>
          </button>
        </div>
      </div>
    );
  }

  const breakdown = data?.breakdown || {};
  const newInquiries = breakdown.inquiries?.new || 0;
  const pendingApps = breakdown.applications?.applied || 0;

  return (
    <div className="admin-tab-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Executive Overview</h1>
          <p className="admin-page-subtitle">
            Live operational status across Ashivam Technologies core services
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="admin-segmented-tabs" role="tablist" aria-label="Time Range Filter">
            {[
              { id: 'all', label: 'All Time' },
              { id: '90d', label: '90 Days' },
              { id: '30d', label: '30 Days' },
              { id: '7d', label: '7 Days' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={timeRange === tab.id}
                className={`admin-segmented-btn ${timeRange === tab.id ? 'admin-segmented-btn--active' : ''}`}
                onClick={() => setTimeRange(tab.id)}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--secondary admin-btn--sm"
            onClick={fetchOverview}
            aria-label="Refresh overview data"
          >
            <RefreshIcon size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Primary Operational Metric Cards */}
      <div className="admin-stats-grid">
        <StatCard
          label="Inquiries"
          value={data?.inquiries ?? 0}
          subtext={newInquiries > 0 ? `${newInquiries} new awaiting review` : 'All inquiries up to date'}
          icon={MessageIcon}
          tone={newInquiries > 0 ? 'attention' : 'default'}
          onClick={() => onNavigateTab?.('inquiries')}
        />
        <StatCard
          label="Active Jobs"
          value={breakdown.jobs?.active ?? data?.jobs ?? 0}
          subtext={`${data?.jobs ?? 0} total vacancies listed`}
          icon={BriefcaseIcon}
          onClick={() => onNavigateTab?.('careers')}
        />
        <StatCard
          label="Job Applications"
          value={data?.applications ?? 0}
          subtext={pendingApps > 0 ? `${pendingApps} pending review` : 'Candidate queue clear'}
          icon={BriefcaseIcon}
          tone={pendingApps > 0 ? 'attention' : 'default'}
          onClick={() => onNavigateTab?.('careers')}
        />
        <StatCard
          label="Internships"
          value={data?.internships ?? 0}
          subtext="Student program applicants"
          icon={AcademicCapIcon}
          onClick={() => onNavigateTab?.('internships')}
        />
        <StatCard
          label="Active Staff"
          value={breakdown.employees?.active ?? data?.employees ?? 0}
          subtext={`${data?.employees ?? 0} employee records`}
          icon={UsersIcon}
          onClick={() => onNavigateTab?.('employees')}
        />
        <StatCard
          label="HR Documents"
          value={data?.hrDocuments ?? 0}
          subtext={`${breakdown.hrDocuments?.verified ?? 0} verified documents`}
          icon={DocumentTextIcon}
          onClick={() => onNavigateTab?.('documents')}
        />
        <StatCard
          label="CMS Blocks"
          value={data?.content ?? 0}
          subtext={`${breakdown.content?.published ?? 0} published to website`}
          icon={PencilSquareIcon}
          onClick={() => onNavigateTab?.('content')}
        />
        <StatCard
          label="Media Assets"
          value={data?.media ?? 0}
          subtext="Images, icons and brand media"
          icon={PhotoIcon}
          onClick={() => onNavigateTab?.('media')}
        />
      </div>

      {/* Grid: Recent Activity Feed & Fast Navigation Shortcuts */}
      <div className="admin-two-col-grid">
        <Panel
          title="Recent Operational Activity"
          description="Latest system actions, inquiries, and application events"
        >
          {activity.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title="No Recent Activity"
              description="No recent administrative events have been recorded."
            />
          ) : (
            <div className="admin-activity-list">
              {activity.map((item, idx) => {
                const dateStr = item.createdAt
                  ? new Date(item.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Recent';

                return (
                  <div key={item._id || idx} className="admin-activity-item">
                    <div className="admin-activity-dot" aria-hidden="true" />
                    <div className="admin-activity-details">
                      <p className="admin-activity-text">
                        <strong>{item.actorName || item.actorUsername || 'Admin'}</strong>{' '}
                        <span>{item.details?.description || item.action || 'Performed action'}</span>
                      </p>
                      <span className="admin-activity-time">{dateStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          title="Administrative Shortcuts"
          description="Direct access to operational workflows"
        >
          <div className="admin-shortcuts-list">
            <button
              type="button"
              className="admin-shortcut-card"
              onClick={() => onNavigateTab?.('inquiries')}
            >
              <div className="admin-shortcut-info">
                <span className="admin-shortcut-title">Review Client Inquiries</span>
                <span className="admin-shortcut-desc">
                  Inspect new business requests and message transcripts
                </span>
              </div>
              <ArrowRightIcon size={16} />
            </button>

            <button
              type="button"
              className="admin-shortcut-card"
              onClick={() => onNavigateTab?.('careers')}
            >
              <div className="admin-shortcut-info">
                <span className="admin-shortcut-title">Manage Job Openings</span>
                <span className="admin-shortcut-desc">
                  Post new engineering roles or review candidate resumes
                </span>
              </div>
              <ArrowRightIcon size={16} />
            </button>

            <button
              type="button"
              className="admin-shortcut-card"
              onClick={() => onNavigateTab?.('employees')}
            >
              <div className="admin-shortcut-info">
                <span className="admin-shortcut-title">Employee Directory</span>
                <span className="admin-shortcut-desc">
                  Add staff, update designations, or manage status
                </span>
              </div>
              <ArrowRightIcon size={16} />
            </button>

            <button
              type="button"
              className="admin-shortcut-card"
              onClick={() => onNavigateTab?.('settings')}
            >
              <div className="admin-shortcut-info">
                <span className="admin-shortcut-title">System & Security Settings</span>
                <span className="admin-shortcut-desc">
                  Configure corporate contact info, feature flags, and maintenance mode
                </span>
              </div>
              <ArrowRightIcon size={16} />
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
