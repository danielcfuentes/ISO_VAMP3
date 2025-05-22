import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ConfigProvider } from 'antd';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Dashboard from './components/Dashboard';
import ExceptionRequests from './components/ExceptionRequests';
import AdminDashboard from './components/AdminDashboard';
import DepartmentHeadDashboard from './components/DepartmentHeadDashboard';
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
  const [userRoles, setUserRoles] = useState(null);

  useEffect(() => {
    // Check authentication status on mount
    checkAuthStatus();

    // Subscribe to auth state changes
    const unsubscribe = nessusService.onAuthStateChange(() => {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserRoles(null);
    });

    return () => unsubscribe();
  }, []);

  const checkAuthStatus = async () => {
    if (isAuthenticated) {
      const isStillAuthenticated = await nessusService.checkAuthStatus();
      if (!isStillAuthenticated) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUserRoles(null);
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('isAdmin');
      } else {
        fetchUserRoles();
      }
    }
  };

  const fetchUserRoles = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/user/roles', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setUserRoles(data.roles);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

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
      setUserRoles(null);
    } catch (error) {
      console.error('Error logging out:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserRoles(null);
    }
  };

  const ProtectedRoute = ({ children, requiresAdmin = false }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (requiresAdmin && !isAdmin) {
      return <Navigate to="/my-agents" replace />;
    }
    return (
      <MainLayout 
        isAdmin={isAdmin} 
        isDepartmentHead={userRoles?.includes('department_head')} 
        onLogout={handleLogout}
      >
        {children}
      </MainLayout>
    );
  };

  ProtectedRoute.propTypes = {
    children: PropTypes.node.isRequired,
    requiresAdmin: PropTypes.bool
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

          <Route path="/department-head-dashboard" element={
            <ProtectedRoute>
              <DepartmentHeadDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/my-agents" replace />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;