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
      label: 'My Scans',
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
        theme="dark"
        className="shadow-md"
        style={{ backgroundColor: '#041E42' }}
      >
        <div className="h-16 flex items-center justify-center" style={{ backgroundColor: '#FF7300' }}>
          <img src="/utep_logo_white.png" alt="UTEP Logo" className="h-12 mr-2" />
        </div>
        <Menu
          theme="dark"
          selectedKeys={[location.pathname]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="border-r-0"
          style={{ backgroundColor: '#041E42' }}
        />
        <div className="p-4 mt-auto">
          <Button type="link" block onClick={onLogout} style={{ color: '#FF7300' }}>
            <LogoutOutlined /> Sign Out
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