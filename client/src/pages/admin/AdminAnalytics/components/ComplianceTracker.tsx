/**
 * Compliance Tracker Component
 * 
 * Displays compliance status for water quality parameters against WHO guidelines.
 * Shows compliance percentage, violation counts, and visual indicators.
 */
import { Card, Row, Col, Progress, Typography, Tag, Space, Alert } from 'antd';
import { CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { memo } from 'react';
import { useThemeToken } from '../../../../theme';
import type { AnalyticsComplianceStatus } from '../../../../schemas/analytics.schema';

const { Title, Text } = Typography;

interface ComplianceTrackerProps {
  complianceStatus: AnalyticsComplianceStatus[];
  loading?: boolean;
}

export const ComplianceTracker = memo<ComplianceTrackerProps>(({ 
  complianceStatus, 
  loading = false 
}) => {
  const token = useThemeToken();

  const getComplianceColor = (percentage: number): string => {
    if (percentage >= 95) return token.colorSuccess;
    if (percentage >= 85) return token.colorWarning;
    return token.colorError;
  };

  const getComplianceIcon = (compliant: boolean) => {
    return compliant 
      ? <CheckCircleOutlined style={{ color: token.colorSuccess, fontSize: 24 }} />
      : <CloseCircleOutlined style={{ color: token.colorError, fontSize: 24 }} />;
  };

  const overallCompliance = complianceStatus.length > 0
    ? complianceStatus.reduce((sum, status) => sum + status.compliancePercentage, 0) / complianceStatus.length
    : 0;

  const allCompliant = complianceStatus.every(status => status.compliant);

  return (
    <Card 
      title={<Title level={4}>Water Quality Compliance Tracker</Title>}
      loading={loading}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Overall Compliance Summary */}
        <Alert
          message={allCompliant ? 'All Parameters Compliant' : 'Compliance Issues Detected'}
          description={
            allCompliant
              ? 'All water quality parameters meet WHO drinking water guidelines.'
              : 'Some parameters do not meet WHO standards. Immediate attention required.'
          }
          type={allCompliant ? 'success' : 'warning'}
          showIcon
          icon={allCompliant ? <CheckCircleOutlined /> : <WarningOutlined />}
        />

        {/* Overall Compliance Percentage */}
        <div>
          <Text strong style={{ fontSize: 16 }}>Overall Compliance: {overallCompliance.toFixed(1)}%</Text>
          <Progress 
            percent={parseFloat(overallCompliance.toFixed(1))} 
            strokeColor={getComplianceColor(overallCompliance)}
            strokeWidth={12}
          />
        </div>

        {/* Individual Parameter Compliance */}
        <Row gutter={[16, 16]}>
          {complianceStatus.map((status) => {
            const parameterName = 
              status.parameter === 'ph' ? 'pH Level' :
              status.parameter === 'tds' ? 'Total Dissolved Solids (TDS)' :
              'Turbidity';

            const thresholdText = 
              status.parameter === 'ph' 
                ? `${status.threshold.min} - ${status.threshold.max}` 
                : `≤ ${status.threshold.max}`;

            const unit = 
              status.parameter === 'ph' ? '' :
              status.parameter === 'tds' ? 'ppm' :
              'NTU';

            return (
              <Col xs={24} lg={8} key={status.parameter}>
                <Card 
                  size="small"
                  style={{ 
                    borderColor: status.compliant ? token.colorSuccess : token.colorError,
                    borderWidth: 2,
                  }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text strong>{parameterName}</Text>
                      {getComplianceIcon(status.compliant)}
                    </div>

                    <div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        WHO Guideline: {thresholdText} {unit}
                      </Text>
                    </div>

                    <Progress 
                      percent={parseFloat(status.compliancePercentage.toFixed(1))}
                      strokeColor={getComplianceColor(status.compliancePercentage)}
                      format={(percent) => `${percent}%`}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Tag color={status.compliant ? 'success' : 'error'}>
                        {status.compliant ? 'Compliant' : 'Non-Compliant'}
                      </Tag>
                      {status.violationCount > 0 && (
                        <Tag color="error">
                          {status.violationCount} violation{status.violationCount > 1 ? 's' : ''}
                        </Tag>
                      )}
                    </div>

                    {!status.compliant && (
                      <Alert
                        message="Action Required"
                        description={`${status.violationCount} reading${status.violationCount > 1 ? 's' : ''} outside acceptable range.`}
                        type="error"
                        showIcon
                        style={{ marginTop: 8 }}
                      />
                    )}
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>

        {/* Compliance Summary Statistics */}
        <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: token.colorSuccess }}>
                  {complianceStatus.filter(s => s.compliant).length}
                </Title>
                <Text type="secondary">Parameters Compliant</Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: token.colorError }}>
                  {complianceStatus.filter(s => !s.compliant).length}
                </Title>
                <Text type="secondary">Parameters Non-Compliant</Text>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: token.colorWarning }}>
                  {complianceStatus.reduce((sum, s) => sum + s.violationCount, 0)}
                </Title>
                <Text type="secondary">Total Violations</Text>
              </div>
            </Col>
          </Row>
        </Card>
      </Space>
    </Card>
  );
});

ComplianceTracker.displayName = 'ComplianceTracker';
