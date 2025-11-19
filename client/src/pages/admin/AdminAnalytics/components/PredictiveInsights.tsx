/**
 * Predictive Insights Component
 * 
 * Displays AI-powered predictions and recommendations for water quality trends.
 * Shows anomaly detection, trend forecasts, and actionable insights.
 */
import { Card, Row, Col, Alert, Typography, Tag, Space, Progress, Descriptions } from 'antd';
import {
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { memo } from 'react';
import { useThemeToken } from '../../../../theme';
import type { TrendAnalysis } from '../../../../schemas/analytics.schema';

const { Title, Text } = Typography;

interface PredictiveInsight {
  parameter: string;
  currentValue: number;
  predictedValue: number;
  predictedChange: number;
  confidence: number;
  timeframe: string;
  recommendation: string;
}

interface Anomaly {
  timestamp: number;
  parameter: string;
  value: number;
  expectedValue: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
}

interface PredictiveInsightsProps {
  trendAnalysis: TrendAnalysis[];
  predictions: PredictiveInsight[];
  anomalies: Anomaly[];
  loading?: boolean;
}

export const PredictiveInsights = memo<PredictiveInsightsProps>(({ 
  trendAnalysis,
  predictions,
  anomalies,
  loading = false 
}) => {
  const token = useThemeToken();

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing':
        return <RiseOutlined style={{ color: token.colorWarning }} />;
      case 'decreasing':
        return <FallOutlined style={{ color: token.colorInfo }} />;
      case 'stable':
        return <MinusOutlined style={{ color: token.colorSuccess }} />;
      default:
        return <MinusOutlined />;
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return token.colorSuccess;
    if (confidence >= 60) return token.colorWarning;
    return token.colorError;
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'default';
    }
  };

  const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
  const hasAnomalies = anomalies.length > 0;

  return (
    <Card 
      title={
        <Space>
          <ThunderboltOutlined style={{ color: token.colorPrimary }} />
          <Title level={4} style={{ margin: 0 }}>Predictive Insights & Anomaly Detection</Title>
        </Space>
      }
      loading={loading}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Anomaly Alert */}
        {hasAnomalies && (
          <Alert
            message={`${anomalies.length} Anomal${anomalies.length > 1 ? 'ies' : 'y'} Detected`}
            description={
              highSeverityAnomalies.length > 0
                ? `${highSeverityAnomalies.length} high-severity anomal${highSeverityAnomalies.length > 1 ? 'ies' : 'y'} require immediate attention.`
                : 'Minor anomalies detected. Monitoring recommended.'
            }
            type={highSeverityAnomalies.length > 0 ? 'error' : 'warning'}
            showIcon
            icon={<WarningOutlined />}
            closable
          />
        )}

        {/* Trend Analysis Summary */}
        <div>
          <Title level={5}>Parameter Trend Analysis</Title>
          <Row gutter={[16, 16]}>
            {trendAnalysis.map((trend) => {
              const parameterName = 
                trend.parameter === 'ph' ? 'pH Level' :
                trend.parameter === 'tds' ? 'TDS' :
                trend.parameter === 'turbidity' ? 'Turbidity' :
                trend.parameter;

              return (
                <Col xs={24} md={8} key={trend.parameter}>
                  <Card size="small" style={{ height: '100%' }}>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{parameterName}</Text>
                        {getTrendIcon(trend.direction)}
                      </div>

                      <Tag color={trend.direction === 'stable' ? 'success' : 'warning'}>
                        {trend.direction.toUpperCase()}
                      </Tag>

                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Confidence: {trend.confidence}%
                        </Text>
                        <Progress 
                          percent={trend.confidence} 
                          strokeColor={getConfidenceColor(trend.confidence)}
                          size="small"
                          showInfo={false}
                        />
                      </div>

                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="Prediction">
                          {trend.prediction != null ? trend.prediction.toFixed(2) : 'N/A'}
                        </Descriptions.Item>
                        <Descriptions.Item label="Rate of Change">
                          {trend.slope != null ? `${trend.slope >= 0 ? '+' : ''}${trend.slope.toFixed(4)} per reading` : 'N/A'}
                        </Descriptions.Item>
                      </Descriptions>

                      {trend.anomalyDetected && (
                        <Tag icon={<WarningOutlined />} color="error">
                          Anomaly Detected
                        </Tag>
                      )}
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>

        {/* Predictive Forecasts */}
        <div>
          <Title level={5}>Predictive Forecasts</Title>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {predictions.map((prediction, index) => {
              const parameterName = 
                prediction.parameter === 'ph' ? 'pH' :
                prediction.parameter === 'tds' ? 'TDS' :
                prediction.parameter === 'turbidity' ? 'Turbidity' :
                prediction.parameter;

              const isPositiveChange = prediction.predictedChange > 0;
              const changeColor = 
                Math.abs(prediction.predictedChange) < 5 ? token.colorSuccess :
                Math.abs(prediction.predictedChange) < 10 ? token.colorWarning :
                token.colorError;

              return (
                <Card 
                  key={index}
                  size="small" 
                  style={{ backgroundColor: token.colorBgLayout }}
                >
                  <Row gutter={16} align="middle">
                    <Col xs={24} md={6}>
                      <Text strong style={{ fontSize: 16 }}>{parameterName}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{prediction.timeframe}</Text>
                    </Col>
                    <Col xs={12} md={5}>
                      <Text type="secondary">Current</Text>
                      <br />
                      <Text strong style={{ fontSize: 18 }}>
                        {prediction.currentValue != null ? prediction.currentValue.toFixed(2) : 'N/A'}
                      </Text>
                    </Col>
                    <Col xs={12} md={5}>
                      <Text type="secondary">Predicted</Text>
                      <br />
                      <Text strong style={{ fontSize: 18, color: changeColor }}>
                        {prediction.predictedValue != null ? prediction.predictedValue.toFixed(2) : 'N/A'}
                      </Text>
                    </Col>
                    <Col xs={24} md={8}>
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div>
                          <Tag color={isPositiveChange ? 'warning' : 'success'}>
                            {prediction.predictedChange != null 
                              ? `${isPositiveChange ? '+' : ''}${prediction.predictedChange.toFixed(1)}% change`
                              : 'N/A'}
                          </Tag>
                          <Tag>
                            {prediction.confidence != null ? `${prediction.confidence}% confidence` : 'N/A'}
                          </Tag>
                        </div>
                        <Progress 
                          percent={prediction.confidence} 
                          strokeColor={getConfidenceColor(prediction.confidence)}
                          size="small"
                          showInfo={false}
                        />
                      </Space>
                    </Col>
                  </Row>
                  <Alert
                    message={prediction.recommendation}
                    type="info"
                    showIcon
                    icon={<CheckCircleOutlined />}
                    style={{ marginTop: 12 }}
                  />
                </Card>
              );
            })}
          </Space>
        </div>

        {/* Detected Anomalies */}
        {hasAnomalies && (
          <div>
            <Title level={5}>Detected Anomalies</Title>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {anomalies.slice(0, 5).map((anomaly, index) => {
                const parameterName = 
                  anomaly.parameter === 'ph' ? 'pH' :
                  anomaly.parameter === 'tds' ? 'TDS' :
                  'Turbidity';

                return (
                  <Card 
                    key={index}
                    size="small"
                    style={{ 
                      borderColor: getSeverityColor(anomaly.severity) === 'error' ? token.colorError : token.colorWarning,
                      borderWidth: 1,
                    }}
                  >
                    <Row gutter={16} align="middle">
                      <Col xs={24} md={6}>
                        <Text strong>{parameterName}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(anomaly.timestamp).toLocaleString()}
                        </Text>
                      </Col>
                      <Col xs={8} md={4}>
                        <Text type="secondary">Actual</Text>
                        <br />
                        <Text strong>{anomaly.value != null ? anomaly.value.toFixed(2) : 'N/A'}</Text>
                      </Col>
                      <Col xs={8} md={4}>
                        <Text type="secondary">Expected</Text>
                        <br />
                        <Text>{anomaly.expectedValue != null ? anomaly.expectedValue.toFixed(2) : 'N/A'}</Text>
                      </Col>
                      <Col xs={8} md={4}>
                        <Text type="secondary">Deviation</Text>
                        <br />
                        <Text strong style={{ color: token.colorError }}>
                          {anomaly.deviation != null ? `±${anomaly.deviation.toFixed(2)}` : 'N/A'}
                        </Text>
                      </Col>
                      <Col xs={24} md={6}>
                        <Tag color={getSeverityColor(anomaly.severity)} icon={<WarningOutlined />}>
                          {anomaly.severity.toUpperCase()} SEVERITY
                        </Tag>
                      </Col>
                    </Row>
                  </Card>
                );
              })}
            </Space>
          </div>
        )}
      </Space>
    </Card>
  );
});

PredictiveInsights.displayName = 'PredictiveInsights';
