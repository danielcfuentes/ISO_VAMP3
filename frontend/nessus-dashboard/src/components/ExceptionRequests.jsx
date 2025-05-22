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
  Input,
  Form,
  Row,
  Col,
  Select,
  Tooltip,
  Timeline
} from 'antd';
import { 
  FileTextOutlined, 
  PlusOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SearchOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import StandardExceptionFormModal from './StandardExceptionFormModal';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const API_URL = 'http://localhost:5000/api';

const ExceptionRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [standardModalVisible, setStandardModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [username, setUsername] = useState('');
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [resubmitModalVisible, setResubmitModalVisible] = useState(false);
  const [resubmitForm] = Form.useForm();
  
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
        // Process each request to ensure phase and status fields are set
        const processedRequests = requestsArray.map(request => {
          const currentPhase = request.approvalPhase || determinePhase(request);
          return {
            ...request,
            approvalPhase: currentPhase,
            // Use backend Status as source of truth, fallback to derived logic
            status: request.status || (
              currentPhase === 'COMPLETED' ? 'APPROVED' : 
              request.cisoStatus === 'DECLINED' || request.deptHeadStatus === 'DECLINED' || request.isoStatus === 'DECLINED' ? 'DECLINED' :
              request.cisoStatus === 'NEED_MORE_INFO' || request.deptHeadStatus === 'NEED_MORE_INFO' || request.isoStatus === 'NEED_MORE_INFO' ? 'NEED_MORE_INFO' :
              'PENDING'
            )
          };
        });
        console.log('Setting requests to:', processedRequests);
        setRequests(processedRequests);
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
  
  // Helper function to determine the phase based on request status
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
  
  const handleOpenModal = (request) => {
    setSelectedRequest(request);
    setViewModalVisible(true);
  };
  
  const handleStandardSubmit = async (values) => {
    try {
      // Format the data and submit
      const formattedData = {
        ...values,
        formType: 'standard',
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
  
  // Add a refresh function that can be called after any state changes
  const refreshRequests = async () => {
    try {
      const response = await axios.get(`${API_URL}/exception-requests`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        const requestsArray = response.data.requests || [];
        console.log('Refreshed requests:', requestsArray);
        
        const processedRequests = requestsArray.map(request => {
          const currentPhase = request.approvalPhase || determinePhase(request);
          return {
            ...request,
            approvalPhase: currentPhase,
            // Use backend Status as source of truth, fallback to derived logic
            status: request.status || (
              currentPhase === 'COMPLETED' ? 'APPROVED' : 
              request.cisoStatus === 'DECLINED' || request.deptHeadStatus === 'DECLINED' || request.isoStatus === 'DECLINED' ? 'DECLINED' :
              request.cisoStatus === 'NEED_MORE_INFO' || request.deptHeadStatus === 'NEED_MORE_INFO' || request.isoStatus === 'NEED_MORE_INFO' ? 'NEED_MORE_INFO' :
              'PENDING'
            )
          };
        });
        
        setRequests(processedRequests);
      }
    } catch (error) {
      console.error('Error refreshing requests:', error);
    }
  };

  // Add effect to refresh data periodically or when modal closes
  useEffect(() => {
    if (!viewModalVisible && !standardModalVisible && !resubmitModalVisible) {
      refreshRequests();
    }
  }, [viewModalVisible, standardModalVisible, resubmitModalVisible]);

  // Add effect to refresh data periodically
  useEffect(() => {
    const refreshInterval = setInterval(refreshRequests, 30000); // Refresh every 30 seconds
    return () => clearInterval(refreshInterval);
  }, []);

  const handleResubmit = async (values) => {
    try {
      const response = await axios.put(
        `${API_URL}/exception-requests/${selectedRequest.id}/resubmit`,
        {
          ...values,
          resubmitComment: values.resubmitComment,
          currentPhase: selectedRequest.approvalPhase || determinePhase(selectedRequest)
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        message.success('Request resubmitted successfully');
        setResubmitModalVisible(false);
        await refreshRequests(); // Refresh the data immediately after resubmission
      } else {
        message.error(response.data.message || 'Failed to resubmit request');
      }
    } catch (error) {
      console.error('Error resubmitting request:', error);
      message.error('Failed to resubmit request');
    }
  };
  
  const getStatusTag = (status, declineReason) => {
    const statusMappings = {
      'APPROVED': { color: 'success', icon: <CheckCircleOutlined />, text: 'Approved' },
      'PENDING': { color: 'processing', icon: <ClockCircleOutlined />, text: 'Pending' },
      'DECLINED': { color: 'error', icon: <CloseCircleOutlined />, text: 'Declined' },
      'NEED_MORE_INFO': { color: 'warning', icon: <InfoCircleOutlined />, text: 'Need More Info' }
    };
    
    // Adjust status display for non-final approvals
    let displayStatus = status;
    if (status === 'APPROVED' && selectedRequest && 
        (!selectedRequest.approvalPhase || selectedRequest.approvalPhase !== 'COMPLETED')) {
      displayStatus = 'PENDING';
    }
    
    const mapping = statusMappings[displayStatus] || { color: 'default', text: displayStatus };
    
    return (
      <div>
        <Tag icon={mapping.icon} color={mapping.color}>
          {mapping.text}
        </Tag>
        {status === 'DECLINED' && declineReason && (
          <Tooltip title={declineReason}>
            <InfoCircleOutlined style={{ marginLeft: 8 }} />
          </Tooltip>
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

      return searchMatch && statusMatch && typeMatch;
    });
  };

  const phaseLabels = {
    ISO_REVIEW: 'ISO Review',
    DEPARTMENT_HEAD_REVIEW: 'Department Head Review',
    CISO_REVIEW: 'CISO Review',
    COMPLETED: 'Completed',
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
              {request.isoReviewedBy && (
                <>
                  <br />
                  <Text>Reviewed by: {request.isoReviewedBy}</Text>
                </>
              )}
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
              {request.deptHeadReviewedBy && (
                <>
                  <br />
                  <Text>Reviewed by: {request.deptHeadReviewedBy}</Text>
                </>
              )}
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
              {request.cisoReviewedBy && (
                <>
                  <br />
                  <Text>Reviewed by: {request.cisoReviewedBy}</Text>
                </>
              )}
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
        <Space>
          <Button type="primary" onClick={() => handleOpenModal(record)}>
            View Details
          </Button>
          {record.status === 'NEED_MORE_INFO' && (
            <Button type="primary" onClick={() => {
              setSelectedRequest(record);
              setResubmitModalVisible(true);
            }}>
              Resubmit
            </Button>
          )}
        </Space>
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
          </Row>

          <Table
            columns={columns}
            dataSource={filterRequests(requests)}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Space>
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
        width={800}
      >
        {selectedRequest && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <Text strong>Request ID:</Text>
                <div>{selectedRequest.requestID || 'N/A'}</div>
              </div>
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
                  console.log('Justification Table Rows:', justificationRows);
                  // Remove the rows as JSON for debugging
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
                    return <div>{selectedRequest.justification}</div>;
                  }
                }
              })()}
            </div>
            
            <div>
              <Text strong>Mitigation Measures:</Text>
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
                    return <div>{selectedRequest.mitigation}</div>;
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
                    return <div>{selectedRequest.mitigation}</div>;
                  }
                }
              })()}
            </div>
            
            {renderApprovalHistory(selectedRequest)}
          </Space>
        )}
      </Modal>

      <Modal
        title="Resubmit Exception Request"
        open={resubmitModalVisible}
        onCancel={() => setResubmitModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={resubmitForm}
          layout="vertical"
          onFinish={handleResubmit}
          initialValues={selectedRequest}
        >
          <Form.Item
            name="resubmitComment"
            label="What changes have you made to address the feedback?"
            rules={[{ required: true, message: 'Please explain what changes you have made' }]}
          >
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Resubmit
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExceptionRequests;