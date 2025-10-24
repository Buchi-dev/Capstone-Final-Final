/**
 * UI Types
 * Types specific to UI components and interactions
 */

import type { ReactNode } from 'react';

// ===========================
// LAYOUT TYPES
// ===========================

export interface LayoutProps {
  children: ReactNode;
}

export interface MenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  path?: string;
  children?: MenuItem[];
  disabled?: boolean;
}

// ===========================
// MODAL TYPES
// ===========================

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  width?: number | string;
}

// ===========================
// FORM TYPES
// ===========================

export interface FormFieldProps {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export interface FormState<T = unknown> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

// ===========================
// TABLE TYPES
// ===========================

export interface TableProps<T = unknown> {
  data: T[];
  columns: TableColumnConfig<T>[];
  loading?: boolean;
  pagination?: TablePaginationConfig;
  onChange?: (pagination: TablePaginationConfig, filters: unknown, sorter: unknown) => void;
}

export interface TableColumnConfig<T = unknown> {
  key: string;
  title: string;
  dataIndex: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sorter?: boolean | ((a: T, b: T) => number);
  render?: (value: unknown, record: T, index: number) => ReactNode;
  fixed?: 'left' | 'right';
}

export interface TablePaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showTotal?: (total: number) => string;
  pageSizeOptions?: number[];
}

// ===========================
// CHART TYPES
// ===========================

export interface ChartDataPoint {
  x: string | number;
  y: number;
  category?: string;
  [key: string]: unknown;
}

export interface ChartConfig {
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  height?: number;
  colors?: string[];
}

// ===========================
// NOTIFICATION TYPES
// ===========================

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationConfig {
  type: NotificationType;
  message: string;
  description?: string;
  duration?: number;
}

// ===========================
// THEME TYPES
// ===========================

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeConfig {
  mode: ThemeMode;
  primaryColor?: string;
  borderRadius?: number;
  fontSize?: number;
}

// ===========================
// BADGE/TAG TYPES
// ===========================

export type BadgeStatus = 'default' | 'success' | 'processing' | 'error' | 'warning';

export interface BadgeProps {
  status: BadgeStatus;
  text: string;
  icon?: ReactNode;
}

// ===========================
// DROPDOWN/SELECT TYPES
// ===========================

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

// ===========================
// BREADCRUMB TYPES
// ===========================

export interface BreadcrumbItem {
  title: string;
  path?: string;
  icon?: ReactNode;
}

// ===========================
// LOADING/SPINNER TYPES
// ===========================

export interface LoadingProps {
  size?: 'small' | 'default' | 'large';
  tip?: string;
  spinning?: boolean;
  fullscreen?: boolean;
}
