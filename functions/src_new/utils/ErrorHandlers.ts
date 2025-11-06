/**
 * Error Handling Utilities
 * Standardized error handling patterns for Firebase Functions
 *
 * @module utils/ErrorHandlers
 */

import {HttpsError} from "firebase-functions/v2/https";

/**
 * @param {unknown} error - The error that was caught
 * @param {string} context - Description of what operation failed (e.g., "updating user status")
 * @param {string} fallbackError - Error message to use if not an HttpsError
 * @throws {HttpsError} Always throws an HttpsError
 */
export function handleOperationError(
  error: unknown,
  context: string,
  fallbackError: string
): never {
  console.error(`Error ${context}:`, error);
  if (error instanceof HttpsError) {
    throw error;
  }

  // Wrap other errors in internal HttpsError
  throw new HttpsError("internal", fallbackError);
}

/**
 * Wraps an async operation with standardized error handling.
 * @template T
 * @param {function(): Promise<T>} operation - The async operation to execute
 * @param {string} context - Description of the operation
 * @param {string} fallbackError - Error message for non-HttpsErrors
 * @return {Promise<T>} Result of the operation
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string,
  fallbackError: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleOperationError(error, context, fallbackError);
  }
}
