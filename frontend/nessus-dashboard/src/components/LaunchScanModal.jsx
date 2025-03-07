import React, { useState } from 'react';
import { Modal, Form, Input, Typography, Divider, Alert, Space, message } from 'antd';
import { MonitorOutlined, ScanOutlined } from '@ant-design/icons';
import nessusService from '../services/nessusService';

const { Text } = Typography;

const LaunchScanModal = ({ visible, onClose, server, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      // Use the server name if provided, otherwise use the input name
      const serverName = server?.name || values.serverName;
      
      await nessusService.createAndLaunchScan(serverName);
      
      message.success(`Scan created and launched for ${serverName}`);
      onSuccess?.();
      onClose();
      form.resetFields();
    } catch (error) {
      console.error('Error launching scan:', error);
      message.error(error.message || 'Failed to launch scan');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <ScanOutlined />
          {server ? 'Launch Scan for Server' : 'Launch New Scan'}
        </Space>
      }
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Launch Scan"
      width={520}
    >
      {server && (
        <Alert
          message={
            <Space>
              <MonitorOutlined />
              <Text strong>{server.name}</Text>
            </Space>
          }
          description={`IP Address: ${server.ipAddress}`}
          type="info"
          showIcon={false}
          style={{ marginBottom: 24 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
      >
        {!server && (
          <Form.Item
            name="serverName"
            label="Server Name"
            rules={[
              { required: true, message: 'Please enter a server name' },
              { min: 3, message: 'Server name must be at least 3 characters' }
            ]}
          >
            <Input 
              placeholder="Enter server name"
              prefix={<MonitorOutlined style={{ color: '#bfbfbf' }} />}
            />
          </Form.Item>
        )}

        <Divider />

        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          The scan will be created and launched automatically. This process may take a few moments.
        </Text>
      </Form>
    </Modal>
  );
};

export default LaunchScanModal;