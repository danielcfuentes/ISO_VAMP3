import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const ExternalScans = () => {
  return (
    <div className="p-6">
      <Card className="shadow-sm">
        <Title level={4}>External Scans</Title>
        <p className="text-gray-600">External scans functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default ExternalScans;