import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Table, Tag, Space, Button, Card, message } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import nessusService from '../services/nessusService';

const ScanHistoryTab = ({ serverName, isExternal }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const handleExpand = (expanded, record) => {
    if (expanded) {
      setExpandedRows([record.key]);
    } else {
      setExpandedRows([]);
    }
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
      title: 'Progress',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress) => <span>{progress}%</span>,
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
    },
  ];

  const expandedRowRender = (record) => {
    return (
      <Card size="small" title="Scan Details">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <strong>Scan Type:</strong> {record.scan_type || 'N/A'}
          </div>
          <div>
            <strong>Total Hosts:</strong> {record.total_hosts || 'N/A'}
          </div>
          <div>
            <strong>Scanned Hosts:</strong> {record.scanned_hosts || 'N/A'}
          </div>
          <div>
            <strong>UUID:</strong> {record.uuid || 'N/A'}
          </div>
        </Space>
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