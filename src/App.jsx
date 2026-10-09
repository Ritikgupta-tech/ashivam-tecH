import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import AdminLogin from './components/Admin/AdminLogin';
import AdminDashboard from './components/Admin/AdminDashboard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Corporate Website & Direct Section Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<HomePage />} />
          <Route path="/services" element={<HomePage />} />
          <Route path="/solutions" element={<HomePage />} />
          <Route path="/projects" element={<HomePage />} />
          <Route path="/team" element={<HomePage />} />
          <Route path="/careers" element={<HomePage />} />
          <Route path="/contact" element={<HomePage />} />

          {/* Superadmin Authentication */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Admin Control Center */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/*" element={<AdminDashboard />} />

          {/* Catch-all redirect to public website */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
