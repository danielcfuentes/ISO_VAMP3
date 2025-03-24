import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Button, Select, Typography, Alert, Space } from 'antd';
import { FileTextOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ExceptionRequestFormModal = ({ 
  visible, 
  onClose, 
  serverName, 
  vulnerabilities = [], 
  onSubmit
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedVulnerability, setSelectedVulnerability] = useState(null);
  
  // Reset form when modal is opened
  useEffect(() => {
    if (visible) {
      form.resetFields();
      // Pre-populate server name
      form.setFieldsValue({
        serverName: serverName
      });
      // Reset selected vulnerability
      setSelectedVulnerability(null);
    }
  }, [visible, serverName, form]);
  
  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      // Format the vulnerabilities data
      const formattedData = {
        ...values,
        vulnerabilities: values.vulnerabilities.map(vulnId => {
          const vuln = vulnerabilities.find(v => v.id === vulnId);
          return {
            id: vuln.id,
            name: vuln.name,
            severity: vuln.severity
          };
        })
      };
      
      // Submit the form
      await onSubmit(formattedData);
      
      // Close modal on success
      onClose();
      form.resetFields();
    } catch (error) {
      console.error('Error submitting exception request:', error);
    } finally {
      setSubmitting(false);
    }
  };
  
  // When a vulnerability is selected from dropdown, show details
  const handleVulnerabilityChange = (value) => {
    const vuln = vulnerabilities.find(v => v.id === value);
    setSelectedVulnerability(vuln);
  };

  // Sort vulnerabilities by severity (Critical > High > Medium)
  const sortedVulnerabilities = vulnerabilities ? [...vulnerabilities].sort((a, b) => {
    const severityOrder = { 'Critical': 3, 'High': 2, 'Medium': 1 };
    return severityOrder[b.severity_name] - severityOrder[a.severity_name];
  }) : [];
  
  // Group vulnerabilities by severity for the dropdown
  const vulnerabilityOptions = [
    {
      label: 'Critical',
      options: sortedVulnerabilities
        .filter(vuln => vuln.severity_name === 'Critical' || vuln.severity === 4 || vuln.severity === 'Critical')
        .map(vuln => ({
          label: `${vuln.plugin_id}: ${vuln.plugin_name || vuln.name}`,
          value: vuln.plugin_id
        }))
    },
    {
      label: 'High',
      options: sortedVulnerabilities
        .filter(vuln => vuln.severity_name === 'High' || vuln.severity === 3 || vuln.severity === 'High')
        .map(vuln => ({
          label: `${vuln.plugin_id}: ${vuln.plugin_name || vuln.name}`,
          value: vuln.plugin_id
        }))
    },
    {
      label: 'Medium',
      options: sortedVulnerabilities
        .filter(vuln => vuln.severity_name === 'Medium' || vuln.severity === 2 || vuln.severity === 'Medium')
        .map(vuln => ({
          label: `${vuln.plugin_id}: ${vuln.plugin_name || vuln.name}`,
          value: vuln.plugin_id
        }))
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          Create Exception Request
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Alert
        message="Exception Request"
        description="Use this form to request an exception for vulnerabilities that cannot be immediately remediated. All requests require proper justification and mitigation measures."
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
        <Form.Item
          name="serverName"
          label="Server Name"
          rules={[{ required: true, message: 'Server name is required' }]}
        >
          <Input readOnly />
        </Form.Item>
        
        <Form.Item
          name="vulnerabilities"
          label="Vulnerabilities"
          rules={[{ required: true, message: 'Please select at least one vulnerability' }]}
        >
          <Select
            mode="multiple"
            placeholder="Select vulnerabilities for exception"
            onChange={handleVulnerabilityChange}
            optionFilterProp="label"
            style={{ width: '100%' }}
            options={vulnerabilityOptions}
          />
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
            placeholder="Explain why these vulnerabilities cannot be remediated immediately"
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
            Submit Exception Request
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ExceptionRequestFormModal;