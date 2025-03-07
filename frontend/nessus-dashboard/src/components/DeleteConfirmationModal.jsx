import React from 'react';
import { Modal, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const DeleteConfirmationModal = ({ visible, onClose, onConfirm, serverName, loading }) => {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-red-600">
          <ExclamationCircleOutlined />
          <span> Remove Agent </span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={onConfirm}
      okText="Remove"
      cancelText="Cancel"
      okButtonProps={{
        danger: true,
        loading: loading
      }}
    >
      <div className="py-4">
        <Text>
          Are you sure you want to remove the agent <Text strong>"{serverName}"</Text> from your group?
        </Text>
        <div> </div>
        <Text className="block mt-4 text-gray-500">
           <span>
                 This action cannot be undone. The agent will need to be re-linked manually through the server side if needed.
            </span>
        </Text>
      </div>
    </Modal>
  );
};

export default DeleteConfirmationModal;