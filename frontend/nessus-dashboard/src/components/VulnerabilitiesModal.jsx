import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Table, Tag, Space, message } from 'antd';
import nessusService from '../services/nessusService';
import ScanHistoryTab from './ScanHistoryTab';

const VulnerabilitiesModal = ({ visible, onClose, serverName }) => {
  const [activeTab, setActiveTab] = useState('1');
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      fetchVulnerabilities();
    }
  }, [visible, serverName]);

  const fetchVulnerabilities = async () => {
    try {
      setLoading(true);
      const data = await nessusService.getVulnerabilities(serverName);
      setVulnerabilities(data.vulnerabilities);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Plugin ID',
      dataIndex: 'plugin_id',
      key: 'plugin_id',
      width: 100,
    },
    {
      title: 'Name',
      dataIndex: 'plugin_name',
      key: 'plugin_name',
      width: 200,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity) => {
        const severityColors = {
          critical: 'red',
          high: 'orange',
          medium: 'yellow',
          low: 'green',
          info: 'blue'
        };
        return <Tag color={severityColors[severity] || 'default'}>{severity.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  const items = [
    {
      key: '1',
      label: 'Vulnerabilities',
      children: (
        <Table
          columns={columns}
          dataSource={vulnerabilities}
          loading={loading}
          rowKey="plugin_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`,
          }}
        />
      ),
    },
    {
      key: '2',
      label: 'Scan History',
      children: <ScanHistoryTab serverName={serverName} />,
    },
  ];

  return (
    <Modal
      title={`Vulnerabilities for ${serverName}`}
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={null}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
      />
    </Modal>
  );
};

export default VulnerabilitiesModal; 