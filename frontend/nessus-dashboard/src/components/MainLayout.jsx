import React from 'react';
import { Layout, Menu, Button } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { DesktopOutlined, FileTextOutlined, DashboardOutlined, LogoutOutlined } from '@ant-design/icons';

const { Content, Sider } = Layout;

const MainLayout = ({ children, isAdmin, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Only include admin dashboard menu item if user is admin
  const menuItems = [
    {
      key: '/my-agents',
      icon: <DesktopOutlined />,
      label: 'Internal Agent Scans',
    },
    {
      key: '/exception-requests',
      icon: <FileTextOutlined />,
      label: 'Exception Requests',
    },
    ...(isAdmin ? [
      {
        key: '/admin-dashboard',
        icon: <DashboardOutlined />,
        label: 'Admin Dashboard',
      }
    ] : [])
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        className="shadow-md"
      >
        <div className="h-16 flex items-center justify-center bg-blue-600">
          <h1 className="text-white text-lg font-semibold">Nessus Manager</h1>
        </div>
        <Menu
          theme="light"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="border-r-0"
        />
        <div className="p-4 mt-auto">
          <Button type="link" block onClick={onLogout}>
            <LogoutOutlined /> Logout
          </Button>
        </div>
      </Sider>
      <Layout>
        <Content className="bg-gray-50">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;