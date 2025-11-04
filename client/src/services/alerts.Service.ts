import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import type {
  WaterQualityAlert,
  AcknowledgeAlertRequest,
  ResolveAlertRequest,
  AlertResponse,
} from '../schemas';

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

const ERROR_MESSAGES: Record<string, string> = {
  'functions/unauthenticated': 'Please log in to perform this action',
  'functions/permission-denied': 'You do not have permission to manage alerts',
  'functions/not-found': 'Alert not found',
  'functions/already-exists': 'Alert already exists',
  'functions/invalid-argument': 'Invalid request parameters',
  'functions/internal': 'An internal error occurred. Please try again',
  'functions/unavailable': 'Alert service temporarily unavailable. Please try again',
  'functions/deadline-exceeded': 'Request timeout. Please try again',
};

export class AlertsService {
  private readonly functions = getFunctions();
  private readonly functionName = 'alertManagement';
  private readonly db = getFirestore();

  // ============================================================================
  // WRITE OPERATIONS (Client → Cloud Functions → Firestore)
  // ============================================================================

  private async callFunction<T>(action: string, data: Omit<T, 'action'>): Promise<void> {
    try {
      const callable = httpsCallable<T, AlertResponse>(this.functions, this.functionName);
      const result = await callable({ action, ...data } as T);

      if (!result.data.success) {
        throw new Error(result.data.error || `Failed to ${action}`);
      }
    } catch (error: any) {
      throw this.handleError(error, `Failed to ${action}`);
    }
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    return this.callFunction<AcknowledgeAlertRequest>('acknowledgeAlert', { alertId });
  }

  async resolveAlert(alertId: string, notes?: string): Promise<void> {
    return this.callFunction<ResolveAlertRequest>('resolveAlert', { alertId, notes });
  }

  // ============================================================================
  // READ OPERATIONS (Client → Firestore Real-time Listener)
  // ============================================================================

  subscribeToAlerts(
    onUpdate: (alerts: WaterQualityAlert[]) => void,
    onError: (error: Error) => void,
    maxAlerts: number = 20
  ): Unsubscribe {
    const alertsQuery = query(
      collection(this.db, 'alerts'),
      orderBy('createdAt', 'desc'),
      limit(maxAlerts)
    );

    return onSnapshot(
      alertsQuery,
      (snapshot) => {
        const alerts = snapshot.docs.map((doc) => ({
          alertId: doc.id,
          ...doc.data(),
        } as WaterQualityAlert));
        onUpdate(alerts);
      },
      (err) => onError(err instanceof Error ? err : new Error('Failed to fetch alerts'))
    );
  }

  private handleError(error: any, defaultMessage: string): ErrorResponse {
    console.error('AlertsService error:', error);

    const code = error.code || 'unknown';
    const message = code in ERROR_MESSAGES
      ? (code === 'functions/failed-precondition' ? error.message : ERROR_MESSAGES[code])
      : (error.message || defaultMessage);

    return {
      code,
      message,
      details: error.details,
    };
  }
}

export const alertsService = new AlertsService();
export default alertsService;
