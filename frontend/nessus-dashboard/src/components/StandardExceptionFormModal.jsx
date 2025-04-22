import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, Button, Typography, Alert, Space, Radio, DatePicker } from 'antd';
import { FileTextOutlined, MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title, Paragraph } = Typography;

const TERMS_AND_CONDITIONS = [
  'By requesting an exception to the vulnerabilities listed above, you (system administrator/owner) acknowledge, accept, and become responsible for the risks associated to postponing or impeding a prompt remediation of these vulnerabilities.',
  'Individual vulnerabilities may be excepted from the security standard provided by our vulnerability scanner. This exception request will be reviewed by the Information Security Office (ISO) and the Chief Information Security Officer (CISO). Exception approval is not guaranteed. You accept the decision from the CISO as final and convey your intentions to remediate these vulnerabilities at the time when exception is denied or before the expiration of any currently approved exceptions.',
  'Vulnerabilities include an expected severity. In any case where the severity of an existing vulnerability has increased, or of new vulnerabilities are found previously submitted and approved exceptions for these vulnerabilities become automatically voided. These vulnerabilities increasing in severity and/or new vulnerabilities must be immediately remediated or a vulnerability exception must be requested within 30 days of the change in severity.',
  'Security sensitive information is displayed when completing this request. This information may not be shared unless there exists a justifiable business need. In such case, the Information Security Office must be notified within 24 hours by emailing security@utep.edu.',
  'The Information Security Office may provide advice on vulnerability remediation; nonetheless, remediation becomes the responsibility of the system owner and administrator throughout the lifetime of the system and it is not limited to the duration of the scanning authorization or any vulnerability exception.',
  'This service is governed by all University policies, State, and Federal Laws. Failure to comply can result in disciplinary action and fines as defined by Legal Regulations.'
];

const StandardExceptionFormModal = ({ 
  visible, 
  onClose, 
  onSubmit
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [customDuration, setCustomDuration] = useState(false);
  
  useEffect(() => {
    if (visible) {
      form.resetFields();
      setCustomDuration(false);
    }
  }, [visible, form]);

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      await onSubmit(values);
      onClose();
      form.resetFields();
    } catch (error) {
      console.error('Error submitting standard exception request:', error);
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
          Standard Exception Request
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnClose
    >
      <Alert
        message="Standard Exception Request"
        description="Use this form to request a standard exception. All requests require proper justification and mitigation measures."
        type="warning"
        showIcon
        style={{ marginBottom: 24 }}
      />
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        requiredMark="optional"
      >
        {/* Requester Information */}
        <Title level={4}>Requester Information</Title>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            name="requesterFirstName"
            label="First Name"
            rules={[{ required: true, message: 'First name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="requesterLastName"
            label="Last Name"
            rules={[{ required: true, message: 'Last name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="requesterDepartment"
            label="Department"
            rules={[{ required: true, message: 'Department is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="requesterJobDescription"
            label="Job Description"
            rules={[{ required: true, message: 'Job description is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="requesterEmail"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="requesterPhone"
            label="Phone"
            rules={[{ required: true, message: 'Phone number is required' }]}
          >
            <Input />
          </Form.Item>
        </div>

        {/* Approver Information */}
        <Title level={4}>Department's Chair, Dean, or Vice-President Information</Title>
        <Form.Item
          name="approverUsername"
          label="UTEP Username"
          rules={[{ required: true, message: 'UTEP username is required' }]}
        >
          <Input placeholder="UTEP username" />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            name="approverFirstName"
            label="First Name"
            rules={[{ required: true, message: 'First name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="approverLastName"
            label="Last Name"
            rules={[{ required: true, message: 'Last name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="approverDepartment"
            label="Department"
            rules={[{ required: true, message: 'Department is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="approverJobDescription"
            label="Job Description"
            rules={[{ required: true, message: 'Job description is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="approverEmail"
            label="Email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="approverPhone"
            label="Phone"
            rules={[{ required: true, message: 'Phone number is required' }]}
          >
            <Input />
          </Form.Item>
        </div>

        {/* Standard/System Information */}
        <Title level={4}>Standard/System Information</Title>
        <Form.Item
          name="standardInfo"
          label="Standard being excepted and system(s) where exception will apply"
          rules={[{ required: true, message: 'Please provide standard and system information' }]}
        >
          <TextArea rows={4} />
        </Form.Item>

        <Form.List
          name="serverNames"
          initialValue={['']} // Start with one empty field
        >
          {(fields, { add, remove }) => (
            <>
              <Typography.Text>Server Names/IPs</Typography.Text>
              {fields.map((field, index) => (
                <Form.Item
                  required={false}
                  key={field.key}
                  style={{ marginBottom: '8px' }}
                >
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Form.Item
                      key={field.key}
                      name={field.name}
                      validateTrigger={['onChange', 'onBlur']}
                      rules={[
                        {
                          whitespace: true,
                          message: "Please enter server name/IP or remove this field"
                        }
                      ]}
                      noStyle
                    >
                      <Input 
                        placeholder="Enter server name or IP address" 
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                    {fields.length > 1 && (
                      <MinusCircleOutlined
                        className="dynamic-delete-button"
                        onClick={() => remove(field.name)}
                      />
                    )}
                  </div>
                </Form.Item>
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

        {/* Justification */}
        <Form.Item
          name="justification"
          label="Reason for requesting exception"
          rules={[
            { required: true, message: 'Please provide justification' },
            { min: 20, message: 'Justification must be at least 20 characters' }
          ]}
        >
          <TextArea rows={4} />
        </Form.Item>

        <Form.Item
          name="mitigationStrategy"
          label="Proposed plan/steps to mitigate/manage risk(s) associated with non-compliance"
          rules={[
            { required: true, message: 'Please provide mitigation strategy' },
            { min: 20, message: 'Mitigation strategy must be at least 20 characters' }
          ]}
        >
          <TextArea rows={4} />
        </Form.Item>

        {/* Data Classification */}
        <Title level={4}>Data Classification</Title>
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
        <Title level={4}>Time to mitigate (duration of exception)</Title>
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

        {/* Additional Information */}
        <Form.Item
          name="additionalInfo"
          label="Please provide additional information (optional)"
        >
          <TextArea rows={4} />
        </Form.Item>

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
          <Button type="primary" htmlType="submit" loading={submitting} block>
            Submit Standard Exception Request
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

StandardExceptionFormModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired
};

export default StandardExceptionFormModal; 