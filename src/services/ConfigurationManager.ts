import * as vscode from 'vscode';
import { ExtensionConfig, ValidationResult, FullConfig, ConfigSummary } from '../types';
import { ConfigurationError } from '../errors';
import { CONFIG_CONSTANTS } from '../constants';
import { maskString } from '../utils/validation';
import { Cache } from '../utils/cache';
import { getConfigArray, addToConfigArray, removeFromConfigArray } from '../utils/configUtils';
import { ConfigurationProvider } from './ConfigurationProvider';
import { ConfigurationValidator } from './ConfigurationValidator';
import { ConfigurationWizard } from './ConfigurationWizard';
import { ConfigurationMigrator } from './ConfigurationMigrator';

/**
 * 配置管理器
 * 协调配置的读取、验证、向导和迁移功能
 * 使用组合模式将职责委托给专门的类
 */
export class ConfigurationManager {
  private configCache: Cache<ConfigSummary>;
  private readonly provider: ConfigurationProvider;
  private readonly validator: ConfigurationValidator;
  private readonly wizard: ConfigurationWizard;
  private readonly migrator: ConfigurationMigrator;

  constructor(context: vscode.ExtensionContext) {
    this.configCache = new Cache<ConfigSummary>(CONFIG_CONSTANTS.CACHE_TTL);
    this.provider = new ConfigurationProvider(context);
    this.validator = new ConfigurationValidator();
    this.wizard = new ConfigurationWizard(this.provider);
    this.migrator = new ConfigurationMigrator(this.provider);
  }

  /**
   * 获取插件配置
   * @returns 完整的配置对象
   * @throws {ConfigurationError} 当配置读取失败时
   */
  async getConfig(): Promise<ExtensionConfig> {
    return await this.provider.getConfig();
  }

  /**
   * 验证配置的有效性
   * @returns 验证结果，包含是否有效和错误信息
   * @throws {ConfigurationError} 当配置验证过程失败时
   */
  async validateConfig(): Promise<ValidationResult> {
    try {
      const config = await this.getConfig();
      const provider = this.getProvider();
      return this.validator.validateConfig(config, provider);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(
        `配置验证失败: ${error instanceof Error ? error.message : String(error)}`,
        'validation'
      );
    }
  }

  /**
   * 更新配置项
   * @param key 配置键
   * @param value 配置值
   * @param target 配置目标（全局或工作区）
   * @throws {ConfigurationError} 当配置更新失败时
   */
  async updateConfig(
    key: keyof ExtensionConfig,
    value: string | number,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    await this.provider.updateConfig(key, value, target);
    this.invalidateCache();
  }

  /**
   * 安全存储 API 密钥到 SecretStorage
   * @param apiKey API密钥
   * @throws {ConfigurationError} 当密钥存储失败时
   */
  async storeApiKey(apiKey: string): Promise<void> {
    await this.provider.storeApiKey(apiKey);
    this.invalidateCache();
  }

  /**
   * 获取存储的 API 密钥
   * @returns API密钥或undefined
   * @throws {ConfigurationError} 当密钥读取失败时
   */
  async getApiKey(): Promise<string | undefined> {
    return await this.provider.getApiKey();
  }

  /**
   * 删除存储的 API 密钥
   * @throws {ConfigurationError} 当密钥删除失败时
   */
  async deleteApiKey(): Promise<void> {
    await this.provider.deleteApiKey();
    this.invalidateCache();
  }

  /**
   * 检查配置是否完整
   * @returns 配置是否完整
   */
  async isConfigured(): Promise<boolean> {
    const validation = await this.validateConfig();
    return validation.valid;
  }

  /**
   * 显示配置向导
   * 引导用户完成初始配置
   */
  async showConfigurationWizard(): Promise<boolean> {
    const result = await this.wizard.showConfigurationWizard();
    if (result) {
      this.invalidateCache();
    }
    return result;
  }

  /**
   * 测试API连接
   * 发送一个简单的请求来验证配置是否正确
   * @throws {ConfigurationError} 当配置无效时
   * @throws {APIError} 当API调用失败时
   * @throws {NetworkError} 当网络连接失败时
   */
  async testAPIConnection(): Promise<boolean> {
    return await this.wizard.testAPIConnection();
  }

  /**
   * 监听配置变更
   * @param callback 配置变更时的回调函数
   * @returns Disposable对象
   */
  onConfigurationChanged(callback: (config: ExtensionConfig) => void): vscode.Disposable {
    return this.provider.onConfigurationChanged(callback);
  }

  /**
   * 获取API提供商
   * @returns 提供商ID
   */
  getProvider(): string {
    return this.provider.getProvider();
  }

  /**
   * 设置API提供商
   * @param provider 提供商ID
   * @param target 配置目标（全局或工作区）
   * @throws {ConfigurationError} 当提供商设置失败时
   */
  async setProvider(
    provider: string,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    await this.provider.setProvider(provider, target);
    this.invalidateCache();
  }

  /**
   * 获取完整配置（包括提供商）
   * @returns 完整的配置对象
   */
  async getFullConfig(): Promise<FullConfig> {
    return await this.provider.getFullConfig();
  }

  /**
   * 保存完整配置
   * @param config 完整配置对象
   * @param target 配置目标（全局或工作区）
   * @throws {ConfigurationError} 当配置保存失败时
   */
  async saveFullConfig(
    config: FullConfig,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    await this.provider.saveFullConfig(config, target);
    this.invalidateCache();
  }

  /**
   * 获取配置摘要（用于显示）
   * 使用5秒TTL缓存机制提高性能
   * @returns 配置摘要对象
   */
  async getConfigSummary(): Promise<ConfigSummary> {
    return await this.configCache.getOrSet('summary', () => this.generateConfigSummary());
  }

  /**
   * 生成配置摘要
   * @returns 配置摘要对象
   */
  private async generateConfigSummary(): Promise<ConfigSummary> {
    try {
      const config = await this.getFullConfig();
      const isConfigured = await this.isConfigured();

      return {
        provider: config.provider || 'openai',
        apiKeyMasked: maskString(config.apiKey),
        baseUrl: config.apiEndpoint || '',
        modelName: config.modelName || '',
        isConfigured,
      };
    } catch {
      // 返回默认值而不是抛出异常
      return {
        provider: 'openai',
        apiKeyMasked: '未设置',
        baseUrl: '',
        modelName: '',
        isConfigured: false,
      };
    }
  }

  /**
   * 清除配置摘要缓存
   * 在配置变更时调用
   */
  private invalidateCache(): void {
    this.configCache.clear();
  }

  /**
   * 配置迁移
   * 检测旧版本配置并迁移到新格式
   * @throws {ConfigurationError} 当配置迁移失败时
   */
  async migrateConfiguration(): Promise<void> {
    await this.migrator.migrateConfiguration();
    this.invalidateCache();
  }

  /**
   * 获取自定义 Base URL 候选项列表
   * @returns 自定义 Base URL 数组
   */
  getCustomBaseUrls(): string[] {
    return getConfigArray<string>('customBaseUrls');
  }

  /**
   * 添加自定义 Base URL 候选项
   * 自动去重，如果 URL 已存在则不重复添加
   * @param url 要添加的 Base URL
   * @throws {ConfigurationError} 当保存失败时
   */
  async addCustomBaseUrl(url: string): Promise<void> {
    try {
      await addToConfigArray('customBaseUrls', url, vscode.ConfigurationTarget.Global);
      this.invalidateCache();
    } catch (error) {
      throw new ConfigurationError(
        `添加自定义 Base URL 失败: ${error instanceof Error ? error.message : String(error)}`,
        'update'
      );
    }
  }

  /**
   * 获取自定义模型名称候选项列表
   * @returns 自定义模型名称数组
   */
  getCustomModelNames(): string[] {
    return getConfigArray<string>('customModelNames');
  }

  /**
   * 添加自定义模型名称候选项
   * 自动去重，如果模型名称已存在则不重复添加
   * @param modelName 要添加的模型名称
   * @throws {ConfigurationError} 当保存失败时
   */
  async addCustomModelName(modelName: string): Promise<void> {
    try {
      await addToConfigArray('customModelNames', modelName, vscode.ConfigurationTarget.Global);
      this.invalidateCache();
    } catch (error) {
      throw new ConfigurationError(
        `添加自定义模型名称失败: ${error instanceof Error ? error.message : String(error)}`,
        'update'
      );
    }
  }

  /**
   * 删除自定义 Base URL
   * @param url 要删除的 Base URL
   * @throws {ConfigurationError} 当删除失败时
   */
  async removeCustomBaseUrl(url: string): Promise<void> {
    try {
      await removeFromConfigArray('customBaseUrls', url, vscode.ConfigurationTarget.Global);
      this.invalidateCache();
    } catch (error) {
      throw new ConfigurationError(
        `删除自定义 Base URL 失败: ${error instanceof Error ? error.message : String(error)}`,
        'update'
      );
    }
  }

  /**
   * 删除自定义模型名称
   * @param modelName 要删除的模型名称
   * @throws {ConfigurationError} 当删除失败时
   */
  async removeCustomModelName(modelName: string): Promise<void> {
    try {
      await removeFromConfigArray('customModelNames', modelName, vscode.ConfigurationTarget.Global);
      this.invalidateCache();
    } catch (error) {
      throw new ConfigurationError(
        `删除自定义模型名称失败: ${error instanceof Error ? error.message : String(error)}`,
        'update'
      );
    }
  }

  /**
   * 获取大型 Diff 处理配置
   * @returns 大型 Diff 处理配置对象
   */
  getLargeDiffConfig(): {
    enableMapReduce: boolean;
    customTokenLimit: number | undefined;
    safetyMarginPercent: number;
    maxConcurrentRequests: number;
  } {
    const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.SECTION);

    const enableMapReduce = config.get<boolean>('enableMapReduce', true);
    const customTokenLimit = config.get<number>('customTokenLimit', 0);
    const safetyMarginPercent = config.get<number>('safetyMarginPercent', 85);
    const maxConcurrentRequests = config.get<number>('maxConcurrentRequests', 5);

    return {
      enableMapReduce,
      customTokenLimit: customTokenLimit > 0 ? customTokenLimit : undefined,
      safetyMarginPercent: Math.max(50, Math.min(100, safetyMarginPercent)),
      maxConcurrentRequests: Math.max(1, Math.min(10, maxConcurrentRequests)),
    };
  }

  /**
   * 更新大型 Diff 处理配置
   * @param key 配置键
   * @param value 配置值
   * @throws {ConfigurationError} 当配置更新失败时
   */
  async updateLargeDiffConfig(
    key: 'enableMapReduce' | 'customTokenLimit' | 'safetyMarginPercent' | 'maxConcurrentRequests',
    value: boolean | number
  ): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.SECTION);
      await config.update(key, value, vscode.ConfigurationTarget.Global);
      this.invalidateCache();
    } catch (error) {
      throw new ConfigurationError(
        `更新大型 Diff 配置失败: ${error instanceof Error ? error.message : String(error)}`,
        'update'
      );
    }
  }

  /**
   * 获取 Chunk 模型配置
   * @returns Chunk 模型名称（可选）
   */
  getChunkModel(): string | undefined {
    const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.SECTION);
    const chunkModel = config.get<string>('chunkModel', '');

    // 如果配置为空字符串，返回 undefined
    return chunkModel && chunkModel.trim() !== '' ? chunkModel.trim() : undefined;
  }

  /**
   * 更新 Chunk 模型配置
   * @param chunkModel Chunk 模型名称（空字符串表示清除配置）
   * @param target 配置目标（全局或工作区）
   * @throws {ConfigurationError} 当配置更新失败时
   */
  async updateChunkModel(
    chunkModel: string,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.SECTION);

      // 如果是空字符串，清除配置
      const valueToSet = chunkModel && chunkModel.trim() !== '' ? chunkModel.trim() : '';

      await config.update('chunkModel', valueToSet, target);
      this.invalidateCache();
    } catch (error) {
      throw new ConfigurationError(
        `更新 Chunk 模型配置失败: ${error instanceof Error ? error.message : String(error)}`,
        'update'
      );
    }
  }

  /**
   * 验证 Chunk 模型配置
   * @param chunkModel Chunk 模型名称
   * @returns 验证结果
   */
  async validateChunkModel(chunkModel: string): Promise<ValidationResult> {
    try {
      const config = await this.getConfig();
      const provider = this.getProvider();

      // 创建临时配置对象用于验证
      const tempConfig = {
        ...config,
        chunkModel: chunkModel && chunkModel.trim() !== '' ? chunkModel.trim() : undefined,
      };

      return this.validator.validateConfig(tempConfig, provider);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(
        `Chunk 模型验证失败: ${error instanceof Error ? error.message : String(error)}`,
        'validation'
      );
    }
  }

  /**
   * 获取智能过滤配置
   * @returns 智能过滤配置对象
   */
  getSmartFilterConfig(): {
    enableSmartFilter: boolean;
    minFilesThreshold: number;
    maxFileListSize: number;
    filterTimeout: number;
    filterModel?: string;
    customSystemPrompt?: string;
    showFilterStats: boolean;
    enableDetailedLogging: boolean;
  } {
    const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.SECTION);

    const enableSmartFilter = config.get<boolean>('enableSmartFilter', true);
    const minFilesThreshold = config.get<number>('minFilesThreshold', 3);
    const maxFileListSize = config.get<number>('maxFileListSize', 500);
    const filterTimeout = config.get<number>('filterTimeout', 10000);
    const filterModel = config.get<string>('filterModel', '');
    const customSystemPrompt = config.get<string>('customSystemPrompt', '');
    const showFilterStats = config.get<boolean>('showFilterStats', true);
    const enableDetailedLogging = config.get<boolean>('enableDetailedLogging', false);

    return {
      enableSmartFilter,
      minFilesThreshold: Math.max(1, Math.min(10, minFilesThreshold)),
      maxFileListSize: Math.max(100, Math.min(1000, maxFileListSize)),
      filterTimeout: Math.max(5000, Math.min(60000, filterTimeout)),
      filterModel: filterModel || undefined,
      customSystemPrompt: customSystemPrompt || undefined,
      showFilterStats,
      enableDetailedLogging,
    };
  }

  /**
   * 更新智能过滤配置
   * @param key 配置键
   * @param value 配置值
   * @throws {ConfigurationError} 当配置更新失败时
   */
  async updateSmartFilterConfig(
    key:
      | 'enableSmartFilter'
      | 'minFilesThreshold'
      | 'maxFileListSize'
      | 'filterTimeout'
      | 'filterModel'
      | 'customSystemPrompt'
      | 'showFilterStats'
      | 'enableDetailedLogging',
    value: boolean | number | string
  ): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.SECTION);
      await config.update(key, value, vscode.ConfigurationTarget.Global);
      this.invalidateCache();
    } catch (error) {
      throw new ConfigurationError(
        `更新智能过滤配置失败: ${error instanceof Error ? error.message : String(error)}`,
        'update'
      );
    }
  }
}
