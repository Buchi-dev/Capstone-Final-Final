/**
 * Pub/Sub Functions Module Entry Point
 * Exports all Pub/Sub trigger functions
 *
 * @module pubsub
 *
 * Pub/Sub functions handle event-driven processing:
 * - processSensorData: Process incoming sensor data from MQTT bridge (CRITICAL)
 * - aggregateAlertsToDigest: Batch alerts into periodic digests (HIGH)
 * - autoRegisterDevice: Auto-register new devices on first connection (MEDIUM)
 */

// Export sensor data processing function (P0 CRITICAL)
export { processSensorData } from "./processSensorData";

// Export alert digest aggregation function (P1 HIGH)
export { aggregateAlertsToDigest } from "./aggregateAlertsToDigest";

// Export device auto-registration function (P2 MEDIUM)
export { autoRegisterDevice } from "./autoRegisterDevice";
