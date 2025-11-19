/**
 * ReportTypeSelection Component
 * 
 * Displays report type cards for user selection in AdminReports wizard.
 * Supports both full and compact layouts.
 */
import { Card, Row, Col, Space, Typography, Tag, Badge, Tooltip } from 'antd';
import {
  ExperimentOutlined,
  ArrowRightOutlined,
  StarOutlined,
  FileTextOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { ReportType } from '../../../../schemas';

const { Text, Title } = Typography;

export interface ReportTypeOption {
  key: ReportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  popular?: boolean;
}

interface ReportTypeSelectionProps {
  selectedType: ReportType;
  onSelectType: (type: ReportType) => void;
  reportTypes: ReportTypeOption[];
  compact?: boolean;
}

/**
 * Report type selection cards with visual feedback
 * 
 * @example
 * <ReportTypeSelection
 *   selectedType="water_quality"
 *   onSelectType={handleSelect}
 *   reportTypes={reportTypes}
 *   compact={false}
 * />
 */
export const ReportTypeSelection = ({
  selectedType,
  onSelectType,
  reportTypes,
  compact = false,
}: ReportTypeSelectionProps) => {
  if (compact) {
    return (
      <Row gutter={[12, 12]}>
        {reportTypes.map(type => (
          <Col xs={24} sm={12} key={type.key}>
            <Card
              hoverable
              onClick={() => onSelectType(type.key)}
              style={{
                borderColor: selectedType === type.key ? type.color : undefined,
                borderWidth: selectedType === type.key ? 2 : 1,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              bodyStyle={{ padding: 16 }}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space>
                  <div style={{ fontSize: 24, color: type.color }}>
                    {type.icon}
                  </div>
                  <div>
                    <Text strong>{type.title}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {type.description.substring(0, 50)}...
                    </Text>
                  </div>
                </Space>
                <ArrowRightOutlined style={{ color: type.color }} />
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <Card 
      bordered={false}
      style={{ marginBottom: 24 }}
    >
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ marginBottom: 8 }}>
          <FileTextOutlined /> Select Report Type
        </Title>
        <Text type="secondary">
          Choose the type of report you want to generate. Each report provides specific insights and analysis.
        </Text>
      </div>
      
      <Row gutter={[16, 16]}>
        {reportTypes.map(type => (
          <Col xs={24} sm={12} lg={6} key={type.key}>
            <Badge.Ribbon 
              text={<><StarOutlined /> Popular</>} 
              color={type.color}
              style={{ display: type.popular ? 'block' : 'none' }}
            >
              <Card
                hoverable
                onClick={() => onSelectType(type.key)}
                style={{
                  borderColor: selectedType === type.key ? type.color : undefined,
                  borderWidth: selectedType === type.key ? 2 : 1,
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: selectedType === type.key ? 'translateY(-4px)' : 'none',
                  boxShadow: selectedType === type.key ? '0 4px 12px rgba(0,0,0,0.15)' : undefined
                }}
                bodyStyle={{ textAlign: 'center', padding: 24 }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Tooltip title={type.description}>
                    <div 
                      style={{ 
                        fontSize: 48, 
                        color: type.color,
                        transition: 'transform 0.3s ease'
                      }}
                    >
                      {type.icon}
                    </div>
                  </Tooltip>
                  
                  <div>
                    <Text strong style={{ fontSize: 16 }}>
                      {type.title}
                    </Text>
                  </div>
                  
                  <Text 
                    type="secondary" 
                    style={{ 
                      fontSize: 12, 
                      textAlign: 'center',
                      display: 'block',
                      minHeight: 60
                    }}
                  >
                    {type.description}
                  </Text>
                  
                  {selectedType === type.key && (
                    <Tag color={type.color} style={{ margin: '8px 0 0' }}>
                      <CheckCircleOutlined /> Selected
                    </Tag>
                  )}
                </Space>
              </Card>
            </Badge.Ribbon>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export const getReportTypes = (token: any): ReportTypeOption[] => [
  {
    key: 'water_quality',
    title: 'Water Quality Report',
    description: 'Comprehensive analysis of water quality parameters including turbidity, TDS, pH levels, and compliance assessment against WHO standards',
    icon: <ExperimentOutlined />,
    color: token.colorInfo,
    popular: true,
  },
];
