import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Table, Tag, Space, Button, Card, message, Spin, Alert, Modal, List } from 'antd';
import { DownOutlined, UpOutlined, BugOutlined } from '@ant-design/icons';
import nessusService from '../services/nessusService';

const ScanHistoryTab = ({ serverName, isExternal }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [vulnerabilities, setVulnerabilities] = useState({});
  const [loadingVulns, setLoadingVulns] = useState({});
  const [vulnModalVisible, setVulnModalVisible] = useState(false);
  const [selectedVulns, setSelectedVulns] = useState([]);
  const [selectedSeverity, setSelectedSeverity] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        console.log('Scan History Debug: Fetching history for', { serverName, isExternal });
        setLoading(true);
        const data = isExternal 
          ? await nessusService.getExternalScanHistory(serverName)
          : await nessusService.getScanHistory(serverName);

        console.log('Scan History Debug: API Response', data);

        if (!data || !data.history) {
          console.warn('Scan History Debug: No history data received');
          setHistory([]);
        } else {
          setHistory(data.history);
        }
      } catch (error) {
        console.error('Scan History Debug: Error', error.message);
        message.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (serverName) {
      fetchHistory();
    }
  }, [serverName, isExternal]);

  const handleExpand = async (expanded, record) => {
    if (expanded) {
      setExpandedRows([record.key]);
      // Fetch vulnerabilities when expanding
      await fetchVulnerabilities(record);
    } else {
      setExpandedRows([]);
    }
  };

  const fetchVulnerabilities = async (record) => {
    try {
      setLoadingVulns(prev => ({ ...prev, [record.key]: true }));
      const data = isExternal
        ? await nessusService.getExternalScanVulnerabilities(record.scan_name)
        : await nessusService.getInternalScanVulnerabilities(record.scan_name);
      
      setVulnerabilities(prev => ({
        ...prev,
        [record.key]: data
      }));
    } catch (error) {
      console.error('Error fetching vulnerabilities:', error);
      message.error('Failed to fetch vulnerabilities');
    } finally {
      setLoadingVulns(prev => ({ ...prev, [record.key]: false }));
    }
  };

  const handleVulnClick = (host, severity) => {
    // Get the vulnerabilities for this host from the scan data
    const scanVulns = vulnerabilities[expandedRows[0]]?.hosts?.find(h => 
      (h.hostname === host.hostname || h.ip === host.ip)
    )?.vulnerabilities || [];

    // Filter vulnerabilities by severity_name and ensure we have the required fields
    const filteredVulns = scanVulns
      .filter(v => v.severity_name?.toLowerCase() === severity)
      .map(v => ({
        name: v.plugin_name || 'Unknown',
        plugin_id: v.plugin_id || 'Unknown',
        description: v.description || 'No description available',
        solution: v.solution || 'No solution available',
        cvss_score: v.cvss_score || 'N/A',
        cvss_vector: v.cvss_vector || 'N/A',
        risk_factor: v.severity_name || 'N/A',
        count: v.count || 1
      }));
    
    setSelectedVulns(filteredVulns);
    setSelectedSeverity(severity);
    setVulnModalVisible(true);
  };

  const renderVulnerabilityModal = () => {
    return (
      <Modal
        title={`${selectedSeverity.toUpperCase()} Vulnerabilities`}
        open={vulnModalVisible}
        onCancel={() => setVulnModalVisible(false)}
        footer={null}
        width={800}
      >
        {selectedVulns.length > 0 ? (
          <List
            dataSource={selectedVulns}
            renderItem={(vuln) => (
              <List.Item>
                <Card size="small" style={{ width: '100%' }}>
                  <div>
                    <strong>Name:</strong> {vuln.name}
                  </div>
                  <div>
                    <strong>Plugin ID:</strong> {vuln.plugin_id}
                  </div>
                  <div>
                    <strong>Count:</strong> {vuln.count}
                  </div>
                  <div>
                    <strong>Description:</strong> {vuln.description}
                  </div>
                  <div>
                    <strong>Solution:</strong> {vuln.solution}
                  </div>
                  <div>
                    <strong>CVSS Score:</strong> {vuln.cvss_score}
                  </div>
                  <div>
                    <strong>CVSS Vector:</strong> {vuln.cvss_vector}
                  </div>
                  <div>
                    <strong>Risk Factor:</strong> {vuln.risk_factor}
                  </div>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Alert
            message="No vulnerabilities found"
            description="There are no vulnerabilities of this severity level for this host."
            type="info"
            showIcon
          />
        )}
      </Modal>
    );
  };

  const columns = [
    {
      title: 'Scan Name',
      dataIndex: 'scan_name',
      key: 'scan_name',
      render: (text) => <span>{text}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusColors = {
          completed: 'success',
          running: 'processing',
          failed: 'error',
          canceled: 'warning',
          pending: 'default'
        };
        return (
          <Tag color={statusColors[status] || 'default'}>
            {status?.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Start Time',
      dataIndex: 'starttime',
      key: 'starttime',
      render: (text) => <span>{text || 'N/A'}</span>,
    },
    {
      title: 'End Time',
      dataIndex: 'endtime',
      key: 'endtime',
      render: (text) => <span>{text || 'N/A'}</span>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button
          type="text"
          icon={expandedRows.includes(record.key) ? <UpOutlined /> : <DownOutlined />}
          onClick={() => handleExpand(!expandedRows.includes(record.key), record)}
        />
      ),
    }
  ];

  const expandedRowRender = (record) => {
    const vulnData = vulnerabilities[record.key];
    const isLoading = loadingVulns[record.key];

    return (
      <Card size="small" title="Scan Details">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>Scan Type:</strong> {record.scan_type || 'N/A'}
          </div>
          <div>
            <strong>UUID:</strong> {record.uuid || 'N/A'}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-4">
              <Spin />
            </div>
          ) : vulnData ? (
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Vulnerabilities</h4>
              {vulnData.hosts?.map((host, index) => (
                <div key={index} className="mb-4">
                  <div className="font-medium mb-2">
                    Host: {host.hostname || host.ip || 'Unknown'}
                  </div>
                  <Space>
                    {host.critical > 0 && (
                      <Tag 
                        color="red" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleVulnClick(host, 'critical')}
                      >
                        {host.critical} Critical
                      </Tag>
                    )}
                    {host.high > 0 && (
                      <Tag 
                        color="orange" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleVulnClick(host, 'high')}
                      >
                        {host.high} High
                      </Tag>
                    )}
                    {host.medium > 0 && (
                      <Tag 
                        color="gold" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleVulnClick(host, 'medium')}
                      >
                        {host.medium} Medium
                      </Tag>
                    )}
                    {host.low > 0 && (
                      <Tag 
                        color="blue" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleVulnClick(host, 'low')}
                      >
                        {host.low} Low
                      </Tag>
                    )}
                    {host.info > 0 && (
                      <Tag color="default">
                        {host.info} Info
                      </Tag>
                    )}
                  </Space>
                </div>
              ))}
            </div>
          ) : (
            <Alert
              message="No vulnerability data available"
              type="info"
              showIcon
            />
          )}
        </Space>
        {renderVulnerabilityModal()}
      </Card>
    );
  };

  return (
    <Table
      columns={columns}
      dataSource={history.map((item, index) => ({
        ...item,
        key: index,
      }))}
      loading={loading}
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        onChange: (page, size) => {
          setCurrentPage(page);
          setPageSize(size);
        },
      }}
      expandable={{
        expandedRowRender,
        expandedRowKeys: expandedRows,
        onExpand: handleExpand,
      }}
    />
  );
};

ScanHistoryTab.propTypes = {
  serverName: PropTypes.string.isRequired,
  isExternal: PropTypes.bool.isRequired
};

export default ScanHistoryTab; 