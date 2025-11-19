/**
 * Alerts Service
 * 
 * Manages water quality alerts through Firebase Cloud Functions and Firestore.
 * 
 * Write Operations: Cloud Functions (AlertsCalls)
 * Read Operations: Firestore real-time listeners with defensive caching
 * 
 * Features:
 * - Acknowledge and resolve alerts
 * - Real-time alert subscriptions
 * - Defensive snapshot validation to prevent stale data
 * - Centralized error handling with user-friendly messages
 * 
 * @module services/alerts
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import type {
  WaterQualityAlert,
  AcknowledgeAlertRequest,
  ResolveAlertRequest,
  AlertResponse,
} from '../schemas';
import { dataFlowLogger, DataSource, FlowLayer } from '../utils/dataFlowLogger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ErrorResponse {
  code: string;
  message: string;
  details?: any;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class AlertsService {
  // ==========================================================================
  // PROPERTIES
  // ==========================================================================
  
  private readonly functions = getFunctions();
  private readonly functionName = 'AlertsCalls';
  private readonly db = getFirestore();

  // ==========================================================================
  // ERROR MESSAGES
  // ==========================================================================
  
  private static readonly ERROR_MESSAGES: Record<string, string> = {
    'functions/unauthenticated': 'Please log in to perform this action',
    'functions/permission-denied': 'You do not have permission to manage alerts',
    'functions/not-found': 'Alert not found',
    'functions/failed-precondition': '', // Use backend message (already acknowledged/resolved)
    'functions/invalid-argument': 'Invalid request parameters',
    'functions/internal': 'An internal error occurred. Please try again',
    'functions/unavailable': 'Alert service temporarily unavailable. Please try again',
    'functions/deadline-exceeded': 'Request timeout. Please try again',
  };

  // ==========================================================================
  // WRITE OPERATIONS (Cloud Functions)
  // ==========================================================================

  /**
   * Generic Cloud Function caller with type safety
   * 
   * @template T - Request payload type
   * @param action - Cloud Function action name
   * @param data - Request data (without action field)
   * @throws {ErrorResponse} Transformed error with user-friendly message
   */
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

  /**
   * Acknowledge an alert
   * 
   * @param alertId - ID of the alert to acknowledge
   * @throws {ErrorResponse} If acknowledgment fails
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    return this.callFunction<AcknowledgeAlertRequest>('acknowledgeAlert', { alertId });
  }

  /**
   * Resolve an alert with optional notes
   * 
   * @param alertId - ID of the alert to resolve
   * @param notes - Optional resolution notes
   * @throws {ErrorResponse} If resolution fails
   */
  async resolveAlert(alertId: string, notes?: string): Promise<void> {
    return this.callFunction<ResolveAlertRequest>('resolveAlert', { alertId, notes });
  }

  // ==========================================================================
  // READ OPERATIONS (Realtime Subscriptions)
  // ==========================================================================

  /**
   * Subscribe to real-time alert updates
   * 
   * Implements defensive caching to prevent:
   * - Null snapshot propagation
   * - Empty state regression during active sessions
   * - UI flicker from Firestore listener stalls
   * 
   * @param onUpdate - Callback invoked with updated alerts
   * @param onError - Callback invoked on subscription errors
   * @param maxAlerts - Maximum number of alerts to fetch (default: 20)
   * @returns Unsubscribe function
   */
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

    // Cache to prevent propagating invalid snapshots
    let lastValidSnapshot: WaterQualityAlert[] | null = null;
    let isFirstSnapshot = true;

    return onSnapshot(
      alertsQuery,
      (snapshot) => {
        // DEFENSIVE: Validate snapshot before propagating to UI
        if (!snapshot) {
          dataFlowLogger.logValidationIssue(
            DataSource.FIRESTORE,
            FlowLayer.SERVICE,
            'Received null snapshot',
            null
          );
          console.warn('[AlertsService] Received null snapshot, maintaining cached state');
          return;
        }

        // Parse alerts from snapshot
        const alerts = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            alertId: doc.id,
            ...data,
            // ✅ CRITICAL: Database uses 'value', but schema expects 'currentValue'
            // Map 'value' to 'currentValue' for consistent component usage
            currentValue: data.value ?? data.currentValue,
          } as WaterQualityAlert;
        });

        dataFlowLogger.log(
          DataSource.FIRESTORE,
          FlowLayer.SERVICE,
          'Snapshot received',
          { alertCount: alerts.length, isFirstSnapshot }
        );

        // DEFENSIVE: Prevent empty state regression during active session
        if (!isFirstSnapshot && alerts.length === 0 && lastValidSnapshot && lastValidSnapshot.length > 0) {
          dataFlowLogger.logStateRejection(
            DataSource.FIRESTORE,
            FlowLayer.SERVICE,
            'Empty snapshot during active session - likely Firestore listener stall',
            alerts,
            lastValidSnapshot
          );
          console.warn('[AlertsService] Rejecting empty snapshot - likely Firestore listener stall');
          console.warn('[AlertsService] Maintaining cached state with', lastValidSnapshot.length, 'alerts');
          return;
        }

        // Valid data - cache and propagate
        lastValidSnapshot = alerts;
        isFirstSnapshot = false;
        
        dataFlowLogger.log(
          DataSource.FIRESTORE,
          FlowLayer.SERVICE,
          'Propagating valid alert data',
          { alertCount: alerts.length }
        );
        
        onUpdate(alerts);
      },
      (err) => {
        dataFlowLogger.log(
          DataSource.FIRESTORE,
          FlowLayer.SERVICE,
          'Snapshot error',
          { error: err.message }
        );
        console.error('[AlertsService] Snapshot error:', err);
        onError(err instanceof Error ? err : new Error('Failed to fetch alerts'));
      }
    );
  }

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  /**
   * Transform errors into user-friendly messages
   * 
   * @param error - Raw error from Firebase or application
   * @param defaultMessage - Fallback message if error unmapped
   * @returns Standardized error response
   */
  private handleError(error: any, defaultMessage: string): ErrorResponse {
    console.error('[AlertsService] Error:', error);

    const code = error.code || 'unknown';
    const message = code === 'functions/failed-precondition' 
      ? error.message 
      : AlertsService.ERROR_MESSAGES[code] || error.message || defaultMessage;

    return {
      code,
      message,
      details: error.details,
    };
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

export const alertsService = new AlertsService();
export default alertsService;
