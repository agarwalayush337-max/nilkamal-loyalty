import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './views/Login';
import ContractorDashboard from './views/ContractorDashboard';
import AdminDashboard from './views/AdminDashboard';
import DevRoleSwitcher from './components/DevRoleSwitcher';

// Route guard for RBAC (Role-Based Access Control)
function ProtectedRoute({ children, requiredRole }) {
  const { user, activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-500 uppercase tracking-widest animate-pulse">Loading App state...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && activeRole !== requiredRole) {
    // Redirect user to their correct role dashboard if they try to access the other one
    return <Navigate to={activeRole === 'admin' ? '/master-dashboard' : '/contractor-dashboard'} replace />;
  }

  return children;
}

// Root route handler that routes users dynamically based on role
function RootRedirect() {
  const { user, activeRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={activeRole === 'admin' ? '/master-dashboard' : '/contractor-dashboard'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Contractor Dashboard */}
          <Route 
            path="/contractor-dashboard" 
            element={
              <ProtectedRoute requiredRole="contractor">
                <ContractorDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Protected Master/Admin Dashboard */}
          <Route 
            path="/master-dashboard" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Fallback / Root Redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Floating Developer role toggle (Only mounts when user is logged in) */}
        <DevRoleSwitcher />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
