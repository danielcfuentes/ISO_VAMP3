import React from 'react';
import { Card, Typography } from 'antd';

const { Title } = Typography;

const ExceptionRequests = () => {
  return (
    <div className="p-6">
      <Card className="shadow-sm">
        <Title level={4}>Exception Requests</Title>
        <p className="text-gray-600">Exception requests functionality will be implemented here.</p>
      </Card>
    </div>
  );
};

export default ExceptionRequests;