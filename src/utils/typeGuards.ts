/**
 * Type guard utilities for runtime type checking.
 * These functions provide type-safe validation and replace unsafe type assertions.
 */

import { ExtensionConfig, GitChange, ChangeStatus, ValidationResult } from '../types';
import {
  APIError,
  ConfigurationError,
  GitOperationError,
  NetworkError,
  BaseError,
} from '../errors';

/**
 * Type guard to check if a value is a valid ExtensionConfig object.
 * @param value - The value to check
 * @returns True if the value is a valid ExtensionConfig
 */
export function isValidConfig(value: unknown): value is ExtensionConfig {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const config = value as Record<string, unknown>;

  return (
    typeof config['apiEndpoint'] === 'string' &&
    typeof config['apiKey'] === 'string' &&
    typeof config['modelName'] === 'string' &&
    typeof config['language'] === 'string' &&
    typeof config['commitFormat'] === 'string' &&
    typeof config['maxTokens'] === 'number' &&
    typeof config['temperature'] === 'number'
  );
}

/**
 * Type guard to check if a value is a valid GitChange object.
 * @param value - The value to check
 * @returns True if the value is a valid GitChange
 */
export function isGitChange(value: unknown): value is GitChange {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const change = value as Record<string, unknown>;

  return (
    typeof change['path'] === 'string' &&
    isChangeStatus(change['status']) &&
    typeof change['diff'] === 'string' &&
    typeof change['additions'] === 'number' &&
    typeof change['deletions'] === 'number'
  );
}

/**
 * Type guard to check if a value is a valid ChangeStatus enum value.
 * @param value - The value to check
 * @returns True if the value is a valid ChangeStatus
 */
export function isChangeStatus(value: unknown): value is ChangeStatus {
  return (
    value === ChangeStatus.Added ||
    value === ChangeStatus.Modified ||
    value === ChangeStatus.Deleted ||
    value === ChangeStatus.Renamed ||
    value === ChangeStatus.Copied
  );
}

/**
 * Type guard to check if an error is an APIError.
 * @param error - The error to check
 * @returns True if the error is an APIError
 */
export function isAPIError(error: unknown): error is APIError {
  return error instanceof APIError;
}

/**
 * Type guard to check if an error is a ConfigurationError.
 * @param error - The error to check
 * @returns True if the error is a ConfigurationError
 */
export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}

/**
 * Type guard to check if an error is a GitOperationError.
 * @param error - The error to check
 * @returns True if the error is a GitOperationError
 */
export function isGitOperationError(error: unknown): error is GitOperationError {
  return error instanceof GitOperationError;
}

/**
 * Type guard to check if an error is a NetworkError.
 * @param error - The error to check
 * @returns True if the error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard to check if an error is any of our custom BaseError types.
 * @param error - The error to check
 * @returns True if the error is a BaseError
 */
export function isBaseError(error: unknown): error is BaseError {
  return error instanceof BaseError;
}

/**
 * Type guard to check if a value is a valid ValidationResult object.
 * @param value - The value to check
 * @returns True if the value is a valid ValidationResult
 */
export function isValidationResult(value: unknown): value is ValidationResult {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const result = value as Record<string, unknown>;

  return (
    typeof result['valid'] === 'boolean' &&
    Array.isArray(result['errors']) &&
    result['errors'].every((error) => typeof error === 'string')
  );
}

/**
 * Type guard to check if a value is a non-empty string.
 * @param value - The value to check
 * @returns True if the value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard to check if a value is a valid array of GitChange objects.
 * @param value - The value to check
 * @returns True if the value is a valid array of GitChange objects
 */
export function isGitChangeArray(value: unknown): value is GitChange[] {
  return Array.isArray(value) && value.every(isGitChange);
}

/**
 * Type guard to check if a value is a valid Error object.
 * @param value - The value to check
 * @returns True if the value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Asserts that a value is a valid ExtensionConfig, throwing an error if not.
 * @param value - The value to assert
 * @param errorMessage - Optional custom error message
 * @throws {ConfigurationError} If the value is not a valid ExtensionConfig
 */
export function assertValidConfig(
  value: unknown,
  errorMessage?: string
): asserts value is ExtensionConfig {
  if (!isValidConfig(value)) {
    throw new ConfigurationError(
      errorMessage || '无效的配置对象：配置必须包含所有必需的字段且类型正确',
      'config'
    );
  }
}

/**
 * Asserts that a value is a valid GitChange, throwing an error if not.
 * @param value - The value to assert
 * @param errorMessage - Optional custom error message
 * @throws {GitOperationError} If the value is not a valid GitChange
 */
export function assertGitChange(value: unknown, errorMessage?: string): asserts value is GitChange {
  if (!isGitChange(value)) {
    throw new GitOperationError(
      errorMessage || '无效的Git变更对象：变更必须包含所有必需的字段且类型正确',
      'assertGitChange'
    );
  }
}
