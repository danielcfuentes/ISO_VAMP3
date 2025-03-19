import React from 'react';
import { Modal, Button, Typography, Divider, Table, Tag, Space, Alert } from 'antd';
import { InfoCircleOutlined, DownloadOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined, StopOutlined } from '@ant-design/icons';

const { Text } = Typography;

const VulDetailsModal = ({ 
  visible, 
  scan, 
  onClose, 
  onDownload, 
  downloadLoading 
}) => {
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Get status tag component
  const getStatusTag = (status) => {
    const statusMappings = {
      'completed': { color: 'success', icon: <CheckCircleOutlined />, text: 'Completed' },
      'running': { color: 'processing', icon: <LoadingOutlined />, text: 'Running' },
      'stopped': { color: 'warning', icon: <StopOutlined />, text: 'Stopped' },
      'failed': { color: 'error', icon: <CloseCircleOutlined />, text: 'Failed' },
      'pending': { color: 'default', icon: <LoadingOutlined />, text: 'Pending' }
    };
    
    const defaultMapping = { color: 'default', icon: <InfoCircleOutlined />, text: status || 'Unknown' };
    const mapping = statusMappings[status] || defaultMapping;
    
    return (
      <Tag icon={mapping.icon} color={mapping.color}>
        {mapping.text}
      </Tag>
    );
  };

  // Render vulnerability summary
  const renderVulnerabilitySummary = (hosts) => {
    if (!hosts || hosts.length === 0) {
      return <Alert message="No vulnerability data available" type="info" />;
    }
    
    const hostColumns = [
      {
        title: 'Hostname',
        dataIndex: 'hostname',
        key: 'hostname',
      },
      {
        title: 'IP Address',
        dataIndex: 'ip',
        key: 'ip',
      },
      {
        title: 'Critical',
        dataIndex: 'critical',
        key: 'critical',
        render: val => (val > 0 ? <Tag color="red">{val}</Tag> : val)
      },
      {
        title: 'High',
        dataIndex: 'high',
        key: 'high',
        render: val => (val > 0 ? <Tag color="orange">{val}</Tag> : val)
      },
      {
        title: 'Medium',
        dataIndex: 'medium',
        key: 'medium',
        render: val => (val > 0 ? <Tag color="gold">{val}</Tag> : val)
      },
      {
        title: 'Low',
        dataIndex: 'low',
        key: 'low',
        render: val => (val > 0 ? <Tag color="green">{val}</Tag> : val)
      },
      {
        title: 'Info',
        dataIndex: 'info',
        key: 'info',
        render: val => <Tag color="blue">{val}</Tag>
      }
    ];
    
    return (
      <Table
        columns={hostColumns}
        dataSource={hosts.map((host, index) => ({ ...host, key: index }))}
        pagination={false}
        size="small"
      />
    );
  };

  return (
    <Modal
      title={
        <Space>
          <InfoCircleOutlined />
          Scan Details: {scan?.name}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        scan?.status === 'completed' && (
          <Button
            key="download"
            type="primary"
            icon={downloadLoading ? <LoadingOutlined spin /> : <DownloadOutlined />}
            onClick={() => onDownload(scan.id, scan.name)}
            loading={downloadLoading}
          >
            Download Report
          </Button>
        )
      ]}
      width={800}
    >
      {scan && (
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Text strong>Status:</Text> {getStatusTag(scan.status)}
            </div>
            <div>
              <Text strong>Scan ID:</Text> {scan.id}
            </div>
            <div>
              <Text strong>Start Time:</Text> {formatTimestamp(scan.start_time)}
            </div>
            <div>
              <Text strong>End Time:</Text> {formatTimestamp(scan.end_time)}
            </div>
          </div>
          
          <Divider orientation="left">Vulnerability Summary</Divider>
          {renderVulnerabilitySummary(scan.hosts)}
        </div>
      )}
    </Modal>
  );
};

export default VulDetailsModal;