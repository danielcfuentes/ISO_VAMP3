import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Layout, Space, Tag, Typography, Card, message, Tooltip, Tabs, Input } from 'antd';
import { PlayCircleOutlined, DownloadOutlined, DeleteOutlined, BugOutlined, StopOutlined, CopyOutlined } from '@ant-design/icons';
import nessusService from '../services/nessusService';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import InternalScanVulDetailsModal from './InternalScanVulDetailsModal';

const { Title } = Typography;
const { Header, Content } = Layout;
const { TabPane } = Tabs;

const Dashboard = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedServerToDelete, setSelectedServerToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [internalScanStates, setInternalScanStates] = useState({});
  const [externalScanStates, setExternalScanStates] = useState({});
  const [statusCheckIntervals, setStatusCheckIntervals] = useState({});
  const [downloadLoading, setDownloadLoading] = useState({});
  const [vulModalVisible, setVulModalVisible] = useState(false);
  const [selectedScanForVul, setSelectedScanForVul] = useState(null);
  const [activeTab, setActiveTab] = useState('internal');
  const [copySuccess, setCopySuccess] = useState(false);
  const username = localStorage.getItem('username') || 'HOSTNAME';

  // Fetch initial scan states when component mounts
  useEffect(() => {
    const fetchInitialScanStates = async () => {
      try {
        const updatedInternalStates = {};
        const updatedExternalStates = {};
        
        for (const server of servers) {
          // Fetch internal scan state
          const internalScan = await nessusService.findScanByServerName(server.name);
          if (internalScan) {
            const status = await nessusService.getScanStatus(internalScan.id);
            updatedInternalStates[server.name] = {
              scanId: internalScan.id,
              status: status.status,
              progress: status.progress || 0
            };
          }

          // Fetch external scan state (new separate handling)
          const externalScans = await nessusService.getExternalScans();
          const serverExternalScan = externalScans.find(scan => scan.name === server.name);
          if (serverExternalScan) {
            updatedExternalStates[server.name] = {
              scanId: serverExternalScan.id,
              status: serverExternalScan.status,
              progress: 0,
              startTime: serverExternalScan.start_time,
              endTime: serverExternalScan.end_time,
              hosts: serverExternalScan.hosts
            };
          }
        }
        
        setInternalScanStates(updatedInternalStates);
        setExternalScanStates(updatedExternalStates);
      } catch (error) {
        console.error('Error fetching initial scan states:', error);
      }
    };

    if (servers.length > 0) {
      fetchInitialScanStates();
    }
  }, [servers]);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(statusCheckIntervals).forEach(intervalId => {
        clearInterval(intervalId);
      });
    };
  }, [statusCheckIntervals]);

  // Initial status check on component mount for any existing scans
  useEffect(() => {
    const checkExistingScans = async () => {
      for (const server of servers) { 
        if (internalScanStates[server.name]?.scanId) {
          const status = await nessusService.getScanStatus(internalScanStates[server.name].scanId);
          setInternalScanStates(prev => ({
            ...prev,
            [server.name]: {
              ...prev[server.name],
              status: status.status,
              progress: status.progress || 0
            }
          }));
        }

        if (externalScanStates[server.name]?.scanId) {
          const externalScans = await nessusService.getExternalScans();
          const serverExternalScan = externalScans.find(scan => scan.name === server.name);
          if (serverExternalScan) {
            setExternalScanStates(prev => ({
              ...prev,
              [server.name]: {
                ...prev[server.name],
                status: serverExternalScan.status,
                startTime: serverExternalScan.start_time,
                endTime: serverExternalScan.end_time,
                hosts: serverExternalScan.hosts
              }
            }));
          }
        }
      }
    };

    checkExistingScans();
  }, [servers]);

  // Helper function to format Unix timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Never';
    try {
      // Check if timestamp is in seconds (Nessus API) or milliseconds
      const timestampMs = timestamp.toString().length === 10 ? timestamp * 1000 : timestamp;
      const date = new Date(timestampMs);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatPluginDate = (pluginFeedId) => {
    if (!pluginFeedId) return 'Never';
    try {
      // Convert plugin feed ID (YYYYMMDDHHMI) to readable format
      const str = pluginFeedId.toString();
      if (str.length !== 12) return 'Invalid Format';
  
      const year = str.substring(0, 4);
      const month = str.substring(4, 6);
      const day = str.substring(6, 8);
      const hour = str.substring(8, 10);
      const minute = str.substring(10, 12);
  
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1, // months are 0-based
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );
  
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting plugin date:', error);
      return 'Invalid Date';
    }
  };

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      const agentGroups = await nessusService.getAgentGroups();
      
      if (agentGroups && agentGroups.id) {
        const groupDetails = await nessusService.getGroupDetails(agentGroups.id);
        
        if (groupDetails && groupDetails.agents) {
          const formattedServers = groupDetails.agents.map(agent => ({
            key: agent.id,
            name: agent.name || 'Unknown',
            status: agent.status?.toLowerCase() || 'unknown',
            ipAddress: agent.ip || 'Unknown',
            lastPluginUpdate: formatPluginDate(agent.plugin_feed_id),
            lastScan: formatDate(agent.last_scanned),
            agentVersion: agent.core_version || 'Unknown',
            platform: agent.platform || 'Unknown',
            uuid: agent.uuid
          }));
          
          setServers(formattedServers);
        }
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
      message.error('Failed to fetch servers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleDeleteClick = (server) => {
    setSelectedServerToDelete(server);
    setDeleteModalVisible(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedServerToDelete) return;

    try {
      setDeleteLoading(true);
      await nessusService.deleteServer(selectedServerToDelete.name);
      setServers(servers.filter(s => s.name !== selectedServerToDelete.name));
      setDeleteModalVisible(false);
      setSelectedServerToDelete(null);
      message.success('Server deleted successfully');
    } catch (error) {
      message.error(error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewVulnerabilities = (server) => {
    const isExternal = activeTab === 'external';
    const scanStates = isExternal ? externalScanStates : internalScanStates;
    const scanState = scanStates[server.name];
    
    if (!scanState || scanState.status !== 'completed') {
      message.warning(`No completed ${isExternal ? 'external' : ''} scan available to view`);
      return;
    }
    
    setSelectedScanForVul({
      id: scanState.scanId,
      name: server.name,
      status: scanState.status,
      start_time: scanState.startTime,
      end_time: scanState.endTime
    });
    setVulModalVisible(true);
  };

  const handleDownloadReport = async (server) => {
    try {
      const isExternal = activeTab === 'external';
      const scanStates = isExternal ? externalScanStates : internalScanStates;
      const scanState = scanStates[server.name];
      
      if (!scanState || scanState.status !== 'completed') {
        message.warning(`No completed ${isExternal ? 'external' : ''} scan available for download`);
        return;
      }

      setDownloadLoading(prev => ({ ...prev, [server.name]: true }));
      
      const blob = await (isExternal ? 
        nessusService.downloadExternalScanReport(server.name) : 
        nessusService.downloadInternalScanReport(server.name)
      );
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download', 
        `${isExternal ? 'external' : 'internal'}_scan_${server.name}_${new Date().toISOString().split('T')[0]}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      message.success(`${isExternal ? 'External' : ''} scan report for ${server.name} downloaded successfully`);
    } catch (error) {
      console.error(`Error downloading ${activeTab === 'external' ? 'external' : ''} report:`, error);
      message.error(`Failed to download ${activeTab === 'external' ? 'external' : ''} report: ${error.message}`);
    } finally {
      setDownloadLoading(prev => ({ ...prev, [server.name]: false }));
    }
  };

  const handleScanClick = async (server) => {
    try {
      const isExternal = activeTab === 'external';
      const currentStates = isExternal ? externalScanStates : internalScanStates;
      const setScanStates = isExternal ? setExternalScanStates : setInternalScanStates;

      // Check if a scan is already running
      if (currentStates[server.name]?.status === 'running') {
        message.warning('A scan is already running for this server');
        return;
      }

      // Start the scan
      const scanId = isExternal 
        ? await nessusService.createAndLaunchExternalScan(server.name)
        : await nessusService.createAndLaunchScan(server.name);

      // Update scan state
      setScanStates(prev => ({
        ...prev,
        [server.name]: {
          scanId,
          status: 'running',
          progress: 0
        }
      }));

      // Start status checking
      const intervalId = setInterval(async () => {
        try {
          let status;
          if (isExternal) {
            const externalScans = await nessusService.getExternalScans();
            const serverExternalScan = externalScans.find(scan => scan.name === server.name);
            status = {
              status: serverExternalScan?.status || 'unknown',
              progress: 0
            };
          } else {
            status = await nessusService.getScanStatus(scanId);
          }

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(intervalId);
            setStatusCheckIntervals(prev => {
              const newIntervals = { ...prev };
              delete newIntervals[server.name];
              return newIntervals;
            });
          }

          setScanStates(prev => ({
            ...prev,
            [server.name]: {
              ...prev[server.name],
              status: status.status,
              progress: status.progress || 0
            }
          }));
        } catch (error) {
          console.error('Error checking scan status:', error);
          clearInterval(intervalId);
        }
      }, 5000);

      setStatusCheckIntervals(prev => ({
        ...prev,
        [server.name]: intervalId
      }));

      message.success(`Scan started for ${server.name}`);
    } catch (error) {
      console.error('Error starting scan:', error);
      message.error('Failed to start scan');
    }
  };

  const handleStopScan = async (scanId, serverName) => {
    try {
      const isExternal = activeTab === 'external';
      await (isExternal ? 
        nessusService.stopExternalScan(scanId) : 
        nessusService.stopScan(scanId)
      );
      
      const setScanStates = isExternal ? setExternalScanStates : setInternalScanStates;
      setScanStates(prev => ({
        ...prev,
        [serverName]: {
          ...prev[serverName],
          status: 'canceled'
        }
      }));

      setStatusCheckIntervals(prev => {
        const newIntervals = { ...prev };
        clearInterval(newIntervals[serverName]);
        delete newIntervals[serverName];
        return newIntervals;
      });

      message.success(`${isExternal ? 'External' : ''} scan stopped for ${serverName}`);
    } catch (error) {
      console.error('Error stopping scan:', error);
      message.error(`Failed to stop ${activeTab === 'external' ? 'external' : ''} scan: ${error.message}`);
    }
  };

  const getScanActionButton = (record) => {
    const isExternal = activeTab === 'external';
    const scanStates = isExternal ? externalScanStates : internalScanStates;
    const scanState = scanStates[record.name];

    if (!scanState) {
      return (
        <Tooltip title={`Start ${isExternal ? 'External' : ''} Scan`}>
          <Button
            icon={<PlayCircleOutlined />}
            onClick={() => handleScanClick(record)}
          />
        </Tooltip>
      );
    }

    if (['running', 'pending'].includes(scanState.status)) {
      return (
        <Tooltip title={`Stop ${isExternal ? 'External' : ''} Scan`}>
          <Button
            icon={<StopOutlined />}
            onClick={() => handleStopScan(scanState.scanId, record.name)}
            danger
          />
        </Tooltip>
      );
    }

    return (
      <Tooltip title={`Start ${isExternal ? 'External' : ''} Scan`}>
        <Button
          icon={<PlayCircleOutlined />}
          onClick={() => handleScanClick(record)}
        />
      </Tooltip>
    );
  };

  const getColumns = () => {
    const isExternal = activeTab === 'external';
    const scanStates = isExternal ? externalScanStates : internalScanStates;

    return [
      {
        title: 'Server Name',
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status) => (
          <Tag color={status === 'online' ? 'green' : 'red'}>
            {status.toUpperCase()}
          </Tag>
        ),
      },
      {
        title: 'IP Address',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
      },
      {
        title: 'Last Plugin Update',
        dataIndex: 'lastPluginUpdate',
        key: 'lastPluginUpdate',
      },
      {
        title: 'Last Scan',
        dataIndex: 'lastScan',
        key: 'lastScan',
      },
      {
        title: 'Agent Version',
        dataIndex: 'agentVersion',
        key: 'agentVersion',
      },
      {
        title: 'Platform',
        dataIndex: 'platform',
        key: 'platform',
      },
      {
        title: 'Scan Status',
        key: 'scanStatus',
        render: (_, record) => {
          const scanState = scanStates[record.name];
          
          if (!scanState) return <Tag>No Scan</Tag>;
          
          const statusColors = {
            running: 'processing',
            completed: 'success',
            starting: 'warning',
            pending: 'warning',
            canceled: 'default',
            failed: 'error'
          };

          return (
            <Tag color={statusColors[scanState.status] || 'default'}>
              {scanState.status?.toUpperCase()} {scanState.progress > 0 && `(${scanState.progress}%)`}
            </Tag>
          );
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Space size="middle">
            {getScanActionButton(record)}
            <Tooltip title="View Vulnerabilities">
              <Button
                icon={<BugOutlined />}
                onClick={() => handleViewVulnerabilities(record)}
                disabled={!scanStates[record.name] || scanStates[record.name].status !== 'completed'}
              />
            </Tooltip>
            <Tooltip title="Download Report">
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadReport(record)}
                loading={downloadLoading[record.name]}
                disabled={!scanStates[record.name] || scanStates[record.name].status !== 'completed'}
              />
            </Tooltip>
            <Tooltip title="Delete Server">
              <Button
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteClick(record)}
                danger
              />
            </Tooltip>
          </Space>
        ),
      },
    ];
  };

  const getExternalColumns = () => {
    return [
      {
        title: 'Server Name',
        dataIndex: 'name',
        key: 'name',
        sorter: (a, b) => a.name.localeCompare(b.name),
      },
      {
        title: 'IP Address',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
      },
      {
        title: 'Last Scan',
        key: 'lastScan',
        render: (_, record) => {
          const scanState = externalScanStates[record.name];
          return scanState?.startTime ? formatDate(scanState.startTime) : 'Never';
        },
      },
      {
        title: 'Scan Status',
        key: 'scanStatus',
        render: (_, record) => {
          const scanState = externalScanStates[record.name];
          
          if (!scanState) return <Tag>No Scan</Tag>;
          
          const statusColors = {
            running: 'processing',
            completed: 'success',
            starting: 'warning',
            pending: 'warning',
            canceled: 'default',
            failed: 'error'
          };

          return (
            <Tag color={statusColors[scanState.status] || 'default'}>
              {scanState.status?.toUpperCase()}
            </Tag>
          );
        },
      },
      {
        title: 'Vulnerabilities',
        key: 'vulnerabilities',
        render: (_, record) => {
          const scanState = externalScanStates[record.name];
          if (!scanState?.hosts?.length) return '-';
          
          const host = scanState.hosts[0];
          return (
            <Space>
              {host.critical > 0 && <Tag color="red">{host.critical} Critical</Tag>}
              {host.high > 0 && <Tag color="orange">{host.high} High</Tag>}
              {host.medium > 0 && <Tag color="gold">{host.medium} Medium</Tag>}
              {host.low > 0 && <Tag color="blue">{host.low} Low</Tag>}
              {host.info > 0 && <Tag color="default">{host.info} Info</Tag>}
            </Space>
          );
        },
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (_, record) => (
          <Space size="middle">
            {getScanActionButton(record)}
            <Tooltip title="View Vulnerabilities">
              <Button
                icon={<BugOutlined />}
                onClick={() => handleViewVulnerabilities(record)}
                disabled={!externalScanStates[record.name] || externalScanStates[record.name].status !== 'completed'}
              />
            </Tooltip>
            <Tooltip title="Download Report">
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadReport(record)}
                loading={downloadLoading[record.name]}
                disabled={!externalScanStates[record.name] || externalScanStates[record.name].status !== 'completed'}
              />
            </Tooltip>
            <Tooltip title="Delete Server">
              <Button
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteClick(record)}
                danger
              />
            </Tooltip>
          </Space>
        ),
      },
    ];
  };

  const handleCopyKey = () => {
    const linkingKey = `/opt/nessus_agent/sbin/nessuscli agent link --groups="${username}" --key=9b27d71431466e0690e093c449ec5f803a7eb85a0c99de7ef448da8682d2b6c4 --host=isosrvutn00.utep.edu --port=8834`;
    navigator.clipboard.writeText(linkingKey);
    setCopySuccess(true);
    message.success('Linking key copied to clipboard!');
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 24px' }}>
        <Title level={2} style={{ margin: '16px 0' }}>Nessus Dashboard</Title>
      </Header>
      <Content style={{ padding: '24px' }}>
        <Card 
          title="Nessus Agent Linking Key" 
          style={{ marginBottom: '24px' }}
          extra={
            <Button 
              icon={<CopyOutlined />} 
              onClick={handleCopyKey}
              type={copySuccess ? 'primary' : 'default'}
            >
              {copySuccess ? 'Copied!' : 'Copy'}
            </Button>
          }
        >
          <Input.TextArea
            value={`/opt/nessus_agent/sbin/nessuscli agent link --groups="${username}" --key=9b27d71431466e0690e093c449ec5f803a7eb85a0c99de7ef448da8682d2b6c4 --host=isosrvutn00.utep.edu --port=8834`}
            readOnly
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{ fontFamily: 'monospace' }}
          />
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
            Your username is automatically included in the linking key
          </Typography.Text>
        </Card>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          type="card"
          style={{ 
            '& .ant-tabs-tab.ant-tabs-tab-active': { 
              backgroundColor: '#FF7300',
              borderColor: '#FF7300'
            }
          }}
        >
          <TabPane tab="Internal Scans" key="internal">
            <Table
              columns={getColumns()}
              dataSource={servers}
              loading={loading}
              pagination={{ pageSize: 10 }}
              rowKey="key"
            />
          </TabPane>
          <TabPane tab="External Scans" key="external">
            <Table
              columns={getExternalColumns()}
              dataSource={servers}
              loading={loading}
              pagination={{ pageSize: 10 }}
              rowKey="key"
            />
          </TabPane>
        </Tabs>

        <DeleteConfirmationModal
          visible={deleteModalVisible}
          onClose={() => setDeleteModalVisible(false)}
          onConfirm={handleDeleteConfirm}
          loading={deleteLoading}
          serverName={selectedServerToDelete?.name}
        />

        <InternalScanVulDetailsModal
          visible={vulModalVisible}
          scan={selectedScanForVul}
          onClose={() => setVulModalVisible(false)}
          onDownload={handleDownloadReport}
          downloadLoading={downloadLoading[selectedScanForVul?.name]}
          isExternal={activeTab === 'external'}
        />
      </Content>
    </Layout>
  );
};

export default Dashboard;