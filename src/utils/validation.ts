/**
 * Validation utility functions
 * Provides common validation logic used across the extension
 */

/**
 * Validates if a string is a valid HTTP or HTTPS URL
 * @param url URL string to validate
 * @returns true if valid URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Masks a sensitive string by showing only the first and last few characters
 * @param str String to mask
 * @param visibleChars Number of characters to show at start and end (default: 4)
 * @returns Masked string
 */
export function maskString(str: string, visibleChars: number = 4): string {
  if (!str || str.trim() === '') {
    return '未设置';
  }
  if (str.length < visibleChars * 2) {
    return '****';
  }
  return str.substring(0, visibleChars) + '****' + str.substring(str.length - visibleChars);
}

/**
 * Validates if a string is not empty or whitespace only
 * @param value String to validate
 * @returns true if not empty, false otherwise
 */
export function isNotEmpty(value: string | undefined | null): boolean {
  return value !== undefined && value !== null && value.trim() !== '';
}

/**
 * Validates if a number is within a specified range (inclusive)
 * @param value Number to validate
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @returns true if within range, false otherwise
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validates if a value is one of the allowed values
 * @param value Value to validate
 * @param allowedValues Array of allowed values
 * @returns true if value is in allowed values, false otherwise
 */
export function isOneOf<T>(value: T, allowedValues: readonly T[]): boolean {
  return allowedValues.includes(value);
}
