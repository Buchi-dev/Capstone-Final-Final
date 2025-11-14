/**
 * AdminReports Page
 * 
 * Comprehensive report generation system with multi-step wizard.
 * Uses global hooks for data operations following architecture guidelines.
 * 
 * Architecture:
 * - Global hooks: useRealtime_Devices (device data), useCall_Reports (report generation)
 * - Local hook: useReportHistory (localStorage UI state)
 * 
 * Features:
 * - Wizard mode: Step-by-step report creation
 * - Dashboard mode: Quick report generation overview
 * - History mode: View past generated reports
 * 
 * @module pages/admin/AdminReports
 */
import { useState, useMemo } from 'react';
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
  FloatButton,
  message
} from 'antd';
import dayjs from 'dayjs';
import { 
  FileTextOutlined, 
  DashboardOutlined,
  HistoryOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { AdminLayout } from '../../../components/layouts';
import type { ReportType, Device } from '../../../schemas';
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

// Global Hooks
import { useRealtime_Devices, useCall_Reports } from '../../../hooks';

// Local UI Hooks
import { useReportHistory } from './hooks';

// PDF Templates
import {
  generateWaterQualityReport,
  generateDeviceStatusReport,
  generateDataSummaryReport,
  generateComplianceReport,
} from './templates';

const { Title, Paragraph } = Typography;

type ViewMode = 'wizard' | 'dashboard' | 'history';

/**
 * Admin report management center
 * 
 * Multi-mode interface for generating and managing reports:
 * - Water quality reports
 * - Device status reports
 * - Data summary reports
 * - Compliance reports
 */
export const AdminReports = () => {
  const token = useThemeToken();
  const [selectedType, setSelectedType] = useState<ReportType>('water_quality');
  const [currentStep, setCurrentStep] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('wizard');
  const [form] = Form.useForm();

  // Global hooks
  const { devices: devicesWithReadings, isLoading: devicesLoading } = useRealtime_Devices();
  const { 
    generateWaterQualityReport: fetchWaterQualityData,
    generateDeviceStatusReport: fetchDeviceStatusData,
    generateDataSummaryReport: fetchDataSummaryData,
    generateComplianceReport: fetchComplianceData,
    isLoading: generating,
    reset: resetReportState
  } = useCall_Reports();

  // Local UI hooks
  const { reportHistory, addReportToHistory } = useReportHistory();

  // Transform DeviceWithSensorData to Device for component compatibility
  const devices: Device[] = useMemo(() => {
    return devicesWithReadings.map((d) => ({
      id: d.deviceId,
      deviceId: d.deviceId,
      name: d.deviceName,
      type: d.metadata?.type || 'ESP32',
      firmwareVersion: d.metadata?.firmwareVersion || '1.0.0',
      macAddress: d.metadata?.macAddress || 'N/A',
      ipAddress: d.metadata?.ipAddress || 'N/A',
      sensors: d.metadata?.sensors || ['tds', 'ph', 'turbidity'],
      status: d.status,
      registeredAt: d.metadata?.registeredAt,
      lastSeen: d.metadata?.lastSeen,
      metadata: d.metadata?.metadata
    }));
  }, [devicesWithReadings]);

  const reportTypes = getReportTypes(token);

  const onFinish = async (values: any) => {
    try {
      resetReportState();
      
      const { dateRange, devices: deviceIds, title, notes, includeStatistics, includeRawData } = values;
      const startDate = dateRange?.[0]?.valueOf();
      const endDate = dateRange?.[1]?.valueOf();

      console.log('[AdminReports] Starting report generation:', {
        type: selectedType,
        deviceIds,
        startDate: startDate ? new Date(startDate).toISOString() : 'none',
        endDate: endDate ? new Date(endDate).toISOString() : 'none'
      });

      // Step 1: Fetch report data from Cloud Function
      let reportData: any;

      switch (selectedType) {
        case 'water_quality':
          reportData = await fetchWaterQualityData(deviceIds, startDate, endDate);
          break;
        case 'device_status':
          reportData = await fetchDeviceStatusData(deviceIds);
          break;
        case 'data_summary':
          reportData = await fetchDataSummaryData(deviceIds, startDate, endDate);
          break;
        case 'compliance':
          reportData = await fetchComplianceData(deviceIds, startDate, endDate);
          break;
      }

      console.log('[AdminReports] Report data fetched:', reportData);

      if (reportData) {
        // Step 2: Create report configuration
        const reportConfig = {
          type: selectedType,
          title: title || `${selectedType.replace(/_/g, ' ').toUpperCase()} Report`,
          deviceIds: deviceIds || [],
          dateRange: dateRange || null,
          generatedBy: 'Administrator', // TODO: Get from auth context
          notes: notes || '',
          includeStatistics: includeStatistics !== false,
          includeRawData: includeRawData !== false,
          includeCharts: true,
        };

        console.log('[AdminReports] Report config:', reportConfig);

        // Step 3: Generate PDF using appropriate template
        let pdfDoc: any;
        
        try {
          switch (selectedType) {
            case 'water_quality':
              pdfDoc = await generateWaterQualityReport(reportConfig, reportData);
              break;
            case 'device_status':
              pdfDoc = await generateDeviceStatusReport(reportConfig, reportData);
              break;
            case 'data_summary':
              pdfDoc = await generateDataSummaryReport(reportConfig, reportData);
              break;
            case 'compliance':
              pdfDoc = await generateComplianceReport(reportConfig, reportData);
              break;
          }

          console.log('[AdminReports] PDF generated successfully');

          // Step 4: Download the PDF
          if (pdfDoc) {
            const filename = `${selectedType}_report_${dayjs().format('YYYY-MM-DD_HHmmss')}.pdf`;
            pdfDoc.save(filename);
            console.log('[AdminReports] PDF downloaded:', filename);
          }

          // Step 5: Add to history
          const reportTypeLabels = {
            water_quality: 'Water Quality Report',
            device_status: 'Device Status Report',
            data_summary: 'Data Summary Report',
            compliance: 'Compliance Report',
          };

          const historyItem = {
            id: `report-${Date.now()}`,
            type: selectedType,
            title: reportConfig.title,
            generatedAt: new Date(),
            devices: deviceIds?.length || 0,
            pages: pdfDoc?.getNumberOfPages() || 1,
          };
          addReportToHistory(historyItem);

          // Show success message
          message.success(`${reportTypeLabels[selectedType]} generated successfully!`);
        } catch (pdfError) {
          console.error('[AdminReports] PDF generation failed:', pdfError);
          message.error('Failed to generate PDF. Please check the console for details.');
          throw pdfError;
        }
      }
    } catch (error) {
      console.error('[AdminReports] Report generation failed:', error);
      message.error(error instanceof Error ? error.message : 'Failed to generate report');
    }
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
              loading={devicesLoading}
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
