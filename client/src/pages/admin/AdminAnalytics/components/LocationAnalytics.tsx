/**
 * Location Analytics Component
 * 
 * Displays location-based water quality insights:
 * - Building/Floor analytics
 * - Average quality scores by location
 * - Alert distribution
 * - Heatmap visualization
 */
import { Card, Row, Col, Typography, Tag, Statistic, Space, Progress } from 'antd';
import { EnvironmentOutlined, AlertOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { memo } from 'react';
import { useThemeToken } from '../../../../theme';
import type { LocationAnalytics as LocationAnalyticsType } from '../../../../schemas/analytics.schema';

const { Title, Text } = Typography;

interface LocationAnalyticsProps {
  locationAnalytics: LocationAnalyticsType[];
  loading?: boolean;
}

export const LocationAnalytics = memo<LocationAnalyticsProps>(({ 
  locationAnalytics,
  loading = false 
}) => {
  const token = useThemeToken();

  const getQualityScoreColor = (score: number): string => {
    if (score >= 90) return token.colorSuccess;
    if (score >= 75) return token.colorInfo;
    if (score >= 60) return token.colorWarning;
    return token.colorError;
  };

  const getQualityScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Critical';
  };

  // Sort by quality score (lowest first to highlight problem areas)
  const sortedLocations = [...locationAnalytics].sort((a, b) => 
    a.avgWaterQualityScore - b.avgWaterQualityScore
  );

  return (
    <Card 
      title={<Title level={4}>Location-Based Water Quality Analytics</Title>}
      loading={loading}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Summary Statistics */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title="Total Locations"
                value={locationAnalytics.length}
                prefix={<EnvironmentOutlined />}
                valueStyle={{ color: token.colorPrimary }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title="Locations with Alerts"
                value={locationAnalytics.filter(l => l.activeAlertCount > 0).length}
                prefix={<AlertOutlined />}
                valueStyle={{ color: token.colorWarning }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title="High Quality Locations"
                value={locationAnalytics.filter(l => l.avgWaterQualityScore >= 90).length}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: token.colorSuccess }}
              />
            </Card>
          </Col>
        </Row>

        {/* Location Cards */}
        <div>
          <Title level={5}>Detailed Location Insights</Title>
          <Row gutter={[16, 16]}>
            {sortedLocations.map((location, index) => {
              const qualityScore = location.avgWaterQualityScore;
              const hasAlerts = location.activeAlertCount > 0;

              return (
                <Col xs={24} lg={12} xxl={8} key={`${location.building}-${location.floor}-${index}`}>
                  <Card
                    size="small"
                    style={{
                      borderColor: hasAlerts ? token.colorError : getQualityScoreColor(qualityScore),
                      borderWidth: 2,
                      height: '100%',
                    }}
                  >
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      {/* Location Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <EnvironmentOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
                          <div>
                            <Text strong style={{ fontSize: 16 }}>{location.building}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>Floor {location.floor}</Text>
                          </div>
                        </Space>
                        {hasAlerts && (
                          <Tag color="error" icon={<AlertOutlined />}>
                            {location.activeAlertCount} Alert{location.activeAlertCount > 1 ? 's' : ''}
                          </Tag>
                        )}
                      </div>

                      {/* Quality Score */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text type="secondary">Water Quality Score</Text>
                          <Tag color={getQualityScoreColor(qualityScore)}>
                            {getQualityScoreLabel(qualityScore)}
                          </Tag>
                        </div>
                        <Progress 
                          percent={Math.round(qualityScore)} 
                          strokeColor={getQualityScoreColor(qualityScore)}
                          format={(percent) => `${percent}/100`}
                        />
                      </div>

                      {/* Device Count */}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">Devices Monitored</Text>
                        <Text strong>{location.deviceCount}</Text>
                      </div>

                      {/* Water Quality Parameters */}
                      <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">Avg pH:</Text>
                            <Text 
                              strong 
                              style={{ 
                                color: location.readings.avgPh >= 6.5 && location.readings.avgPh <= 8.5 
                                  ? token.colorSuccess 
                                  : token.colorError 
                              }}
                            >
                              {location.readings.avgPh.toFixed(2)}
                            </Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">Avg TDS:</Text>
                            <Text 
                              strong 
                              style={{ 
                                color: location.readings.avgTds <= 500 
                                  ? token.colorSuccess 
                                  : token.colorError 
                              }}
                            >
                              {location.readings.avgTds.toFixed(0)} ppm
                            </Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">Avg Turbidity:</Text>
                            <Text 
                              strong 
                              style={{ 
                                color: location.readings.avgTurbidity <= 5 
                                  ? token.colorSuccess 
                                  : token.colorError 
                              }}
                            >
                              {location.readings.avgTurbidity.toFixed(2)} NTU
                            </Text>
                          </div>
                        </Space>
                      </Card>

                      {/* Status Badge */}
                      <div style={{ textAlign: 'center' }}>
                        {qualityScore >= 90 && !hasAlerts ? (
                          <Tag color="success" style={{ fontSize: 14, padding: '4px 12px' }}>
                            ✓ Excellent Water Quality
                          </Tag>
                        ) : hasAlerts ? (
                          <Tag color="error" style={{ fontSize: 14, padding: '4px 12px' }}>
                            ⚠ Requires Attention
                          </Tag>
                        ) : (
                          <Tag color="warning" style={{ fontSize: 14, padding: '4px 12px' }}>
                            ⚡ Monitor Closely
                          </Tag>
                        )}
                      </div>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      </Space>
    </Card>
  );
});

LocationAnalytics.displayName = 'LocationAnalytics';
