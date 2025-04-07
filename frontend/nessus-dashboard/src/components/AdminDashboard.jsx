import { useState, useEffect } from 'react';
import { Card, Typography, Space, Table, Tag, Button, Modal, message } from 'antd';
import { DashboardOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { Title, Paragraph, Text } = Typography;
const API_URL = 'http://localhost:5000/api';

const AdminDashboard = () => {
  const [exceptionRequests, setExceptionRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchExceptionRequests();
  }, []);

  const fetchExceptionRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/exception-requests`, {
        withCredentials: true
      });
      setExceptionRequests(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching exception requests:', error);
      message.error('Failed to load exception requests');
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setModalVisible(true);
  };

  const getStatusTag = (status) => {
    const statusMappings = {
      'approved': { color: 'success', icon: <CheckCircleOutlined />, text: 'Approved' },
      'pending': { color: 'processing', icon: <ClockCircleOutlined />, text: 'Pending' },
      'rejected': { color: 'error', icon: <CloseCircleOutlined />, text: 'Rejected' }
    };
    
    const mapping = statusMappings[status] || { color: 'default', text: status };
    
    return (
      <Tag icon={mapping.icon} color={mapping.color}>
        {mapping.text}
      </Tag>
    );
  };

  const columns = [
    {
      title: 'Server Name',
      dataIndex: 'serverName',
      key: 'serverName',
      render: (text, record) => <a onClick={() => handleViewDetails(record)}>{text}</a>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Requested By',
      dataIndex: 'requestedBy',
      key: 'requestedBy',
    },
    {
      title: 'Request Date',
      dataIndex: 'requestedDate',
      key: 'requestedDate',
      render: (date) => moment(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Expiration Date',
      dataIndex: 'expirationDate',
      key: 'expirationDate',
      render: (date) => moment(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          type="link"
          onClick={() => handleViewDetails(record)}
        >
          View Details
        </Button>
      ),
    },
  ];

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
          Welcome to the Admin Dashboard. Review vulnerability exception requests below.
        </Paragraph>
        
        <Card title="Exception Requests" className="mb-4">
          <Table 
            columns={columns} 
            dataSource={exceptionRequests}
            rowKey="id"
            loading={loading}
          />
        </Card>
      </Card>

      <Modal
        title="Exception Request Details"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={
          <Button key="close" onClick={() => setModalVisible(false)}>
            Close
          </Button>
        }
        width={700}
      >
        {selectedRequest && (
          <div>
            <div className="mb-4">
              <Text strong>Server Name: </Text>
              <Text>{selectedRequest.serverName}</Text>
            </div>
            
            <div className="mb-4">
              <Text strong>Status: </Text>
              {getStatusTag(selectedRequest.status)}
            </div>
            
            <div className="mb-4">
              <Text strong>Requested By: </Text>
              <Text>{selectedRequest.requestedBy}</Text>
            </div>
            
            <div className="mb-4">
              <Text strong>Request Date: </Text>
              <Text>{moment(selectedRequest.requestedDate).format('YYYY-MM-DD')}</Text>
            </div>
            
            <div className="mb-4">
              <Text strong>Expiration Date: </Text>
              <Text>{moment(selectedRequest.expirationDate).format('YYYY-MM-DD')}</Text>
            </div>
            
            <div className="mb-4">
              <Text strong>Vulnerabilities: </Text>
              <div>
                {selectedRequest.vulnerabilities.map((vuln, index) => (
                  <Tag key={index}>{vuln}</Tag>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <Text strong>Justification: </Text>
              <p>{selectedRequest.justification}</p>
            </div>
            
            <div className="mb-4">
              <Text strong>Mitigation Measures: </Text>
              <p>{selectedRequest.mitigation}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDashboard;