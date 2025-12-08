/**
 * 通用工具函数
 * 提供可复用的常用功能
 */

/**
 * 安全执行异步操作并包装错误
 * @param operation 要执行的异步操作
 * @param errorMessage 错误消息前缀
 * @param ErrorClass 错误类构造函数
 * @returns 操作结果
 * @throws 包装后的错误
 */
export async function safeExecute<T, E extends Error>(
  operation: () => Promise<T>,
  errorMessage: string,
  ErrorClass: new (message: string, ...args: unknown[]) => E
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ErrorClass(`${errorMessage}: ${message}`);
  }
}

/**
 * 安全执行同步操作并包装错误
 * @param operation 要执行的同步操作
 * @param errorMessage 错误消息前缀
 * @param ErrorClass 错误类构造函数
 * @returns 操作结果
 * @throws 包装后的错误
 */
export function safeExecuteSync<T, E extends Error>(
  operation: () => T,
  errorMessage: string,
  ErrorClass: new (message: string, ...args: unknown[]) => E
): T {
  try {
    return operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ErrorClass(`${errorMessage}: ${message}`);
  }
}

/**
 * 向数组添加唯一项（去重）
 * @param array 目标数组
 * @param item 要添加的项
 * @returns 是否成功添加（false表示项已存在）
 */
export function addUniqueItem<T>(array: T[], item: T): boolean {
  if (array.includes(item)) {
    return false;
  }
  array.push(item);
  return true;
}

/**
 * 从数组中移除项
 * @param array 目标数组
 * @param item 要移除的项
 * @returns 是否成功移除（false表示项不存在）
 */
export function removeItem<T>(array: T[], item: T): boolean {
  const index = array.indexOf(item);
  if (index === -1) {
    return false;
  }
  array.splice(index, 1);
  return true;
}

/**
 * 创建带默认值的getter函数
 * @param getValue 获取值的函数
 * @param defaultValue 默认值
 * @returns 带默认值的getter函数
 */
export function withDefault<T>(getValue: () => T | undefined, defaultValue: T): () => T {
  return () => {
    try {
      const value = getValue();
      return value !== undefined ? value : defaultValue;
    } catch {
      return defaultValue;
    }
  };
}

/**
 * 批量验证输入
 * @param validations 验证规则数组
 * @returns 第一个验证失败的错误消息，如果全部通过则返回null
 */
export function validateInputs(
  validations: Array<{ condition: boolean; message: string }>
): string | null {
  for (const validation of validations) {
    if (validation.condition) {
      return validation.message;
    }
  }
  return null;
}

/**
 * 安全地从对象中提取属性
 * @param obj 源对象
 * @param key 属性键
 * @param defaultValue 默认值
 * @returns 属性值或默认值
 */
export function safeGet<T extends Record<string, unknown>, K extends keyof T>(
  obj: T | undefined,
  key: K,
  defaultValue: T[K]
): T[K] {
  if (!obj || !(key in obj)) {
    return defaultValue;
  }
  return obj[key];
}

/**
 * 延迟执行
 * @param ms 延迟毫秒数
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 限制字符串长度
 * @param str 原始字符串
 * @param maxLength 最大长度
 * @param suffix 超出时的后缀
 * @returns 限制后的字符串
 */
export function truncateString(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 检查字符串是否为空或仅包含空白字符
 * @param str 要检查的字符串
 * @returns 是否为空
 */
export function isEmptyOrWhitespace(str: string | undefined | null): boolean {
  return !str || str.trim().length === 0;
}

/**
 * 规范化URL（移除尾部斜杠）
 * @param url 原始URL
 * @returns 规范化后的URL
 */
export function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

/**
 * 构建URL路径
 * @param base 基础URL
 * @param path 路径
 * @returns 完整URL
 */
export function buildUrl(base: string, path: string): string {
  const normalizedBase = normalizeUrl(base);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return normalizedBase + normalizedPath;
}

/**
 * 安全的JSON解析
 * @param json JSON字符串
 * @param defaultValue 解析失败时的默认值
 * @returns 解析结果或默认值
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 创建错误消息映射的查找函数
 * @param errorMap 错误映射表
 * @param defaultMessage 默认错误消息
 * @returns 查找函数
 */
export function createErrorMapper(
  errorMap: Record<string | number, string>,
  defaultMessage: string
): (key: string | number) => string {
  return (key: string | number) => errorMap[key] || defaultMessage;
}
