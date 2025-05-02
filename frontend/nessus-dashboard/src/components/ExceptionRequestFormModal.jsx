import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, Button, Select, Typography, Alert, Space, Radio, DatePicker, message, Spin, Card, Table, Tag } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;
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
  vulnerabilities = []
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [customDuration, setCustomDuration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [departmentHeadLoading, setDepartmentHeadLoading] = useState(false);
  const [selectedVulnIds, setSelectedVulnIds] = useState([]);
  const [isFormComplete, setIsFormComplete] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      form.resetFields();
      form.setFieldsValue({
        serverName: serverName
      });
      setCustomDuration(false);
      setSelectedVulnIds([]);
      fetchRequesterInfo();
    }
  }, [visible, serverName, form]);

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

  // Function to check if a vulnerability is complete
  const isVulnerabilityComplete = (vulnId) => {
    const formValues = form.getFieldsValue();
    const justification = formValues[`justification_${vulnId}`];
    const mitigation = formValues[`mitigation_${vulnId}`];
    return justification?.trim()?.length >= 20 && mitigation?.trim()?.length >= 20;
  };

  // Function to check if all selected vulnerabilities are complete
  const areAllSelectedVulnsComplete = () => {
    return selectedVulnIds.every(vulnId => isVulnerabilityComplete(vulnId));
  };

  // Handle vulnerability selection change
  const handleVulnerabilityChange = (selectedIds) => {
    setSelectedVulnIds(selectedIds);
    // Clear form fields for unselected vulnerabilities
    const formValues = form.getFieldsValue();
    Object.keys(formValues).forEach(key => {
      if (key.startsWith('justification_') || key.startsWith('mitigation_')) {
        const vulnId = key.split('_')[1];
        if (!selectedIds.includes(vulnId)) {
          form.setFieldsValue({ [key]: undefined });
        }
      }
    });
    handleFormValuesChange();
  };

  // Handle form values change
  const handleFormValuesChange = () => {
    const formValues = form.getFieldsValue();
    const allRequiredFieldsFilled = 
      formValues.requesterFirstName &&
      formValues.requesterLastName &&
      formValues.requesterJobDescription &&
      formValues.requesterEmail &&
      formValues.departmentHeadUsername &&
      formValues.departmentHeadFirstName &&
      formValues.departmentHeadLastName &&
      formValues.departmentHeadJobDescription &&
      formValues.departmentHeadEmail &&
      formValues.dataClassification &&
      formValues.exceptionDurationType &&
      (!formValues.exceptionDurationType === 'custom' || formValues.customExpirationDate) &&
      formValues.usersAffected &&
      formValues.dataAtRisk &&
      formValues.termsAccepted;

    setIsFormComplete(areAllSelectedVulnsComplete() && allRequiredFieldsFilled);
  };

  // Table columns definition
  const columns = [
    {
      title: 'Vulnerability',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Typography.Text strong>{text}</Typography.Text>
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        const isComplete = isVulnerabilityComplete(record.plugin_id);
        const isSelected = selectedVulnIds.includes(record.plugin_id);
        return (
          <Tag 
            color={isSelected ? (isComplete ? 'success' : 'error') : 'default'}
            icon={isSelected ? (isComplete ? <CheckCircleOutlined /> : <CloseCircleOutlined />) : null}
          >
            {isSelected ? (isComplete ? 'Complete' : 'Incomplete') : 'Not Selected'}
          </Tag>
        );
      }
    }
  ];

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      // Get the selected vulnerability IDs from the form
      const selectedVulnIds = values.vulnerabilities || [];
      
      // Validate that all selected vulnerabilities have justification and mitigation
      const missingFields = selectedVulnIds.filter(vulnId => {
        const justification = values[`justification_${vulnId}`];
        const mitigation = values[`mitigation_${vulnId}`];
        return !justification || !mitigation;
      });

      if (missingFields.length > 0) {
        message.error('Please provide both justification and mitigation for all selected vulnerabilities');
        return;
      }
      
      // Filter the vulnerabilities array to only include selected ones
      const selectedVulnerabilities = vulnerabilities
        .filter(vuln => selectedVulnIds.includes(vuln.plugin_id))
        .map(vuln => ({
          id: vuln.plugin_id,
          name: vuln.plugin_name || vuln.name,
          severity: vuln.severity,
          description: vuln.description,
          justification: values[`justification_${vuln.plugin_id}`],
          mitigation: values[`mitigation_${vuln.plugin_id}`]
        }));
      
      // Determine exception type based on the presence of vulnerabilities
      const exceptionType = selectedVulnerabilities.length > 0 ? 'Vulnerability' : 'Standard';
      
      // Prepare the data for submission
      const formData = {
        ...values,
        // Map department head fields to approver fields
        approverFirstName: values.departmentHeadFirstName,
        approverLastName: values.departmentHeadLastName,
        approverJobDescription: values.departmentHeadJobDescription,
        approverEmail: values.departmentHeadEmail,
        vulnerabilities: selectedVulnerabilities,
        exceptionType: exceptionType
      };
      
      // Send the request to the backend
      const response = await axios.post(`${API_URL}/exception-requests`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.data.success) {
        message.success('Exception request submitted successfully');
        onClose();
        form.resetFields();
      } else {
        throw new Error(response.data.message || 'Failed to submit exception request');
      }
    } catch (error) {
      console.error('Error submitting exception request:', error);
      console.error('Error details:', error.response?.data);
      
      // Handle specific error cases
      if (error.response?.status === 500) {
        message.error('Database connection error. Please try again later.');
      } else if (error.response?.status === 401) {
        message.error('Your session has expired. Please log in again.');
      } else if (error.response?.status === 403) {
        message.error('You do not have permission to submit exception requests.');
      } else if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (error.message) {
        message.error(error.message);
      } else {
        message.error('Failed to submit exception request. Please try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle duration type change
  const handleDurationTypeChange = (e) => {
    const isCustom = e.target.value === 'custom';
    setCustomDuration(isCustom);
    if (!isCustom) {
      form.setFieldsValue({ customExpirationDate: null });
    }
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
          message="Exception Request"
          description="Use this form to request an exception for vulnerabilities that cannot be immediately remediated. All requests require proper justification and mitigation measures for each selected vulnerability."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
        />
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark="optional"
          validateTrigger={['onChange', 'onBlur', 'onSubmit']}
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
          <Typography.Title level={4}>Requester Information</Typography.Title>
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

          {/* Approver Information */}
          <Typography.Title level={4}>Department Head/Dean/Vice-President Information</Typography.Title>
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

          {/* Data Classification */}
          <Typography.Title level={4}>Data Classification</Typography.Title>
          <Form.Item
            name="dataClassification"
            label="Highest data classification contained in server/device/service"
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
          <Title level={4}>Time to complete (duration of exception)</Title>
          <Form.Item
            name="exceptionDurationType"
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
          <Typography.Title level={4}>Users Affected</Typography.Title>
          <Form.Item
            name="usersAffected"
            label="In case of a security breach (service-level scenarios), how many users might be affected?"
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
            <TextArea rows={4} />
          </Form.Item>

          {/* Vulnerability Status Table */}
          <Card style={{ marginBottom: 16 }}>
            <Typography.Title level={5}>Vulnerability Completion Status</Typography.Title>
            <Table
              columns={columns}
              dataSource={vulnerabilities.map(vuln => ({
                ...vuln,
                name: vuln.plugin_name || vuln.name
              }))}
              rowKey="plugin_id"
              pagination={false}
              size="small"
            />
          </Card>

          {/* Vulnerabilities Selection */}
          <Form.Item
            name="vulnerabilities"
            label="Vulnerabilities"
            rules={[{ required: true, message: 'You must select all vulnerabilities to submit the form' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select all vulnerabilities that need exception"
              style={{ width: '100%' }}
              options={vulnerabilities.map(vuln => ({
                label: `${vuln.plugin_id}: ${vuln.plugin_name || vuln.name}`,
                value: vuln.plugin_id
              }))}
              onChange={handleVulnerabilityChange}
            />
          </Form.Item>

          {/* Dynamic Justification and Mitigation boxes for each selected vulnerability */}
          {selectedVulnIds.map(vulnId => {
            const vuln = vulnerabilities.find(v => v.plugin_id === vulnId);
            if (!vuln) return null;
            
            return (
              <Card 
                key={vulnId} 
                title={`Vulnerability: ${vuln.plugin_name || vuln.name}`}
                style={{ marginBottom: 16 }}
                extra={
                  <Tag 
                    color={isVulnerabilityComplete(vulnId) ? 'success' : 'error'}
                    icon={isVulnerabilityComplete(vulnId) ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  >
                    {isVulnerabilityComplete(vulnId) ? 'Complete' : 'Incomplete'}
                  </Tag>
                }
              >
                <Form.Item
                  name={`justification_${vulnId}`}
                  label="Justification"
                  rules={[
                    { required: true, message: 'Please provide justification for this vulnerability' },
                    { min: 20, message: 'Justification must be at least 20 characters' }
                  ]}
                  validateTrigger={['onChange', 'onBlur']}
                  dependencies={[`mitigation_${vulnId}`]}
                >
                  <TextArea 
                    rows={4} 
                    placeholder="Please provide a detailed justification for this vulnerability exception"
                  />
                </Form.Item>

                <Form.Item
                  name={`mitigation_${vulnId}`}
                  label="Mitigation Strategy"
                  rules={[
                    { required: true, message: 'Please provide a mitigation strategy for this vulnerability' },
                    { min: 20, message: 'Mitigation strategy must be at least 20 characters' }
                  ]}
                  validateTrigger={['onChange', 'onBlur']}
                  dependencies={[`justification_${vulnId}`]}
                >
                  <TextArea 
                    rows={4} 
                    placeholder="Please describe how you plan to mitigate the risks associated with this vulnerability"
                  />
                </Form.Item>
              </Card>
            );
          })}

          {/* Terms and Conditions */}
          <Title level={4}>Terms and Conditions</Title>
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
            valuePropName="checked"
            rules={[
              { required: true, message: 'You must accept the terms and conditions' }
            ]}
          >
            <Radio>I have read and agree to the terms and conditions</Radio>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting} 
              block
              disabled={!isFormComplete}
            >
              {!isFormComplete 
                ? 'Complete all vulnerability details and required fields to submit' 
                : 'Submit Exception Request'}
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
      plugin_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      plugin_name: PropTypes.string,
      name: PropTypes.string
    })
  )
};

export default ExceptionRequestFormModal;