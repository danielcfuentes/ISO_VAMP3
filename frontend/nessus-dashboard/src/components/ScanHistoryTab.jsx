import React, { useState, useEffect } from 'react';
import { Table, Tag, Space, Button, Card, message } from 'antd';
import { DownOutlined, UpOutlined } from '@ant-design/icons';
import nessusService from '../services/nessusService';

const ScanHistoryTab = ({ serverName }) => {
  console.log('ScanHistoryTab rendered with serverName:', serverName);
  
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    console.log('useEffect triggered with serverName:', serverName);
    
    const fetchHistory = async () => {
      try {
        console.log('Fetching scan history for server:', serverName);
        setLoading(true);
        const data = await nessusService.getScanHistory(serverName);
        console.log('Received scan history data:', data);
        setHistory(data.history);
      } catch (error) {
        console.error('Error fetching scan history:', error);
        message.error(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (serverName) {
      fetchHistory();
    } else {
      console.warn('No serverName provided to ScanHistoryTab');
    }
  }, [serverName]);

  const columns = [
    {
      title: 'History ID',
      dataIndex: 'history_id',
      key: 'history_id',
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const statusColors = {
          completed: 'success',
          running: 'processing',
          pending: 'warning',
          canceled: 'default',
          failed: 'error'
        };
        return <Tag color={statusColors[status] || 'default'}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Start Time',
      dataIndex: 'starttime',
      key: 'starttime',
      width: 200,
    },
    {
      title: 'End Time',
      dataIndex: 'endtime',
      key: 'endtime',
      width: 200,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="text"
          icon={expandedRows.includes(record.history_id) ? <UpOutlined /> : <DownOutlined />}
          onClick={() => {
            if (expandedRows.includes(record.history_id)) {
              setExpandedRows(expandedRows.filter(id => id !== record.history_id));
            } else {
              setExpandedRows([...expandedRows, record.history_id]);
            }
          }}
        />
      ),
    },
  ];

  const expandedRowRender = (record) => {
    return (
      <Card size="small" title="Additional Details">
        <Space direction="vertical">
          <div><strong>Creation Date:</strong> {record.creation_date}</div>
          <div><strong>Last Modified:</strong> {record.last_modification_date}</div>
          <div><strong>UUID:</strong> {record.uuid}</div>
        </Space>
      </Card>
    );
  };

  return (
    <Table
      columns={columns}
      dataSource={history}
      loading={loading}
      rowKey="history_id"
      expandable={{
        expandedRowRender,
        expandedRowKeys: expandedRows,
        expandRowByClick: true,
      }}
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        total: history.length,
        onChange: (page, size) => {
          setCurrentPage(page);
          setPageSize(size);
        },
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} items`,
      }}
    />
  );
};

export default ScanHistoryTab; 