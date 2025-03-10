import React from 'react';
import { Card, Typography, Space } from 'antd';
import { DashboardOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const AdminDashboard = () => {
  return (
    <div className="p-6">
      <Card className="shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <Title level={4}>
            <Space>
              <DashboardOutlined />
              Admin Dashboard
            </Space>
          </Title>
        </div>
        
        <Paragraph className="text-gray-600 mb-4">
          Welcome to the Admin Dashboard. This area is reserved for administrative functions and system management.
        </Paragraph>
        
        {/* You can add more admin functionality here later */}
      </Card>
    </div>
  );
};

export default AdminDashboard;