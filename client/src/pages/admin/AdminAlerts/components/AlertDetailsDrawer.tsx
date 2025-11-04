import {
  Drawer,
  Space,
  Tag,
  Button,
  Card,
  Row,
  Col,
  Typography,
  Divider,
  Form,
  Input,
} from 'antd';
import {
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  TabletOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import {
  getParameterUnit,
  getParameterName,
  getSeverityColor,
  getStatusColor,
} from '../../../../schemas';
import type { WaterQualityAlert } from '../../../../schemas';

const { Text } = Typography;
const { TextArea } = Input;

interface AlertDetailsDrawerProps {
  visible: boolean;
  alert: WaterQualityAlert | null;
  onClose: () => void;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string, notes?: string) => Promise<boolean>;
  isAcknowledging?: (alertId: string) => boolean;
  isResolving?: (alertId: string) => boolean;
}

/**
 * Alert Details Drawer Component
 * Shows detailed information about a selected alert and allows actions
 */
export const AlertDetailsDrawer: React.FC<AlertDetailsDrawerProps> = ({
  visible,
  alert,
  onClose,
  onAcknowledge,
  onResolve,
  isAcknowledging = () => false,
  isResolving = () => false,
}) => {
  const token = useThemeToken();

  const handleResolve = async (values: { notes?: string }) => {
    if (alert) {
      const success = await onResolve(alert.alertId, values.notes);
      if (success) {
        onClose();
      }
    }
  };

  if (!alert) return null;

  const acknowledging = isAcknowledging(alert.alertId);
  const resolving = isResolving(alert.alertId);

  return (
    <Drawer
      title={
        <Space>
          <WarningOutlined style={{ fontSize: 20 }} />
          <span>Alert Details</span>
        </Space>
      }
      placement="right"
      width={650}
      open={visible}
      onClose={onClose}
      styles={{
        body: { padding: 0 }
      }}
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header Section with Status */}
        <div style={{ 
          padding: '24px 24px 20px', 
          background: `linear-gradient(135deg, ${getSeverityColor(alert.severity)}15 0%, ${getSeverityColor(alert.severity)}05 100%)`,
          borderBottom: `3px solid ${getSeverityColor(alert.severity)}`
        }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space size={8}>
              <Tag 
                color={getSeverityColor(alert.severity)} 
                icon={<WarningOutlined />}
                style={{ fontSize: 14, padding: '4px 12px', fontWeight: 600 }}
              >
                {alert.severity}
              </Tag>
              <Tag 
                color={getStatusColor(alert.status)}
                icon={
                  alert.status === 'Active' ? <ExclamationCircleOutlined /> :
                  alert.status === 'Acknowledged' ? <CheckCircleOutlined /> :
                  <CloseCircleOutlined />
                }
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {alert.status}
              </Tag>
              <Tag style={{ fontSize: 12, padding: '2px 8px' }}>
                {alert.alertType}
              </Tag>
            </Space>
            
            {/* Quick Actions */}
            {alert.status === 'Active' && (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => onAcknowledge(alert.alertId)}
                loading={acknowledging}
                disabled={acknowledging}
                block
                size="large"
              >
                {acknowledging ? 'Acknowledging...' : 'Acknowledge Alert'}
              </Button>
            )}
          </Space>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            
            {/* Alert Message - Prominent */}
            <div style={{
              padding: 16,
              background: token.colorBgContainer,
              borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
              borderRadius: 8,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
              <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>
                Alert Message
              </Text>
              <div style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 15, lineHeight: 1.6 }}>
                  {alert.message}
                </Text>
              </div>
            </div>

            {/* Measurement Info - Visual Cards */}
            <Row gutter={12}>
              <Col span={12}>
                <Card size="small" style={{ textAlign: 'center', background: '#f5f5f5' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Parameter</Text>
                  <div style={{ marginTop: 4 }}>
                    <Text strong style={{ fontSize: 16, color: token.colorPrimary }}>
                      {getParameterName(alert.parameter)}
                    </Text>
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ textAlign: 'center', background: '#f5f5f5' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Current Value</Text>
                  <div style={{ marginTop: 4 }}>
                    <Text strong style={{ 
                      fontSize: 18, 
                      color: getSeverityColor(alert.severity),
                      fontWeight: 700
                    }}>
                      {alert.currentValue.toFixed(2)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                      {getParameterUnit(alert.parameter)}
                    </Text>
                  </div>
                </Card>
              </Col>
            </Row>

            {alert.thresholdValue && (
              <Card size="small" style={{ background: '#fff9e6' }}>
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Threshold Limit</Text>
                    <div>
                      <Text strong style={{ fontSize: 16 }}>
                        {alert.thresholdValue} {getParameterUnit(alert.parameter)}
                      </Text>
                    </div>
                  </div>
                  {alert.trendDirection && (
                    <Tag color="orange">{alert.trendDirection}</Tag>
                  )}
                </Space>
              </Card>
            )}

            <Divider style={{ margin: '8px 0' }} />

            {/* Device Information */}
            <div>
              <Space style={{ fontSize: 14, marginBottom: 12 }}>
                <TabletOutlined />
                <Text strong>Device Information</Text>
              </Space>
              <Card size="small" bodyStyle={{ padding: 16 }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>Device Name</Text>
                    <div>
                      <Text strong>{alert.deviceName || alert.deviceId}</Text>
                    </div>
                  </div>
                  {(alert.deviceBuilding || alert.deviceFloor) && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>Location</Text>
                      <div>
                        <Space size={4}>
                          <EnvironmentOutlined style={{ color: token.colorPrimary }} />
                          <Text>
                            {[alert.deviceBuilding, alert.deviceFloor].filter(Boolean).join(', ')}
                          </Text>
                        </Space>
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: token.colorTextTertiary }}>
                    ID: {alert.deviceId}
                  </div>
                </Space>
              </Card>
            </div>

            {/* Recommended Action */}
            <div style={{
              padding: 16,
              background: '#fffbe6',
              border: '1px solid #ffe58f',
              borderRadius: 8
            }}>
              <Space align="start">
                <ExclamationCircleOutlined style={{ color: '#faad14', fontSize: 18, marginTop: 2 }} />
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 8 }}>
                    Recommended Action
                  </Text>
                  <Text style={{ fontSize: 14, lineHeight: 1.6 }}>
                    {alert.recommendedAction}
                  </Text>
                </div>
              </Space>
            </div>

            <Divider style={{ margin: '8px 0' }} />

            {/* Timeline */}
            <div>
              <Space style={{ fontSize: 14, marginBottom: 12 }}>
                <ClockCircleOutlined />
                <Text strong>Timeline</Text>
              </Space>
              <Card size="small" bodyStyle={{ padding: 16 }}>
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text type="secondary">Created</Text>
                    <Text strong>
                      {alert.createdAt?.toDate ? 
                        alert.createdAt.toDate().toLocaleString() : 
                        'N/A'}
                    </Text>
                  </div>
                  {alert.acknowledgedAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Acknowledged</Text>
                      <Text>
                        {alert.acknowledgedAt.toDate ? 
                          alert.acknowledgedAt.toDate().toLocaleString() : 
                          'N/A'}
                      </Text>
                    </div>
                  )}
                  {alert.resolvedAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">Resolved</Text>
                      <Text style={{ color: token.colorSuccess }}>
                        {alert.resolvedAt.toDate ? 
                          alert.resolvedAt.toDate().toLocaleString() : 
                          'N/A'}
                      </Text>
                    </div>
                  )}
                </Space>
              </Card>
            </div>

            {/* Notifications */}
            {alert.notificationsSent && alert.notificationsSent.length > 0 && (
              <Card size="small" style={{ background: '#f6ffed' }}>
                <Space>
                  <BellOutlined style={{ color: token.colorSuccess }} />
                  <Text>
                    <Text strong style={{ color: token.colorSuccess }}>
                      {alert.notificationsSent.length}
                    </Text>
                    {' '}user{alert.notificationsSent.length !== 1 ? 's' : ''} notified
                  </Text>
                </Space>
              </Card>
            )}

            {/* Resolve Alert Form */}
            {alert.status !== 'Resolved' && (
              <div style={{ 
                padding: 20, 
                background: token.colorBgContainer,
                border: '1px solid #d9d9d9',
                borderRadius: 8,
                marginTop: 8
              }}>
                <Space style={{ fontSize: 14, marginBottom: 16 }}>
                  <CheckCircleOutlined style={{ color: token.colorSuccess }} />
                  <Text strong>Resolve This Alert</Text>
                </Space>
                <Form
                  layout="vertical"
                  onFinish={handleResolve}
                >
                  <Form.Item
                    name="notes"
                    label="Resolution Notes"
                    extra="Describe how the issue was resolved or any actions taken"
                  >
                    <TextArea
                      rows={4}
                      placeholder="Example: Checked water filtration system, replaced filter cartridge, water quality returned to normal levels."
                      style={{ fontSize: 13 }}
                    />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<CheckCircleOutlined />}
                      size="large"
                      block
                      loading={resolving}
                      disabled={resolving}
                      style={{ 
                        background: token.colorSuccess,
                        borderColor: token.colorSuccess,
                        height: 44
                      }}
                    >
                      {resolving ? 'Resolving...' : 'Mark as Resolved'}
                    </Button>
                  </Form.Item>
                </Form>
              </div>
            )}
          </Space>
        </div>
      </div>
    </Drawer>
  );
};
