import { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Table, 
  Space, 
  Button, 
  Modal, 
  Form, 
  Input, 
  DatePicker, 
  message, 
  Tag, 
  Tooltip,
  Alert
} from 'antd';
import { 
  FileTextOutlined, 
  PlusOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const API_URL = 'http://localhost:5000/api';

const ExceptionRequests = () => {
  const [form] = Form.useForm();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState('');
  
  // Get user info and fetch exception requests from the API
  useEffect(() => {
    // Check if user is logged in and get the username
    const checkSession = async () => {
      try {
        // You could make an API call here to get session info if needed
        // For now, we'll just show the requests
        fetchExceptionRequests();
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    
    checkSession();
  }, []);
  
  const fetchExceptionRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/exception-requests`, {
        withCredentials: true
      });
      console.log('Fetched exception requests:', response.data);
      setRequests(response.data);
      
      // If we have any requests, we can get the username from the first one
      if (response.data && response.data.length > 0) {
        setUsername(response.data[0].requestedBy);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching exception requests:', error);
      message.error('Failed to load exception requests');
      setLoading(false);
    }
  };
  
  const handleOpenModal = (mode, request = null) => {
    setModalMode(mode);
    setSelectedRequest(request);
    
    if (mode === 'create') {
      form.resetFields();
    }
    
    setModalVisible(true);
  };
  
  const handleSubmit = async (values) => {
    setSubmitting(true);
    setError(null);
    
    try {
      // Format the vulnerabilities data
      const formattedData = {
        ...values,
        vulnerabilities: values.vulnerabilities.split(',').map(v => v.trim()),
        expirationDate: values.expirationDate.format('YYYY-MM-DD')
      };
      
      console.log("Submitting data:", formattedData);

      // Call the API to create the exception request
      await axios.post(`${API_URL}/exception-requests`, formattedData, {
        withCredentials: true
      });
      
      // Success - refresh the list and close the modal
      message.success('Exception request submitted successfully');
      fetchExceptionRequests();
      setModalVisible(false);
      form.resetFields();
    } catch (err) {
      console.error("Error submitting exception request:", err);
      setError(err.response?.data?.error || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  
  const getStatusTag = (status, declineReason) => {
    const statusMappings = {
      'approved': { color: 'success', icon: <CheckCircleOutlined />, text: 'Approved' },
      'pending': { color: 'processing', icon: <ClockCircleOutlined />, text: 'Pending' },
      'declined': { color: 'error', icon: <CloseCircleOutlined />, text: 'Declined' }
    };
    
    const mapping = statusMappings[status] || { color: 'default', text: status };
    
    return (
      <div>
        <Tag icon={mapping.icon} color={mapping.color}>
          {mapping.text}
        </Tag>
        {status === 'declined' && declineReason && (
          <div className="mt-2 text-red-500">
            <Text type="secondary">Reason: {declineReason}</Text>
          </div>
        )}
      </div>
    );
  };
  
  const columns = [
    {
      title: 'Server Name',
      dataIndex: 'serverName',
      key: 'serverName',
      sorter: (a, b) => a.serverName.localeCompare(b.serverName)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => getStatusTag(status, record.declineReason),
      filters: [
        { text: 'Approved', value: 'approved' },
        { text: 'Pending', value: 'pending' },
        { text: 'Declined', value: 'declined' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Requested By',
      dataIndex: 'requestedBy',
      key: 'requestedBy'
    },
    {
      title: 'Request Date',
      dataIndex: 'requestedDate',
      key: 'requestedDate',
      sorter: (a, b) => new Date(a.requestedDate) - new Date(b.requestedDate)
    },
    {
      title: 'Expiration Date',
      dataIndex: 'expirationDate',
      key: 'expirationDate',
      render: date => date || 'N/A',
      sorter: (a, b) => {
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;
        return new Date(a.expirationDate) - new Date(b.expirationDate);
      }
    },
    {
      title: 'Vulnerabilities',
      dataIndex: 'vulnerabilities',
      key: 'vulnerabilities',
      render: vulns => (
        <span>
          {vulns.map(vuln => (
            <Tag key={vuln} color="orange" style={{ marginBottom: '4px' }}>
              {vuln}
            </Tag>
          ))}
        </span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button 
              type="text" 
              icon={<FileTextOutlined />} 
              onClick={() => handleOpenModal('view', record)} 
            />
          </Tooltip>
        </Space>
      )
    }
  ];
  
  const modalTitle = {
    'create': 'Create Exception Request',
    'view': 'Exception Request Details'
  };
  
  return (
    <div className="p-6">
      <Card className="shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <Title level={4}>
            <Space>
              <FileTextOutlined />
              {username ? `${username}'s Exception Requests` : 'My Exception Requests'}
            </Space>
          </Title>
          
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal('create')}
          >
            New Exception Request
          </Button>
        </div>
        
        <Paragraph className="text-gray-600 mb-4">
          Exception requests allow you to document vulnerabilities that cannot be immediately remediated. 
          Each request requires justification and appropriate mitigation measures.
        </Paragraph>
        
        <Alert
          message="About Exception Requests"
          description="If a vulnerability cannot be remediated due to business or technical constraints, you can request an exception. All exceptions must be thoroughly justified, include appropriate compensating controls, and are subject to security team approval."
          type="info"
          showIcon
          className="mb-4"
        />
        

        
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={loading}
          expandable={{
            expandedRowRender: record => (
              <div className="p-4">
                <div className="mb-3">
                  <Text strong>Justification: </Text>
                  <div>{record.justification}</div>
                </div>
                <div className="mb-3">
                  <Text strong>Mitigation Measures: </Text>
                  <div>{record.mitigation}</div>
                </div>
                {record.status === 'declined' && record.declineReason && (
                  <div className="mb-3">
                    <Text strong>Decline Reason: </Text>
                    <div className="text-red-600">{record.declineReason}</div>
                  </div>
                )}
              </div>
            )
          }}
        />
      </Card>
      
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            {modalTitle[modalMode]}
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={modalMode === 'view' ? [
          <Button key="close" onClick={() => setModalVisible(false)}>
            Close
          </Button>
        ] : null}
        width={700}
      >
        {modalMode === 'view' && selectedRequest ? (
          <div className="p-2">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Text strong>Server Name:</Text>
                <div>{selectedRequest.serverName}</div>
              </div>
              <div>
                <Text strong>Status:</Text>
                <div>{getStatusTag(selectedRequest.status, selectedRequest.declineReason)}</div>
              </div>
              <div>
                <Text strong>Requested By:</Text>
                <div>{selectedRequest.requestedBy}</div>
              </div>
              <div>
                <Text strong>Request Date:</Text>
                <div>{selectedRequest.requestedDate}</div>
              </div>
              <div>
                <Text strong>Expiration Date:</Text>
                <div>{selectedRequest.expirationDate || 'N/A'}</div>
              </div>
              <div>
                <Text strong>Vulnerabilities:</Text>
                <div>
                  {selectedRequest.vulnerabilities.map(vuln => (
                    <Tag key={vuln} color="orange" style={{ marginBottom: '4px' }}>
                      {vuln}
                    </Tag>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <Text strong>Justification:</Text>
              <div>{selectedRequest.justification}</div>
            </div>
            
            <div>
              <Text strong>Mitigation Measures:</Text>
              <div>{selectedRequest.mitigation}</div>
            </div>
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="serverName"
              label="Server Name"
              rules={[
                { required: true, message: 'Please enter the server name' },
                { min: 3, message: 'Server name must be at least 3 characters' }
              ]}
            >
              <Input placeholder="Enter server name" />
            </Form.Item>
            
            <Form.Item
              name="vulnerabilities"
              label="Vulnerabilities (comma separated)"
              rules={[
                { required: true, message: 'Please enter the vulnerabilities' }
              ]}
            >
              <Input placeholder="e.g., CVE-2024-1234, CVE-2024-5678" />
            </Form.Item>
            
            <Form.Item
              name="justification"
              label="Justification"
              rules={[
                { required: true, message: 'Please provide justification' },
                { min: 20, message: 'Justification must be at least 20 characters' }
              ]}
            >
              <TextArea 
                placeholder="Explain why these vulnerabilities cannot be remediated"
                rows={4}
              />
            </Form.Item>
            
            <Form.Item
              name="mitigation"
              label="Mitigation Measures"
              rules={[
                { required: true, message: 'Please provide mitigation measures' },
                { min: 20, message: 'Mitigation measures must be at least 20 characters' }
              ]}
            >
              <TextArea 
                placeholder="Describe the compensating controls and mitigation strategies"
                rows={4}
              />
            </Form.Item>
            
            <Form.Item
              name="expirationDate"
              label="Requested Expiration Date"
              rules={[
                { required: true, message: 'Please select an expiration date' }
              ]}
            >
              <DatePicker 
                placeholder="Select expiration date"
                style={{ width: '100%' }}
              />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={submitting} block>
                Submit Request
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ExceptionRequests;