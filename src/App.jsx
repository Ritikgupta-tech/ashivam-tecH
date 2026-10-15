import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import IndustriesPage from './pages/IndustriesPage';
import SolutionsPage from './pages/SolutionsPage';
import CareersPage from './pages/CareersPage';
import EmployeePortalSelector from './pages/EmployeePortalSelector';
import EmployeeLoginPage from './pages/EmployeeLoginPage';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';
import NotFoundPage from './pages/NotFoundPage';
import LegalPage from './pages/LegalPage';
import RouteScrollWatcher from './components/RouteScrollWatcher';

function App() {
  return (
    <BrowserRouter>
      <RouteScrollWatcher />
      <div className="page-bg" aria-hidden="true" />
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

          {/* Dedicated Employee & Admin Authentication Gateways */}
          <Route path="/employee-login" element={<EmployeePortalSelector />} />
          <Route path="/employee-login/employee" element={<EmployeeLoginPage />} />
          <Route path="/employee-login/admin" element={<AdminLogin />} />

          {/* Legacy & Direct Section Aliases */}
          <Route path="/about" element={<HomePage />} />
          <Route path="/services" element={<SolutionsPage />} />
          <Route path="/projects" element={<HomePage />} />
          <Route path="/contact" element={<HomePage />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Administrative Dashboard (Preserved) */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/*" element={<AdminDashboard />} />

          {/* Unknown Route Catch-All (404 Experience) */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
