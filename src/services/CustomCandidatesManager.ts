import { ConfigurationManager } from './ConfigurationManager';
import { ErrorHandler } from '../utils/ErrorHandler';

/**
 * 保存选项
 */
export interface SaveOptions {
  /** 最大重试次数，默认 3 */
  maxRetries?: number;
  /** 重试延迟（毫秒），默认 [100, 200, 400] */
  retryDelays?: number[];
  /** 是否跳过验证，默认 false */
  skipValidation?: boolean;
}

/**
 * 保存结果
 */
export interface SaveResult {
  /** 是否成功 */
  success: boolean;
  /** 错误消息（如果失败） */
  error?: string;
  /** 重试次数 */
  retries: number;
  /** 是否为新增（false 表示已存在，跳过） */
  added: boolean;
}

/**
 * 删除结果
 */
export interface RemoveResult {
  /** 是否成功 */
  success: boolean;
  /** 错误消息（如果失败） */
  error?: string;
  /** 是否实际删除了项（false 表示项不存在） */
  removed: boolean;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误消息（如果无效） */
  error?: string;
}

/**
 * 自定义候选项管理器
 * 负责管理 OpenAI Compatible 提供商的自定义 Base URL 和模型名称
 */
export class CustomCandidatesManager {
  private readonly maxListSize = 50;

  constructor(
    private readonly configManager: ConfigurationManager,
    private readonly errorHandler: ErrorHandler
  ) {}

  /**
   * 保存自定义 Base URL（带重试和验证）
   * @param url 要保存的 Base URL
   * @param options 保存选项
   * @returns 保存结果
   */
  async saveCustomBaseUrl(url: string, options?: SaveOptions): Promise<SaveResult> {
    const opts: SaveOptions = {
      maxRetries: 3,
      retryDelays: [100, 200, 400],
      skipValidation: false,
      ...options,
    };

    // 验证输入
    if (!opts.skipValidation) {
      const validation = this.validateBaseUrl(url);
      if (!validation.valid) {
        this.errorHandler.logWarning(
          `自定义 Base URL 验证失败: ${validation.error} (URL: ${url})`,
          'CustomCandidatesManager'
        );
        return {
          success: false,
          error: validation.error,
          retries: 0,
          added: false,
        };
      }
    }

    // 检查去重
    const existingUrls = this.configManager.getCustomBaseUrls();
    if (existingUrls.includes(url)) {
      return {
        success: true,
        retries: 0,
        added: false,
      };
    }

    // 检查列表大小限制
    const sizeCheck = this.checkListSizeLimit(existingUrls, 'baseUrl');
    if (!sizeCheck.valid) {
      this.errorHandler.logWarning(
        `自定义 Base URL 列表已满 (当前: ${existingUrls.length}, 最大: ${this.maxListSize})`,
        'CustomCandidatesManager'
      );
      return {
        success: false,
        error: sizeCheck.error,
        retries: 0,
        added: false,
      };
    }

    // 带重试的保存操作
    let retries = 0;
    try {
      await this.saveWithRetry(
        async () => {
          await this.configManager.addCustomBaseUrl(url);
        },
        opts,
        (attempt) => {
          retries = attempt;
        }
      );

      this.errorHandler.logInfo(
        `自定义 Base URL 保存成功: ${url} (重试次数: ${retries})`,
        'CustomCandidatesManager'
      );

      return {
        success: true,
        retries,
        added: true,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorHandler.logError(
        err,
        `自定义 Base URL 保存失败: ${url} (重试次数: ${retries}, 现有列表大小: ${existingUrls.length})`
      );

      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        retries,
        added: false,
      };
    }
  }

  /**
   * 保存自定义模型名称（带重试和验证）
   * @param modelName 要保存的模型名称
   * @param options 保存选项
   * @returns 保存结果
   */
  async saveCustomModelName(modelName: string, options?: SaveOptions): Promise<SaveResult> {
    const opts: SaveOptions = {
      maxRetries: 3,
      retryDelays: [100, 200, 400],
      skipValidation: false,
      ...options,
    };

    // 验证输入
    if (!opts.skipValidation) {
      const validation = this.validateModelName(modelName);
      if (!validation.valid) {
        this.errorHandler.logWarning(
          `自定义模型名称验证失败: ${validation.error} (模型名称: ${modelName})`,
          'CustomCandidatesManager'
        );
        return {
          success: false,
          error: validation.error,
          retries: 0,
          added: false,
        };
      }
    }

    // 检查去重
    const existingNames = this.configManager.getCustomModelNames();
    if (existingNames.includes(modelName)) {
      return {
        success: true,
        retries: 0,
        added: false,
      };
    }

    // 检查列表大小限制
    const sizeCheck = this.checkListSizeLimit(existingNames, 'modelName');
    if (!sizeCheck.valid) {
      this.errorHandler.logWarning(
        `自定义模型名称列表已满 (当前: ${existingNames.length}, 最大: ${this.maxListSize})`,
        'CustomCandidatesManager'
      );
      return {
        success: false,
        error: sizeCheck.error,
        retries: 0,
        added: false,
      };
    }

    // 带重试的保存操作
    let retries = 0;
    try {
      await this.saveWithRetry(
        async () => {
          await this.configManager.addCustomModelName(modelName);
        },
        opts,
        (attempt) => {
          retries = attempt;
        }
      );

      this.errorHandler.logInfo(
        `自定义模型名称保存成功: ${modelName} (重试次数: ${retries})`,
        'CustomCandidatesManager'
      );

      return {
        success: true,
        retries,
        added: true,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorHandler.logError(
        err,
        `自定义模型名称保存失败: ${modelName} (重试次数: ${retries}, 现有列表大小: ${existingNames.length})`
      );

      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        retries,
        added: false,
      };
    }
  }

  /**
   * 删除自定义 Base URL
   * @param url 要删除的 Base URL
   * @returns 删除结果
   */
  async removeCustomBaseUrl(url: string): Promise<RemoveResult> {
    try {
      await this.configManager.removeCustomBaseUrl(url);

      this.errorHandler.logInfo(`自定义 Base URL 删除成功: ${url}`, 'CustomCandidatesManager');

      return {
        success: true,
        removed: true,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorHandler.logError(err, `自定义 Base URL 删除失败: ${url}`);

      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        removed: false,
      };
    }
  }

  /**
   * 删除自定义模型名称
   * @param modelName 要删除的模型名称
   * @returns 删除结果
   */
  async removeCustomModelName(modelName: string): Promise<RemoveResult> {
    try {
      await this.configManager.removeCustomModelName(modelName);

      this.errorHandler.logInfo(`自定义模型名称删除成功: ${modelName}`, 'CustomCandidatesManager');

      return {
        success: true,
        removed: true,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.errorHandler.logError(err, `自定义模型名称删除失败: ${modelName}`);

      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        removed: false,
      };
    }
  }

  /**
   * 验证 Base URL
   * @param url 要验证的 URL
   * @returns 验证结果
   */
  validateBaseUrl(url: string): ValidationResult {
    // 空值检查
    if (!url || url.trim() === '') {
      return {
        valid: false,
        error: 'Base URL 不能为空',
      };
    }

    // 长度检查
    if (url.length > 500) {
      return {
        valid: false,
        error: 'Base URL 长度不能超过 500 字符',
      };
    }

    // URL 格式检查
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return {
          valid: false,
          error: 'Base URL 必须以 http:// 或 https:// 开头',
        };
      }
    } catch {
      return {
        valid: false,
        error: 'Base URL 格式无效',
      };
    }

    // 危险字符检查
    const dangerousChars = ['<', '>', '"', "'", '`'];
    if (dangerousChars.some((char) => url.includes(char))) {
      return {
        valid: false,
        error: 'Base URL 包含不允许的字符',
      };
    }

    return { valid: true };
  }

  /**
   * 验证模型名称
   * @param modelName 要验证的模型名称
   * @returns 验证结果
   */
  validateModelName(modelName: string): ValidationResult {
    // 空值检查
    if (!modelName || modelName.trim() === '') {
      return {
        valid: false,
        error: '模型名称不能为空',
      };
    }

    // 长度检查
    if (modelName.length > 100) {
      return {
        valid: false,
        error: '模型名称长度不能超过 100 字符',
      };
    }

    // 危险字符检查
    const dangerousChars = ['<', '>', '"', "'", '`', ';', '&', '|'];
    if (dangerousChars.some((char) => modelName.includes(char))) {
      return {
        valid: false,
        error: '模型名称包含不允许的字符',
      };
    }

    return { valid: true };
  }

  /**
   * 检查列表大小限制
   * @param currentList 当前列表
   * @param type 候选项类型
   * @returns 验证结果
   */
  private checkListSizeLimit(
    currentList: string[],
    type: 'baseUrl' | 'modelName'
  ): ValidationResult {
    if (currentList.length >= this.maxListSize) {
      return {
        valid: false,
        error: `自定义${type === 'baseUrl' ? 'Base URL' : '模型名称'}数量已达上限（${this.maxListSize}个）`,
      };
    }

    return { valid: true };
  }

  /**
   * 带重试的保存操作
   * @param operation 要执行的操作
   * @param options 保存选项
   * @param onRetry 重试回调
   */
  private async saveWithRetry<T>(
    operation: () => Promise<T>,
    options: SaveOptions,
    onRetry: (attempt: number) => void
  ): Promise<T> {
    const maxRetries = options.maxRetries ?? 3;
    const retryDelays = options.retryDelays ?? [100, 200, 400];

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        onRetry(attempt);
        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          const delay = retryDelays[attempt] ?? 400;
          this.errorHandler.logWarning(
            `保存失败，${delay}ms 后重试 (${attempt + 1}/${maxRetries}): ${lastError.message}`,
            'CustomCandidatesManager'
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('保存操作失败');
  }

  /**
   * 异步延迟
   * @param ms 延迟毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
