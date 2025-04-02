import { useState, useEffect } from 'react';
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
  BugOutlined
} from '@ant-design/icons';
import axios from 'axios';
import nessusService from '../services/nessusService';
import VulDetailsModal from './VulDetailsModal';

const { Title, Paragraph } = Typography;

const ExternalScans = () => {
  const [form] = Form.useForm();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [selectedScan, setSelectedScan] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [externalScansFolder, setExternalScansFolder] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState({});
  
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
    // Set loading state for this specific download
    setDownloadLoading(prev => ({ ...prev, [scanName]: true }));
    
    try {
      // Use the new dedicated method for external scan reports
      const blob = await nessusService.downloadExternalScanReport(scanName);
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `external_scan_${scanName}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      message.success(`Report for ${scanName} downloaded successfully`);
    } catch (error) {
      console.error('Error downloading report:', error);
      message.error(`Failed to download report: ${error.message}`);
    } finally {
      // Clear loading state
      setDownloadLoading(prev => ({ ...prev, [scanName]: false }));
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
                icon={downloadLoading[record.name] ? <LoadingOutlined spin /> : <DownloadOutlined />}
                onClick={() => handleDownloadReport(record.id, record.name)}
                disabled={downloadLoading[record.name]}
              />
            </Tooltip>
          )}
          
          <Tooltip title="View Vulnerabilities">
            <Button 
              type="text"
              icon={<BugOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

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
            onClick={() => setScanModalVisible(true)}
          >
            New External Scan
          </Button>
        </div>
        
        <Paragraph className="text-gray-600 mb-4">
          External vulnerability scans allow you to assess the security posture of systems from an outside perspective. 
          These scans help identify vulnerabilities that could be exploited by external threats.
        </Paragraph>
        
        <Alert
          message="Important Notice"
          description="External vulnerability scanning must be performed in accordance with security policies. Unauthorized scanning is prohibited and may result in account suspension."
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
      
      {/* Vulnerability Details Modal - Now using the separate component */}
      <VulDetailsModal
        visible={detailModalVisible}
        scan={selectedScan}
        onClose={() => setDetailModalVisible(false)}
        onDownload={handleDownloadReport}
        downloadLoading={selectedScan ? downloadLoading[selectedScan.name] : false}
      />
    </div>
  );
};

export default ExternalScans;