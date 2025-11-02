/**
 * Firebase Functions Entry Point - src_new
 * Main index file for exporting all Cloud Functions
 *
 * Function Categories:
 * - Authentication: beforeCreate, beforeSignIn
 * - Callable: userManagement, alertManagement, deviceManagement, etc.
 * - Pub/Sub: processSensorData, aggregateAlertsToDigest, etc.
 * - Schedulers: checkStaleAlerts, sendAlertDigests, analytics
 */

// Export authentication functions
export * from "./auth";

// Export callable functions
export * from "./callable";

// Export Pub/Sub trigger functions
export * from "./pubsub";

// Export scheduled functions
export * from "./scheduler";
