import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './pages/HomePage';
import IndustriesPage from './pages/IndustriesPage';
import SolutionsPage from './pages/SolutionsPage';
import CareersPage from './pages/CareersPage';
import EmployeePortalSelector from './pages/EmployeePortalSelector';
import EmployeeLoginPage from './pages/EmployeeLoginPage';
import NotFoundPage from './pages/NotFoundPage';
import LegalPage from './pages/LegalPage';
import RouteScrollWatcher from './components/RouteScrollWatcher';

// PERF-01: Lazy-load admin-only bundles so public visitors never download
// the AdminDashboard (~400 kB parsed JS) or AdminLogin chunks.
// These are fetched on-demand only when a user navigates to /admin/*.
const AdminLogin = lazy(() => import('./components/Admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'));

/** Minimal loading fallback — keeps the viewport stable during chunk fetch. */
function AdminLoadingFallback() {
  return (
    <div
      role="status"
      aria-label="Loading admin panel"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '1rem',
        color: '#6b7280',
      }}
    >
      Loading…
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RouteScrollWatcher />
      <div className="page-bg" aria-hidden="true" />
      <ErrorBoundary>
        <AuthProvider>
          <Routes>
          {/* Core Corporate Multi-Page Architecture */}
          <Route path="/" element={<HomePage />} />
          <Route path="/industries" element={<IndustriesPage />} />
          <Route path="/industries/:sector" element={<IndustriesPage />} />
          <Route path="/solutions" element={<SolutionsPage />} />
          <Route path="/solutions/:category" element={<SolutionsPage />} />
          <Route path="/careers" element={<CareersPage />} />

          {/* Legal Governance & Enterprise Compliance Pages */}
          <Route path="/privacy-policy" element={<LegalPage initialTab="privacy" />} />
          <Route path="/privacy" element={<LegalPage initialTab="privacy" />} />
          <Route path="/terms-of-service" element={<LegalPage initialTab="terms" />} />
          <Route path="/terms" element={<LegalPage initialTab="terms" />} />
          <Route path="/security" element={<LegalPage initialTab="security" />} />
          <Route path="/sla" element={<LegalPage initialTab="terms" />} />
          <Route path="/legal" element={<LegalPage initialTab="privacy" />} />

          {/* Dedicated Employee & Admin Authentication Gateways */}
          <Route path="/employee-login" element={<EmployeePortalSelector />} />
          <Route path="/employee-login/employee" element={<EmployeeLoginPage />} />
          <Route path="/employee-login/admin" element={
            <Suspense fallback={<AdminLoadingFallback />}>
              <AdminLogin />
            </Suspense>
          } />

          {/* Legacy & Direct Section Aliases */}
          <Route path="/about" element={<HomePage />} />
          <Route path="/services" element={<SolutionsPage />} />
          <Route path="/projects" element={<HomePage />} />
          <Route path="/contact" element={<HomePage />} />
          <Route path="/admin/login" element={
            <Suspense fallback={<AdminLoadingFallback />}>
              <AdminLogin />
            </Suspense>
          } />

          {/* Protected Administrative Dashboard (Preserved) */}
          <Route path="/admin" element={
            <Suspense fallback={<AdminLoadingFallback />}>
              <AdminDashboard />
            </Suspense>
          } />
          <Route path="/admin/*" element={
            <Suspense fallback={<AdminLoadingFallback />}>
              <AdminDashboard />
            </Suspense>
          } />

          {/* Unknown Route Catch-All (404 Experience) */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
