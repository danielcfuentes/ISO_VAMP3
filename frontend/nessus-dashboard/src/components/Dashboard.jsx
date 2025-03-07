import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Layout, Space, Tag, Typography, Card, message, Tooltip, Progress } from 'antd';
import { PlayCircleOutlined, LoadingOutlined, CheckCircleOutlined, DownloadOutlined, DeleteOutlined } from '@ant-design/icons';
import nessusService from '../services/nessusService';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import LaunchScanModal from './LaunchScanModal';

const { Title } = Typography;
const { Header, Content } = Layout;

const Dashboard = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedServerToDelete, setSelectedServerToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState({});
  const [scanStates, setScanStates] = useState({});
  const [activePollingJobs, setActivePollingJobs] = useState(new Set());
  const [statusCheckIntervals, setStatusCheckIntervals] = useState({});
  const [downloadLoading, setDownloadLoading] = useState({});

    // Fetch initial scan states when component mounts
    useEffect(() => {
      const fetchInitialScanStates = async () => {
        try {
          const updatedStates = {};
          for (const server of servers) {
            const scan = await nessusService.findScanByServerName(server.name);
            if (scan) {
              const status = await nessusService.getScanStatus(scan.id);
              updatedStates[server.name] = {
                scanId: scan.id,
                status: status.status,
                progress: status.progress || 0
              };
            }
          }
          setScanStates(updatedStates);
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
        if (scanStates[server.name]?.scanId) {
          await checkScanStatus(
            scanStates[server.name].scanId,
            server.name
          );
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
    try {
      setDeleteLoading(true);
      const agentGroups = await nessusService.getAgentGroups();
      
      if (agentGroups && agentGroups.id && selectedServerToDelete) {
        await nessusService.removeAgent(
          agentGroups.id,
          selectedServerToDelete.key
        );
        
        message.success(`Successfully removed ${selectedServerToDelete.name}`);
        setDeleteModalVisible(false);
        fetchServers();
      }
    } catch (error) {
      console.error('Error removing agent:', error);
      message.error('Failed to remove agent');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownloadReport = async (server) => {
    try {
      setDownloadLoading(prev => ({ ...prev, [server.name]: true }));
      
      // Check if there's a completed scan for this server
      const scanState = scanStates[server.name];
      if (!scanState || scanState.status !== 'completed') {
        message.warning('No completed scan available for download');
        return;
      }
      
      // Download the report
      const blob = await nessusService.downloadReport(server.name);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `nessus_report_${server.name}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      
      // Trigger download and cleanup
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      message.success(`Report for ${server.name} downloaded successfully`);
    } catch (error) {
      console.error('Error downloading report:', error);
      message.error(`Failed to download report: ${error.message}`);
    } finally {
      setDownloadLoading(prev => ({ ...prev, [server.name]: false }));
    }
  };

  const handleScanClick = async (server) => {
    try {
      // Clear any existing interval for this server
      if (statusCheckIntervals[server.name]) {
        clearInterval(statusCheckIntervals[server.name]);
      }

      setScanStates(prev => ({
        ...prev,
        [server.name]: { status: 'starting' }
      }));

      const result = await nessusService.launchAndMonitorScan(server.name);
      
      if (result.scanId) {
        setScanStates(prev => ({
          ...prev,
          [server.name]: { 
            scanId: result.scanId,
            status: 'pending'
          }
        }));

        // Start immediate status checking
        await checkScanStatus(result.scanId, server.name);
        message.success(`Scan launched for ${server.name}`);
      }
    } catch (error) {
      console.error('Error launching scan:', error);
      message.error(`Failed to launch scan: ${error.message}`);
      setScanStates(prev => ({
        ...prev,
        [server.name]: null
      }));
    }
  };

 
  // Simplified action button without progress and tooltip
  const getScanActionButton = (record) => {
    const scanState = scanStates[record.name];
    
    if (!scanState || scanState.status === 'completed') {
      return (
        <Button
          type="text"
          icon={<PlayCircleOutlined />}
          onClick={() => handleScanClick(record)}
          disabled={record.status !== 'online'}
          title="Launch Scan"
        />
      );
    }

    if (['starting', 'pending', 'running'].includes(scanState.status)) {
      return (
        <Button
          type="text"
          icon={<LoadingOutlined spin />}
          disabled
        />
      );
    }

    // Default state
    return (
      <Button
        type="text"
        icon={<PlayCircleOutlined />}
        onClick={() => handleScanClick(record)}
        disabled={record.status !== 'online'}
      />
    );
  };

 
  // Enhanced status checking function with more frequent initial checks

  const checkScanStatus = useCallback(async (scanId, serverName) => {
    try {
      const status = await nessusService.getScanStatus(scanId);
      const currentState = scanStates[serverName]?.status;
      
      console.log(`Status check for ${serverName}:`, { 
        currentState, 
        newStatus: status.status 
      });

      // Update state if changed
      if (status.status !== currentState) {
        console.log(`Status changed for ${serverName}: ${currentState} -> ${status.status}`);
        setScanStates(prev => ({
          ...prev,
          [serverName]: {
            scanId,
            status: status.status
          }
        }));
      }

      // Determine polling interval based on status
      let nextInterval;
      switch (status.status) {
        case 'pending':
          nextInterval = 3000; // Check every 3 seconds while pending
          break;
        case 'running':
          nextInterval = 10000; // Check every 10 seconds while running
          break;
        case 'completed':
          // Clear interval and update state
          if (statusCheckIntervals[serverName]) {
            clearInterval(statusCheckIntervals[serverName]);
            setStatusCheckIntervals(prev => {
              const newIntervals = { ...prev };
              delete newIntervals[serverName];
              return newIntervals;
            });
          }
          return;
        default:
          nextInterval = 30000; // Default to 30 seconds
      }

      // Set up new interval if needed
      if (!statusCheckIntervals[serverName]) {
        const intervalId = setInterval(
          () => checkScanStatus(scanId, serverName), 
          nextInterval
        );
        setStatusCheckIntervals(prev => ({
          ...prev,
          [serverName]: intervalId
        }));
      }
    } catch (error) {
      console.error('Error checking scan status:', error);
    }
  }, [scanStates, statusCheckIntervals]);


  const columns = [
    {
      title: 'Server Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Agent Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'online' ? 'success' : 'error'}>
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
      title: 'Last Plugin Update',
      dataIndex: 'lastPluginUpdate',
      key: 'lastPluginUpdate',
      render: (text) => (
        <span className={text === 'Invalid Date' ? 'text-red-500' : ''}>
          {text}
        </span>
      ),
    },
    {
      title: 'Last Scan',
      dataIndex: 'lastScan',
      key: 'lastScan',
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
          <Tooltip title="Download Report">
            <Button 
              type="text"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadReport(record)}
              loading={downloadLoading[record.name]}
              disabled={!scanStates[record.name] || scanStates[record.name].status !== 'completed'}
            />
          </Tooltip>
          {getScanActionButton(record)}
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteClick(record)}
            title="Remove Agent"
          />
        </Space>
      ),
    },
  ];
  return (
    <Layout className="min-h-screen bg-gray-100">
      <Header className="bg-white px-6 flex items-center shadow">
        <Title level={3} className="m-0 text-blue-600">
          Nessus Manager Dashboard
        </Title>
      </Header>
      
      <Content className="p-6">
        <Card className="rounded-lg shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <Title level={4} className="m-0">Server List</Title>
          </div>

          <Table
            columns={columns}
            dataSource={servers}
            pagination={false}
            loading={loading}
            className="bg-white rounded-lg"
          />
        </Card>
      </Content>

      <DeleteConfirmationModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        onConfirm={handleDeleteConfirm}
        serverName={selectedServerToDelete?.name}
        loading={deleteLoading}
      />
    </Layout>
  );
};

export default Dashboard;