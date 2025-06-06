import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Layout, Space, Tag, Typography, message, Tooltip, Tabs, Input, Collapse, Modal } from 'antd';
import { PlayCircleOutlined, DownloadOutlined, DeleteOutlined, BugOutlined, StopOutlined, CopyOutlined } from '@ant-design/icons';
import nessusService from '../services/nessusService';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import InternalScanVulDetailsModal from './InternalScanVulDetailsModal';

const { Title } = Typography;
const { Header, Content } = Layout;
const { TabPane } = Tabs;
const { Panel } = Collapse;

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
  const [scanStatusLoading, setScanStatusLoading] = useState({});
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const username = localStorage.getItem('username') || 'HOSTNAME';

  // Add periodic scan state refresh every 10 minutes
  useEffect(() => {
    const fetchAllScanStates = async () => {
      try {
        const isExternal = activeTab === 'external';
        const updatedStates = {};
        
        for (const server of servers) {
          try {
            if (isExternal) {
              const externalScans = await nessusService.getExternalScans();
              const serverExternalScan = externalScans.find(scan => scan.name === server.name);
              if (serverExternalScan) {
                updatedStates[server.name] = {
                  scanId: serverExternalScan.id,
                  status: serverExternalScan.status,
                  progress: 0,
                  startTime: serverExternalScan.start_time,
                  endTime: serverExternalScan.end_time,
                  hosts: serverExternalScan.hosts
                };
              }
            } else {
              const internalScan = await nessusService.findScanByServerName(server.name);
              if (internalScan) {
                const status = await nessusService.getScanStatus(internalScan.id);
                updatedStates[server.name] = {
                  scanId: internalScan.id,
                  status: status.status,
                  progress: status.progress || 0
                };
              }
            }
          } catch (error) {
            console.error(`Error fetching scan state for ${server.name}:`, error);
          }
        }

        if (isExternal) {
          setExternalScanStates(prev => ({
            ...prev,
            ...updatedStates
          }));
        } else {
          setInternalScanStates(prev => ({
            ...prev,
            ...updatedStates
          }));
        }
      } catch (error) {
        console.error('Error fetching all scan states:', error);
      }
    };

    // Initial fetch
    if (servers.length > 0) {
      fetchAllScanStates();
    }

    // Set up 10-minute interval
    const intervalId = setInterval(fetchAllScanStates, 10 * 60 * 1000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [servers, activeTab]);

  // Initialize loading state for all servers when servers list changes
  useEffect(() => {
    const initialLoadingState = {};
    servers.forEach(server => {
      initialLoadingState[server.name] = true;
    });
    setScanStatusLoading(initialLoadingState);
  }, [servers]);

  // Fetch initial scan states when component mounts
  useEffect(() => {
    const fetchInitialScanStates = async () => {
      try {
        const isExternal = activeTab === 'external';
        const updatedStates = {};
        
        for (const server of servers) {
          try {
            if (isExternal) {
              // Only fetch external scan state for external tab
              const externalScans = await nessusService.getExternalScans();
              const serverExternalScan = externalScans.find(scan => scan.name === server.name);
              if (serverExternalScan) {
                updatedStates[server.name] = {
                  scanId: serverExternalScan.id,
                  status: serverExternalScan.status,
                  progress: 0,
                  startTime: serverExternalScan.start_time,
                  endTime: serverExternalScan.end_time,
                  hosts: serverExternalScan.hosts
                };
              }
            } else {
              // Only fetch internal scan state for internal tab
              const internalScan = await nessusService.findScanByServerName(server.name);
              if (internalScan) {
                const status = await nessusService.getScanStatus(internalScan.id);
                updatedStates[server.name] = {
                  scanId: internalScan.id,
                  status: status.status,
                  progress: status.progress || 0
                };
              }
            }

            // Update states and loading for this server immediately
            if (isExternal) {
              setExternalScanStates(prev => ({
                ...prev,
                [server.name]: updatedStates[server.name]
              }));
            } else {
              setInternalScanStates(prev => ({
                ...prev,
                [server.name]: updatedStates[server.name]
              }));
            }
            setScanStatusLoading(prev => ({
              ...prev,
              [server.name]: false
            }));
          } catch (error) {
            console.error(`Error fetching scan state for ${server.name}:`, error);
            setScanStatusLoading(prev => ({
              ...prev,
              [server.name]: false
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching initial scan states:', error);
      }
    };

    if (servers.length > 0) {
      fetchInitialScanStates();
    }
  }, [servers, activeTab]);

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
          const isLoading = scanStatusLoading[record.name];
          
          if (isLoading) {
            return <Tag>Loading...</Tag>;
          }
          
          if (!scanState) {
            return <Tag>No Scan</Tag>;
          }
          
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
          const isLoading = scanStatusLoading[record.name];
          
          if (isLoading) {
            return <Tag>Loading...</Tag>;
          }
          
          if (!scanState) {
            return <Tag>No Scan</Tag>;
          }
          
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
      <Content style={{ padding: '24px' }}>
        <Collapse 
          defaultActiveKey={['0']} 
          style={{ marginBottom: '24px' }}
        >
          <Panel 
            header="Nessus Agent Linking Key" 
            key="1"
          >
            <Input.TextArea
              value={`/opt/nessus_agent/sbin/nessuscli agent link --groups="${username}" --key=9b27d71431466e0690e093c449ec5f803a7eb85a0c99de7ef448da8682d2b6c4 --host=isosrvutn00.utep.edu --port=8834`}
              readOnly
              autoSize={{ minRows: 2, maxRows: 4 }}
              style={{ fontFamily: 'monospace' }}
            />
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography.Text type="secondary">
                Your username is automatically included in the linking key
              </Typography.Text>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button 
                  icon={<CopyOutlined />} 
                  onClick={handleCopyKey}
                  type={copySuccess ? 'primary' : 'default'}
                >
                  {copySuccess ? 'Copied!' : 'Copy'}
                </Button>
                <Button type="primary" onClick={() => setSetupModalVisible(true)}>
                  Setup Instructions
                </Button>
              </div>
            </div>
          </Panel>
        </Collapse>

        <Modal
          title="Agent Setup Instructions"
          visible={setupModalVisible}
          onCancel={() => setSetupModalVisible(false)}
          footer={null}
        >
          <ol style={{ paddingLeft: 20 }}>
            <li style={{ marginBottom: 12 }}>
              Get an installer from the{' '}
              <a href="https://www.tenable.com/downloads/nessus-agents?loginAttempted=true" target="_blank" rel="noopener noreferrer">
                Nessus Agent Download page
              </a>.
            </li>
            <li style={{ marginBottom: 12 }}>
              Install the agent on your targets manually, via Group Policy, SCCM, or other third-party software deployment application.
            </li>
            <li style={{ marginBottom: 12 }}>
              During installation, use the following options to link to this manager:
              <pre style={{ background: '#f5f5f5', padding: 10, borderRadius: 4, marginTop: 8 }}>
--host=&lt;host&gt;
--port=&lt;port&gt;
--key=9b27d71431466e0690e093c449ec5f803a7eb85a0c99de7ef448da8682d2b6c4
              </pre>
            </li>
          </ol>
          <div style={{ textAlign: 'right' }}>
            <Button onClick={() => setSetupModalVisible(false)}>
              Close
            </Button>
          </div>
        </Modal>

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
          servers={servers}
        />
      </Content>
    </Layout>
  );
};

export default Dashboard;