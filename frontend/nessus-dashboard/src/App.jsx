import React, { useState } from 'react';
import { ConfigProvider } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Dashboard from './components/Dashboard';
import ExternalScans from './components/ExternalScans';
import ExceptionRequests from './components/ExceptionRequests';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';

const ProtectedRoute = ({ children, isAuthenticated }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout>{children}</MainLayout>;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
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
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/external-scans" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ExternalScans />
            </ProtectedRoute>
          } />
          
          <Route path="/exception-requests" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ExceptionRequests />
            </ProtectedRoute>
          } />
          
          <Route path="/admin-dashboard" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
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