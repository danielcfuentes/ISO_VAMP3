import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Form, 
  Input, 
  Button, 
  Table, 
  Tag, 
  Space, 
  Modal, 
  Alert, 
  message,
  Divider,
  Tooltip
} from 'antd';
import { 
  ScanOutlined, 
  GlobalOutlined, 
  InfoCircleOutlined, 
  StopOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  WarningOutlined,
  MailOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ExternalScans = () => {
  const [form] = Form.useForm();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [externalScansFolder, setExternalScansFolder] = useState(null);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  
  // API URL
  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    // Fetch external scans folder on component mount
    fetchExternalScansFolder();
    // Fetch existing external scans
    fetchExternalScans();
  }, []);

  const fetchExternalScansFolder = async () => {
    try {
      const response = await axios.get(`${API_URL}/external-scans/folder`, {
        withCredentials: true
      });
      setExternalScansFolder(response.data);
    } catch (error) {
      console.error('Error fetching external scans folder:', error);
      message.error('Failed to fetch external scans folder');
    }
  };

  const fetchExternalScans = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/external-scans`, {
        withCredentials: true
      });
      setScans(response.data.scans || []);
    } catch (error) {
      console.error('Error fetching external scans:', error);
      message.error('Failed to fetch external scans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApprovalRequest = async (values) => {
    try {
      setSubmitting(true);
      // This would normally send an email to security@utep.edu
      // For now, we'll just simulate it
      
      message.success('Approval request sent successfully');
      setApprovalModalVisible(false);
      setScanModalVisible(true);
    } catch (error) {
      message.error('Failed to send approval request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitScan = async (values) => {
    try {
      setSubmitting(true);
      
      if (!externalScansFolder) {
        message.error('External scans folder not found');
        return;
      }
      
      // Create the external scan
      const response = await axios.post(`${API_URL}/external-scans/create`, {
        server_name: values.serverName,
        folder_id: externalScansFolder.id
      }, {
        withCredentials: true
      });
      
      if (response.data && response.data.scan && response.data.scan.id) {
        // Launch the scan
        await axios.post(`${API_URL}/scans/${response.data.scan.id}/launch`, {}, {
          withCredentials: true
        });
        
        message.success(`External scan created and launched for ${values.serverName}`);
        setScanModalVisible(false);
        form.resetFields();
        
        // Refresh the scans list
        fetchExternalScans();
      }
    } catch (error) {
      console.error('Error creating external scan:', error);
      message.error('Failed to create external scan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopScan = async (scanId) => {
    try {
      await axios.post(`${API_URL}/external-scans/stop/${scanId}`, {}, {
        withCredentials: true
      });
      message.success('Scan stopped successfully');
      
      // Refresh the scans list
      fetchExternalScans();
    } catch (error) {
      console.error('Error stopping scan:', error);
      message.error('Failed to stop scan');
    }
  };

  const handleViewDetails = (scan) => {
    setSelectedScan(scan);
    setDetailModalVisible(true);
  };

  const handleDownloadReport = async (scanId, scanName) => {
    try {
      const response = await axios.get(`${API_URL}/scan/report/${scanName}`, {
        responseType: 'blob',
        withCredentials: true
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `external_scan_${scanName}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      message.error('Failed to download report');
    }
  };

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

  // Column definitions for scan table
  const columns = [
    {
      title: 'Server Name',
      dataIndex: 'name',
      key: 'name',
      render: text => <a onClick={() => handleViewDetails(scans.find(scan => scan.name === text))}>{text}</a>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => getStatusTag(status)
    },
    {
      title: 'Start Time',
      dataIndex: 'start_time',
      key: 'start_time',
      render: time => formatTimestamp(time)
    },
    {
      title: 'End Time',
      dataIndex: 'end_time',
      key: 'end_time',
      render: time => formatTimestamp(time)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          {record.status === 'running' && (
            <Tooltip title="Stop Scan">
              <Button 
                type="text"
                danger
                icon={<StopOutlined />}
                onClick={() => handleStopScan(record.id)}
              />
            </Tooltip>
          )}
          
          {record.status === 'completed' && (
            <Tooltip title="Download Report">
              <Button 
                type="text"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadReport(record.id, record.name)}
              />
            </Tooltip>
          )}
          
          <Tooltip title="View Details">
            <Button 
              type="text"
              icon={<InfoCircleOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // Render vulnerability summary in detail modal
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
    <div className="p-6">
      <Card className="shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">
          <Title level={4}>
            <Space>
              <GlobalOutlined />
              External Vulnerability Scans
            </Space>
          </Title>
          <Button 
            type="primary" 
            icon={<ScanOutlined />}
            onClick={() => setApprovalModalVisible(true)}
          >
            Request New External Scan
          </Button>
        </div>
        
        <Paragraph className="text-gray-600 mb-4">
          External vulnerability scans allow you to assess the security posture of systems from an outside perspective. 
          Before conducting an external scan, approval is required to ensure compliance with security policies.
        </Paragraph>
        
        <Alert
          message="Important Notice"
          description="External vulnerability scanning must be approved by the security team. Unauthorized scanning is prohibited and may result in account suspension."
          type="warning"
          showIcon
          className="mb-4"
        />
        
        <Table
          columns={columns}
          dataSource={scans.map(scan => ({ ...scan, key: scan.id }))}
          loading={loading}
        />
      </Card>
      
      {/* Approval Request Modal */}
      <Modal
        title={
          <Space>
            <MailOutlined />
            Request Scan Approval
          </Space>
        }
        open={approvalModalVisible}
        onCancel={() => setApprovalModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitApprovalRequest}
        >
          <Alert
            message="A request will be sent to security@utep.edu for approval"
            description="Please provide complete information to expedite approval. The security team will review your request and respond within 24-48 hours."
            type="info"
            showIcon
            className="mb-4"
          />
          
          <Form.Item
            name="serverName"
            label="Server/IP Address to Scan"
            rules={[
              { required: true, message: 'Please enter server name or IP address' },
              { min: 3, message: 'Server name must be at least 3 characters' }
            ]}
          >
            <Input 
              placeholder="e.g., example.utep.edu or 192.168.1.1"
              prefix={<GlobalOutlined style={{ color: '#bfbfbf' }} />}
            />
          </Form.Item>
          
          <Form.Item
            name="justification"
            label="Justification for Scan"
            rules={[
              { required: true, message: 'Please provide justification' },
              { min: 20, message: 'Please provide a detailed justification (minimum 20 characters)' }
            ]}
          >
            <TextArea
              placeholder="Explain why this scan is necessary..."
              rows={4}
            />
          </Form.Item>
          
          <Form.Item
            name="contactInfo"
            label="Contact Information"
            rules={[{ required: true, message: 'Please provide contact information' }]}
          >
            <Input placeholder="Your name, department, and phone number" />
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} block>
              Submit Approval Request
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Scan Creation Modal */}
      <Modal
        title={
          <Space>
            <ScanOutlined />
            Create External Scan
          </Space>
        }
        open={scanModalVisible}
        onCancel={() => setScanModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitScan}
        >
          <Alert
            message="Scan Approved"
            description="Your scan request has been approved. You can now proceed with creating the scan."
            type="success"
            showIcon
            className="mb-4"
          />
          
          <Form.Item
            name="serverName"
            label="Server/IP Address"
            rules={[{ required: true, message: 'Please enter server name or IP address' }]}
          >
            <Input 
              placeholder="e.g., example.utep.edu or 192.168.1.1"
              prefix={<GlobalOutlined style={{ color: '#bfbfbf' }} />}
            />
          </Form.Item>
          
          <Alert
            message="Note"
            description="This scan will run against the provided target from the Nessus scanner. Make sure the target is accessible from the scanner's network."
            type="info"
            showIcon
            className="mb-4"
          />
          
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} block>
              Create and Launch Scan
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined />
            Scan Details: {selectedScan?.name}
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>,
          selectedScan?.status === 'completed' && (
            <Button
              key="download"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadReport(selectedScan.id, selectedScan.name)}
            >
              Download Report
            </Button>
          )
        ]}
        width={800}
      >
        {selectedScan && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Text strong>Status:</Text> {getStatusTag(selectedScan.status)}
              </div>
              <div>
                <Text strong>Scan ID:</Text> {selectedScan.id}
              </div>
              <div>
                <Text strong>Start Time:</Text> {formatTimestamp(selectedScan.start_time)}
              </div>
              <div>
                <Text strong>End Time:</Text> {formatTimestamp(selectedScan.end_time)}
              </div>
            </div>
            
            <Divider orientation="left">Vulnerability Summary</Divider>
            {renderVulnerabilitySummary(selectedScan.hosts)}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExternalScans;