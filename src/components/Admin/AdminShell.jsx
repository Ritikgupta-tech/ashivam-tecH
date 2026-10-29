import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';
import {
  MenuIcon,
  XMarkIcon,
  ChevronDownIcon,
  ActivityIcon,
  MessageIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  UsersIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  PhotoIcon,
  ShieldCheckIcon,
  GearIcon,
  CrownIcon,
} from '../icons';

export const ADMIN_ICON_MAP = {
  overview: ActivityIcon,
  inquiries: MessageIcon,
  careers: BriefcaseIcon,
  internships: AcademicCapIcon,
  employees: UsersIcon,
  documents: DocumentTextIcon,
  content: PencilSquareIcon,
  media: PhotoIcon,
  audit: ShieldCheckIcon,
  settings: GearIcon,
  admins: CrownIcon,
};

export default function AdminShell({
  user,
  activeTab,
  onTabChange,
  allowedTabs = [],
  badgeCounts = {},
  onLogout,
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target)
      ) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  // Close mobile drawer on Escape key or resize > 1024px
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setAccountMenuOpen(false);
      }
    }
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const activeTabMeta = allowedTabs.find((t) => t.id === activeTab) || allowedTabs[0];
  const isSuperadmin = user?.role === 'Superadmin';
  const userInitials = (user?.name || user?.username || 'A')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSelectTab = (tabId) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="admin-layout">
      {/* Top Application Header */}
      <header className="admin-header">
        <div className="admin-header-left">
          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="admin-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <XMarkIcon size={20} /> : <MenuIcon size={20} />}
          </button>

          <Link to="/" className="admin-header-brand" aria-label="Ashivam Technologies Homepage">
            <Logo size={28} variant="symbol" showText={false} alt="Ashivam Technologies" />
            <div className="admin-brand-info">
              <span className="admin-brand-name">Ashivam</span>
              <span className="admin-brand-sub">Admin Portal</span>
            </div>
          </Link>

          <div className="admin-header-divider" aria-hidden="true" />

          {/* Breadcrumb Navigation */}
          <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
            <ol className="admin-breadcrumb-list">
              <li className="admin-breadcrumb-item">
                <span className="admin-breadcrumb-root">Portal</span>
              </li>
              <li className="admin-breadcrumb-separator" aria-hidden="true">/</li>
              <li className="admin-breadcrumb-item admin-breadcrumb-active" aria-current="page">
                {activeTabMeta?.label || 'Overview'}
              </li>
            </ol>
          </nav>
        </div>

        {/* Right Section: User Identity & Account Menu */}
        <div className="admin-header-right">
          <div className="admin-user-menu-wrap" ref={accountMenuRef}>
            <button
              type="button"
              className="admin-account-btn"
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              aria-expanded={accountMenuOpen}
              aria-haspopup="menu"
              aria-label="User account controls"
            >
              <div className="admin-user-avatar" aria-hidden="true">
                {userInitials}
              </div>
              <div className="admin-user-text">
                <span className="admin-user-name">{user?.name || user?.username}</span>
                <span className={`admin-user-role ${isSuperadmin ? 'admin-user-role--super' : ''}`}>
                  {user?.role || 'Admin'}
                </span>
              </div>
              <ChevronDownIcon
                size={14}
                className={`admin-account-chevron ${accountMenuOpen ? 'admin-account-chevron--open' : ''}`}
              />
            </button>

            {accountMenuOpen && (
              <div className="admin-account-dropdown" role="menu">
                <div className="admin-dropdown-header">
                  <p className="admin-dropdown-user-name">{user?.name || user?.username}</p>
                  <p className="admin-dropdown-user-handle">@{user?.username}</p>
                  <p className="admin-dropdown-user-email">{user?.email || 'System Account'}</p>
                  <span className={`admin-role-badge ${isSuperadmin ? 'superadmin' : 'admin'}`}>
                    {user?.role}
                  </span>
                </div>
                <div className="admin-dropdown-divider" />
                <div className="admin-dropdown-items">
                  <Link
                    to="/"
                    className="admin-dropdown-link"
                    role="menuitem"
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    View Public Website
                  </Link>
                  <button
                    type="button"
                    className="admin-dropdown-link admin-dropdown-link--danger"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      onLogout();
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Body: Sidebar + Active Tab Content */}
      <div className="admin-body">
        {/* Mobile Backdrop Overlay */}
        {mobileMenuOpen && (
          <div
            className="admin-drawer-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          className={`admin-sidebar ${mobileMenuOpen ? 'admin-sidebar--mobile-open' : ''}`}
          aria-label="Admin Navigation"
        >
          <div className="admin-sidebar-nav">
            <div className="admin-nav-group-label">WORKSPACE</div>
            <ul className="admin-nav-list">
              {allowedTabs.map((item) => {
                const isActive = activeTab === item.id;
                const IconComponent = ADMIN_ICON_MAP[item.id] || ActivityIcon;
                const badgeCount = badgeCounts[item.id];

                return (
                  <li key={item.id} className="admin-nav-item">
                    <button
                      type="button"
                      className={`admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`}
                      onClick={() => handleSelectTab(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="admin-nav-icon" aria-hidden="true">
                        <IconComponent size={18} />
                      </span>
                      <span className="admin-nav-label">{item.label}</span>
                      {badgeCount !== undefined && badgeCount > 0 && (
                        <span className="admin-nav-badge" aria-label={`${badgeCount} pending items`}>
                          {badgeCount > 99 ? '99+' : badgeCount}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Sidebar Footer Metadata */}
          <div className="admin-sidebar-footer">
            <div className="admin-status-indicator">
              <span className="admin-status-dot" aria-hidden="true" />
              <span className="admin-status-text">Backend Connected</span>
            </div>
            <span className="admin-footer-version">v1.2.0 • Ashivam Enterprise</span>
          </div>
        </aside>

        {/* Active Content View Container */}
        <main className="admin-content-view" id="admin-main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
