import { useState, useEffect } from 'react';
import { Card, Typography, Space, Table, Tag, Button, Modal, message, Input, Tabs } from 'antd';
import { DashboardOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, ScanOutlined, FileTextOutlined } from '@ant-design/icons';
import axios from 'axios';
import ExternalScans from './ExternalScans';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const API_URL = 'http://localhost:5000/api';

const AdminDashboard = () => {
  const [exceptionRequests, setExceptionRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);

  useEffect(() => {
    fetchExceptionRequests();
  }, []);

  const fetchExceptionRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/exception-requests`, {
        withCredentials: true
      });
      console.log('Raw API Response:', response);
      console.log('Response Data:', response.data);
      
      if (response.data.success) {
        const requestsArray = response.data.requests || [];
        console.log('Setting requests to:', requestsArray);
        setExceptionRequests(requestsArray);
      } else {
        console.error('API returned error:', response.data.message);
        message.error(response.data.message || 'Failed to load exception requests');
        setExceptionRequests([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching exception requests:', error);
      console.error('Error details:', error.response?.data);
      message.error('Failed to load exception requests');
      setExceptionRequests([]);
      setLoading(false);
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setModalVisible(true);
    setDeclineReason('');
    setShowDeclineForm(false);
  };

  const handleApprove = async () => {
    try {
      setUpdating(true);
      await axios.put(
        `${API_URL}/exception-requests/${selectedRequest.id}`,
        { status: 'approved' },
        { withCredentials: true }
      );
      message.success('Exception request approved');
      setModalVisible(false);
      fetchExceptionRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      message.error('Failed to approve request');
    } finally {
      setUpdating(false);
    }
  };

  const handleDecline = async () => {
    if (!showDeclineForm) {
      setShowDeclineForm(true);
      return;
    }

    if (!declineReason) {
      message.error('Please provide a reason for declining');
      return;
    }

    try {
      setUpdating(true);
      await axios.put(
        `${API_URL}/exception-requests/${selectedRequest.id}`,
        { status: 'declined', declineReason },
        { withCredentials: true }
      );
      message.success('Exception request declined');
      setModalVisible(false);
      fetchExceptionRequests();
    } catch (error) {
      console.error('Error declining request:', error);
      message.error('Failed to decline request');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusTag = (status) => {
    const statusMappings = {
      'approved': { color: 'success', icon: <CheckCircleOutlined />, text: 'Approved' },
      'pending': { color: 'processing', icon: <ClockCircleOutlined />, text: 'Pending' },
      'declined': { color: 'error', icon: <CloseCircleOutlined />, text: 'Declined' }
    };
    
    const mapping = statusMappings[status] || { color: 'default', text: status };
    
    return (
      <Tag icon={mapping.icon} color={mapping.color}>
        {mapping.text}
      </Tag>
    );
  };

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
      title: 'Requester',
      dataIndex: 'requesterEmail',
      key: 'requesterEmail',
      render: (email, record) => (
        <span>
          {record.requesterFirstName} {record.requesterLastName}
          <br />
          <Text type="secondary">{email}</Text>
        </span>
      )
    },
    {
      title: 'Department',
      dataIndex: 'requesterDepartment',
      key: 'requesterDepartment'
    },
    {
      title: 'Job Description',
      dataIndex: 'requesterJobDescription',
      key: 'requesterJobDescription'
    },
    {
      title: 'Phone',
      dataIndex: 'requesterPhone',
      key: 'requesterPhone'
    },
    {
      title: 'Department Head',
      dataIndex: 'departmentHeadEmail',
      key: 'departmentHeadEmail',
      render: (email, record) => (
        <span>
          {record.departmentHeadFirstName} {record.departmentHeadLastName}
          <br />
          <Text type="secondary">{email}</Text>
        </span>
      )
    },
    {
      title: 'Dept Head Department',
      dataIndex: 'departmentHeadDepartment',
      key: 'departmentHeadDepartment'
    },
    {
      title: 'Dept Head Phone',
      dataIndex: 'departmentHeadPhone',
      key: 'departmentHeadPhone'
    },
    {
      title: 'Data Classification',
      dataIndex: 'dataClassification',
      key: 'dataClassification'
    },
    {
      title: 'Duration Type',
      dataIndex: 'exceptionDurationType',
      key: 'exceptionDurationType'
    },
    {
      title: 'Users Affected',
      dataIndex: 'usersAffected',
      key: 'usersAffected'
    },
    {
      title: 'Data at Risk',
      dataIndex: 'dataAtRisk',
      key: 'dataAtRisk'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
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
        <Space size="small">
          <Button 
            type="text" 
            icon={<FileTextOutlined />} 
            onClick={() => handleViewDetails(record)}
          />
          {record.status === 'pending' && (
            <>
              <Button 
                type="text" 
                icon={<CheckCircleOutlined />} 
                onClick={() => handleApprove(record)}
                style={{ color: '#52c41a' }}
              />
              <Button 
                type="text" 
                icon={<CloseCircleOutlined />} 
                onClick={() => handleDecline(record)}
                style={{ color: '#ff4d4f' }}
              />
            </>
          )}
        </Space>
      )
    }
  ];

  const items = [
    {
      key: 'exception-requests',
      label: (
        <span>
          <FileTextOutlined />
          Exception Requests Dashboard
        </span>
      ),
      children: (
        <div>
          <Card title="Exception Requests" className="mb-4">
            <Table 
              columns={columns} 
              dataSource={exceptionRequests}
              rowKey="id"
              loading={loading}
              scroll={{ x: true }}
            />
          </Card>

          <Modal
            title="Exception Request Details"
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
            footer={null}
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
                  <Text strong>Requester: </Text>
                  <Text>{selectedRequest.requesterFirstName} {selectedRequest.requesterLastName}</Text>
                  <br />
                  <Text type="secondary">{selectedRequest.requesterEmail}</Text>
                </div>
                
                <div className="mb-4">
                  <Text strong>Department: </Text>
                  <Text>{selectedRequest.requesterDepartment}</Text>
                </div>
                
                <div className="mb-4">
                  <Text strong>Request Date: </Text>
                  <Text>{formatTimestamp(selectedRequest.requestedDate)}</Text>
                </div>
                
                <div className="mb-4">
                  <Text strong>Expiration Date: </Text>
                  <Text>{formatTimestamp(selectedRequest.expirationDate)}</Text>
                </div>
                
                <div className="mb-4">
                  <Text strong>Vulnerabilities: </Text>
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
                
                <div className="mb-4">
                  <Text strong>Justification: </Text>
                  <div>{selectedRequest.justification}</div>
                </div>
                
                <div className="mb-4">
                  <Text strong>Mitigation Measures: </Text>
                  <div>{selectedRequest.mitigation}</div>
                </div>
                
                {selectedRequest.status === 'pending' && (
                  <div className="mt-4">
                    {!showDeclineForm ? (
                      <Space>
                        <Button 
                          type="primary" 
                          icon={<CheckCircleOutlined />}
                          onClick={handleApprove}
                          loading={updating}
                        >
                          Approve
                        </Button>
                        <Button 
                          danger 
                          icon={<CloseCircleOutlined />}
                          onClick={handleDecline}
                          loading={updating}
                        >
                          Decline
                        </Button>
                      </Space>
                    ) : (
                      <div>
                        <TextArea
                          rows={4}
                          placeholder="Enter reason for declining"
                          value={declineReason}
                          onChange={(e) => setDeclineReason(e.target.value)}
                          className="mb-4"
                        />
                        <Space>
                          <Button 
                            danger 
                            icon={<CloseCircleOutlined />}
                            onClick={handleDecline}
                            loading={updating}
                          >
                            Confirm Decline
                          </Button>
                          <Button onClick={() => setShowDeclineForm(false)}>
                            Cancel
                          </Button>
                        </Space>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Modal>
        </div>
      )
    },
    {
      key: 'external-scans',
      label: (
        <span>
          <ScanOutlined />
          External Scans
        </span>
      ),
      children: <ExternalScans />,
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
          Welcome to the Admin Dashboard. Manage exception requests and external scans below.
        </Paragraph>
        
        <Tabs defaultActiveKey="exception-requests" items={items} />
      </Card>
    </div>
  );
};

export default AdminDashboard;