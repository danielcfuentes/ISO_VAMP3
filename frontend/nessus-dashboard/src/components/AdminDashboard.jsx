import { useState, useEffect } from 'react';
import { Card, Typography, Space, Table, Tag, Button, Modal, message, Input, Tabs, Select, Row, Col } from 'antd';
import { DashboardOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, ScanOutlined, FileTextOutlined, SearchOutlined } from '@ant-design/icons';
import axios from 'axios';
import ExternalScans from './ExternalScans';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const API_URL = 'http://localhost:5000/api';

const AdminDashboard = () => {
  const [exceptionRequests, setExceptionRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

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

  const handleApprove = async (request) => {
    try {
      setUpdating(true);
      await axios.put(
        `${API_URL}/exception-requests/${request.id}`,
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

  const handleDecline = async (request) => {
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
        `${API_URL}/exception-requests/${request.id}`,
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

  const filterRequests = (requests) => {
    return requests.filter(request => {
      // Apply search filter
      const searchLower = searchText.toLowerCase();
      const searchMatch = 
        request.serverName?.toLowerCase().includes(searchLower) ||
        request.requesterFirstName?.toLowerCase().includes(searchLower) ||
        request.requesterLastName?.toLowerCase().includes(searchLower) ||
        request.requesterEmail?.toLowerCase().includes(searchLower) ||
        request.requesterDepartment?.toLowerCase().includes(searchLower) ||
        request.requesterJobDescription?.toLowerCase().includes(searchLower) ||
        request.departmentHeadFirstName?.toLowerCase().includes(searchLower) ||
        request.departmentHeadLastName?.toLowerCase().includes(searchLower) ||
        request.departmentHeadEmail?.toLowerCase().includes(searchLower) ||
        request.departmentHeadDepartment?.toLowerCase().includes(searchLower) ||
        request.dataClassification?.toLowerCase().includes(searchLower) ||
        request.usersAffected?.toLowerCase().includes(searchLower) ||
        request.dataAtRisk?.toLowerCase().includes(searchLower) ||
        request.justification?.toLowerCase().includes(searchLower) ||
        request.mitigation?.toLowerCase().includes(searchLower);

      // Apply status filter
      const statusMatch = statusFilter === 'all' || request.status?.toLowerCase() === statusFilter.toLowerCase();

      // Apply type filter
      const typeMatch = typeFilter === 'all' || request.exceptionType === typeFilter;

      return searchMatch && statusMatch && typeMatch;
    });
  };

  const columns = [
    {
      title: 'Server Name',
      dataIndex: 'serverName',
      key: 'serverName',
      sorter: (a, b) => a.serverName.localeCompare(b.serverName)
    },
    {
      title: 'Exception Type',
      dataIndex: 'exceptionType',
      key: 'exceptionType',
      render: (type) => (
        <Tag color={type === 'Vulnerability' ? 'orange' : 'blue'}>
          {type}
        </Tag>
      )
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
      title: 'Vulnerabilities',
      dataIndex: 'vulnerabilities',
      key: 'vulnerabilities',
      render: (vulnerabilities) => {
        if (!vulnerabilities) return 'N/A';
        const vulnArray = typeof vulnerabilities === 'string' 
          ? JSON.parse(vulnerabilities) 
          : vulnerabilities;
        return (
          <div style={{ maxWidth: '200px' }}>
            {vulnArray.map((vuln, index) => (
              <Tag key={index} color="orange" style={{ marginBottom: '4px' }}>
                {vuln.name || vuln}
              </Tag>
            ))}
          </div>
        );
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status)
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
            type="primary"
            onClick={() => handleViewDetails(record)}
          >
            View Details
          </Button>
          {record.status === 'pending' && (
            <>
              <Button 
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleApprove(record)}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Approve
              </Button>
              <Button 
                type="primary"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleDecline(record)}
              >
                Decline
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  const renderExceptionRequestsTab = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Input
            placeholder="Search in all fields..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col span={4}>
          <Select
            style={{ width: '100%' }}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Filter by status"
          >
            <Option value="all">All Statuses</Option>
            <Option value="pending">Pending</Option>
            <Option value="approved">Approved</Option>
            <Option value="declined">Declined</Option>
          </Select>
        </Col>
        <Col span={4}>
          <Select
            style={{ width: '100%' }}
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="Filter by type"
          >
            <Option value="all">All Types</Option>
            <Option value="Vulnerability">Vulnerability</Option>
            <Option value="Standard">Standard</Option>
          </Select>
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={filterRequests(exceptionRequests)}
        rowKey="id"
        loading={loading}
        scroll={{ x: true }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
        }}
      />

      <Modal
        title="Exception Request Details"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setShowDeclineForm(false);
          setDeclineReason('');
        }}
        footer={null}
        width={700}
      >
        {selectedRequest && (
          <>
            {console.log('Selected Request:', selectedRequest)}
            {console.log('Request Status:', selectedRequest.status)}
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
                <Text strong>Job Description: </Text>
                <Text>{selectedRequest.requesterJobDescription}</Text>
              </div>
              
              <div className="mb-4">
                <Text strong>Department Head: </Text>
                <Text>{selectedRequest.departmentHeadFirstName} {selectedRequest.departmentHeadLastName}</Text>
                <br />
                <Text type="secondary">{selectedRequest.departmentHeadEmail}</Text>
              </div>
              
              <div className="mb-4">
                <Text strong>Data Classification: </Text>
                <Text>{selectedRequest.dataClassification}</Text>
              </div>
              
              <div className="mb-4">
                <Text strong>Exception Type: </Text>
                <Tag color={selectedRequest.exceptionType === 'Vulnerability' ? 'orange' : 'blue'}>
                  {selectedRequest.exceptionType}
                </Tag>
              </div>
              
              <div className="mb-4">
                <Text strong>Duration Type: </Text>
                <Text>{selectedRequest.exceptionDurationType}</Text>
              </div>
              
              <div className="mb-4">
                <Text strong>Users Affected: </Text>
                <Text>{selectedRequest.usersAffected}</Text>
              </div>
              
              <div className="mb-4">
                <Text strong>Data at Risk: </Text>
                <Text>{selectedRequest.dataAtRisk}</Text>
              </div>
              
              <div className="mb-4">
                <Text strong>Vulnerabilities: </Text>
                <div>
                  {selectedRequest.vulnerabilities?.map((vuln, index) => (
                    <Tag key={index} color="orange" style={{ marginBottom: '4px' }}>
                      {vuln.name || vuln}
                    </Tag>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <Text strong>Justification: </Text>
                <Text>{selectedRequest.justification}</Text>
              </div>
              
              <div className="mb-4">
                <Text strong>Mitigation: </Text>
                <Text>{selectedRequest.mitigation}</Text>
              </div>

              {/* Action Buttons - Moved inside the main content div */}
              <div style={{ marginTop: '24px', borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
                {console.log('Rendering buttons section')}
                {console.log('Status check:', selectedRequest.status === 'pending')}
                {console.log('Show decline form:', showDeclineForm)}
                
                {(selectedRequest.status === 'pending' || selectedRequest.status === 'Pending') && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {!showDeclineForm ? (
                      <>
                        <Button 
                          type="primary"
                          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleApprove(selectedRequest)}
                          loading={updating}
                        >
                          Approve
                        </Button>
                        <Button 
                          type="primary"
                          danger
                          icon={<CloseCircleOutlined />}
                          onClick={() => handleDecline(selectedRequest)}
                          loading={updating}
                        >
                          Decline
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => setShowDeclineForm(false)}>
                          Cancel
                        </Button>
                        <Button 
                          type="primary" 
                          danger
                          onClick={() => handleDecline(selectedRequest)}
                          loading={updating}
                          disabled={!declineReason}
                        >
                          Confirm Decline
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Decline Form */}
              {showDeclineForm && (
                <div style={{ marginTop: '16px' }}>
                  <TextArea
                    placeholder="Enter reason for declining..."
                    value={declineReason}
                    onChange={e => setDeclineReason(e.target.value)}
                    rows={4}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );

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
          {renderExceptionRequestsTab()}
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