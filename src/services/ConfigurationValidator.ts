import { ExtensionConfig, ValidationResult } from '../types';
import { isValidUrl } from '../utils/validation';

/**
 * 配置验证器
 * 负责验证配置的有效性
 */
export class ConfigurationValidator {
  /**
   * 验证配置的有效性
   * @param config 配置对象
   * @returns 验证结果，包含是否有效和错误信息
   */
  validateConfig(config: ExtensionConfig): ValidationResult {
    const errors: string[] = [];

    this.validateAPIEndpoint(config.apiEndpoint, errors);
    this.validateAPIKey(config.apiKey, errors);
    this.validateModelName(config.modelName, errors);
    this.validateLanguage(config.language, errors);
    this.validateCommitFormat(config.commitFormat, errors);
    this.validateMaxTokens(config.maxTokens, errors);
    this.validateTemperature(config.temperature, errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证API端点
   * @param apiEndpoint API端点
   * @param errors 错误列表
   */
  private validateAPIEndpoint(apiEndpoint: string, errors: string[]): void {
    if (!apiEndpoint || apiEndpoint.trim() === '') {
      errors.push('API端点不能为空。请在设置中配置有效的API端点URL。');
    } else if (!isValidUrl(apiEndpoint)) {
      errors.push(`API端点格式无效: "${apiEndpoint}"。必须是有效的HTTP或HTTPS URL。`);
    }
  }

  /**
   * 验证API密钥
   * @param apiKey API密钥
   * @param errors 错误列表
   */
  private validateAPIKey(apiKey: string, errors: string[]): void {
    if (!apiKey || apiKey.trim() === '') {
      errors.push('API密钥不能为空。请在设置中配置您的API密钥。');
    } else if (apiKey.length < 8) {
      errors.push('API密钥长度过短。请确保使用有效的API密钥。');
    }
  }

  /**
   * 验证模型名称
   * @param modelName 模型名称
   * @param errors 错误列表
   */
  private validateModelName(modelName: string, errors: string[]): void {
    if (!modelName || modelName.trim() === '') {
      errors.push('模型名称不能为空。请在设置中配置模型名称（如 gpt-3.5-turbo）。');
    }
  }

  /**
   * 验证语言配置
   * @param language 语言
   * @param errors 错误列表
   */
  private validateLanguage(language: string, errors: string[]): void {
    const validLanguages = ['zh-CN', 'en-US'];
    if (!validLanguages.includes(language)) {
      errors.push(`语言配置无效: "${language}"。支持的语言: ${validLanguages.join(', ')}。`);
    }
  }

  /**
   * 验证提交格式
   * @param commitFormat 提交格式
   * @param errors 错误列表
   */
  private validateCommitFormat(commitFormat: string, errors: string[]): void {
    const validFormats = ['conventional', 'simple'];
    if (!validFormats.includes(commitFormat)) {
      errors.push(`提交格式无效: "${commitFormat}"。支持的格式: ${validFormats.join(', ')}。`);
    }
  }

  /**
   * 验证最大token数
   * @param maxTokens 最大token数
   * @param errors 错误列表
   */
  private validateMaxTokens(maxTokens: number, errors: string[]): void {
    if (maxTokens <= 0) {
      errors.push(`最大token数必须大于0，当前值: ${maxTokens}。`);
    } else if (maxTokens > 4000) {
      errors.push(`最大token数不能超过4000，当前值: ${maxTokens}。`);
    }
  }

  /**
   * 验证温度参数
   * @param temperature 温度参数
   * @param errors 错误列表
   */
  private validateTemperature(temperature: number, errors: string[]): void {
    if (temperature < 0 || temperature > 2) {
      errors.push(`温度参数必须在0到2之间，当前值: ${temperature}。`);
    }
  }
}
