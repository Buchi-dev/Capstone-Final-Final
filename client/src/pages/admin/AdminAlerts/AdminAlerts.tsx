/**
 * AdminAlerts - Manage Alerts Page
 * 
 * View, manage, and configure water quality alerts with real-time updates.
 * 
 * Architecture:
 * ✅ Service Layer → Global Hooks → UI Components
 * 
 * Data Flow:
 * - READ: useAlerts() - Real-time alerts with SWR polling
 * - WRITE: useAlertMutations() - Alert operations (acknowledge, resolve)
 * - UI Logic: Local hooks for filtering and statistics (useAlertFilters, useAlertStats)
 * 
 * @module pages/admin/AdminAlerts
 */

import { useState, useEffect } from 'react';
import { Layout, Space, message } from 'antd';
import { BellOutlined, ReloadOutlined } from '@ant-design/icons';
import type { WaterQualityAlert } from '../../../schemas';
import { AdminLayout } from '../../../components/layouts/AdminLayout';
import { PageHeader } from '../../../components/PageHeader';
import { useAlerts, useAlertMutations } from '../../../hooks';
import { useAlertStats, useAlertFilters } from './hooks';
import {
  AlertStatistics,
  AlertFilters,
  AlertsTable,
  AlertDetailsDrawer,
} from './components';

const { Content } = Layout;

export const AdminAlerts = () => {
  const [selectedAlert, setSelectedAlert] = useState<WaterQualityAlert | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // ✅ GLOBAL READ HOOK - Real-time alerts with SWR polling
  const { alerts, isLoading: loading, error: alertsError, refetch } = useAlerts({ 
    filters: { limit: 100 },
    pollInterval: 5000 // Poll every 5 seconds
  });

  // ✅ GLOBAL WRITE HOOK - Alert operations (acknowledge, resolve)
  const { 
    acknowledgeAlert, 
    resolveAlert, 
    isLoading: isOperating,
    error: operationError,
  } = useAlertMutations();

  // ✅ LOCAL UI HOOKS - UI-specific filtering and statistics
  const { filteredAlerts, filters, setFilters, clearFilters } = useAlertFilters(alerts);
  const stats = useAlertStats(filteredAlerts);

  // Handle errors from global hooks
  useEffect(() => {
    if (alertsError) {
      console.error('Error loading alerts:', alertsError);
      message.error('Failed to load alerts');
    }
  }, [alertsError]);

  useEffect(() => {
    if (operationError) {
      console.error('Alert operation error:', operationError);
      message.error(operationError.message);
    }
  }, [operationError]);

  const handleClearFilters = () => {
    clearFilters();
    message.info('Filters cleared');
  };

  const viewAlertDetails = (alert: WaterQualityAlert) => {
    setSelectedAlert(alert);
    setDetailsVisible(true);
  };

  // ✅ Use global write hook for batch operations
  const handleBatchAcknowledge = async (alertIds: string[]) => {
    try {
      const results = await Promise.allSettled(
        alertIds.map((id) => acknowledgeAlert(id))
      );
      
      const failed = results
        .map((result, idx) => (result.status === 'rejected' ? alertIds[idx] : null))
        .filter((id): id is string => id !== null);
      
      if (failed.length === 0) {
        message.success(`All ${alertIds.length} alerts acknowledged successfully`);
      } else if (failed.length === alertIds.length) {
        message.error('Failed to acknowledge any selected alerts');
      } else {
        message.warning(
          `Acknowledged ${alertIds.length - failed.length} of ${alertIds.length} alerts. ${failed.length} failed.`
        );
      }
      
      // Refresh data
      await refetch();
    } catch (error) {
      message.error('Failed to acknowledge alerts');
    }
  };

  return (
    <AdminLayout>
      <Content style={{ padding: '24px' }}>
        <PageHeader
          title="Water Quality Alerts"
          icon={<BellOutlined />}
          description="Monitor and manage real-time water quality alerts"
          breadcrumbItems={[
            { title: 'Alerts', icon: <BellOutlined /> }
          ]}
          actions={[
            {
              key: 'refresh',
              label: 'Refresh',
              icon: <ReloadOutlined spin={loading} />,
              onClick: () => window.location.reload(),
              disabled: loading,
            }
          ]}
        />

        <Space direction="vertical" size="large" style={{ width: '100%', marginTop: 24 }}>
          {/* Statistics */}
          <AlertStatistics stats={stats} />

          {/* Filters and Actions */}
          <AlertFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={handleClearFilters}
            totalAlerts={alerts.length}
            filteredCount={filteredAlerts.length}
          />

          {/* Alerts Table */}
          <AlertsTable
            alerts={filteredAlerts}
            loading={loading}
            onViewDetails={viewAlertDetails}
            onAcknowledge={acknowledgeAlert}
            onBatchAcknowledge={handleBatchAcknowledge}
            isAcknowledging={isOperating}
          />
        </Space>

        {/* Alert Details Drawer */}
        <AlertDetailsDrawer
          visible={detailsVisible}
          alert={selectedAlert}
          onClose={() => setDetailsVisible(false)}
          onAcknowledge={acknowledgeAlert}
          onResolve={resolveAlert}
          isAcknowledging={isOperating}
          isResolving={isOperating}
        />
      </Content>
    </AdminLayout>
  );

};
