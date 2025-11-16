/**
 * Custom error classes for the AI Git Commit extension.
 * These errors provide better context and recovery information.
 */

/**
 * Base error class for all custom errors in the extension.
 * Provides common properties like error code and recoverability.
 */
export abstract class BaseError extends Error {
  /**
   * Creates a new BaseError instance.
   * @param message - Human-readable error message
   * @param code - Error code for programmatic handling
   * @param recoverable - Whether the error can be recovered from
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = false
  ) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when configuration is invalid or missing.
 * This error is recoverable as users can fix their configuration.
 */
export class ConfigurationError extends BaseError {
  /**
   * Creates a new ConfigurationError instance.
   * @param message - Human-readable error message
   * @param field - Optional field name that caused the error
   */
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, 'CONFIG_ERROR', true);
  }
}

/**
 * Error thrown when Git operations fail.
 * This error is typically not recoverable as it indicates Git issues.
 */
export class GitOperationError extends BaseError {
  /**
   * Creates a new GitOperationError instance.
   * @param message - Human-readable error message
   * @param operation - The Git operation that failed (e.g., 'commit', 'diff')
   */
  constructor(
    message: string,
    public readonly operation: string
  ) {
    super(message, 'GIT_ERROR', false);
  }
}

/**
 * Error thrown when API calls fail.
 * This error may be recoverable depending on the status code (e.g., rate limits).
 */
export class APIError extends BaseError {
  /**
   * Creates a new APIError instance.
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code from the API response
   * @param response - Optional raw response data for debugging
   */
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    // Rate limit (429) and service unavailable (503) errors are recoverable
    const isRecoverable = statusCode === 429 || statusCode === 503;
    super(message, 'API_ERROR', isRecoverable);
  }
}

/**
 * Error thrown when network operations fail.
 * This error is recoverable as network issues are often temporary.
 */
export class NetworkError extends BaseError {
  /**
   * Creates a new NetworkError instance.
   * @param message - Human-readable error message
   * @param cause - Optional underlying error that caused the network failure
   */
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message, 'NETWORK_ERROR', true);
  }
}
