import React, { useState, useEffect } from 'react';
import { 
  Modal, Button, Typography, Divider, Table, Tag, Space, 
  Alert, Tabs, Collapse, Descriptions, Badge, Progress, Spin 
} from 'antd';
import { 
  InfoCircleOutlined, 
  DownloadOutlined, 
  LoadingOutlined,
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  StopOutlined,
  WarningOutlined,
  BugOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import nessusService from '../services/nessusService';

const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;

const InternalScanVulDetailsModal = ({ 
  visible, 
  scan, 
  onClose, 
  onDownload, 
  downloadLoading 
}) => {
  const [vulnerabilityData, setVulnerabilityData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTabKey, setActiveTabKey] = useState('summary');
  const [expandedRows, setExpandedRows] = useState({});
  const [pluginDetails, setPluginDetails] = useState({});

  // Fetch vulnerability data when scan is selected and modal is opened
  useEffect(() => {
    if (visible && scan && scan.name) {
      fetchVulnerabilityData(scan.name);
    }
  }, [visible, scan]);

  const fetchVulnerabilityData = async (serverName) => {
    setLoading(true);
    try {
      const vulData = await nessusService.getInternalScanVulnerabilities(serverName);
      setVulnerabilityData(vulData);
    } catch (error) {
      console.error('Error fetching vulnerability data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch vulnerability details for a specific plugin
  const fetchPluginDetails = async (scanId, hostId, pluginId) => {
    try {
      const details = await nessusService.getInternalVulnerabilityPluginDetails(scanId, hostId, pluginId);
      return details;
    } catch (error) {
      console.error('Error fetching plugin details:', error);
      return null;
    }
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp || timestamp === 'N/A') return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  // Get status tag component
  const getStatusTag = (status) => {
    const statusMappings = {
      'completed': { color: 'success', icon: <CheckCircleOutlined />, text: 'Completed' },
      'running': { color: 'processing', icon: <LoadingOutlined />, text: 'Running' },
      'stopped': { color: 'warning', icon: <StopOutlined />, text: 'Stopped' },
      'failed': { color: 'error', icon: <CloseCircleOutlined />, text: 'Failed' },
      'pending': { color: 'default', icon: <LoadingOutlined />, text: 'Pending' }
    };
    
    const defaultMapping = { color: 'default', icon: <InfoCircleOutlined />, text: status || 'Unknown' };
    const mapping = statusMappings[status] || defaultMapping;
    
    return (
      <Tag icon={mapping.icon} color={mapping.color}>
        {mapping.text}
      </Tag>
    );
  };

  // Get severity tag with appropriate color
  const getSeverityTag = (severity, count) => {
    let color, icon;
    
    switch(severity.toLowerCase()) {
      case 'critical':
        color = 'red';
        icon = <WarningOutlined />;
        break;
      case 'high':
        color = 'orange';
        icon = <WarningOutlined />;
        break;
      case 'medium':
        color = 'gold';
        icon = <InfoCircleOutlined />;
        break;
      case 'low':
        color = 'green';
        icon = <InfoCircleOutlined />;
        break;
      default:
        color = 'blue';
        icon = <InfoCircleOutlined />;
    }
    
    return (
      <Tag color={color} icon={icon}>
        {severity} {count !== undefined && `(${count})`}
      </Tag>
    );
  };

  // Render scan overview
  const renderScanOverview = () => {
    if (!scan) return <Alert message="No scan data available" type="info" />;
    
    return (
      <div className="mb-4">
        <Descriptions bordered size="small" column={2}>
          <Descriptions.Item label="Scan Name">{scan.name}</Descriptions.Item>
          <Descriptions.Item label="Status">{getStatusTag(scan.status)}</Descriptions.Item>
          <Descriptions.Item label="Scan ID">{scan.id}</Descriptions.Item>
          <Descriptions.Item label="Target">{vulnerabilityData?.targets || scan.name}</Descriptions.Item>
          <Descriptions.Item label="Start Time">{formatTimestamp(scan.start_time)}</Descriptions.Item>
          <Descriptions.Item label="End Time">{formatTimestamp(scan.end_time)}</Descriptions.Item>
        </Descriptions>
      </div>
    );
  };

  // Render vulnerability summary
  const renderVulnerabilitySummary = () => {
    if (!vulnerabilityData || !vulnerabilityData.hosts || vulnerabilityData.hosts.length === 0) {
      return <Alert message="No vulnerability data available" type="info" />;
    }

    // Calculate total counts from all hosts
    const severity_counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };

    vulnerabilityData.hosts.forEach(host => {
      severity_counts.critical += host.critical || 0;
      severity_counts.high += host.high || 0;
      severity_counts.medium += host.medium || 0;
      severity_counts.low += host.low || 0;
      severity_counts.info += host.info || 0;
    });

    const totalVulnerabilities = 
      severity_counts.critical + 
      severity_counts.high + 
      severity_counts.medium + 
      severity_counts.low + 
      severity_counts.info;
    
    // Create data for chart visualization - order from Critical to Info
    const severityData = [
      { severity: 'Critical', count: severity_counts.critical || 0, color: '#ff4d4f' },
      { severity: 'High', count: severity_counts.high || 0, color: '#fa8c16' },
      { severity: 'Medium', count: severity_counts.medium || 0, color: '#faad14' },
      { severity: 'Low', count: severity_counts.low || 0, color: '#52c41a' },
      { severity: 'Info', count: severity_counts.info || 0, color: '#1890ff' }
    ];
    
    return (
      <div>
        <div className="mb-4">
          <Title level={5}>Vulnerability Distribution</Title>
          <div className="grid grid-cols-5 gap-2 mt-2">
            {severityData.map(item => (
              <div key={item.severity} className="flex flex-col items-center">
                <Text strong>{item.severity}</Text>
                <div className="text-2xl font-bold" style={{ color: item.color }}>{item.count}</div>
                {totalVulnerabilities > 0 && (
                  <Progress 
                    percent={Math.round((item.count / totalVulnerabilities) * 100)} 
                    strokeColor={item.color}
                    showInfo={false}
                    size="small"
                    style={{ width: '100%' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        
        <Divider orientation="left">Hosts Summary</Divider>
        
        {renderHostsTable()}
      </div>
    );
  };

  // Render hosts table with vulnerability counts
  const renderHostsTable = () => {
    if (!vulnerabilityData || !vulnerabilityData.hosts || vulnerabilityData.hosts.length === 0) {
      return <Alert message="No host data available" type="info" />;
    }
    
    const hostColumns = [
      {
        title: 'Hostname',
        dataIndex: 'hostname',
        key: 'hostname',
      },
      {
        title: 'IP Address',
        dataIndex: 'ip',
        key: 'ip',
      },
      {
        title: 'Critical',
        dataIndex: 'critical',
        key: 'critical',
        render: val => (val > 0 ? <Tag color="red">{val}</Tag> : val),
        sorter: (a, b) => b.critical - a.critical,
        defaultSortOrder: 'descend'
      },
      {
        title: 'High',
        dataIndex: 'high',
        key: 'high',
        render: val => (val > 0 ? <Tag color="orange">{val}</Tag> : val)
      },
      {
        title: 'Medium',
        dataIndex: 'medium',
        key: 'medium',
        render: val => (val > 0 ? <Tag color="gold">{val}</Tag> : val)
      },
      {
        title: 'Low',
        dataIndex: 'low',
        key: 'low',
        render: val => (val > 0 ? <Tag color="green">{val}</Tag> : val)
      },
      {
        title: 'Info',
        dataIndex: 'info',
        key: 'info',
        render: val => <Tag color="blue">{val}</Tag>
      }
    ];
    
    return (
      <Table
        columns={hostColumns}
        dataSource={vulnerabilityData.hosts.map((host, index) => ({ ...host, key: index }))}
        pagination={false}
        size="small"
      />
    );
  };

  // Render detailed vulnerabilities
  const renderVulnerabilityDetails = () => {
    if (!vulnerabilityData || !vulnerabilityData.hosts) {
      return <Alert message="No vulnerability details available" type="info" />;
    }
    
    return (
      <Collapse defaultActiveKey={vulnerabilityData.hosts.length > 0 ? [0] : []}>
        {vulnerabilityData.hosts.map((host, hostIndex) => (
          <Panel 
            header={
              <Space>
                <Text strong>{host.hostname || host.ip}</Text>
                {getSeverityTag('Critical', host.critical)}
                {getSeverityTag('High', host.high)}
              </Space>
            }
            key={hostIndex}
          >
            <Text strong>Operating System:</Text> {host.os || 'Unknown'}
            
            <Divider orientation="left">Vulnerabilities</Divider>
            
            <Table
              dataSource={
                // Sort vulnerabilities by severity (highest first) and filter out Info severity (0)
                [...host.vulnerabilities]
                  .filter(vuln => vuln.severity > 0)  // Only include Low and above (exclude Info which is 0)
                  .sort((a, b) => b.severity - a.severity)
                  .map((vuln, idx) => ({ ...vuln, key: idx }))
              }
              columns={[
                {
                  title: 'Vulnerability',
                  dataIndex: 'plugin_name',
                  key: 'plugin_name',
                  render: (text, record) => (
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Text strong>{text}</Text>
                      <Text type="secondary">Plugin ID: {record.plugin_id}</Text>
                    </Space>
                  )
                },
                {
                  title: 'Severity',
                  dataIndex: 'severity_name',
                  key: 'severity_name',
                  width: 120,
                  sorter: (a, b) => b.severity - a.severity,
                  defaultSortOrder: 'descend',
                  render: (text, record) => getSeverityTag(text)
                },
                {
                  title: 'Count',
                  dataIndex: 'count',
                  key: 'count',
                  width: 80,
                  align: 'center'
                }
              ]}
              expandable={{
                expandedRowRender: (record) => {
                  const details = pluginDetails[`${host.id}-${record.plugin_id}`];
                  
                  if (!details) {
                    return <Spin size="small" />;
                  }
                  
                  return (
                    <div className="p-2">
                      {details.synopsis && (
                        <div className="mb-3">
                          <Text strong>Synopsis:</Text>
                          <Paragraph>{details.synopsis}</Paragraph>
                        </div>
                      )}
                      
                      {details.solution && (
                        <div>
                          <Text strong>Solution:</Text>
                          <Paragraph>{details.solution}</Paragraph>
                        </div>
                      )}
                      
                      {details.description && (
                        <Collapse ghost>
                          <Panel header="Description" key="1">
                            <Paragraph>{details.description}</Paragraph>
                          </Panel>
                        </Collapse>
                      )}
                    </div>
                  );
                },
                onExpand: async (expanded, record) => {
                  const detailKey = `${host.id}-${record.plugin_id}`;
                  
                  if (expanded && !pluginDetails[detailKey]) {
                    // Fetch plugin details when expanding a row
                    const details = await fetchPluginDetails(vulnerabilityData.id, host.id, record.plugin_id);
                    if (details) {
                      setPluginDetails(prev => ({
                        ...prev,
                        [detailKey]: details
                      }));
                    }
                  }
                  
                  setExpandedRows(prev => ({
                    ...prev,
                    [record.key]: expanded
                  }));
                },
                expandedRowKeys: Object.keys(expandedRows).filter(key => expandedRows[key])
                  .map(key => parseInt(key))
              }}
              pagination={false}
              size="small"
            />
          </Panel>
        ))}
      </Collapse>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <BugOutlined />
          Internal Scan Details: {scan?.name}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        scan?.status === 'completed' && (
          <Button
            key="download"
            type="primary"
            icon={downloadLoading ? <LoadingOutlined spin /> : <DownloadOutlined />}
            onClick={() => onDownload(scan)}
            loading={downloadLoading}
          >
            Download Report
          </Button>
        )
      ]}
      width={800}
    >
      {loading ? (
        <div className="flex justify-center items-center p-10">
          <Spin size="large" />
        </div>
      ) : (
        <div>
          {renderScanOverview()}
          
          <Tabs 
            activeKey={activeTabKey} 
            onChange={setActiveTabKey}
            items={[
              {
                key: "summary",
                label: (
                  <span>
                    <BarChartOutlined />
                    Summary
                  </span>
                ),
                children: renderVulnerabilitySummary()
              },
              {
                key: "vulnerabilities",
                label: (
                  <span>
                    <BugOutlined />
                    Vulnerabilities
                  </span>
                ),
                children: renderVulnerabilityDetails()
              }
            ]}
          />
        </div>
      )}
    </Modal>
  );
};

export default InternalScanVulDetailsModal; 