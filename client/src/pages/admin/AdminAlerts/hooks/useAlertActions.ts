import { message } from 'antd';
import { alertsService } from '../../../../services/alerts.Service';

/**
 * Custom hook to manage alert actions (acknowledge, resolve)
 * @returns Functions to acknowledge and resolve alerts
 */
export const useAlertActions = () => {
  const acknowledgeAlert = async (alertId: string) => {
    try {
      await alertsService.acknowledgeAlert(alertId);
      message.success('Alert acknowledged successfully');
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to acknowledge alert';
      message.error(errorMessage);
    }
  };

  const resolveAlert = async (alertId: string, notes?: string) => {
    try {
      await alertsService.resolveAlert(alertId, notes);
      message.success('Alert resolved successfully');
      return true;
    } catch (error) {
      console.error('Error resolving alert:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve alert';
      message.error(errorMessage);
      return false;
    }
  };

  return {
    acknowledgeAlert,
    resolveAlert,
  };
};
