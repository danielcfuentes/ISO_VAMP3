import { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Table, 
  Space, 
  Button, 
  Modal, 
  message, 
  Tag, 
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
import StandardExceptionFormModal from './StandardExceptionFormModal';

const { Title, Text, Paragraph } = Typography;

const API_URL = 'http://localhost:5000/api';

const ExceptionRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [standardModalVisible, setStandardModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [username, setUsername] = useState('');
  
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/current-user`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setUsername(response.data.username);
        fetchExceptionRequests();
      } else {
        message.error('Failed to get current user');
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      message.error('Failed to load user information');
    }
  };
  
  const fetchExceptionRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/exception-requests`, {
        withCredentials: true
      });
      console.log('Raw API Response:', response);
      console.log('Response Data:', response.data);
      console.log('Requests Array:', response.data.requests);
      
      if (response.data.success) {
        const requestsArray = response.data.requests || [];
        console.log('Setting requests to:', requestsArray);
        setRequests(requestsArray);
      } else {
        console.error('API returned error:', response.data.message);
        message.error(response.data.message || 'Failed to load exception requests');
        setRequests([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching exception requests:', error);
      console.error('Error details:', error.response?.data);
      message.error('Failed to load exception requests');
      setRequests([]);
      setLoading(false);
    }
  };
  
  const handleOpenModal = (request) => {
    setSelectedRequest(request);
    setViewModalVisible(true);
  };
  
  const handleStandardSubmit = async (values) => {
    try {
      // Format the data and submit
      const formattedData = {
        ...values,
        requestType: 'standard',
        status: 'pending',
        requestedDate: new Date().toISOString()
      };

      // Call the API to create the exception request
      await axios.post(`${API_URL}/exception-requests`, formattedData, {
        withCredentials: true
      });
      
      // Success - refresh the list and close the modal
      message.success('Standard exception request submitted successfully');
      fetchExceptionRequests();
      setStandardModalVisible(false);
    } catch (err) {
      console.error("Error submitting standard exception request:", err);
      message.error(err.response?.data?.error || "Failed to submit request. Please try again.");
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
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
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
      title: 'Request Date',
      dataIndex: 'requestedDate',
      key: 'requestedDate',
      render: (date) => formatTimestamp(date),
      sorter: (a, b) => new Date(a.requestedDate) - new Date(b.requestedDate)
    },
    {
      title: 'Expiration Date',
      dataIndex: 'expirationDate',
      key: 'expirationDate',
      render: (date) => formatTimestamp(date),
      sorter: (a, b) => {
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;
        return new Date(a.expirationDate) - new Date(b.expirationDate);
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button type="link" onClick={() => handleOpenModal(record)}>
          View Details
        </Button>
      )
    }
  ];

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
            onClick={() => setStandardModalVisible(true)}
            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
          >
            Create Standard Exception Request
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
      
      {/* Standard Exception Form Modal */}
      <StandardExceptionFormModal
        visible={standardModalVisible}
        onClose={() => setStandardModalVisible(false)}
        onSubmit={handleStandardSubmit}
      />
      
      {/* View Request Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            Exception Request Details
          </Space>
        }
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={700}
      >
        {selectedRequest && (
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
                <Text strong>Request Date:</Text>
                <div>{formatTimestamp(selectedRequest.requestedDate)}</div>
              </div>
              <div>
                <Text strong>Expiration Date:</Text>
                <div>{formatTimestamp(selectedRequest.expirationDate)}</div>
              </div>
              <div>
                <Text strong>Vulnerabilities:</Text>
                <div>
                  {typeof selectedRequest.vulnerabilities === 'string' 
                    ? JSON.parse(selectedRequest.vulnerabilities).map(vuln => (
                        <Tag key={vuln.id || vuln} color="orange" style={{ marginBottom: '4px' }}>
                          {vuln.name || vuln}
                        </Tag>
                      ))
                    : selectedRequest.vulnerabilities.map(vuln => (
                        <Tag key={vuln.id || vuln} color="orange" style={{ marginBottom: '4px' }}>
                          {vuln.name || vuln}
                        </Tag>
                      ))
                  }
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
        )}
      </Modal>
    </div>
  );
};

export default ExceptionRequests;