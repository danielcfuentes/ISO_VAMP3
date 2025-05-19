import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, Button, Typography, Space, Radio, DatePicker, message, Spin, Collapse } from 'antd';
import { FileTextOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
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

// Add this new component for server entry fields
const ServerEntryFields = ({ field, remove, isFirst }) => {
  const [serverName, setServerName] = useState('');
  
  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: '4px', padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <Form.Item
          {...field}
          validateTrigger={['onChange', 'onBlur']}
          rules={[
            {
              required: true,
              whitespace: true,
              message: "Please enter server name/IP or remove this field"
            }
          ]}
          noStyle
        >
          <Input 
            placeholder="Enter server name or IP address" 
            style={{ width: '100%' }}
            onChange={(e) => setServerName(e.target.value)}
          />
        </Form.Item>
        {!isFirst && (
          <MinusCircleOutlined
            className="dynamic-delete-button"
            onClick={() => remove(field.name)}
            style={{ color: '#ff4d4f' }}
          />
        )}
      </div>
      
      {serverName && (
        <>
          <Form.Item
            name={['serverJustifications', field.name]}
            label="Justification for this server"
            rules={[
              { required: true, message: 'Please provide justification for this server' },
              { min: 20, message: 'Justification must be at least 20 characters' }
            ]}
          >
            <TextArea 
              rows={3} 
              placeholder={`Please provide justification for ${serverName} (min 20 characters)`}
            />
          </Form.Item>

          <Form.Item
            name={['serverMitigations', field.name]}
            label="Mitigation for this server"
            rules={[
              { required: true, message: 'Please provide mitigation for this server' },
              { min: 20, message: 'Mitigation must be at least 20 characters' }
            ]}
          >
            <TextArea 
              rows={3} 
              placeholder={`Please describe how you will mitigate risks for ${serverName} (min 20 characters)`}
            />
          </Form.Item>
        </>
      )}
    </div>
  );
};

// Add PropTypes validation for ServerEntryFields
ServerEntryFields.propTypes = {
  field: PropTypes.shape({
    key: PropTypes.string.isRequired,
    name: PropTypes.number.isRequired
  }).isRequired,
  remove: PropTypes.func.isRequired,
  isFirst: PropTypes.bool.isRequired
};

const StandardExceptionFormModal = ({ 
  visible, 
  onClose, 
  onSubmit
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [customDuration, setCustomDuration] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approverLoading, setApproverLoading] = useState(false);
  const [enableSubmit, setEnableSubmit] = useState(false);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setCustomDuration(false);
      fetchRequesterInfo();
    }
  }, [visible, form]);

  // Check form completeness whenever form values change
  useEffect(() => {
    checkFormCompleteness();
  }, [form.getFieldsValue()]);

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

  const handleApproverBlur = async (e) => {
    const username = e.target.value;
    if (!username) return;

    try {
      setApproverLoading(true);
      const response = await axios.get(`${API_URL}/users/${username}`, {
        withCredentials: true
      });
      
      if (response.data.success) {
        const userData = response.data.data;
        
        // Auto-populate approver fields
        form.setFieldsValue({
          approverFirstName: userData.firstName,
          approverLastName: userData.lastName,
          approverDepartment: userData.department,
          approverJobDescription: userData.jobDescription,
          approverEmail: userData.email,
          approverPhone: userData.phone
        });
      }
    } catch (error) {
      console.error('Error fetching approver info:', error);
      message.error('Failed to load approver information');
      // Clear approver fields if user not found
      form.setFieldsValue({
        approverFirstName: '',
        approverLastName: '',
        approverDepartment: '',
        approverJobDescription: '',
        approverEmail: '',
        approverPhone: ''
      });
    } finally {
      setApproverLoading(false);
    }
  };

  const checkFormCompleteness = () => {
    const formValues = form.getFieldsValue();
    const requiredFields = [
      'requesterFirstName',
      'requesterLastName',
      'requesterJobDescription',
      'requesterEmail',
      'approverUsername',
      'approverFirstName',
      'approverLastName',
      'approverJobDescription',
      'approverEmail',
      'standardInfo',
      'serverNames',
      'dataClassification',
      'exceptionDurationType',
      'termsAccepted'
    ];
    
    const missingRequiredFields = requiredFields.some(field => {
      if (field === 'serverNames') {
        return !formValues[field]?.some(name => name?.trim());
      }
      return !formValues[field];
    });
    
    if (missingRequiredFields) {
      setEnableSubmit(false);
      return;
    }
    
    // Check if all servers have justification and mitigation
    const serverNames = formValues.serverNames || [];
    const serverJustifications = formValues.serverJustifications || {};
    const serverMitigations = formValues.serverMitigations || {};
    
    const allServersComplete = serverNames.every((serverName, index) => {
      if (!serverName?.trim()) return true; // Skip empty server names
      const justification = serverJustifications[index];
      const mitigation = serverMitigations[index];
      return justification?.length >= 20 && mitigation?.length >= 20;
    });
    
    if (!allServersComplete) {
      setEnableSubmit(false);
      return;
    }
    
    // If custom expiration date is selected, check if it's provided
    if (formValues.exceptionDurationType === 'custom' && !formValues.customExpirationDate) {
      setEnableSubmit(false);
      return;
    }
    
    setEnableSubmit(true);
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      // Keep the moment object for custom dates, or create one for predefined durations
      let expirationDate = null;
      if (values.exceptionDurationType === 'custom') {
        expirationDate = values.customExpirationDate;
      } else {
        const months = parseInt(values.exceptionDurationType);
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        expirationDate = moment(date);
      }
      
      // Combine server-specific justifications and mitigations
      const serverDetails = values.serverNames.map((serverName, index) => ({
        serverName,
        justification: values.serverJustifications?.[index] || '',
        mitigation: values.serverMitigations?.[index] || ''
      })).filter(server => server.serverName?.trim());

      // Format the combined justification and mitigation
      const combinedJustification = serverDetails.map(server => 
        `Server: ${server.serverName}\nJustification: ${server.justification}`
      ).join('\n\n');

      const combinedMitigation = serverDetails.map(server => 
        `Server: ${server.serverName}\nMitigation: ${server.mitigation}`
      ).join('\n\n');

      // For standard exceptions, we'll use the first server as the primary server
      // and include the rest in the justification/mitigation
      const primaryServer = serverDetails[0]?.serverName || '';
      
      const formData = {
        ...values,
        serverName: primaryServer, // Use first server as primary
        justification: combinedJustification,
        mitigation: combinedMitigation,
        expirationDate: expirationDate,
        requestType: 'standard',
        // Remove the individual arrays as they're now combined
        serverNames: undefined,
        serverJustifications: undefined,
        serverMitigations: undefined,
        // Add additional info if provided
        additionalInfo: values.additionalInfo ? 
          `Additional Information:\n${values.additionalInfo}\n\n${combinedJustification}` : 
          combinedJustification
      };
      
      if (onSubmit) {
        await onSubmit(formData);
      } else {
        const apiData = {
          ...formData,
          expirationDate: expirationDate.toISOString()
        };
        
        console.log('Submitting exception request with data:', apiData);
        
        const response = await axios.post(`${API_URL}/exception-requests`, apiData, {
          withCredentials: true
        });
        
        if (response.data.success) {
          message.success('Standard exception request submitted successfully');
          onClose();
        } else {
          throw new Error(response.data.message || 'Failed to submit request');
        }
      }
    } catch (error) {
      console.error('Error submitting standard exception request:', error);
      message.error(error.response?.data?.message || 'Failed to submit request');
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
    checkFormCompleteness();
  };

  // Handle form field changes
  const handleFormValuesChange = () => {
    checkFormCompleteness();
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          Standard Exception Request
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Spin spinning={loading || approverLoading}>

        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark="optional"
          onValuesChange={handleFormValuesChange}
        >
          {/* Requester Information */}
          <Collapse defaultActiveKey={['1']} style={{ marginBottom: 16 }}>
            <Panel 
              header={
                <Space>
                  <Title level={5} style={{ margin: 0 }}>Requester Information</Title>
                  <Text type="secondary">(Auto-populated)</Text>
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

          {/* Approver Information */}
          <Collapse defaultActiveKey={['1']} style={{ marginBottom: 16 }}>
            <Panel 
              header={
                <Space>
                  <Title level={5} style={{ margin: 0 }}>Department&apos;s Chair, Dean, or Vice-President Information</Title>
                </Space>
              } 
              key="1"
            >
              <Form.Item
                name="approverUsername"
                label="UTEP Username"
                rules={[{ required: true, message: 'UTEP username is required' }]}
              >
                <Input onBlur={handleApproverBlur} placeholder="Enter UTEP username to auto-populate" />
              </Form.Item>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Form.Item
                  name="approverFirstName"
                  label="First Name"
                  rules={[{ required: true, message: 'First name is required' }]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="approverLastName"
                  label="Last Name"
                  rules={[{ required: true, message: 'Last name is required' }]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="approverDepartment"
                  label="Department"
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="approverJobDescription"
                  label="Job Description"
                  rules={[{ required: true, message: 'Job description is required' }]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="approverEmail"
                  label="Email"
                  rules={[
                    { required: true, message: 'Email is required' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input disabled />
                </Form.Item>

                <Form.Item
                  name="approverPhone"
                  label="Phone"
                >
                  <Input disabled />
                </Form.Item>
              </div>
            </Panel>
          </Collapse>

          {/* Standard/System Information */}
          <Collapse defaultActiveKey={['1']} style={{ marginBottom: 16 }}>
            <Panel header={<Title level={5} style={{ margin: 0 }}>Standard/System Information</Title>} key="1">
              <Form.Item
                name="standardInfo"
                label="Standard being excepted and system(s) where exception will apply"
                rules={[{ required: true, message: 'Please provide standard and system information' }]}
              >
                <TextArea rows={4} />
              </Form.Item>

              <Form.List
                name="serverNames"
                initialValue={['']}
              >
                {(fields, { add, remove }) => (
                  <>
                    <Typography.Text strong>Server Names/IPs</Typography.Text>

                    {fields.map((field, index) => (
                      <ServerEntryFields
                        key={field.key}
                        field={field}
                        remove={remove}
                        isFirst={index === 0}
                      />
                    ))}
                    <Form.Item>
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        icon={<PlusOutlined />}
                        style={{ width: '100%' }}
                      >
                        Add Server Name/IP
                      </Button>
                    </Form.Item>
                  </>
                )}
              </Form.List>
            </Panel>
          </Collapse>

          {/* Data Classification and Duration */}
          <Collapse defaultActiveKey={['1']} style={{ marginBottom: 16 }}>
            <Panel header={<Title level={5} style={{ margin: 0 }}>Data Classification and Duration</Title>} key="1">
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

              <Form.Item
                name="exceptionDurationType"
                label="Time to mitigate (duration of exception)"
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
            </Panel>
          </Collapse>

          {/* Additional Information */}
          <Collapse defaultActiveKey={['1']} style={{ marginBottom: 16 }}>
            <Panel header={<Title level={5} style={{ margin: 0 }}>Additional Information</Title>} key="1">
              <Form.Item
                name="additionalInfo"
                label="Please provide additional information"
              >
                <TextArea rows={4} />
              </Form.Item>
            </Panel>
          </Collapse>

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
                ? 'Submit Standard Exception Request' 
                : 'Complete all fields to enable submission'}
            </Button>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

StandardExceptionFormModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func
};

export default StandardExceptionFormModal; 