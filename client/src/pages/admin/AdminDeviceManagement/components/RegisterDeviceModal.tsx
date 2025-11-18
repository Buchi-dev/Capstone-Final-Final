import { Modal, Form, Input, Select, Space, Typography, Divider, Alert } from 'antd';
import { useEffect, useState } from 'react';
import type { Device } from '../../../../schemas';
import { EnvironmentOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

interface RegisterDeviceModalProps {
  visible: boolean;
  device: Device | null;
  onRegister: (deviceId: string, locationData: { building: string; floor: string; notes?: string }) => void;
  onCancel: () => void;
}

export const RegisterDeviceModal = ({
  visible,
  device,
  onRegister,
  onCancel,
}: RegisterDeviceModalProps) => {
  const [form] = Form.useForm();
  const token = useThemeToken();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible && device) {
      form.setFieldsValue({
        building: device.metadata?.location?.building || '',
        floor: device.metadata?.location?.floor || '',
        notes: device.metadata?.location?.notes || '',
      });
      setIsSubmitting(false);
    } else {
      form.resetFields();
      setIsSubmitting(false);
    }
  }, [visible, device, form]);

  const handleOk = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      
      if (!device) {
        setIsSubmitting(false);
        return;
      }

      await onRegister(device.deviceId, {
        building: values.building,
        floor: values.floor,
        notes: values.notes || '',
      });
      
      // Reset submission state after a delay to ensure the modal has time to close
      setTimeout(() => {
        setIsSubmitting(false);
      }, 1000);
    } catch (error) {
      console.error('Form validation failed:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <Space>
          <EnvironmentOutlined style={{ color: token.colorSuccess }} />
          <span>Register Device</span>
        </Space>
      }
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      width={600}
      okText="Register Device"
      cancelText="Cancel"
      okButtonProps={{ 
        type: 'primary',
        loading: isSubmitting,
        disabled: isSubmitting,
      }}
      cancelButtonProps={{
        disabled: isSubmitting,
      }}
      closable={!isSubmitting}
      maskClosable={!isSubmitting}
    >
      {device ? (
        <>
          <Alert
            message="Device Registration"
            description={
              <Space direction="vertical" size={0}>
                <Text>
                  You are registering <Text strong code>{device.deviceId}</Text> - <Text strong>{device.name}</Text>
                </Text>
                <Text type="secondary">
                  Please provide the location information to complete the registration.
                </Text>
              </Space>
            }
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 16 }}
          />

          <Divider />

          <Form
            form={form}
            layout="vertical"
          >
            {/* Location Information */}
            <Text strong style={{ fontSize: '16px' }}>📍 Location Information</Text>
            <Divider style={{ margin: '12px 0' }} />

            <Form.Item
              label="Building"
              name="building"
              rules={[
                { required: true, message: 'Building is required for registration' },
                { min: 2, message: 'Building name must be at least 2 characters' },
              ]}
              tooltip="Building where the device is installed"
            >
              <Input 
                placeholder="e.g., Main Building, Building A, Science Block" 
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="Floor"
              name="floor"
              rules={[
                { required: true, message: 'Floor is required for registration' },
              ]}
              tooltip="Floor level where the device is located"
            >
              <Select 
                placeholder="Select floor" 
                size="large"
              >
                <Option value="1st Floor">1st Floor</Option>
                <Option value="2nd Floor">2nd Floor</Option>
                <Option value="3rd Floor">3rd Floor</Option>
                <Option value="4th Floor">4th Floor</Option>
                <Option value="5th Floor">5th Floor</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Notes (Optional)"
              name="notes"
              tooltip="Additional location details or landmarks"
            >
              <TextArea
                rows={3}
                placeholder="e.g., Near the main entrance, Room 201, Lab 3, Next to the water tank"
              />
            </Form.Item>

            <Alert
              message="Note"
              description="Once registered, the device will appear in the Registered Devices tab and can be used for monitoring."
              type="success"
              showIcon
              style={{ marginTop: 16 }}
            />
          </Form>
        </>
      ) : (
        <Form form={form} layout="vertical" style={{ display: 'none' }} />
      )}
    </Modal>
  );
};
