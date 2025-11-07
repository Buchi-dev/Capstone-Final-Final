import { 
  Form, 
  Input, 
  Select, 
  DatePicker, 
  Checkbox, 
  Button, 
  Space, 
  Card, 
  Row, 
  Col,
  Divider,
  Typography,
  Alert,
  Tooltip,
  Tag
} from 'antd';
import { 
  DownloadOutlined, 
  LeftOutlined,
  FilePdfOutlined,
  InfoCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { FormInstance } from 'antd';
import type { Device, ReportType } from '../../../../schemas';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Text } = Typography;

interface ReportConfigFormProps {
  form: FormInstance;
  devices: Device[];
  loading: boolean;
  generating: boolean;
  onFinish: (values: any) => void;
  selectedType?: ReportType;
  onBack?: () => void;
}

export const ReportConfigForm = ({
  form,
  devices,
  loading,
  generating,
  onFinish,
  selectedType,
  onBack,
}: ReportConfigFormProps) => {
  const getReportTypeInfo = () => {
    switch (selectedType) {
      case 'water_quality':
        return {
          title: 'Water Quality Report Configuration',
          description: 'Configure parameters for comprehensive water quality analysis',
          color: '#1890ff'
        };
      case 'device_status':
        return {
          title: 'Device Status Report Configuration',
          description: 'Set up device health and connectivity monitoring report',
          color: '#52c41a'
        };
      case 'data_summary':
        return {
          title: 'Data Summary Report Configuration',
          description: 'Configure statistical analysis and data trends report',
          color: '#722ed1'
        };
      case 'compliance':
        return {
          title: 'Compliance Report Configuration',
          description: 'Set up regulatory compliance verification report',
          color: '#fa8c16'
        };
      default:
        return {
          title: 'Report Configuration',
          description: 'Configure your report parameters',
          color: '#1890ff'
        };
    }
  };

  const reportInfo = getReportTypeInfo();

  return (
    <Card
      bordered={false}
      title={
        <Space>
          <SettingOutlined style={{ color: reportInfo.color }} />
          <span>{reportInfo.title}</span>
        </Space>
      }
      extra={
        onBack && (
          <Button icon={<LeftOutlined />} onClick={onBack}>
            Back to Report Types
          </Button>
        )
      }
    >
      <Alert
        message={reportInfo.description}
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
        icon={<InfoCircleOutlined />}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          includeStatistics: true,
          includeRawData: true,
          includeCharts: false,
        }}
        requiredMark="optional"
      >
        <Row gutter={16}>
          <Col xs={24} lg={12}>
            <Form.Item
              label={
                <Space>
                  <Text strong>Report Title</Text>
                  <Tooltip title="Give your report a descriptive title">
                    <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                  </Tooltip>
                </Space>
              }
              name="title"
              rules={[
                { required: true, message: 'Please enter report title' },
                { min: 5, message: 'Title must be at least 5 characters' }
              ]}
            >
              <Input 
                placeholder="e.g., Monthly Water Quality Report - November 2025" 
                size="large"
                prefix={<FilePdfOutlined />}
              />
            </Form.Item>
          </Col>

          <Col xs={24} lg={12}>
            <Form.Item
              label={
                <Space>
                  <Text strong>Date Range</Text>
                  <Tooltip title="Select the time period for data analysis">
                    <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                  </Tooltip>
                </Space>
              }
              name="dateRange"
            >
              <RangePicker
                style={{ width: '100%' }}
                size="large"
                format="YYYY-MM-DD"
                suffixIcon={<CalendarOutlined />}
                presets={[
                  { label: 'Today', value: [dayjs().startOf('day'), dayjs()] },
                  { label: 'Last 7 Days', value: [dayjs().subtract(7, 'd'), dayjs()] },
                  { label: 'Last 30 Days', value: [dayjs().subtract(30, 'd'), dayjs()] },
                  { label: 'Last 90 Days', value: [dayjs().subtract(90, 'd'), dayjs()] },
                  { label: 'This Month', value: [dayjs().startOf('month'), dayjs()] },
                  { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
                  { label: 'This Year', value: [dayjs().startOf('year'), dayjs()] },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label={
            <Space>
              <Text strong>Select Devices</Text>
              <Tag color="blue">{devices.length} available</Tag>
              <Tooltip title="Choose which devices to include in this report">
                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            </Space>
          }
          name="devices"
          rules={[{ required: true, message: 'Please select at least one device' }]}
        >
          <Select
            mode="multiple"
            placeholder="Select devices to include in the report"
            loading={loading}
            showSearch
            size="large"
            maxTagCount="responsive"
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={devices.map(device => ({
              value: device.deviceId,
              label: `${device.name} (${device.deviceId})`,
            }))}
            notFoundContent={loading ? 'Loading devices...' : 'No devices found'}
          />
        </Form.Item>

        <Divider orientation="left">
          <Space>
            <CheckCircleOutlined />
            <Text strong>Report Options</Text>
          </Space>
        </Divider>

        <Card size="small" style={{ backgroundColor: '#fafafa', marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name="includeStatistics" valuePropName="checked" noStyle>
              <Checkbox>
                <Space>
                  <Text strong>Include Statistical Summary</Text>
                  <Tooltip title="Add averages, min/max values, and trends">
                    <InfoCircleOutlined style={{ fontSize: 12 }} />
                  </Tooltip>
                </Space>
              </Checkbox>
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12, paddingLeft: 24 }}>
              Includes averages, min/max values, standard deviation, and trend analysis
            </Text>
          </Space>
        </Card>

        <Card size="small" style={{ backgroundColor: '#fafafa', marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name="includeRawData" valuePropName="checked" noStyle>
              <Checkbox>
                <Space>
                  <Text strong>Include Detailed Data Tables</Text>
                  <Tooltip title="Add complete data tables with all readings">
                    <InfoCircleOutlined style={{ fontSize: 12 }} />
                  </Tooltip>
                </Space>
              </Checkbox>
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12, paddingLeft: 24 }}>
              Complete data tables with timestamps and sensor readings for detailed analysis
            </Text>
          </Space>
        </Card>

        <Card size="small" style={{ backgroundColor: '#f0f0f0', marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item name="includeCharts" valuePropName="checked" noStyle>
              <Checkbox disabled>
                <Space>
                  <Text strong type="secondary">Include Charts & Graphs</Text>
                  <Tag color="orange">Coming Soon</Tag>
                </Space>
              </Checkbox>
            </Form.Item>
            <Text type="secondary" style={{ fontSize: 12, paddingLeft: 24 }}>
              Visual representations of data trends and patterns (feature in development)
            </Text>
          </Space>
        </Card>

        <Form.Item 
          label={
            <Space>
              <Text strong>Additional Notes</Text>
              <Text type="secondary">(Optional)</Text>
            </Space>
          }
          name="notes"
        >
          <TextArea
            rows={4}
            placeholder="Add any additional notes, observations, or context to include in the report executive summary..."
            showCount
            maxLength={500}
          />
        </Form.Item>

        <Divider />

        <Form.Item style={{ marginBottom: 0 }}>
          <Row justify="space-between" align="middle">
            <Col>
              {onBack && (
                <Button 
                  icon={<LeftOutlined />} 
                  onClick={onBack}
                  size="large"
                >
                  Back
                </Button>
              )}
            </Col>
            <Col>
              <Space>
                <Button 
                  type="default" 
                  size="large"
                  onClick={() => form.resetFields()}
                >
                  Reset Form
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<DownloadOutlined />}
                  loading={generating}
                  size="large"
                >
                  {generating ? 'Generating Report...' : 'Generate PDF Report'}
                </Button>
              </Space>
            </Col>
          </Row>
        </Form.Item>
      </Form>
    </Card>
  );
};
