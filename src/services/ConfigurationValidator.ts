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
   * @param provider 可选的提供商ID，用于验证 chunkModel 与 provider 的匹配性
   * @returns 验证结果，包含是否有效、错误信息和确认信息
   */
  validateConfig(config: ExtensionConfig, provider?: string): ValidationResult {
    const errors: string[] = [];

    this.validateAPIEndpoint(config.apiEndpoint, errors);
    this.validateAPIKey(config.apiKey, errors);
    this.validateModelName(config.modelName, errors);
    this.validateLanguage(config.language, errors);
    this.validateCommitFormat(config.commitFormat, errors);
    this.validateMaxTokens(config.maxTokens, errors);
    this.validateTemperature(config.temperature, errors);
    this.validateChunkModel(config.chunkModel, config.modelName, provider, errors);

    // 生成确认信息（当配置有效时）
    const confirmations = this.generateConfirmations(config, provider);

    return {
      valid: errors.length === 0,
      errors,
      confirmations: errors.length === 0 ? confirmations : undefined,
    };
  }

  /**
   * 生成配置确认信息
   * @param config 配置对象
   * @param provider 提供商ID
   * @returns 确认信息列表
   */
  private generateConfirmations(config: ExtensionConfig, provider?: string): string[] {
    const confirmations: string[] = [];

    // 基本配置确认
    confirmations.push('✅ 基本配置验证通过');

    // Chunk 模型配置确认
    if (config.chunkModel) {
      confirmations.push(
        `✅ Chunk 模型已配置: ${config.chunkModel}\n` + '   将在 Map 阶段使用此模型处理 diff chunks'
      );

      // 检查是否是推荐的轻量级模型
      const lightweightModels = [
        'gpt-4o-mini',
        'gpt-3.5-turbo',
        'gemini-1.5-flash',
        'gemini-flash',
      ];
      if (lightweightModels.some((model) => config.chunkModel?.includes(model))) {
        confirmations.push('💡 您选择了推荐的轻量级模型，这将显著降低成本并提升处理速度');
      }
    } else {
      confirmations.push(
        '💡 Chunk 模型未配置，将使用智能降级自动选择\n' +
          '   系统会根据主模型自动选择合适的轻量级模型'
      );
    }

    // 混合模型策略说明
    if (provider) {
      confirmations.push(
        '📊 混合模型策略已启用：\n' +
          `   • Map 阶段: ${config.chunkModel || '自动选择轻量级模型'}\n` +
          `   • Reduce 阶段: ${config.modelName}\n` +
          '   • 预计可节省 70-85% 的 token 成本'
      );
    }

    return confirmations;
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

  /**
   * 验证 Chunk 模型配置
   * @param chunkModel Chunk 模型名称（可选）
   * @param primaryModel 主模型名称
   * @param provider 提供商ID（可选）
   * @param errors 错误列表
   */
  private validateChunkModel(
    chunkModel: string | undefined,
    primaryModel: string,
    provider: string | undefined,
    errors: string[]
  ): void {
    // 如果未配置 chunkModel，跳过验证（允许为空）
    if (!chunkModel) {
      return;
    }

    // 验证模型名称格式
    const trimmedModel = chunkModel.trim();
    if (trimmedModel === '') {
      errors.push(
        'Chunk 模型名称不能为空字符串。\n' +
          '💡 修复建议：\n' +
          '  • 配置有效的模型名称（如 gpt-4o-mini, gemini-1.5-flash）\n' +
          '  • 或留空以使用智能降级自动选择'
      );
      return;
    }

    // 验证模型名称不包含特殊字符（允许字母、数字、连字符、下划线、点和斜杠）
    const validModelNamePattern = /^[a-zA-Z0-9\-_./]+$/;
    if (!validModelNamePattern.test(trimmedModel)) {
      errors.push(
        `Chunk 模型名称格式无效: "${chunkModel}"。\n` +
          '模型名称只能包含字母、数字、连字符(-)、下划线(_)、点(.)和斜杠(/)。\n' +
          '💡 修复建议：\n' +
          '  • 移除特殊字符（如空格、@、#等）\n' +
          '  • 使用标准模型名称格式\n' +
          '  • 示例：gpt-4o-mini, gemini-1.5-flash, meta-llama/Llama-2-7b-chat-hf'
      );
      return;
    }

    // 如果提供了 provider，验证 chunkModel 与 provider 的匹配性
    if (provider) {
      this.validateProviderMatch(trimmedModel, primaryModel, provider, errors);
    }
  }

  /**
   * 验证 Chunk 模型与提供商的匹配性
   * @param chunkModel Chunk 模型名称
   * @param primaryModel 主模型名称
   * @param provider 提供商ID
   * @param errors 错误列表
   */
  private validateProviderMatch(
    chunkModel: string,
    primaryModel: string,
    provider: string,
    errors: string[]
  ): void {
    // 定义各提供商的模型前缀模式
    const providerPatterns: Record<string, { pattern: RegExp; examples: string[] }> = {
      openai: {
        pattern: /^(gpt-|o1-|text-|davinci-|curie-|babbage-|ada-)/i,
        examples: ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4'],
      },
      gemini: {
        pattern: /^gemini-/i,
        examples: ['gemini-1.5-flash', 'gemini-pro', 'gemini-1.5-pro'],
      },
      qwen: {
        pattern: /^qwen-/i,
        examples: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
      },
      ollama: {
        pattern: /.*/,
        examples: ['llama2', 'mistral', 'codellama'],
      },
      vllm: {
        pattern: /.*/,
        examples: ['meta-llama/Llama-2-7b-chat-hf', 'mistralai/Mistral-7B-v0.1'],
      },
      'openai-compatible': {
        pattern: /.*/,
        examples: ['任意兼容 OpenAI 格式的模型'],
      },
    };

    const providerInfo = providerPatterns[provider.toLowerCase()];

    // 如果是本地提供商或自定义提供商，跳过严格验证
    if (
      provider.toLowerCase() === 'ollama' ||
      provider.toLowerCase() === 'vllm' ||
      provider.toLowerCase() === 'openai-compatible' ||
      provider.toLowerCase() === 'custom'
    ) {
      return;
    }

    // 对于云服务提供商，验证模型名称是否匹配
    if (providerInfo && !providerInfo.pattern.test(chunkModel)) {
      errors.push(
        `⚠️ Chunk 模型 "${chunkModel}" 可能与提供商 "${provider}" 不匹配。\n` +
          `💡 修复建议：\n` +
          `  • 使用 ${provider} 的推荐模型：${providerInfo.examples.join(', ')}\n` +
          `  • 或切换到支持该模型的提供商\n` +
          `  • 如果您确定模型名称正确，可以忽略此警告`
      );
    }

    // 额外检查：如果主模型和 chunk 模型的提供商前缀不一致，给出警告
    const primaryPrefix = this.extractModelPrefix(primaryModel);
    const chunkPrefix = this.extractModelPrefix(chunkModel);

    if (primaryPrefix && chunkPrefix && primaryPrefix !== chunkPrefix) {
      errors.push(
        `⚠️ 主模型 "${primaryModel}" 和 Chunk 模型 "${chunkModel}" 似乎来自不同的模型系列。\n` +
          `💡 修复建议：\n` +
          `  • 使用相同提供商的模型以确保兼容性\n` +
          `  • 例如，如果主模型是 GPT-4，建议 Chunk 模型使用 gpt-4o-mini\n` +
          `  • 或者如果主模型是 Gemini Pro，建议 Chunk 模型使用 gemini-1.5-flash`
      );
    }
  }

  /**
   * 提取模型名称的前缀（用于判断模型系列）
   * @param modelName 模型名称
   * @returns 模型前缀，如果无法识别则返回 null
   */
  private extractModelPrefix(modelName: string): string | null {
    const prefixes = ['gpt-', 'o1-', 'gemini-', 'qwen-', 'claude-'];

    for (const prefix of prefixes) {
      if (modelName.toLowerCase().startsWith(prefix)) {
        return prefix;
      }
    }

    return null;
  }

  /**
   * 生成配置验证的用户友好摘要
   * @param result 验证结果
   * @returns 格式化的摘要信息
   */
  getValidationSummary(result: ValidationResult): string {
    if (result.valid) {
      return '✅ 配置验证通过！所有配置项均有效。';
    }

    const errorCount = result.errors.length;
    const warningCount = result.errors.filter((e) => e.startsWith('⚠️')).length;
    const criticalCount = errorCount - warningCount;

    let summary = `配置验证发现 ${errorCount} 个问题`;
    if (criticalCount > 0 && warningCount > 0) {
      summary += `（${criticalCount} 个错误，${warningCount} 个警告）`;
    } else if (criticalCount > 0) {
      summary += `（${criticalCount} 个错误）`;
    } else {
      summary += `（${warningCount} 个警告）`;
    }

    summary += '：\n\n';
    summary += result.errors.map((error, index) => `${index + 1}. ${error}`).join('\n\n');

    return summary;
  }

  /**
   * 生成 Chunk 模型配置的确认信息
   * @param chunkModel Chunk 模型名称（可选）
   * @param primaryModel 主模型名称
   * @param provider 提供商ID
   * @returns 确认信息
   */
  getChunkModelConfirmation(
    chunkModel: string | undefined,
    primaryModel: string,
    provider: string
  ): string {
    if (!chunkModel || chunkModel.trim() === '') {
      return (
        '✅ Chunk 模型配置：未配置（将使用智能降级）\n' +
        `   系统将根据主模型 "${primaryModel}" 自动选择合适的轻量级模型。`
      );
    }

    const trimmedModel = chunkModel.trim();
    const isWarning = this.hasProviderMismatch(trimmedModel, primaryModel, provider);

    if (isWarning) {
      return (
        `⚠️ Chunk 模型配置：${trimmedModel}\n` +
        `   注意：该模型可能与提供商 "${provider}" 或主模型 "${primaryModel}" 不匹配。\n` +
        '   建议检查配置以确保兼容性。'
      );
    }

    return (
      `✅ Chunk 模型配置：${trimmedModel}\n` +
      `   该模型将用于 Map 阶段处理，主模型 "${primaryModel}" 将用于 Reduce 阶段。`
    );
  }

  /**
   * 检查是否存在提供商不匹配
   * @param chunkModel Chunk 模型名称
   * @param primaryModel 主模型名称
   * @param provider 提供商ID
   * @returns 是否存在不匹配
   */
  private hasProviderMismatch(chunkModel: string, primaryModel: string, provider: string): boolean {
    // 本地提供商不检查
    if (
      provider.toLowerCase() === 'ollama' ||
      provider.toLowerCase() === 'vllm' ||
      provider.toLowerCase() === 'openai-compatible' ||
      provider.toLowerCase() === 'custom'
    ) {
      return false;
    }

    // 检查提供商模式匹配
    const providerPatterns: Record<string, RegExp> = {
      openai: /^(gpt-|o1-|text-|davinci-|curie-|babbage-|ada-)/i,
      gemini: /^gemini-/i,
      qwen: /^qwen-/i,
    };

    const pattern = providerPatterns[provider.toLowerCase()];
    if (pattern && !pattern.test(chunkModel)) {
      return true;
    }

    // 检查模型系列匹配
    const primaryPrefix = this.extractModelPrefix(primaryModel);
    const chunkPrefix = this.extractModelPrefix(chunkModel);

    return !!(primaryPrefix && chunkPrefix && primaryPrefix !== chunkPrefix);
  }
}
