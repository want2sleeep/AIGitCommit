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

/**
 * 安全地从对象中获取字符串属性
 * @param obj 对象
 * @param key 属性键
 * @param defaultValue 默认值
 * @returns 字符串值或默认值
 */
export function getStringProperty(
  obj: Record<string, unknown>,
  key: string,
  defaultValue: string = ''
): string {
  const value = obj[key];
  return typeof value === 'string' ? value : defaultValue;
}

/**
 * 安全地从对象中获取数字属性
 * @param obj 对象
 * @param key 属性键
 * @param defaultValue 默认值
 * @returns 数字值或默认值
 */
export function getNumberProperty(
  obj: Record<string, unknown>,
  key: string,
  defaultValue: number = 0
): number {
  const value = obj[key];
  return typeof value === 'number' ? value : defaultValue;
}

/**
 * 安全地从对象中获取布尔属性
 * @param obj 对象
 * @param key 属性键
 * @param defaultValue 默认值
 * @returns 布尔值或默认值
 */
export function getBooleanProperty(
  obj: Record<string, unknown>,
  key: string,
  defaultValue: boolean = false
): boolean {
  const value = obj[key];
  return typeof value === 'boolean' ? value : defaultValue;
}

/**
 * 合并两个配置对象，第二个对象的属性会覆盖第一个对象的属性
 * @param base 基础配置对象
 * @param override 覆盖配置对象
 * @returns 合并后的配置对象
 */
export function mergeConfig<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  return { ...base, ...override };
}

/**
 * 深度合并两个对象
 * @param target 目标对象
 * @param source 源对象
 * @returns 合并后的对象
 */
export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}
