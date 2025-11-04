import { useState } from 'react';
import { message } from 'antd';
import { alertsService } from '../../../../services/alerts.Service';

/**
 * Custom hook to manage alert actions (acknowledge, resolve)
 * @returns Functions to acknowledge and resolve alerts with loading states
 */
export const useAlertActions = () => {
  const [acknowledgingIds, setAcknowledgingIds] = useState<Set<string>>(new Set());
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

  const acknowledgeAlert = async (alertId: string) => {
    setAcknowledgingIds(prev => new Set(prev).add(alertId));
    const hideLoading = message.loading('Acknowledging alert...', 0);
    
    try {
      await alertsService.acknowledgeAlert(alertId);
      hideLoading();
      message.success('Alert acknowledged successfully');
    } catch (error) {
      hideLoading();
      console.error('Error acknowledging alert:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to acknowledge alert';
      message.error(errorMessage);
    } finally {
      setAcknowledgingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const resolveAlert = async (alertId: string, notes?: string) => {
    setResolvingIds(prev => new Set(prev).add(alertId));
    const hideLoading = message.loading('Resolving alert...', 0);
    
    try {
      await alertsService.resolveAlert(alertId, notes);
      hideLoading();
      message.success('Alert resolved successfully');
      return true;
    } catch (error) {
      hideLoading();
      console.error('Error resolving alert:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve alert';
      message.error(errorMessage);
      return false;
    } finally {
      setResolvingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const isAcknowledging = (alertId: string) => acknowledgingIds.has(alertId);
  const isResolving = (alertId: string) => resolvingIds.has(alertId);

  return {
    acknowledgeAlert,
    resolveAlert,
    isAcknowledging,
    isResolving,
  };
};
