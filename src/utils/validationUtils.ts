/**
 * 验证工具函数
 * 提供常用的输入验证功能
 */

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * 创建验证结果
 * @param valid 是否有效
 * @param message 错误消息
 * @returns 验证结果
 */
export function createValidationResult(valid: boolean, message?: string): ValidationResult {
  return { valid, message };
}

/**
 * 验证非空字符串
 * @param value 要验证的值
 * @param fieldName 字段名称
 * @returns 验证结果
 */
export function validateNonEmpty(value: string | undefined, fieldName: string): ValidationResult {
  if (!value || value.trim() === '') {
    return createValidationResult(false, `${fieldName}不能为空`);
  }
  return createValidationResult(true);
}

/**
 * 验证字符串长度
 * @param value 要验证的值
 * @param minLength 最小长度
 * @param maxLength 最大长度
 * @param fieldName 字段名称
 * @returns 验证结果
 */
export function validateLength(
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string
): ValidationResult {
  if (value.length < minLength) {
    return createValidationResult(false, `${fieldName}长度不足，至少需要 ${minLength} 个字符`);
  }
  if (value.length > maxLength) {
    return createValidationResult(false, `${fieldName}长度超限，最多 ${maxLength} 个字符`);
  }
  return createValidationResult(true);
}

/**
 * 验证URL格式
 * @param value 要验证的URL
 * @param fieldName 字段名称
 * @returns 验证结果
 */
export function validateUrlFormat(value: string, fieldName: string): ValidationResult {
  try {
    new URL(value);
    return createValidationResult(true);
  } catch {
    return createValidationResult(false, `${fieldName}格式无效`);
  }
}

/**
 * 验证必填字段
 * @param value 要验证的值
 * @param fieldName 字段名称
 * @returns 错误消息或null
 */
export function validateRequired(value: string | undefined, fieldName: string): string | null {
  if (!value || value.trim() === '') {
    return `${fieldName}不能为空`;
  }
  return null;
}

/**
 * 组合多个验证器
 * @param validators 验证器数组
 * @returns 组合后的验证结果
 */
export function combineValidators(...validators: ValidationResult[]): ValidationResult {
  for (const result of validators) {
    if (!result.valid) {
      return result;
    }
  }
  return createValidationResult(true);
}

/**
 * 创建输入验证函数
 * @param validations 验证规则数组
 * @returns 验证函数
 */
export function createInputValidator(
  validations: Array<(value: string) => string | null>
): (value: string) => string | null {
  return (value: string) => {
    for (const validation of validations) {
      const error = validation(value);
      if (error) {
        return error;
      }
    }
    return null;
  };
}

/**
 * 验证API密钥格式（通用）
 * @param apiKey API密钥
 * @returns 错误消息或null
 */
export function validateApiKey(apiKey: string): string | null {
  if (!apiKey || apiKey.trim() === '') {
    return 'API密钥不能为空';
  }
  return null;
}

/**
 * 验证模型名称
 * @param modelName 模型名称
 * @returns 错误消息或null
 */
export function validateModelName(modelName: string): string | null {
  if (!modelName || modelName.trim() === '') {
    return '模型名称不能为空';
  }
  return null;
}

/**
 * 验证API端点
 * @param endpoint API端点
 * @returns 错误消息或null
 */
export function validateApiEndpoint(endpoint: string): string | null {
  if (!endpoint || endpoint.trim() === '') {
    return 'API端点不能为空';
  }

  try {
    new URL(endpoint);
    return null;
  } catch {
    return 'API端点格式无效';
  }
}
