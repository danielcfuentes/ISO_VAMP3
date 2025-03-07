import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Table, 
  Space, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  message, 
  Tag, 
  Tooltip,
  Alert
} from 'antd';
import { 
  FileTextOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const API_URL = 'http://localhost:5000/api';

const ExceptionRequests = () => {
  const [form] = Form.useForm();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Mock data for now since the backend API isn't implemented yet
  useEffect(() => {
    setRequests([
      {
        id: 1,
        serverName: 'ISOSRVTS102',
        status: 'approved',
        requestedBy: 'jdoe',
        requestedDate: '2025-02-15',
        expirationDate: '2025-05-15',
        justification: 'Server runs critical legacy application that cannot be patched without breaking functionality.',
        vulnerabilities: ['CVE-2024-1234', 'CVE-2024-5678'],
        mitigation: 'Server is isolated on a separate VLAN with restricted access.'
      },
      {
        id: 2,
        serverName: 'ISOSRVDB01',
        status: 'pending',
        requestedBy: 'msmith',
        requestedDate: '2025-03-01',
        expirationDate: '2025-06-01',
        justification: 'Database server with vendor restrictions on updates until next maintenance window.',
        vulnerabilities: ['CVE-2024-9876'],
        mitigation: 'Additional monitoring and host-based firewall rules implemented.'
      },
      {
        id: 3,
        serverName: 'ISOSRVWEB03',
        status: 'rejected',
        requestedBy: 'tjohnson',
        requestedDate: '2025-02-20',
        expirationDate: null,
        justification: 'Web server with custom application.',
        vulnerabilities: ['CVE-2024-2468', 'CVE-2024-1357', 'CVE-2024-8765'],
        mitigation: 'Proposed to implement WAF but rejected as insufficient.'
      }
    ]);
  }, []);
  
  const fetchExceptionRequests = async () => {
    // This would be implemented when the backend API is ready
    setLoading(true);
    try {
      // const response = await axios.get(`${API_URL}/exception-requests`, {
      //   withCredentials: true
      // });
      // setRequests(response.data);
      
      // For now, we're using mock data that's loaded in the useEffect
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
    
    if (mode === 'edit' && request) {
      form.setFieldsValue({
        serverName: request.serverName,
        justification: request.justification,
        vulnerabilities: request.vulnerabilities.join(', '),
        mitigation: request.mitigation,
        expirationDate: request.expirationDate ? moment(request.expirationDate) : null
      });
    } else {
      form.resetFields();
    }
    
    setModalVisible(true);
  };
  
  const handleSubmit = async (values) => {
    setSubmitting(true);
    
    try {
      const formData = {
        ...values,
        vulnerabilities: values.vulnerabilities.split(',').map(v => v.trim())
      };
      
      if (modalMode === 'create') {
        // This would be implemented when the backend API is ready
        // await axios.post(`${API_URL}/exception-requests`, formData, {
        //   withCredentials: true
        // });
        
        // Mock implementation
        setRequests([
          ...requests,
          {
            id: requests.length + 1,
            ...formData,
            status: 'pending',
            requestedBy: 'currentUser', // This would come from the session
            requestedDate: new Date().toISOString().split('T')[0]
          }
        ]);
        
        message.success('Exception request submitted successfully');
      } else if (modalMode === 'edit') {
        // This would be implemented when the backend API is ready
        // await axios.put(`${API_URL}/exception-requests/${selectedRequest.id}`, formData, {
        //   withCredentials: true
        // });
        
        // Mock implementation
        setRequests(
          requests.map(req => 
            req.id === selectedRequest.id 
              ? { ...req, ...formData }
              : req
          )
        );
        
        message.success('Exception request updated successfully');
      }
      
      setModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error submitting exception request:', error);
      message.error('Failed to submit exception request');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleDelete = async (id) => {
    try {
      // This would be implemented when the backend API is ready
      // await axios.delete(`${API_URL}/exception-requests/${id}`, {
      //   withCredentials: true
      // });
      
      // Mock implementation
      setRequests(requests.filter(req => req.id !== id));
      
      message.success('Exception request deleted successfully');
    } catch (error) {
      console.error('Error deleting exception request:', error);
      message.error('Failed to delete exception request');
    }
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
      sorter: (a, b) => a.serverName.localeCompare(b.serverName)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: status => getStatusTag(status),
      filters: [
        { text: 'Approved', value: 'approved' },
        { text: 'Pending', value: 'pending' },
        { text: 'Rejected', value: 'rejected' }
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
          
          {record.status === 'pending' && (
            <>
              <Tooltip title="Edit Request">
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  onClick={() => handleOpenModal('edit', record)} 
                />
              </Tooltip>
              <Tooltip title="Delete Request">
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={() => Modal.confirm({
                    title: 'Delete Exception Request',
                    content: `Are you sure you want to delete the exception request for ${record.serverName}?`,
                    okText: 'Delete',
                    okButtonProps: { danger: true },
                    onOk: () => handleDelete(record.id)
                  })} 
                />
              </Tooltip>
            </>
          )}
        </Space>
      )
    }
  ];
  
  const modalTitle = {
    'create': 'Create Exception Request',
    'edit': 'Edit Exception Request',
    'view': 'Exception Request Details'
  };
  
  return (
    <div className="p-6">
      <Card className="shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <Title level={4}>
            <Space>
              <FileTextOutlined />
              Exception Requests
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
                  <p>{record.justification}</p>
                </div>
                <div>
                  <Text strong>Mitigation Measures: </Text>
                  <p>{record.mitigation}</p>
                </div>
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
                <p>{selectedRequest.serverName}</p>
              </div>
              <div>
                <Text strong>Status:</Text>
                <p>{getStatusTag(selectedRequest.status)}</p>
              </div>
              <div>
                <Text strong>Requested By:</Text>
                <p>{selectedRequest.requestedBy}</p>
              </div>
              <div>
                <Text strong>Request Date:</Text>
                <p>{selectedRequest.requestedDate}</p>
              </div>
              <div>
                <Text strong>Expiration Date:</Text>
                <p>{selectedRequest.expirationDate || 'N/A'}</p>
              </div>
              <div>
                <Text strong>Vulnerabilities:</Text>
                <p>
                  {selectedRequest.vulnerabilities.map(vuln => (
                    <Tag key={vuln} color="orange" style={{ marginBottom: '4px' }}>
                      {vuln}
                    </Tag>
                  ))}
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <Text strong>Justification:</Text>
              <p>{selectedRequest.justification}</p>
            </div>
            
            <div>
              <Text strong>Mitigation Measures:</Text>
              <p>{selectedRequest.mitigation}</p>
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
                {modalMode === 'create' ? 'Submit Request' : 'Update Request'}
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ExceptionRequests;