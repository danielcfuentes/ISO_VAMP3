import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, Button, Typography, Alert, Space, Radio, DatePicker, message, Spin, Collapse, Table, Tag } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;
const API_URL = 'http://localhost:5000/api';

const TERMS_AND_CONDITIONS = [
  'By requesting an exception to the vulnerabilities listed above, you (system administrator/owner) acknowledge, accept, and become responsible for the risks associated to postponing or impeding a prompt remediation of these vulnerabilities.',
  'Individual vulnerabilities may be excepted from the security standard provided by our vulnerability scanner. This exception request will be reviewed by the Information Security Office (ISO) and the Chief Information Security Officer (CISO). Exception approval is not guaranteed. You accept the decision from the CISO as final and convey your intentions to remediate these vulnerabilities at the time when exception is denied or before the expiration of any currently approved exceptions.',
  'Vulnerabilities include an expected severity. In any case where the severity of an existing vulnerability has increased, or of new vulnerabilities are found previously submitted and approved exceptions for these vulnerabilities become automatically voided. These vulnerabilities increasing in severity and/or new vulnerabilities must be immediately remediated or a vulnerability exception must be requested within 30 days of the change in severity.',
  'Security sensitive information is displayed when completing this request. This information may not be shared unless there exists a justifiable business need. In such case, the Information Security Office must be notified within 24 hours by emailing security@utep.edu.',
  'The Information Security Office may provide advice on vulnerability remediation; nonetheless, remediation becomes the responsibility of the system owner and administrator throughout the lifetime of the system and it is not limited to the duration of the scanning authorization or any vulnerability exception.',
  'This service is governed by all University policies, State, and Federal Laws. Failure to comply can result in disciplinary action and fines as defined by Legal Regulations.'
];

const ExceptionRequestFormModal = ({ 
  visible, 
  onClose, 
  serverName, 
  vulnerabilities = [],
  onSubmit
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [customDuration, setCustomDuration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departmentHeadLoading, setDepartmentHeadLoading] = useState(false);
  const [formVulnerabilities, setFormVulnerabilities] = useState([]);
  const [enableSubmit, setEnableSubmit] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        serverName: serverName
      });
      
      setCustomDuration(false);
      
      // Filter vulnerabilities with severity higher than "info" (0)
      const significantVulnerabilities = vulnerabilities.filter(vuln => 
        typeof vuln.severity === 'number' ? vuln.severity > 0 : 
        ['low', 'medium', 'high', 'critical'].includes(vuln.severity?.toLowerCase())
      );
      
      setFormVulnerabilities(significantVulnerabilities.map(vuln => ({
        ...vuln,
        key: vuln.plugin_id || vuln.id,
        name: vuln.plugin_name || vuln.name,
        justificationComplete: false,
        mitigationComplete: false
      })));
      
      // Initialize form fields for each vulnerability
      const initialValues = {};
      significantVulnerabilities.forEach(vuln => {
        const id = vuln.plugin_id || vuln.id;
        initialValues[`justification_${id}`] = '';
        initialValues[`mitigation_${id}`] = '';
      });
      
      form.setFieldsValue(initialValues);
      fetchRequesterInfo();
    }
  }, [visible, serverName, vulnerabilities, form]);

  // Check form completeness whenever form values change
  useEffect(() => {
    checkFormCompleteness();
  }, [formVulnerabilities]);

  const fetchRequesterInfo = async () => {
    try {
      setLoading(true);
      // Get username from the session cookie
      const response = await axios.get(`${API_URL}/auth/current-user`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        const username = response.data.username;
        // Now fetch the user details
        const userResponse = await axios.get(`${API_URL}/users/${username}`, {
          withCredentials: true
        });
        
        if (userResponse.data.success) {
          const userData = userResponse.data.data;
          
          // Auto-populate requester fields
          form.setFieldsValue({
            requesterFirstName: userData.firstName,
            requesterLastName: userData.lastName,
            requesterDepartment: userData.department,
            requesterJobDescription: userData.jobDescription,
            requesterEmail: userData.email,
            requesterPhone: userData.phone
          });
        } else {
          message.error('Failed to load user details');
        }
      } else {
        message.error('Failed to get current user');
      }
    } catch (error) {
      console.error('Error fetching requester info:', error);
      message.error('Failed to load requester information');
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentHeadBlur = async (e) => {
    const username = e.target.value;
    if (!username) return;

    try {
      setDepartmentHeadLoading(true);
      const response = await axios.get(`${API_URL}/users/${username}`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        const userData = response.data.data;
        
        // Auto-populate department head fields
        form.setFieldsValue({
          departmentHeadFirstName: userData.firstName,
          departmentHeadLastName: userData.lastName,
          departmentHeadDepartment: userData.department,
          departmentHeadJobDescription: userData.jobDescription,
          departmentHeadEmail: userData.email,
          departmentHeadPhone: userData.phone
        });
      }
    } catch (error) {
      console.error('Error fetching department head info:', error);
      message.error('Failed to load department head information');
      // Clear department head fields if user not found
      form.setFieldsValue({
        departmentHeadFirstName: '',
        departmentHeadLastName: '',
        departmentHeadDepartment: '',
        departmentHeadJobDescription: '',
        departmentHeadEmail: '',
        departmentHeadPhone: ''
      });
    } finally {
      setDepartmentHeadLoading(false);
    }
  };

  const handleJustificationChange = (e, record) => {
    const value = e.target.value;
    const vulnId = record.key;
    const isComplete = value && value.length >= 20;
    
    setFormVulnerabilities(prev => 
      prev.map(v => v.key === vulnId ? { ...v, justificationComplete: isComplete } : v)
    );
    
    checkFormCompleteness();
  };

  const handleMitigationChange = (e, record) => {
    const value = e.target.value;
    const vulnId = record.key;
    const isComplete = value && value.length >= 20;
    
    setFormVulnerabilities(prev => 
      prev.map(v => v.key === vulnId ? { ...v, mitigationComplete: isComplete } : v)
    );
    
    checkFormCompleteness();
  };

  const checkFormCompleteness = () => {
    // Check if all required fields are filled
    const formValues = form.getFieldsValue();
    const requiredFields = [
      'requesterFirstName',
      'requesterLastName',
      'requesterJobDescription',
      'requesterEmail',
      'departmentHeadUsername',
      'departmentHeadFirstName',
      'departmentHeadLastName',
      'departmentHeadJobDescription',
      'departmentHeadEmail',
      'dataClassification',
      'exceptionDurationType',
      'usersAffected',
      'dataAtRisk',
      'termsAccepted'
    ];
    
    const missingRequiredFields = requiredFields.some(field => !formValues[field]);
    
    if (missingRequiredFields) {
      setEnableSubmit(false);
      return;
    }
    
    // If custom expiration date is selected, check if it's provided
    if (formValues.exceptionDurationType === 'custom' && !formValues.customExpirationDate) {
      setEnableSubmit(false);
      return;
    }
    
    // Check if all vulnerabilities have complete justification and mitigation
    const allVulnsComplete = formVulnerabilities.every(v => 
      v.justificationComplete && v.mitigationComplete
    );
    
    setEnableSubmit(allVulnsComplete);
  };

  // Handle duration type change
  const handleDurationTypeChange = (e) => {
    const isCustom = e.target.value === 'custom';
    setCustomDuration(isCustom);
    if (!isCustom) {
      form.setFieldsValue({ customExpirationDate: null });
    }
    checkFormCompleteness();
  };

  // Handle form field changes
  const handleFormValuesChange = () => {
    checkFormCompleteness();
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      const selectedVulnerabilities = formVulnerabilities.map(vuln => ({
        id: vuln.key,
        name: vuln.name,
        severity: vuln.severity,
        justification: values[`justification_${vuln.key}`],
        mitigation: values[`mitigation_${vuln.key}`]
      }));
      
      // Keep the moment object for custom dates, or create one for predefined durations
      let expirationDate = null;
      if (values.exceptionDurationType === 'custom') {
        expirationDate = values.customExpirationDate; // This is already a moment object from DatePicker
      } else {
        // For predefined durations, create a moment object
        const months = parseInt(values.exceptionDurationType);
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        expirationDate = moment(date); // Convert to moment object
      }
      
      const formData = {
        ...values,
        vulnerabilities: selectedVulnerabilities,
        expirationDate: expirationDate,
        formType: 'Vulnerability'
      };
      
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        // For direct API submission, convert to ISO string
        const apiData = {
          ...formData,
          expirationDate: expirationDate.toISOString()
        };
        
        const response = await axios.post(`${API_URL}/exception-requests`, apiData, {
          withCredentials: true
        });
        
        if (response.data.success) {
          message.success('Exception request submitted successfully');
          onClose();
        } else {
          throw new Error(response.data.message || 'Failed to submit request');
        }
      }
    } catch (error) {
      console.error('Error submitting exception request:', error);
      message.error(error.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Render vulnerability form items
  const renderVulnerabilityInputs = (record) => {
    const vulnId = record.key;
    
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        <Form.Item
          name={`justification_${vulnId}`}
          label={<Text strong>Justification</Text>}
          rules={[
            { required: true, message: 'Justification is required' },
            { min: 20, message: 'Justification must be at least 20 characters' }
          ]}
        >
          <TextArea 
            rows={3} 
            placeholder="Please provide justification for this vulnerability exception (min 20 characters)"
            onChange={(e) => handleJustificationChange(e, record)}
          />
        </Form.Item>
        
        <Form.Item
          name={`mitigation_${vulnId}`}
          label={<Text strong>Mitigation</Text>}
          rules={[
            { required: true, message: 'Mitigation is required' },
            { min: 20, message: 'Mitigation must be at least 20 characters' }
          ]}
        >
          <TextArea 
            rows={3} 
            placeholder="Please describe how you will mitigate this vulnerability (min 20 characters)"
            onChange={(e) => handleMitigationChange(e, record)}
          />
        </Form.Item>
      </Space>
    );
  };

  // Get severity tag with appropriate color
  const getSeverityTag = (severity) => {
    let color, text;
    
    if (typeof severity === 'number') {
      // Handle numeric severity (0-4)
      switch(severity) {
        case 4: color = 'red'; text = 'Critical'; break;
        case 3: color = 'orange'; text = 'High'; break;
        case 2: color = 'gold'; text = 'Medium'; break;
        case 1: color = 'green'; text = 'Low'; break;
        default: color = 'blue'; text = 'Info';
      }
    } else if (typeof severity === 'string') {
      // Handle string severity
      const severityLower = severity.toLowerCase();
      if (severityLower.includes('critical')) {
        color = 'red'; text = 'Critical';
      } else if (severityLower.includes('high')) {
        color = 'orange'; text = 'High';
      } else if (severityLower.includes('medium')) {
        color = 'gold'; text = 'Medium';
      } else if (severityLower.includes('low')) {
        color = 'green'; text = 'Low';
      } else {
        color = 'blue'; text = severity;
      }
    } else {
      // Default
      color = 'blue'; text = 'Unknown';
    }
    
    return <Tag color={color}>{text}</Tag>;
  };

  // Get status tag for vulnerability fields
  const getStatusTag = (record) => {
    const isJustificationComplete = record.justificationComplete;
    const isMitigationComplete = record.mitigationComplete;
    
    if (isJustificationComplete && isMitigationComplete) {
      return <Tag icon={<CheckCircleOutlined />} color="success">Complete</Tag>;
    } else {
      return <Tag icon={<CloseCircleOutlined />} color="error">Incomplete</Tag>;
    }
  };

  // Define table columns
  const columns = [
    {
      title: 'Vulnerability',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary">ID: {record.plugin_id || record.id}</Text>
        </Space>
      )
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: '15%',
      render: (severity) => getSeverityTag(severity)
    },
    {
      title: 'Status',
      key: 'status',
      width: '15%',
      render: (_, record) => getStatusTag(record)
    }
  ];

  // Expandable row configuration
  const expandable = {
    expandedRowRender: renderVulnerabilityInputs,
    defaultExpandAllRows: true
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          Vulnerability Exception Request
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Spin spinning={loading || departmentHeadLoading}>
        <Alert
          message="Vulnerability Exception Request"
          description="You must provide justification and mitigation measures for ALL listed vulnerabilities before submitting this form."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark="optional"
          onValuesChange={handleFormValuesChange}
        >
          {/* Server Information */}
          <Form.Item
            name="serverName"
            label="Server Name"
            rules={[{ required: true, message: 'Server name is required' }]}
          >
            <Input readOnly />
          </Form.Item>

          {/* Requester Information */}
          <Collapse defaultActiveKey={['1']} style={{ marginBottom: 16 }}>
            <Panel 
              header={
                <Space>
                  <Title level={5} style={{ margin: 0 }}>Requester Information</Title>
                </Space>
              } 
              key="1"
            >

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Item
                  name="requesterFirstName"
                  label="First Name"
                  rules={[{ required: true, message: 'First name is required' }]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="requesterLastName"
                  label="Last Name"
                  rules={[{ required: true, message: 'Last name is required' }]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="requesterDepartment"
                  label="Department"
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="requesterJobDescription"
                  label="Job Description"
                  rules={[{ required: true, message: 'Job description is required' }]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="requesterEmail"
                  label="Email"
                  rules={[
                    { required: true, message: 'Email is required' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="requesterPhone"
                  label="Phone"
                >
                  <Input disabled />
                </Form.Item>
              </div>
            </Panel>
          </Collapse>

          {/* Department Head Information */}
          <Collapse defaultActiveKey={['1']} style={{ marginBottom: 16 }}>
            <Panel header={<Title level={5} style={{ margin: 0 }}>Department Head Information</Title>} key="1">
              <Form.Item
                name="departmentHeadUsername"
                label="UTEP Username"
                rules={[{ required: true, message: 'UTEP username is required' }]}
              >
                <Input onBlur={handleDepartmentHeadBlur} />
              </Form.Item>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Item
                  name="departmentHeadFirstName"
                  label="First Name"
                  rules={[{ required: true, message: 'First name is required' }]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="departmentHeadLastName"
                  label="Last Name"
                  rules={[{ required: true, message: 'Last name is required' }]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="departmentHeadDepartment"
                  label="Department"
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="departmentHeadJobDescription"
                  label="Job Description"
                  rules={[{ required: true, message: 'Job description is required' }]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="departmentHeadEmail"
                  label="Email"
                  rules={[
                    { required: true, message: 'Email is required' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="departmentHeadPhone"
                  label="Phone"
                >
                  <Input disabled />
                </Form.Item>
              </div>
            </Panel>
          </Collapse>

          {/* Exception Details */}
          <Collapse defaultActiveKey={['1']} style={{ marginBottom: 16 }}>
            <Panel header={<Title level={5} style={{ margin: 0 }}>Exception Details</Title>} key="1">
              {/* Data Classification */}
              <Form.Item
                name="dataClassification"
                label="Data Classification"
                rules={[{ required: true, message: 'Please select data classification' }]}
              >
                <Radio.Group>
                  <Space direction="vertical">
                    <Radio value="confidential">Confidential</Radio>
                    <Radio value="controlled">Controlled</Radio>
                    <Radio value="published">Published</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              {/* Exception Duration */}
              <Form.Item
                name="exceptionDurationType"
                label="Exception Duration"
                rules={[{ required: true, message: 'Please select exception duration' }]}
              >
                <Radio.Group onChange={handleDurationTypeChange}>
                  <Space direction="vertical">
                    <Radio value="1">1 Month</Radio>
                    <Radio value="3">3 Months</Radio>
                    <Radio value="6">6 Months</Radio>
                    <Radio value="12">1 Year</Radio>
                    <Radio value="custom">Custom Date</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              {customDuration && (
                <Form.Item
                  name="customExpirationDate"
                  label="Custom Expiration Date"
                  rules={[
                    { required: true, message: 'Please select a custom expiration date' },
                    {
                      validator: async (_, value) => {
                        if (value && value.isBefore(new Date(), 'day')) {
                          throw new Error('Expiration date cannot be in the past');
                        }
                      }
                    }
                  ]}
                >
                  <DatePicker 
                    style={{ width: '100%' }} 
                    placeholder="Select custom expiration date"
                  />
                </Form.Item>
              )}

              {/* Users Affected */}
              <Form.Item
                name="usersAffected"
                label="Users Affected"
                rules={[{ required: true, message: 'Please select number of users affected' }]}
              >
                <Radio.Group>
                  <Space direction="vertical">
                    <Radio value="1-100">1-100</Radio>
                    <Radio value="101-1000">101-1,000</Radio>
                    <Radio value="1001-10000">1,001-10,000</Radio>
                    <Radio value="10000+">Greater than 10,000</Radio>
                  </Space>
                </Radio.Group>
              </Form.Item>

              {/* Data/Departments at Risk */}
              <Form.Item
                name="dataAtRisk"
                label="Data, departments, or customers that may be placed at risk"
                rules={[{ required: true, message: 'Please describe data/departments at risk' }]}
              >
                <TextArea rows={3} />
              </Form.Item>
            </Panel>
          </Collapse>

          {/* Vulnerabilities */}
          <Title level={5}>Vulnerabilities</Title>
          <Alert
            message={
              <Space>
                <InfoCircleOutlined />
                <span>
                  Complete <strong>BOTH</strong> justification and mitigation for <strong>ALL</strong> vulnerabilities
                </span>
              </Space>
            }
            type="info"
            showIcon={false}
            style={{ marginBottom: 16 }}
          />

          <Table
            columns={columns}
            dataSource={formVulnerabilities}
            expandable={expandable}
            pagination={false}
            style={{ marginBottom: 16 }}
            rowKey="key"
          />

          {/* Terms and Conditions */}
          <Title level={5}>Terms and Conditions</Title>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto', 
            padding: '16px',
            border: '1px solid #d9d9d9',
            borderRadius: '2px',
            marginBottom: '16px',
            backgroundColor: '#fafafa'
          }}>
            {TERMS_AND_CONDITIONS.map((term, index) => (
              <Paragraph key={index} style={{ marginBottom: '16px' }}>
                {term}
              </Paragraph>
            ))}
          </div>

          <Form.Item
            name="termsAccepted"
            rules={[{ required: true, message: 'You must accept the terms and conditions' }]}
          >
            <Radio.Group>
              <Radio value={true}>I have read and agree to the terms and conditions</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting} 
              block
              disabled={!enableSubmit}
            >
              {enableSubmit 
                ? 'Submit Exception Request' 
                : 'Complete all fields to enable submission'}
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

ExceptionRequestFormModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  serverName: PropTypes.string.isRequired,
  vulnerabilities: PropTypes.arrayOf(
    PropTypes.shape({
      plugin_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      plugin_name: PropTypes.string,
      name: PropTypes.string,
      severity: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    })
  ),
  onSubmit: PropTypes.func
};

export default ExceptionRequestFormModal;