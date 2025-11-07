import { useState } from 'react';
import { 
  Row, 
  Col, 
  Typography, 
  Steps, 
  Card, 
  Space, 
  Segmented,
  Divider,
  Statistic,
  Badge,
  FloatButton
} from 'antd';
import { 
  FileTextOutlined, 
  DashboardOutlined,
  HistoryOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import type { ReportType } from '../../../schemas';
import { useThemeToken } from '../../../theme';
import { Form } from 'antd';

// Components
import {
  ReportTypeSelection,
  getReportTypes,
  ReportConfigForm,
  ReportHistorySidebar,
  ReportPreviewPanel,
  QuickStatsPanel
} from './components';

// Hooks
import {
  useDevices,
  useReportHistory,
  useReportGeneration,
} from './hooks';

const { Title, Paragraph } = Typography;

type ViewMode = 'wizard' | 'dashboard' | 'history';

export const AdminReports = () => {
  const token = useThemeToken();
  const [selectedType, setSelectedType] = useState<ReportType>('water_quality');
  const [currentStep, setCurrentStep] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('wizard');
  const [form] = Form.useForm();

  // Custom hooks
  const { devices, loading } = useDevices();
  const { reportHistory, addReportToHistory } = useReportHistory();
  const { generating, handleGenerateReport } = useReportGeneration(devices, addReportToHistory);

  const reportTypes = getReportTypes(token);

  const onFinish = (values: any) => {
    handleGenerateReport(selectedType, values);
  };

  const steps = [
    {
      title: 'Report Type',
      icon: <FileTextOutlined />,
      description: 'Choose your report type'
    },
    {
      title: 'Configuration',
      icon: <SettingOutlined />,
      description: 'Set parameters and options'
    },
    {
      title: 'Preview & Generate',
      icon: <RocketOutlined />,
      description: 'Review and create report'
    },
  ];

  const renderWizardView = () => (
    <>
      {/* Progress Steps */}
      <Card 
        style={{ marginBottom: 24 }}
        bodyStyle={{ paddingTop: 32, paddingBottom: 32 }}
      >
        <Steps 
          current={currentStep} 
          items={steps}
          onChange={setCurrentStep}
          style={{ maxWidth: 900, margin: '0 auto' }}
        />
      </Card>

      {/* Step Content */}
      {currentStep === 0 && (
        <ReportTypeSelection
          selectedType={selectedType}
          onSelectType={(type) => {
            setSelectedType(type);
            setCurrentStep(1);
          }}
          reportTypes={reportTypes}
        />
      )}

      {currentStep === 1 && (
        <Row gutter={24}>
          <Col xs={24} xl={16}>
            <ReportConfigForm
              form={form}
              devices={devices}
              loading={loading}
              generating={generating}
              onFinish={(values) => {
                onFinish(values);
                setCurrentStep(2);
              }}
              selectedType={selectedType}
              onBack={() => setCurrentStep(0)}
            />
          </Col>
          <Col xs={24} xl={8}>
            <QuickStatsPanel 
              devices={devices}
              reportHistory={reportHistory}
            />
          </Col>
        </Row>
      )}

      {currentStep === 2 && (
        <ReportPreviewPanel
          selectedType={selectedType}
          formValues={form.getFieldsValue()}
          devices={devices}
          onGenerate={() => onFinish(form.getFieldsValue())}
          onBack={() => setCurrentStep(1)}
          generating={generating}
        />
      )}
    </>
  );

  const renderDashboardView = () => (
    <Row gutter={24}>
      <Col xs={24} lg={16}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Quick Actions */}
          <Card 
            title={
              <Space>
                <RocketOutlined />
                <span>Quick Generate</span>
              </Space>
            }
          >
            <ReportTypeSelection
              selectedType={selectedType}
              onSelectType={(type) => {
                setSelectedType(type);
                setViewMode('wizard');
                setCurrentStep(1);
              }}
              reportTypes={reportTypes}
              compact
            />
          </Card>

          {/* Recent Activity */}
          <ReportHistorySidebar
            reportHistory={reportHistory.slice(0, 5)}
            token={token}
            title="Recent Reports"
            showViewAll
            onViewAll={() => setViewMode('history')}
          />
        </Space>
      </Col>
      <Col xs={24} lg={8}>
        <QuickStatsPanel 
          devices={devices}
          reportHistory={reportHistory}
          detailed
        />
      </Col>
    </Row>
  );

  const renderHistoryView = () => (
    <Card>
      <ReportHistorySidebar
        reportHistory={reportHistory}
        token={token}
        fullView
      />
    </Card>
  );

  return (
    <AdminLayout>
      <div style={{ padding: '24px', maxWidth: 1600, margin: '0 auto' }}>
        {/* Header */}
        <Card 
          style={{ 
            marginBottom: 24,
            background: `linear-gradient(135deg, ${token.colorPrimary}15 0%, ${token.colorPrimaryBg} 100%)`
          }}
          bordered={false}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Space direction="vertical" size={4}>
                <Title level={2} style={{ margin: 0 }}>
                  <FileTextOutlined /> Report Management Center
                </Title>
                <Paragraph style={{ margin: 0, fontSize: 16 }} type="secondary">
                  Generate comprehensive reports for water quality analysis, device monitoring, and compliance tracking
                </Paragraph>
              </Space>
            </Col>
            <Col>
              <Statistic 
                title="Total Reports Generated" 
                value={reportHistory.length} 
                prefix={<Badge status="success" />}
                valueStyle={{ color: token.colorSuccess }}
              />
            </Col>
          </Row>

          <Divider style={{ marginTop: 20, marginBottom: 20 }} />

          {/* View Mode Toggle */}
          <Row justify="center">
            <Segmented
              size="large"
              value={viewMode}
              onChange={(value) => {
                setViewMode(value as ViewMode);
                if (value === 'wizard') setCurrentStep(0);
              }}
              options={[
                {
                  label: (
                    <Space>
                      <RocketOutlined />
                      <span>Create Report</span>
                    </Space>
                  ),
                  value: 'wizard',
                },
                {
                  label: (
                    <Space>
                      <DashboardOutlined />
                      <span>Dashboard</span>
                    </Space>
                  ),
                  value: 'dashboard',
                },
                {
                  label: (
                    <Space>
                      <HistoryOutlined />
                      <span>History</span>
                      {reportHistory.length > 0 && (
                        <Badge count={reportHistory.length} showZero={false} />
                      )}
                    </Space>
                  ),
                  value: 'history',
                },
              ]}
            />
          </Row>
        </Card>

        {/* Main Content */}
        {viewMode === 'wizard' && renderWizardView()}
        {viewMode === 'dashboard' && renderDashboardView()}
        {viewMode === 'history' && renderHistoryView()}

        {/* Help Float Button */}
        <FloatButton 
          icon={<QuestionCircleOutlined />} 
          type="primary"
          tooltip="Report Generation Help"
        />
      </div>
    </AdminLayout>
  );
};
