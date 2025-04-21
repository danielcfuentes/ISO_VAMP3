import React, { useState, useEffect } from 'react';
import { ConfigProvider } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Dashboard from './components/Dashboard';
import ExceptionRequests from './components/ExceptionRequests';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import nessusService from './services/nessusService';
import './styles/theme.css';  // Import UTEP theme

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('isAuthenticated') === 'true'
  );
  const [isAdmin, setIsAdmin] = useState(
    localStorage.getItem('isAdmin') === 'true'
  );

  const handleLoginSuccess = (isAdmin = false) => {
    localStorage.setItem('isAuthenticated', 'true');
    setIsAuthenticated(true);
    setIsAdmin(isAdmin);
  };

  const handleLogout = async () => {
    try {
      await nessusService.logout();
      setIsAuthenticated(false);
      setIsAdmin(false);
    } catch (error) {
      console.error('Error logging out:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  };

  const ProtectedRoute = ({ children, requiresAdmin = false }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (requiresAdmin && !isAdmin) {
      return <Navigate to="/my-agents" replace />;
    }
    return <MainLayout isAdmin={isAdmin} onLogout={handleLogout}>{children}</MainLayout>;
  };

  return (
    <ConfigProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? (
              <Navigate to="/my-agents" replace />
            ) : (
              <Login onLoginSuccess={handleLoginSuccess} />
            )
          } />
          
          <Route path="/my-agents" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/exception-requests" element={
            <ProtectedRoute>
              <ExceptionRequests />
            </ProtectedRoute>
          } />
          
          <Route path="/admin-dashboard" element={
            <ProtectedRoute requiresAdmin={true}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/my-agents" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;