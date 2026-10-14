import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import { ShieldIcon, ServerIcon, ArrowRightIcon } from '../components/icons';
import './EmployeePortalSelector.css';

export default function EmployeePortalSelector() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Employee & Administrative Portals | Ashivam Technologies';
  }, []);

  return (
    <div className="portal-selector-page">
      <Navbar />

      <main className="portal-selector-main" id="main-content">
        <div className="container portal-selector-container">
          <div className="portal-selector__header text-center">
            <div className="portal-selector__badge">
              <span>Authentication Gateways</span>
            </div>
            <h1 className="portal-selector__title">
              Ashivam Technologies <span className="gradient-text-gold">Access Portals</span>
            </h1>
            <p className="portal-selector__desc">
              Select your authorized gateway below to securely access internal workspaces, administrative modules, and enterprise resources.
            </p>
          </div>

          <div className="portal-cards-grid">
            {/* Employee Portal Card */}
            <div className="portal-card">
              <div className="portal-card__icon-wrap">
                <ShieldIcon size={28} />
              </div>
              <span className="portal-card__type">Team Members & Staff</span>
              <h2 className="portal-card__title">Employee Workspace</h2>
              <p className="portal-card__desc">
                Access your employee directory profile, assigned project tasks, organizational policies, and internal documentation vaults.
              </p>
              <ul className="portal-card__features">
                <li>Employee directory & identity profile</li>
                <li>Digital document access & compliance</li>
                <li>Project assignment overviews</li>
              </ul>
              <Link to="/employee-login/employee" className="btn btn-primary portal-card__btn">
                <span>Access Employee Login</span>
                <ArrowRightIcon size={16} />
              </Link>
            </div>

            {/* Admin Console Card */}
            <div className="portal-card portal-card--admin">
              <div className="portal-card__icon-wrap">
                <ServerIcon size={28} />
              </div>
              <span className="portal-card__type">Executive & Administrative</span>
              <h2 className="portal-card__title">Admin Control Center</h2>
              <p className="portal-card__desc">
                Authorized management portal for Superadmins and Admins to govern inquiries, job listings, candidate resumes, and system audits.
              </p>
              <ul className="portal-card__features">
                <li>Candidate resume review & job publishing</li>
                <li>Customer inquiries & communication status</li>
                <li>Employee administration & audit logs</li>
              </ul>
              <Link to="/employee-login/admin" className="btn btn-primary portal-card__btn">
                <span>Access Admin Console</span>
                <ArrowRightIcon size={16} />
              </Link>
            </div>
          </div>

          <div className="portal-security-notice text-center">
            <p>
              Protected by Ashivam Enterprise Access Policy. Unauthorized access attempts are monitored and recorded with client IP telemetry.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
