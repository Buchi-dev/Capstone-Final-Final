/**
 * Common Types
 * Generic types used across the application
 */

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Sort types
export type SortOrder = 'ascend' | 'descend' | null;

export interface SortParams {
  field: string;
  order: SortOrder;
}

// Filter types
export interface FilterParams {
  [key: string]: string | number | boolean | string[] | number[] | undefined;
}

// Generic response wrapper
export interface GenericResponse<T = unknown> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

// Loading state
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Date range
export interface DateRange {
  start: number | Date;
  end: number | Date;
}

// Key-value pair
export interface KeyValuePair<T = string> {
  key: string;
  value: T;
  label?: string;
}

// Option for select/dropdown
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

// Table column configuration
export interface TableColumn<T = unknown> {
  key: string;
  title: string;
  dataIndex: string;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
  sorter?: boolean;
  render?: (value: unknown, record: T) => React.ReactNode;
}

// Status type
export type Status = 'idle' | 'loading' | 'success' | 'error';

// Async state
export interface AsyncState<T> {
  data: T | null;
  status: Status;
  error: string | null;
}
