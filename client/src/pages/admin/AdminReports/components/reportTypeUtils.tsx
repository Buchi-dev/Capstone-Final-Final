/**
 * Report Type Utilities
 * Shared utilities for report type selection
 */

import { ExperimentOutlined } from '@ant-design/icons';
import type { ReportTypeOption } from './ReportTypeSelection';

export const getReportTypes = (token: Record<string, string | number>): ReportTypeOption[] => [
  {
    key: 'water_quality',
    title: 'Water Quality Report',
    description: 'Comprehensive analysis of water quality parameters including turbidity, TDS, pH levels, and compliance assessment against WHO standards',
    icon: <ExperimentOutlined />,
    color: token.colorInfo as string,
    popular: true,
  },
];
