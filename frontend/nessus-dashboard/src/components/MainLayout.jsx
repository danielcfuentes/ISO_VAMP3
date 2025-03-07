import React from 'react';
import { Layout, Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { DesktopOutlined, ScanOutlined, FileTextOutlined } from '@ant-design/icons';

const { Header, Content, Sider } = Layout;

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/my-agents',
      icon: <DesktopOutlined />,
      label: 'My Agents',
    },
    {
      key: '/external-scans',
      icon: <ScanOutlined />,
      label: 'External Scans',
    },
    {
      key: '/exception-requests',
      icon: <FileTextOutlined />,
      label: 'Exception Requests',
    },
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