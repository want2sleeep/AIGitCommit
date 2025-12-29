import { FullConfig } from '../types';
import { LogManager, LogLevel } from './LogManager';

/**
 * 模型降级映射表
 * 定义了不同提供商的主模型到轻量级模型的映射关系
 */
const MODEL_DOWNGRADE_MAP: Record<string, Record<string, string>> = {
  openai: {
    'gpt-4': 'gpt-4o-mini',
    'gpt-4-turbo': 'gpt-4o-mini',
    'gpt-4o': 'gpt-4o-mini',
    'gpt-4-32k': 'gpt-4o-mini',
  },
  gemini: {
    'gemini-pro': 'gemini-1.5-flash',
    'gemini-1.5-pro': 'gemini-1.5-flash',
  },
};

/**
 * 本地提供商列表
 * 这些提供商通常不收费，且用户可能只配置了一个模型
 */
const LOCAL_PROVIDERS = ['ollama', 'lmstudio', 'localai', 'custom'];

/**
 * 模型选择器
 * 负责为 Map-Reduce 处理的不同阶段选择合适的模型
 */
export class ModelSelector {
  private logger: LogManager;

  /**
   * 构造函数
   * @param logger 日志管理器实例
   */
  constructor(logger: LogManager) {
    this.logger = logger;
  }

  /**
   * 为 Map 阶段选择合适的模型
   * @param config 扩展配置
   * @returns 选定的模型 ID
   */
  selectMapModel(config: FullConfig): string {
    // 1. 优先使用用户配置的 chunkModel
    if (config.chunkModel && config.chunkModel.trim() !== '') {
      this.logger.log(
        LogLevel.INFO,
        `使用用户配置的 chunk 模型: ${config.chunkModel}`,
        'ModelSelector.selectMapModel'
      );
      return config.chunkModel;
    }

    // 2. 智能降级
    const downgraded = this.smartDowngrade(config.modelName, config.provider);

    if (downgraded !== config.modelName) {
      this.logger.log(
        LogLevel.INFO,
        `智能降级: ${config.modelName} -> ${downgraded}`,
        'ModelSelector.selectMapModel'
      );
    } else {
      this.logger.log(
        LogLevel.INFO,
        `使用主模型: ${config.modelName}`,
        'ModelSelector.selectMapModel'
      );
    }

    return downgraded;
  }

  /**
   * 智能降级逻辑
   * 根据主模型和提供商自动选择合适的轻量级模型
   * @param primaryModel 主模型名称
   * @param provider Provider 类型
   * @returns 降级后的模型 ID
   */
  private smartDowngrade(primaryModel: string, provider: string): string {
    // 本地模型（Ollama、LM Studio 等）不降级
    // 本地模型通常不收费，且用户可能只配置了一个模型
    if (this.isLocalProvider(provider)) {
      this.logger.log(
        LogLevel.INFO,
        `本地模型 Provider (${provider}) 检测到，跳过智能降级`,
        'ModelSelector.smartDowngrade'
      );
      return primaryModel;
    }

    // 获取提供商的降级映射
    const providerMap = MODEL_DOWNGRADE_MAP[provider.toLowerCase()];
    if (!providerMap) {
      // 没有配置降级映射的提供商，保持原模型
      return primaryModel;
    }

    // OpenAI GPT-4 系列降级
    if (provider.toLowerCase() === 'openai') {
      // 检查是否包含 'gpt-4' 但不包含 'mini'
      if (primaryModel.includes('gpt-4') && !primaryModel.includes('mini')) {
        return 'gpt-4o-mini';
      }
    }

    // Gemini Pro 降级
    if (provider.toLowerCase() === 'gemini') {
      if (primaryModel === 'gemini-pro' || primaryModel === 'gemini-1.5-pro') {
        return 'gemini-1.5-flash';
      }
    }

    // 检查精确匹配
    if (providerMap[primaryModel]) {
      return providerMap[primaryModel];
    }

    // 其他情况保持原模型
    return primaryModel;
  }

  /**
   * 判断是否为本地 Provider
   * @param provider Provider 类型
   * @returns 是否为本地 Provider
   */
  private isLocalProvider(provider: string): boolean {
    return LOCAL_PROVIDERS.includes(provider.toLowerCase());
  }

  /**
   * 验证模型是否可用
   * 检查模型 ID 的格式和有效性
   * @param modelId 模型 ID
   * @param provider Provider 类型（可选，用于更详细的验证）
   * @returns 是否可用
   */
  validateModel(modelId: string, provider?: string): boolean {
    try {
      // 1. 基本验证：检查模型 ID 是否为非空字符串
      if (!modelId || typeof modelId !== 'string') {
        this.logger.log(
          LogLevel.WARN,
          `模型 ID 无效: ${modelId} (类型: ${typeof modelId})`,
          'ModelSelector.validateModel'
        );
        return false;
      }

      // 2. 去除首尾空格后再次检查
      const trimmedModelId = modelId.trim();
      if (trimmedModelId === '') {
        this.logger.log(LogLevel.WARN, '模型 ID 为空字符串', 'ModelSelector.validateModel');
        return false;
      }

      // 3. 检查模型名称格式
      // 模型名称应该只包含字母、数字、连字符、下划线和点号
      const validModelNamePattern = /^[a-zA-Z0-9._-]+$/;
      if (!validModelNamePattern.test(trimmedModelId)) {
        this.logger.log(
          LogLevel.WARN,
          `模型 ID 格式无效: ${trimmedModelId}。应只包含字母、数字、连字符、下划线和点号`,
          'ModelSelector.validateModel'
        );
        return false;
      }

      // 4. 检查模型名称长度（合理范围：3-100 字符）
      if (trimmedModelId.length < 3 || trimmedModelId.length > 100) {
        this.logger.log(
          LogLevel.WARN,
          `模型 ID 长度不合理: ${trimmedModelId.length} 字符。应在 3-100 字符之间`,
          'ModelSelector.validateModel'
        );
        return false;
      }

      // 5. 如果提供了 provider，进行更详细的验证
      if (provider) {
        const isValid = this.validateModelForProvider(trimmedModelId, provider);
        if (!isValid) {
          this.logger.log(
            LogLevel.WARN,
            `模型 ${trimmedModelId} 与提供商 ${provider} 不匹配`,
            'ModelSelector.validateModel'
          );
          return false;
        }
      }

      // 验证通过
      this.logger.log(
        LogLevel.DEBUG,
        `模型验证通过: ${trimmedModelId}${provider ? ` (提供商: ${provider})` : ''}`,
        'ModelSelector.validateModel'
      );

      return true;
    } catch (error) {
      // 捕获任何验证过程中的异常
      this.logger.log(
        LogLevel.ERROR,
        `模型验证过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
        'ModelSelector.validateModel'
      );
      return false;
    }
  }

  /**
   * 验证模型是否与提供商匹配
   * 检查模型名称是否符合特定提供商的命名规范
   * @param modelId 模型 ID
   * @param provider Provider 类型
   * @returns 是否匹配
   */
  private validateModelForProvider(modelId: string, provider: string): boolean {
    const providerLower = provider.toLowerCase();

    // OpenAI 模型验证
    if (providerLower === 'openai') {
      // OpenAI 模型通常以 gpt- 开头
      const openaiPattern = /^(gpt-|text-|davinci|curie|babbage|ada)/i;
      return openaiPattern.test(modelId);
    }

    // Gemini 模型验证
    if (providerLower === 'gemini') {
      // Gemini 模型通常以 gemini- 开头
      const geminiPattern = /^gemini-/i;
      return geminiPattern.test(modelId);
    }

    // Azure OpenAI 模型验证
    if (providerLower === 'azure' || providerLower === 'azureopenai') {
      // Azure 使用部署名称，可以是任意有效的标识符
      // 这里只做基本格式检查
      return true;
    }

    // 本地提供商（Ollama、LM Studio 等）
    if (this.isLocalProvider(provider)) {
      // 本地模型名称格式较为灵活，只要符合基本格式即可
      return true;
    }

    // 其他提供商或自定义提供商
    // 默认通过基本格式验证即可
    return true;
  }

  /**
   * 验证并选择模型，如果验证失败则回退到主模型
   * 这是一个便捷方法，结合了选择和验证逻辑
   * @param config 扩展配置
   * @returns 验证通过的模型 ID
   */
  selectAndValidateMapModel(config: FullConfig): string {
    // 1. 选择 Map 模型
    const selectedModel = this.selectMapModel(config);

    // 2. 验证选定的模型
    const isValid = this.validateModel(selectedModel, config.provider);

    // 3. 如果验证失败，回退到主模型
    if (!isValid) {
      this.logger.log(
        LogLevel.WARN,
        `选定的 Map 模型 ${selectedModel} 验证失败，回退到主模型 ${config.modelName}`,
        'ModelSelector.selectAndValidateMapModel'
      );

      // 验证主模型
      const isPrimaryValid = this.validateModel(config.modelName, config.provider);
      if (!isPrimaryValid) {
        this.logger.log(
          LogLevel.ERROR,
          `主模型 ${config.modelName} 也验证失败！将使用原始配置`,
          'ModelSelector.selectAndValidateMapModel'
        );
      }

      return config.modelName;
    }

    return selectedModel;
  }
}
