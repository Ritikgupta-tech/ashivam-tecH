import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDashboardOverview } from '../../api';

import { AdminFeedbackProvider } from './AdminFeedback';
import AdminShell from './AdminShell';

import OverviewTab from './tabs/OverviewTab';
import InquiriesTab from './tabs/InquiriesTab';
import CareersTab from './tabs/CareersTab';
import InternshipsTab from './tabs/InternshipsTab';
import EmployeesTab from './tabs/EmployeesTab';
import DocumentsTab from './tabs/DocumentsTab';
import ContentTab from './tabs/ContentTab';
import MediaTab from './tabs/MediaTab';
import AuditTab from './tabs/AuditTab';
import SettingsTab from './tabs/SettingsTab';
import AdminsTab from './tabs/AdminsTab';

import './AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout, hasPermission, isSuperadmin } = useAuth();

  // Navigation Items defined strictly by backend permission model
  const navItems = useMemo(
    () => [
      { id: 'overview', label: 'Overview', permission: 'dashboard' },
      { id: 'inquiries', label: 'Inquiries', permission: 'inquiries' },
      { id: 'careers', label: 'Careers & Jobs', permission: 'careers' },
      { id: 'internships', label: 'Internships', permission: 'careers' },
      { id: 'employees', label: 'Employees', permission: 'employees' },
      { id: 'documents', label: 'HR Documents', permission: 'employees' },
      { id: 'content', label: 'CMS Content', permission: 'content' },
      { id: 'media', label: 'Media Library', permission: 'media' },
      { id: 'audit', label: 'Audit Logs', permission: 'audit' },
      { id: 'settings', label: 'Settings', permission: 'settings' },
      { id: 'admins', label: 'Admin Accounts', superadminOnly: true },
    ],
    []
  );

  // Filter allowed tabs based on real backend permissions
  const allowedTabs = useMemo(() => {
    return navItems.filter((item) => {
      if (item.superadminOnly) return isSuperadmin;
      return hasPermission(item.permission);
    });
  }, [navItems, isSuperadmin, hasPermission]);

  const [activeTab, setActiveTab] = useState('overview');
  const [badgeCounts, setBadgeCounts] = useState({});

  // Redirect to login if unauthenticated once auth check finishes
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/admin/login', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Adjust active tab if current tab is not permitted
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.some((t) => t.id === activeTab)) {
      setActiveTab(allowedTabs[0].id);
    }
  }, [allowedTabs, activeTab]);

  // Fetch light overview count for attention badges in navigation
  const fetchBadgeCounts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await getDashboardOverview();
      const overview = res?.data || {};
      const breakdown = overview.breakdown || {};
      setBadgeCounts({
        inquiries: breakdown.inquiries?.new || 0,
        careers: breakdown.applications?.applied || 0,
        documents: breakdown.hrDocuments?.pending || 0,
      });
    } catch {
      // Non-critical badge counter fail silently
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchBadgeCounts();
  }, [fetchBadgeCounts, activeTab]);

  // Loading state while verifying administrator session
  if (isLoading) {
    return (
      <div className="admin-loading-screen" role="status" aria-live="polite">
        <div className="admin-spinner" style={{ width: '36px', height: '36px', borderWidth: '3px' }} />
        <p className="admin-loading-text">Verifying secure administrator session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <AdminFeedbackProvider>
      <AdminShell
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        allowedTabs={allowedTabs}
        badgeCounts={badgeCounts}
        onLogout={logout}
      >
        {activeTab === 'overview' && <OverviewTab onNavigateTab={setActiveTab} />}
        {activeTab === 'inquiries' && <InquiriesTab />}
        {activeTab === 'careers' && <CareersTab />}
        {activeTab === 'internships' && <InternshipsTab />}
        {activeTab === 'employees' && <EmployeesTab />}
        {activeTab === 'documents' && <DocumentsTab />}
        {activeTab === 'content' && <ContentTab />}
        {activeTab === 'media' && <MediaTab />}
        {activeTab === 'audit' && <AuditTab />}
        {activeTab === 'settings' && <SettingsTab />}
        {activeTab === 'admins' && <AdminsTab currentUser={user} />}
      </AdminShell>
    </AdminFeedbackProvider>
  );
}
