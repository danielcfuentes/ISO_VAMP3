import {
  FileTextOutlined,
  SearchOutlined,
  ScanOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { Card, Typography, Space, Table, Tag, Button, Modal, message, Input, Tabs, Select, Row, Col, Timeline } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
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
  const [moreInfoReason, setMoreInfoReason] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [showMoreInfoForm, setShowMoreInfoForm] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [phaseFilter, setPhaseFilter] = useState('all');

  const phaseLabels = {
    ISO_REVIEW: 'ISO Review',
    DEPARTMENT_HEAD_REVIEW: 'Department Head Review',
    CISO_REVIEW: 'CISO Review',
    COMPLETED: 'Completed',
  };

  useEffect(() => {
    fetchExceptionRequests();
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    try {
      const response = await axios.get(`${API_URL}/user/roles`, {
        withCredentials: true
      });
      if (response.data.success) {
        console.log('User roles fetched:', response.data.roles);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const fetchExceptionRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/exception-requests`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        const requestsArray = response.data.requests || [];
        setExceptionRequests(requestsArray.map(request => ({
          ...request,
          // Use backend Status as source of truth, fallback to derived logic
          status: request.status || (
            request.approvalPhase === 'COMPLETED' ? 'APPROVED' : 
            request.cisoStatus === 'DECLINED' || request.deptHeadStatus === 'DECLINED' || request.isoStatus === 'DECLINED' ? 'DECLINED' :
            request.cisoStatus === 'NEED_MORE_INFO' || request.deptHeadStatus === 'NEED_MORE_INFO' || request.isoStatus === 'NEED_MORE_INFO' ? 'NEED_MORE_INFO' :
            'PENDING'
          )
        })));
      } else {
        message.error(response.data.message || 'Failed to load exception requests');
        setExceptionRequests([]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching exception requests:', error);
      message.error('Failed to load exception requests');
      setExceptionRequests([]);
      setLoading(false);
    }
  };

  // Helper function to determine the phase based on request status
  // eslint-disable-next-line no-unused-vars
  const determinePhase = (request) => {
    if (!request) return 'ISO_REVIEW';
    
    // If CISO has made a decision
    if (request.cisoStatus) {
      return request.cisoStatus === 'APPROVED' ? 'COMPLETED' : 'CISO_REVIEW';
    }
    
    // If Department Head has made a decision and it's approved, move to CISO
    if (request.deptHeadStatus === 'APPROVED') {
      return 'CISO_REVIEW';
    }
    
    // If ISO has approved, move to Department Head
    if (request.isoStatus === 'APPROVED') {
      return 'DEPARTMENT_HEAD_REVIEW';
    }
    
    // If Department Head has made any other decision (DECLINED, NEED_MORE_INFO)
    if (request.deptHeadStatus) {
      return 'DEPARTMENT_HEAD_REVIEW';
    }
    
    // If ISO has made any decision (DECLINED, NEED_MORE_INFO)
    if (request.isoStatus) {
      return 'ISO_REVIEW';
    }
    
    // Default to ISO_REVIEW for new requests
    return 'ISO_REVIEW';
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setModalVisible(true);
    setDeclineReason('');
    setMoreInfoReason('');
    setShowDeclineForm(false);
    setShowMoreInfoForm(false);
  };

  const refreshExceptionRequests = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/exception-requests?t=${Date.now()}`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        const requestsArray = response.data.requests || [];
        setExceptionRequests(requestsArray.map(request => ({
          ...request,
          // Use backend Status as source of truth, fallback to derived logic
          status: request.status || (
            request.approvalPhase === 'COMPLETED' ? 'APPROVED' : 
            request.cisoStatus === 'DECLINED' || request.deptHeadStatus === 'DECLINED' || request.isoStatus === 'DECLINED' ? 'DECLINED' :
            request.cisoStatus === 'NEED_MORE_INFO' || request.deptHeadStatus === 'NEED_MORE_INFO' || request.isoStatus === 'NEED_MORE_INFO' ? 'NEED_MORE_INFO' :
            'PENDING'
          )
        })));
      } else {
        message.error(response.data.message || 'Failed to refresh exception requests');
      }
    } catch (error) {
      console.error('Error refreshing requests:', error);
      message.error('Failed to refresh requests');
    }
  };

  const handleApprove = async (request) => {
    try {
      setUpdating(true);
      const currentPhase = request.approvalPhase || determinePhase(request);
      console.log('Current phase before approval:', currentPhase);
      console.log('Request data:', request);
      
      const response = await axios.put(
        `${API_URL}/exception-requests/${request.id}/update-status`,
        {
          status: 'APPROVED',
          comments: '',
          approvalPhase: currentPhase
        },
        { 
          withCredentials: true,
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        console.log('Response from approval:', response.data);
        
        // Immediately update the local state with the new phase
        setExceptionRequests(prevRequests => 
          prevRequests.map(req => 
            req.id === request.id
              ? {
                  ...req,
                  approvalPhase: response.data.nextPhase,
                  status: 'APPROVED'
                }
              : req
          )
        );

        message.success('Request approved successfully');
        setModalVisible(false);
        
        // Add a short delay before refreshing from backend
        setTimeout(() => {
          refreshExceptionRequests();
        }, 500);
      } else {
        throw new Error(response.data.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      console.error('Error details:', error.response?.data);
      
      if (error.response?.status === 404) {
        message.error('Request not found. Please refresh the page.');
      } else if (error.response?.status === 500) {
        message.error('Server error while approving request. Please try again or contact support.');
      } else {
        message.error(error.response?.data?.message || 'Failed to approve request. Please try again.');
      }
    } finally {
      setUpdating(false);
    }
  };

  // Add effect to refresh data periodically or when modal closes
  useEffect(() => {
    if (!modalVisible) {
      refreshExceptionRequests();
    }
  }, [modalVisible]);

  // Add effect to refresh data periodically
  useEffect(() => {
    const refreshInterval = setInterval(refreshExceptionRequests, 60000); // Refresh every 60 seconds
    return () => clearInterval(refreshInterval);
  }, []);

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
      const currentPhase = request.approvalPhase || determinePhase(request);
      await axios.put(
        `${API_URL}/exception-requests/${request.id}/update-status`,
        { status: 'DECLINED', comments: declineReason, approvalPhase: currentPhase },
        { withCredentials: true }
      );
      // Update local state immediately
      setExceptionRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === request.id
            ? {
                ...req,
                status: 'DECLINED',
                approvalPhase: currentPhase,
                isoStatus: 'DECLINED'
              }
            : req
        )
      );
      message.success('Exception request declined');
      setModalVisible(false);
      // Add a short delay before refreshing from backend
      setTimeout(() => {
        fetchExceptionRequests();
      }, 500);
    } catch (error) {
      console.error('Error declining request:', error);
      message.error('Failed to decline request');
    } finally {
      setUpdating(false);
    }
  };

  const handleNeedMoreInfo = async (request) => {
    if (!showMoreInfoForm) {
      setShowMoreInfoForm(true);
      return;
    }

    if (!moreInfoReason) {
      message.error('Please provide details about what additional information is needed');
      return;
    }

    try {
      setUpdating(true);
      const currentPhase = request.approvalPhase || determinePhase(request);
      await axios.put(
        `${API_URL}/exception-requests/${request.id}/update-status`,
        { status: 'NEED_MORE_INFO', comments: moreInfoReason, approvalPhase: currentPhase },
        { withCredentials: true }
      );
      // Update local state immediately
      setExceptionRequests(prevRequests =>
        prevRequests.map(req =>
          req.id === request.id
            ? {
                ...req,
                status: 'NEED_MORE_INFO',
                approvalPhase: currentPhase,
                isoStatus: 'NEED_MORE_INFO'
              }
            : req
        )
      );
      message.success('Request for more information sent');
      setModalVisible(false);
      // Add a short delay before refreshing from backend
      setTimeout(() => {
        fetchExceptionRequests();
      }, 500);
    } catch (error) {
      console.error('Error requesting more information:', error);
      message.error('Failed to send request for more information');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusTag = (status) => {
    const statusMappings = {
      'APPROVED': { color: 'success', icon: <CheckCircleOutlined />, text: 'Approved' },
      'PENDING': { color: 'processing', icon: <ClockCircleOutlined />, text: 'Pending' },
      'DECLINED': { color: 'error', icon: <CloseCircleOutlined />, text: 'Declined' },
      'NEED_MORE_INFO': { color: 'warning', icon: <InfoCircleOutlined />, text: 'Need More Info' }
    };
    
    // Adjust status display for the modal view
    let displayStatus = status;
    if (status === 'APPROVED' && selectedRequest && 
        (!selectedRequest.approvalPhase || selectedRequest.approvalPhase !== 'COMPLETED')) {
      displayStatus = 'PENDING';
    }
    
    const mapping = statusMappings[displayStatus] || { color: 'default', text: displayStatus };
    
    return (
      <Tag icon={mapping.icon} color={mapping.color}>
        {mapping.text}
      </Tag>
    );
  };

  const getPhaseTag = (phase) => {
    const phaseColors = {
      ISO_REVIEW: 'blue',
      DEPARTMENT_HEAD_REVIEW: 'purple',
      CISO_REVIEW: 'orange',
      COMPLETED: 'green',
    };
    const label = phaseLabels[phase] || phaseLabels['ISO_REVIEW'];
    return (
      <Tag color={phaseColors[phase] || 'default'}>
        {label}
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
        request.mitigation?.toLowerCase().includes(searchLower) ||
        request.requestID?.toLowerCase().includes(searchLower);

      // Apply status filter
      const statusMatch = statusFilter === 'all' || request.status?.toLowerCase() === statusFilter.toLowerCase();

      // Apply type filter
      const typeMatch = typeFilter === 'all' || request.exceptionType === typeFilter;

      // Apply phase filter
      const phaseMatch = phaseFilter === 'all' || request.approvalPhase === phaseFilter;

      return searchMatch && statusMatch && typeMatch && phaseMatch;
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircleOutlined />;
      case 'DECLINED':
        return <CloseCircleOutlined />;
      case 'NEED_MORE_INFO':
        return <InfoCircleOutlined />;
      default:
        return <ClockCircleOutlined />;
    }
  };

  const getExceptionTypeTag = (type) => {
    const color = type && type.toLowerCase() === 'vulnerability' ? 'orange' : 'blue';
    const label = type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : '';
    return <Tag color={color}>{label}</Tag>;
  };

  const columns = [
    {
      title: 'Request ID',
      dataIndex: 'requestID',
      key: 'requestID',
      sorter: (a, b) => a.requestID.localeCompare(b.requestID)
    },
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
      render: (type) => getExceptionTypeTag(type)
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
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const statusColor = {
          'APPROVED': 'green',
          'DECLINED': 'red',
          'NEED_MORE_INFO': 'orange',
          'PENDING': 'blue'
        };
        
        // Status should be PENDING unless:
        // 1. Request is declined
        // 2. CISO has approved (final phase)
        let displayStatus = status;
        if (status === 'APPROVED' && (!record.approvalPhase || record.approvalPhase !== 'COMPLETED')) {
          displayStatus = 'PENDING';
        }
        
        return (
          <Tag color={statusColor[displayStatus] || 'default'}>
            {displayStatus}
          </Tag>
        );
      }
    },
    {
      title: 'Phase',
      dataIndex: 'approvalPhase',
      key: 'approvalPhase',
      render: (phase) => getPhaseTag(phase)
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (timestamp) => formatTimestamp(timestamp)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button type="primary" onClick={() => handleViewDetails(record)}>
          View Details
        </Button>
      )
    }
  ];

  const renderActionButtons = (request) => {
    // Show action buttons if isoStatus is missing (null/undefined) or 'PENDING'
    const canTakeAction = !request.isoStatus || request.isoStatus === 'PENDING';
    
    return (
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <Space>
          <Button
            type="default"
            onClick={() => setModalVisible(false)}
          >
            Close
          </Button>
          {canTakeAction && (
            <>
              <Button
                type="primary"
                onClick={() => handleApprove(request)}
                loading={updating}
                icon={<CheckCircleOutlined />}
              >
                Approve
              </Button>
              <Button
                danger
                onClick={() => handleDecline(request)}
                loading={updating}
                icon={<CloseCircleOutlined />}
              >
                {showDeclineForm ? 'Submit Decline' : 'Decline'}
              </Button>
              <Button
                type="default"
                onClick={() => handleNeedMoreInfo(request)}
                loading={updating}
                icon={<InfoCircleOutlined />}
              >
                {showMoreInfoForm ? 'Submit Request' : 'Need More Info'}
              </Button>
            </>
          )}
        </Space>
      </div>
    );
  };

  const renderApprovalHistory = (request) => {
    return (
      <div style={{ marginTop: 16 }}>
        <Title level={5}>Approval History</Title>
        <Timeline>
          {request.isoStatus && (
            <Timeline.Item 
              color={request.isoStatus === 'APPROVED' ? 'green' : request.isoStatus === 'DECLINED' ? 'red' : 'blue'}
              dot={getStatusIcon(request.isoStatus)}
            >
              <Text strong>ISO Review</Text>
              <br />
              <Text>Status: {request.isoStatus}</Text>
              {request.isoComments && (
                <>
                  <br />
                  <Text>Comments: {request.isoComments}</Text>
                </>
              )}
              {request.isoReviewDate && (
                <>
                  <br />
                  <Text type="secondary">{formatTimestamp(request.isoReviewDate)}</Text>
                </>
              )}
            </Timeline.Item>
          )}
          
          {request.deptHeadStatus && (
            <Timeline.Item 
              color={request.deptHeadStatus === 'APPROVED' ? 'green' : request.deptHeadStatus === 'DECLINED' ? 'red' : 'blue'}
              dot={getStatusIcon(request.deptHeadStatus)}
            >
              <Text strong>Department Head Review</Text>
              <br />
              <Text>Status: {request.deptHeadStatus}</Text>
              {request.deptHeadComments && (
                <>
                  <br />
                  <Text>Comments: {request.deptHeadComments}</Text>
                </>
              )}
              {request.deptHeadReviewDate && (
                <>
                  <br />
                  <Text type="secondary">{formatTimestamp(request.deptHeadReviewDate)}</Text>
                </>
              )}
            </Timeline.Item>
          )}
          
          {request.cisoStatus && (
            <Timeline.Item 
              color={request.cisoStatus === 'APPROVED' ? 'green' : request.cisoStatus === 'DECLINED' ? 'red' : 'blue'}
              dot={getStatusIcon(request.cisoStatus)}
            >
              <Text strong>CISO Review</Text>
              <br />
              <Text>Status: {request.cisoStatus}</Text>
              {request.cisoComments && (
                <>
                  <br />
                  <Text>Comments: {request.cisoComments}</Text>
                </>
              )}
              {request.cisoReviewDate && (
                <>
                  <br />
                  <Text type="secondary">{formatTimestamp(request.cisoReviewDate)}</Text>
                </>
              )}
            </Timeline.Item>
          )}
        </Timeline>
      </div>
    );
  };

  // Helper to parse justification/mitigation into table data
  const parseServerDetails = (text, type = 'justification') => {
    if (!text) return [];
    // Split by double newlines (\n\n) or by 'Server:'
    const items = text.split(/\n\n|(?=Server: )/).filter(Boolean);
    return items.map(item => {
      const serverMatch = item.match(/Server: ([^\n]+)/);
      // Split on the first occurrence of 'Justification:' or 'Mitigation:'
      const splitKey = `${type.charAt(0).toUpperCase() + type.slice(1)}:`;
      let value = '';
      if (item.includes(splitKey)) {
        value = item.split(splitKey)[1]?.trim() || '';
      } else {
        value = item.replace(/Server: [^\n]+/, '').trim();
      }
      return {
        server: serverMatch ? serverMatch[1].trim() : '',
        value
      };
    });
  };

  // Helper to parse vulnerability details for justification/mitigation
  const parseVulnerabilityDetails = (text, vulnerabilities) => {
    if (!text || !Array.isArray(vulnerabilities) || vulnerabilities.length === 0) return [];
    const lines = text.split('\n').map(line => line.trim());
    return vulnerabilities
      .map(vuln => {
        // Support both string and object with name property
        const vulnName = typeof vuln === 'string' ? vuln : vuln?.name;
        if (!vulnName) return null;
        const normalizedVuln = (vulnName + ':').toLowerCase().replace(/\s+/g, ' ').trim();
        let lineIdx = -1;
        for (let i = 0; i < lines.length; i++) {
          const normalizedLine = lines[i].toLowerCase().replace(/\s+/g, ' ').trim();
          if (normalizedLine.startsWith(normalizedVuln)) {
            lineIdx = i;
            break;
          }
        }
        let value = '';
        if (lineIdx !== -1) {
          for (let i = lineIdx + 1; i < lines.length; i++) {
            if (lines[i]) {
              value = lines[i];
              break;
            }
          }
        }
        return {
          vulnerability: vulnName,
          value
        };
      })
      .filter(Boolean);
  };

  const renderExceptionRequestsTab = () => (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Input
              placeholder="Search requests..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
            >
              <Option value="all">All Statuses</Option>
              <Option value="pending">Pending</Option>
              <Option value="approved">Approved</Option>
              <Option value="declined">Declined</Option>
              <Option value="need_more_info">Need More Info</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              value={typeFilter}
              onChange={setTypeFilter}
            >
              <Option value="all">All Types</Option>
              <Option value="Standard">Standard</Option>
              <Option value="Vulnerability">Vulnerability</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              style={{ width: '100%' }}
              value={phaseFilter}
              onChange={setPhaseFilter}
            >
              <Option value="all">All Phases</Option>
              <Option value="ISO_REVIEW">ISO Review</Option>
              <Option value="DEPARTMENT_HEAD_REVIEW">Department Head Review</Option>
              <Option value="CISO_REVIEW">CISO Review</Option>
              <Option value="COMPLETED">Completed</Option>
            </Select>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filterRequests(exceptionRequests)}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Space>

      <Modal
        title="Exception Request Details"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedRequest && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Title level={5}>Request Information</Title>
                <Paragraph>
                  <Text strong>Request ID:</Text> {selectedRequest.requestID || 'N/A'}<br />
                  <Text strong>Server Name:</Text> {selectedRequest.serverName}<br />
                  <Text strong>Status:</Text> {getStatusTag(selectedRequest.status)}<br />
                  <Text strong>Phase:</Text> {getPhaseTag(selectedRequest.approvalPhase)}<br />
                  <Text strong>Created:</Text> {formatTimestamp(selectedRequest.createdAt)}<br />
                  <Text strong>Last Updated:</Text> {formatTimestamp(selectedRequest.updatedAt)}
                </Paragraph>
              </Col>
              <Col span={12}>
                <Title level={5}>Requester Information</Title>
                <Paragraph>
                  <Text strong>Name:</Text> {selectedRequest.requesterFirstName} {selectedRequest.requesterLastName}<br />
                  <Text strong>Email:</Text> {selectedRequest.requesterEmail}<br />
                  <Text strong>Department:</Text> {selectedRequest.requesterDepartment}<br />
                  <Text strong>Job Description:</Text> {selectedRequest.requesterJobDescription}
                </Paragraph>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Title level={5}>Department Head Information</Title>
                <Paragraph>
                  <Text strong>Name:</Text> {selectedRequest.departmentHeadFirstName} {selectedRequest.departmentHeadLastName}<br />
                  <Text strong>Email:</Text> {selectedRequest.departmentHeadEmail}<br />
                  <Text strong>Department:</Text> {selectedRequest.departmentHeadDepartment}<br />
                  <Text strong>Job Description:</Text> {selectedRequest.departmentHeadJobDescription}
                </Paragraph>
              </Col>
              <Col span={12}>
                <Title level={5}>Request Details</Title>
                <Paragraph>
                  <Text strong>Data Classification:</Text> {selectedRequest.dataClassification}<br />
                  <Text strong>Users Affected:</Text> {selectedRequest.usersAffected}<br />
                  <Text strong>Data at Risk:</Text> {selectedRequest.dataAtRisk}<br />
                  <Text strong>Exception Duration:</Text> {selectedRequest.exceptionDurationType}<br />
                  <Text strong>Expiration Date:</Text> {selectedRequest.expirationDate}
                </Paragraph>
              </Col>
            </Row>

            <Title level={5}>Justification</Title>
            {(() => {
              if (selectedRequest.exceptionType && selectedRequest.exceptionType.toLowerCase() === 'vulnerability') {
                // Parse by vulnerabilities
                let vulnerabilities = [];
                if (typeof selectedRequest.vulnerabilities === 'string') {
                  try {
                    vulnerabilities = JSON.parse(selectedRequest.vulnerabilities);
                  } catch {
                    vulnerabilities = [];
                  }
                } else {
                  vulnerabilities = selectedRequest.vulnerabilities || [];
                }
                const justificationRows = parseVulnerabilityDetails(selectedRequest.justification, vulnerabilities);
                if (justificationRows.length > 0 && justificationRows.some(row => row.vulnerability)) {
                  return (
                    <Table
                      dataSource={justificationRows}
                      columns={[
                        { title: 'Vulnerability', dataIndex: 'vulnerability', key: 'vulnerability' },
                        { title: 'Justification', dataIndex: 'value', key: 'justification' }
                      ]}
                      pagination={false}
                      size="small"
                      rowKey={(row, idx) => row.vulnerability + idx}
                    />
                  );
                } else {
                  return <Paragraph>{selectedRequest.justification}</Paragraph>;
                }
              } else {
                // Standard exception (server-based)
                const justificationRows = parseServerDetails(selectedRequest.justification, 'justification');
                if (justificationRows.length > 0 && justificationRows.some(row => row.server)) {
                  return (
                    <Table
                      dataSource={justificationRows}
                      columns={[
                        { title: 'Server', dataIndex: 'server', key: 'server' },
                        { title: 'Justification', dataIndex: 'value', key: 'justification' }
                      ]}
                      pagination={false}
                      size="small"
                      rowKey={(row, idx) => row.server + idx}
                    />
                  );
                } else {
                  return <Paragraph>{selectedRequest.justification}</Paragraph>;
                }
              }
            })()}

            <Title level={5}>Mitigation</Title>
            {(() => {
              if (selectedRequest.exceptionType && selectedRequest.exceptionType.toLowerCase() === 'vulnerability') {
                // Parse by vulnerabilities
                let vulnerabilities = [];
                if (typeof selectedRequest.vulnerabilities === 'string') {
                  try {
                    vulnerabilities = JSON.parse(selectedRequest.vulnerabilities);
                  } catch {
                    vulnerabilities = [];
                  }
                } else {
                  vulnerabilities = selectedRequest.vulnerabilities || [];
                }
                const mitigationRows = parseVulnerabilityDetails(selectedRequest.mitigation, vulnerabilities);
                if (mitigationRows.length > 0 && mitigationRows.some(row => row.vulnerability)) {
                  return (
                    <Table
                      dataSource={mitigationRows}
                      columns={[
                        { title: 'Vulnerability', dataIndex: 'vulnerability', key: 'vulnerability' },
                        { title: 'Mitigation', dataIndex: 'value', key: 'mitigation' }
                      ]}
                      pagination={false}
                      size="small"
                      rowKey={(row, idx) => row.vulnerability + idx}
                    />
                  );
                } else {
                  return <Paragraph>{selectedRequest.mitigation}</Paragraph>;
                }
              } else {
                // Standard exception (server-based)
                const mitigationRows = parseServerDetails(selectedRequest.mitigation, 'mitigation');
                if (mitigationRows.length > 0 && mitigationRows.some(row => row.server)) {
                  return (
                    <Table
                      dataSource={mitigationRows}
                      columns={[
                        { title: 'Server', dataIndex: 'server', key: 'server' },
                        { title: 'Mitigation', dataIndex: 'value', key: 'mitigation' }
                      ]}
                      pagination={false}
                      size="small"
                      rowKey={(row, idx) => row.server + idx}
                    />
                  );
                } else {
                  return <Paragraph>{selectedRequest.mitigation}</Paragraph>;
                }
              }
            })()}

            {renderApprovalHistory(selectedRequest)}

            {showDeclineForm && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>Reason for Decline</Title>
                <TextArea
                  rows={4}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Please provide a reason for declining this request..."
                />
              </div>
            )}

            {showMoreInfoForm && (
              <div style={{ marginTop: 16 }}>
                <Title level={5}>Additional Information Needed</Title>
                <TextArea
                  rows={4}
                  value={moreInfoReason}
                  onChange={(e) => setMoreInfoReason(e.target.value)}
                  placeholder="Please specify what additional information is needed..."
                />
              </div>
            )}

            {renderActionButtons(selectedRequest)}
          </Space>
        )}
      </Modal>
    </Card>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Tabs defaultActiveKey="exceptionRequests">
        <Tabs.TabPane
          tab={
            <span>
              <FileTextOutlined />
              Exception Requests
            </span>
          }
          key="exceptionRequests"
        >
          {renderExceptionRequestsTab()}
        </Tabs.TabPane>
        <Tabs.TabPane
          tab={
            <span>
              <ScanOutlined />
              External Scans
            </span>
          }
          key="externalScans"
        >
          <ExternalScans />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;