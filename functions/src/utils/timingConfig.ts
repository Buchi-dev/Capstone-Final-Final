/**
 * Timing Configuration Helper
 * Utilities for loading and managing system timing configuration
 * 
 * @module utils/timingConfig
 */

import { logger } from "firebase-functions/v2";
import { db } from "../config/firebase";
import {
  SYSTEM_CONFIG_COLLECTION,
  SYSTEM_CONFIG_DOC,
  DEFAULT_CHECK_INTERVAL_MINUTES,
  validateCheckInterval,
  TIMING_MESSAGES,
  type SystemTimingConfig,
} from "../constants/timing.constants";

/**
 * Cached timing configuration
 * Prevents excessive Firestore reads
 */
let cachedConfig: SystemTimingConfig | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache

/**
 * Load system timing configuration from Firestore
 * Uses cache to minimize Firestore reads
 * 
 * @returns {Promise<SystemTimingConfig>} System timing configuration
 */
export async function loadTimingConfig(): Promise<SystemTimingConfig> {
  const now = Date.now();
  
  // Return cached config if still valid
  if (cachedConfig && (now - lastCacheTime) < CACHE_TTL_MS) {
    return cachedConfig;
  }
  
  try {
    const configDoc = await db
      .collection(SYSTEM_CONFIG_COLLECTION)
      .doc(SYSTEM_CONFIG_DOC)
      .get();
    
    if (configDoc.exists) {
      const config = configDoc.data() as SystemTimingConfig;
      
      // Validate interval
      if (validateCheckInterval(config.checkIntervalMinutes)) {
        cachedConfig = config;
        lastCacheTime = now;
        logger.info(TIMING_MESSAGES.CONFIG_LOADED, {
          interval: config.checkIntervalMinutes,
          timezone: config.timezone,
        });
        return config;
      }
    }
  } catch (error) {
    logger.warn("Failed to load timing config from Firestore, using default", error);
  }
  
  // Return default if config not found or invalid
  logger.info(TIMING_MESSAGES.USING_DEFAULT, {
    interval: DEFAULT_CHECK_INTERVAL_MINUTES,
  });
  
  return {
    checkIntervalMinutes: DEFAULT_CHECK_INTERVAL_MINUTES,
    timezone: "Asia/Manila",
    updatedAt: null as any,
  };
}

/**
 * Get check interval in minutes
 * Convenience function that loads config and returns interval
 * 
 * @returns {Promise<number>} Check interval in minutes
 */
export async function getCheckInterval(): Promise<number> {
  const config = await loadTimingConfig();
  return config.checkIntervalMinutes;
}

/**
 * Clear timing configuration cache
 * Forces reload on next access
 */
export function clearTimingCache(): void {
  cachedConfig = null;
  lastCacheTime = 0;
}

/**
 * Initialize default timing configuration in Firestore if not exists
 * Called on first deployment
 */
export async function initializeTimingConfig(): Promise<void> {
  try {
    const configRef = db.collection(SYSTEM_CONFIG_COLLECTION).doc(SYSTEM_CONFIG_DOC);
    const doc = await configRef.get();
    
    if (!doc.exists) {
      await configRef.set({
        checkIntervalMinutes: DEFAULT_CHECK_INTERVAL_MINUTES,
        timezone: "Asia/Manila",
        updatedAt: new Date(),
        updatedBy: "system",
      });
      
      logger.info("Initialized default timing configuration");
    }
  } catch (error) {
    logger.error("Failed to initialize timing configuration", error);
  }
}
