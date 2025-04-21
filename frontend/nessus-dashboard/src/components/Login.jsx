import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, LockFilled, CheckCircleFilled } from '@ant-design/icons';
import nessusService from '../services/nessusService';
import '../styles/Login.css';

const { Title, Text, Paragraph } = Typography;

const Login = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [logoVisible, setLogoVisible] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    setLogoVisible(true);
    setTimeout(() => setTitleVisible(true), 300);
  }, []);

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const result = await nessusService.login(values.username, values.password);
      message.success({
        content: 'Login successful',
        icon: <CheckCircleFilled style={{ color: '#52c41a' }} />,
        className: 'custom-success-message'
      });
      setTimeout(() => onLoginSuccess(result.isAdmin), 800);
    } catch (error) {
      message.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="login-container">
      <div className="background-pattern" />

      <div className={`login-box ${logoVisible ? 'fade-in' : ''}`}>

        <Card className="login-card">
          <div className={`login-title ${titleVisible ? 'fade-in' : ''}`}>
            <img src="/utep_logo.png" alt="UTEP Logo" className="utep-logo" />
            <Title level={2}>Information Security Office</Title>
            <Paragraph className="subtitle">Vulnerability Management Program (VaMP)</Paragraph>
          </div>

          <Form
            form={form}
            name="login"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
            className={`login-form ${titleVisible ? 'fade-in' : ''}`}
          >
            <Form.Item name="username" rules={[{ required: true, message: 'Please input your username!' }]}> 
              <Input prefix={<UserOutlined className="input-icon" />} placeholder="UTEP Username" />
            </Form.Item>

            <Form.Item name="password" rules={[{ required: true, message: 'Please input your password!' }]}> 
              <Input.Password prefix={<LockOutlined className="input-icon" />} placeholder="Password" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} className="login-button">
                {loading ? 'Authenticating...' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>

          <Divider className="divider">Secure UTEP Connection</Divider>

          <div className="secure-text">
            <SafetyOutlined className="secure-icon" />
            <Text type="secondary">End-to-end encrypted connection to UTEP VaMP</Text>
          </div>
        </Card>

        <div className="footer">
          <span className="status-indicator" /> System Status: Operational
          <div>© {new Date().getFullYear()} UTEP Information Security Office • All rights reserved</div>
        </div>
      </div>
    </div>
  );
};

export default Login;