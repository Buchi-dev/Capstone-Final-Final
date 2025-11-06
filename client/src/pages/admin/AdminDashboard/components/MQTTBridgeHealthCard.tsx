import { Card, Row, Col, Statistic, Badge, Space, Typography, Tooltip, Progress, Tag, Button } from 'antd';
import {
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  DatabaseOutlined,
  SyncOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useThemeToken } from '../../../../theme';
import { useMQTTBridgeHealth } from '../hooks/useMQTTBridgeHealth';
import { MQTTBridgeService } from '../../../../services/mqttBridge.Service';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

// ============================================================================
// COMPONENT
// ============================================================================

export const MQTTBridgeHealthCard = () => {
  const token = useThemeToken();
  const { health, loading, error, lastUpdated, refetch } = useMQTTBridgeHealth(30000);

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy':
        return token.colorSuccess;
      case 'degraded':
        return token.colorWarning;
      case 'unhealthy':
        return token.colorError;
      default:
        return token.colorTextSecondary;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleOutlined style={{ color: token.colorSuccess }} />;
      case 'degraded':
        return <WarningOutlined style={{ color: token.colorWarning }} />;
      case 'unhealthy':
        return <CloseCircleOutlined style={{ color: token.colorError }} />;
      default:
        return <SyncOutlined spin style={{ color: token.colorTextSecondary }} />;
    }
  };

  const getMemoryColor = (percent: number) => {
    if (percent >= 90) return token.colorError;
    if (percent >= 75) return token.colorWarning;
    return token.colorSuccess;
  };

  // ============================================================================
  // RENDER ERROR STATE
  // ============================================================================

  if (error) {
    return (
      <Card
        title={
          <Space>
            <CloudServerOutlined />
            <span>MQTT Bridge Health</span>
            <Badge status="error" text="Offline" />
          </Space>
        }
        extra={
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={refetch}
            loading={loading}
          >
            Retry
          </Button>
        }
      >
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CloseCircleOutlined style={{ fontSize: 48, color: token.colorError }} />
          <Title level={4} style={{ marginTop: 16 }}>
            Connection Failed
          </Title>
          <Text type="secondary">{error}</Text>
        </div>
      </Card>
    );
  }

  // ============================================================================
  // RENDER LOADING STATE
  // ============================================================================

  if (loading && !health) {
    return (
      <Card
        title={
          <Space>
            <CloudServerOutlined />
            <span>MQTT Bridge Health</span>
          </Space>
        }
        loading={true}
      />
    );
  }

  // ============================================================================
  // RENDER MAIN CONTENT
  // ============================================================================

  return (
    <Card
      title={
        <Space>
          <CloudServerOutlined />
          <span>MQTT Bridge Health</span>
          {health && (
            <Badge
              status={health.status === 'healthy' ? 'success' : health.status === 'degraded' ? 'warning' : 'error'}
              text={health.status.toUpperCase()}
            />
          )}
        </Space>
      }
      extra={
        <Space>
          {lastUpdated && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Updated {dayjs(lastUpdated).fromNow()}
            </Text>
          )}
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={refetch}
            loading={loading}
          />
        </Space>
      }
    >
      {health && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* ====== SYSTEM STATUS ====== */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card variant="borderless" style={{ background: token.colorBgContainer }}>
                <Statistic
                  title="Status"
                  value={health.status.toUpperCase()}
                  prefix={getStatusIcon(health.status)}
                  valueStyle={{ color: getStatusColor(health.status), fontSize: 16 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card variant="borderless" style={{ background: token.colorBgContainer }}>
                <Statistic
                  title="Uptime"
                  value={MQTTBridgeService.formatUptime(health.uptime)}
                  prefix={<ThunderboltOutlined />}
                  valueStyle={{ color: token.colorPrimary }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card variant="borderless" style={{ background: token.colorBgContainer }}>
                <Statistic
                  title="MQTT Connection"
                  value={health.checks.mqtt.connected ? 'Connected' : 'Disconnected'}
                  prefix={health.checks.mqtt.connected ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  valueStyle={{
                    color: health.checks.mqtt.connected ? token.colorSuccess : token.colorError,
                    fontSize: 16,
                  }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card variant="borderless" style={{ background: token.colorBgContainer }}>
                <Statistic
                  title="Circuit Breaker"
                  value={health.metrics.circuitBreakerOpen ? 'OPEN' : 'CLOSED'}
                  prefix={health.metrics.circuitBreakerOpen ? <WarningOutlined /> : <CheckCircleOutlined />}
                  valueStyle={{
                    color: health.metrics.circuitBreakerOpen ? token.colorError : token.colorSuccess,
                    fontSize: 16,
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* ====== METRICS ====== */}
          <Card
            title="Message Metrics"
            variant="borderless"
            style={{ background: token.colorBgContainer }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={8} lg={4}>
                <Statistic
                  title="Received"
                  value={health.metrics.received}
                  valueStyle={{ color: token.colorInfo }}
                />
              </Col>
              <Col xs={12} sm={8} lg={4}>
                <Statistic
                  title="Published"
                  value={health.metrics.published}
                  valueStyle={{ color: token.colorSuccess }}
                />
              </Col>
              <Col xs={12} sm={8} lg={4}>
                <Statistic
                  title="Failed"
                  value={health.metrics.failed}
                  valueStyle={{ color: health.metrics.failed > 0 ? token.colorError : token.colorTextSecondary }}
                />
              </Col>
              <Col xs={12} sm={8} lg={4}>
                <Statistic
                  title="Commands"
                  value={health.metrics.commands}
                  valueStyle={{ color: token.colorPrimary }}
                />
              </Col>
              <Col xs={12} sm={8} lg={4}>
                <Statistic
                  title="Flushes"
                  value={health.metrics.flushes}
                  valueStyle={{ color: token.colorWarning }}
                />
              </Col>
              <Col xs={12} sm={8} lg={4}>
                <Statistic
                  title="DLQ Messages"
                  value={health.metrics.messagesInDLQ}
                  valueStyle={{ color: health.metrics.messagesInDLQ > 0 ? token.colorError : token.colorTextSecondary }}
                />
              </Col>
            </Row>
          </Card>

          {/* ====== MEMORY USAGE ====== */}
          <Card
            title="Memory Usage"
            variant="borderless"
            style={{ background: token.colorBgContainer }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} lg={8}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Overall Usage</Text>
                  <Progress
                    percent={health.checks.memory.percent}
                    strokeColor={getMemoryColor(health.checks.memory.percent)}
                    status={health.checks.memory.percent >= 90 ? 'exception' : 'normal'}
                  />
                  <Space split="|">
                    <Tooltip title="Heap Used">
                      <Text type="secondary">Heap: {health.checks.memory.heapUsed}</Text>
                    </Tooltip>
                    <Tooltip title="Heap Total">
                      <Text type="secondary">Total: {health.checks.memory.heapTotal}</Text>
                    </Tooltip>
                    <Tooltip title="RSS">
                      <Text type="secondary">RSS: {health.checks.memory.rss}</Text>
                    </Tooltip>
                  </Space>
                </Space>
              </Col>

              {/* ====== BUFFER STATUS ====== */}
              <Col xs={24} sm={12} lg={16}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Buffer Status</Text>
                  <Row gutter={[8, 8]}>
                    {Object.entries(health.checks.buffers).map(([key, buffer]) => (
                      <Col xs={24} sm={12} key={key}>
                        <Card
                          size="small"
                          variant="borderless"
                          style={{
                            background: buffer.messages > 0 ? token.colorWarningBg : token.colorSuccessBg,
                          }}
                        >
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Space>
                              <DatabaseOutlined />
                              <Text strong style={{ fontSize: 12 }}>
                                {key.replace('iot-', '').replace(/-/g, ' ').toUpperCase()}
                              </Text>
                            </Space>
                            <Space split="•" size="small">
                              <Tag color={buffer.messages > 0 ? 'warning' : 'success'}>
                                {buffer.messages} messages
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {buffer.utilization}% utilized
                              </Text>
                            </Space>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* ====== CLIENT INFO ====== */}
          <Card variant="borderless" style={{ background: token.colorInfoBg }}>
            <Space split="|">
              <Text>
                <strong>Client ID:</strong> {health.checks.mqtt.clientId}
              </Text>
              <Text>
                <strong>Last Check:</strong> {dayjs(health.timestamp).format('MMM D, YYYY h:mm:ss A')}
              </Text>
            </Space>
          </Card>
        </Space>
      )}
    </Card>
  );
};
