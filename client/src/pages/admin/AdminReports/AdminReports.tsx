/**
 * AdminReports Page - Simplified Water Quality Report Generation
 * 
 * Clean, user-friendly interface for generating water quality reports
 * with compliance assessment.
 * 
 * Architecture:
 * - Global hooks: useRealtime_Devices (device data), useCall_Reports (report generation)
 * - Local hook: useReportHistory (localStorage UI state)
 * 
 * @module pages/admin/AdminReports
 */
import { useState, useMemo } from 'react';
import { 
  Row, 
  Col, 
  Typography, 
  Card, 
  Space, 
  Button,
  Divider,
  Statistic,
  Form,
  Select,
  DatePicker,
  Input,
  Switch,
  Alert,
  List,
  Tag,
  Empty,
  message
} from 'antd';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  FileTextOutlined, 
  HistoryOutlined,
  DownloadOutlined,
  CalendarOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

dayjs.extend(relativeTime);
import { AdminLayout } from '../../../components/layouts';
import type { Device } from '../../../schemas';
import { useThemeToken } from '../../../theme';

// Global Hooks
import { useRealtime_Devices, useCall_Reports } from '../../../hooks';

// Local UI Hooks
import { useReportHistory } from './hooks';

// PDF Templates
import { generateWaterQualityReport } from './templates';

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

/**
 * Simplified Water Quality Report Generation Interface
 */
export const AdminReports = () => {
  const token = useThemeToken();
  const [showHistory, setShowHistory] = useState(false);
  const [form] = Form.useForm();

  // Global hooks
  const { devices: devicesWithReadings, isLoading: devicesLoading } = useRealtime_Devices();
  const { 
    generateWaterQualityReport: fetchWaterQualityData,
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

  // Set default values for form
  useMemo(() => {
    form.setFieldsValue({
      dateRange: [dayjs().subtract(7, 'days'), dayjs()],
      includeStatistics: true,
      includeCharts: true,
    });
  }, [form]);

  const handleGenerateReport = async (values: any) => {
    try {
      resetReportState();
      
      const { dateRange, devices: deviceIds, title, notes, includeStatistics, includeCharts } = values;
      const startDate = dateRange?.[0]?.valueOf();
      const endDate = dateRange?.[1]?.valueOf();

      message.loading({ content: 'Generating report...', key: 'report', duration: 0 });

      // Fetch water quality data with compliance information
      const reportData = await fetchWaterQualityData(deviceIds, startDate, endDate);

      if (reportData) {
        // Create report configuration
        const reportConfig = {
          type: 'water_quality' as const,
          title: title || 'Water Quality Analysis Report',
          deviceIds: deviceIds || [],
          dateRange: dateRange || null,
          generatedBy: 'Administrator',
          notes: notes || '',
          includeStatistics: includeStatistics !== false,
          includeRawData: false,
          includeCharts: includeCharts !== false,
        };

        // Generate PDF
        const pdfDoc = await generateWaterQualityReport(reportConfig, reportData);

        if (pdfDoc) {
          const filename = `water_quality_report_${dayjs().format('YYYY-MM-DD_HHmmss')}.pdf`;
          pdfDoc.save(filename);

          // Add to history
          const historyItem = {
            id: `report-${Date.now()}`,
            type: 'water_quality' as const,
            title: reportConfig.title,
            generatedAt: new Date(),
            devices: deviceIds?.length || 0,
            pages: pdfDoc.getNumberOfPages() || 1,
          };
          addReportToHistory(historyItem);

          message.success({ content: 'Report generated and downloaded successfully!', key: 'report' });
          form.resetFields();
        }
      }
    } catch (error) {
      message.error({ content: error instanceof Error ? error.message : 'Failed to generate report', key: 'report' });
      console.error('[AdminReports] Report generation failed:', error);
    }
  };



  return (
    <AdminLayout>
      <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <Card 
          style={{ 
            marginBottom: 24,
            background: '#ffffff',
            borderTop: `4px solid ${token.colorPrimary}`,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
          }}
          bordered={false}
        >
          <Row justify="space-between" align="middle">
            <Col>
              <Space direction="vertical" size={4}>
                <Title level={2} style={{ margin: 0 }}>
                  <FileTextOutlined /> Water Quality Reports
                </Title>
                <Paragraph style={{ margin: 0, fontSize: 16 }} type="secondary">
                  Generate comprehensive water quality analysis reports with compliance assessment
                </Paragraph>
              </Space>
            </Col>
            <Col>
              <Button 
                icon={<HistoryOutlined />} 
                onClick={() => setShowHistory(!showHistory)}
                type={showHistory ? 'primary' : 'default'}
              >
                History ({reportHistory.length})
              </Button>
            </Col>
          </Row>
        </Card>

        <Row gutter={24}>
          {/* Main Form Section */}
          <Col xs={24} lg={showHistory ? 16 : 24}>
            <Card
              title={
                <Space>
                  <ExperimentOutlined style={{ color: token.colorPrimary }} />
                  <span>Generate Report</span>
                </Space>
              }
              extra={
                <Tag color="blue" icon={<CheckCircleOutlined />}>
                  Includes Compliance Assessment
                </Tag>
              }
            >
              <Alert
                message="Water Quality & Compliance Report"
                description="This report includes comprehensive water quality analysis (pH, TDS, Turbidity) and WHO standards compliance assessment for the selected devices and time period."
                type="info"
                showIcon
                style={{ marginBottom: 24 }}
              />

              <Form
                form={form}
                layout="vertical"
                onFinish={handleGenerateReport}
                initialValues={{
                  dateRange: [dayjs().subtract(7, 'days'), dayjs()],
                  includeStatistics: true,
                  includeCharts: true,
                }}
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label={
                        <Space>
                          <CalendarOutlined />
                          <span>Date Range</span>
                        </Space>
                      }
                      name="dateRange"
                      rules={[{ required: true, message: 'Please select a date range' }]}
                    >
                      <RangePicker 
                        style={{ width: '100%' }}
                        format="YYYY-MM-DD"
                        disabled={generating}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item
                      label={
                        <Space>
                          <DatabaseOutlined />
                          <span>Select Devices</span>
                        </Space>
                      }
                      name="devices"
                      rules={[{ required: true, message: 'Please select at least one device' }]}
                    >
                      <Select
                        mode="multiple"
                        placeholder="Select devices to include"
                        loading={devicesLoading}
                        disabled={generating}
                        options={devices.map(d => ({
                          label: `${d.name} (${d.deviceId})`,
                          value: d.deviceId,
                        }))}
                        maxTagCount="responsive"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="Report Title (Optional)"
                  name="title"
                >
                  <Input 
                    placeholder="e.g., Weekly Water Quality Report"
                    disabled={generating}
                  />
                </Form.Item>

                <Form.Item
                  label="Notes (Optional)"
                  name="notes"
                >
                  <TextArea 
                    rows={3}
                    placeholder="Add any notes or observations to include in the report..."
                    disabled={generating}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Include Statistics"
                      name="includeStatistics"
                      valuePropName="checked"
                    >
                      <Switch 
                        checkedChildren="Yes" 
                        unCheckedChildren="No"
                        disabled={generating}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Include Charts"
                      name="includeCharts"
                      valuePropName="checked"
                    >
                      <Switch 
                        checkedChildren="Yes" 
                        unCheckedChildren="No"
                        disabled={generating}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider />

                <Form.Item style={{ marginBottom: 0 }}>
                  <Space style={{ width: '100%', justifyContent: 'center' }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      icon={<DownloadOutlined />}
                      loading={generating}
                      disabled={devicesLoading}
                      style={{ minWidth: 200 }}
                    >
                      {generating ? 'Generating Report...' : 'Generate & Download Report'}
                    </Button>
                  </Space>
                </Form.Item>
              </Form>

              {/* Quick Stats */}
              <Divider />
              <Row gutter={16} style={{ marginTop: 24 }}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Active Devices"
                    value={devices.filter(d => d.status === 'online').length}
                    suffix={`/ ${devices.length}`}
                    valueStyle={{ color: token.colorSuccess }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Total Reports"
                    value={reportHistory.length}
                    prefix={<FileTextOutlined />}
                    valueStyle={{ color: token.colorPrimary }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Last Generated"
                    value={reportHistory.length > 0 ? dayjs(reportHistory[0].generatedAt).fromNow() : 'Never'}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Available Sensors"
                    value={devices.reduce((acc, d) => acc + (d.sensors?.length || 0), 0)}
                    valueStyle={{ color: token.colorInfo }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          {/* History Sidebar */}
          {showHistory && (
            <Col xs={24} lg={8}>
              <Card
                title={
                  <Space>
                    <HistoryOutlined />
                    <span>Report History</span>
                  </Space>
                }
                bodyStyle={{ padding: '12px' }}
              >
                {reportHistory.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No reports generated yet"
                    style={{ padding: '40px 0' }}
                  />
                ) : (
                  <List
                    dataSource={reportHistory.slice(0, 10)}
                    renderItem={(item) => (
                      <List.Item
                        style={{ 
                          padding: '12px',
                          borderRadius: 8,
                          marginBottom: 8,
                          background: '#fafafa'
                        }}
                      >
                        <List.Item.Meta
                          avatar={<FileTextOutlined style={{ fontSize: 20, color: token.colorPrimary }} />}
                          title={
                            <Text strong ellipsis style={{ fontSize: 13 }}>
                              {item.title}
                            </Text>
                          }
                          description={
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                <ClockCircleOutlined /> {dayjs(item.generatedAt).format('MMM D, YYYY h:mm A')}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                <DatabaseOutlined /> {item.devices} device{item.devices !== 1 ? 's' : ''}
                              </Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          )}
        </Row>
      </div>
    </AdminLayout>
  );
};
