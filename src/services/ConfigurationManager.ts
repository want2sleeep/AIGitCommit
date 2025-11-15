import * as vscode from 'vscode';
import { ExtensionConfig, ValidationResult, FullConfig, ConfigSummary } from '../types';

/**
 * 配置管理器
 * 负责读取、验证和管理插件配置
 */
export class ConfigurationManager {
  private static readonly CONFIG_SECTION = 'aigitcommit';
  private static readonly SECRET_KEY_API_KEY = 'aigitcommit.apiKey';
  private static readonly CACHE_TTL = 5000; // 5秒缓存TTL

  private configSummaryCache: ConfigSummary | undefined;
  private cacheTimestamp: number = 0;

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * 获取插件配置
   * @returns 完整的配置对象
   */
  async getConfig(): Promise<ExtensionConfig> {
    const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);

    // 优先从 SecretStorage 读取 API 密钥
    let apiKey = await this.context.secrets.get(ConfigurationManager.SECRET_KEY_API_KEY);

    // 如果 SecretStorage 中没有，则从配置中读取（向后兼容）
    if (!apiKey) {
      apiKey = config.get<string>('apiKey', '');
      // 如果配置中有密钥，迁移到 SecretStorage
      if (apiKey) {
        await this.storeApiKey(apiKey);
        // 清除配置中的密钥
        await config.update('apiKey', '', vscode.ConfigurationTarget.Global);
      }
    }

    return {
      apiEndpoint: config.get<string>('apiEndpoint', 'https://api.openai.com/v1'),
      apiKey: apiKey || '',
      modelName: config.get<string>('modelName', 'gpt-3.5-turbo'),
      language: config.get<string>('language', 'zh-CN'),
      commitFormat: config.get<string>('commitFormat', 'conventional'),
      maxTokens: config.get<number>('maxTokens', 500),
      temperature: config.get<number>('temperature', 0.7),
    };
  }

  /**
   * 验证配置的有效性
   * @returns 验证结果，包含是否有效和错误信息
   */
  async validateConfig(): Promise<ValidationResult> {
    const config = await this.getConfig();
    const errors: string[] = [];

    // 验证 API 端点
    if (!config.apiEndpoint || config.apiEndpoint.trim() === '') {
      errors.push('API端点不能为空');
    } else if (!this.isValidUrl(config.apiEndpoint)) {
      errors.push('API端点格式无效，必须是有效的URL');
    }

    // 验证 API 密钥
    if (!config.apiKey || config.apiKey.trim() === '') {
      errors.push('API密钥不能为空');
    }

    // 验证模型名称
    if (!config.modelName || config.modelName.trim() === '') {
      errors.push('模型名称不能为空');
    }

    // 验证语言
    const validLanguages = ['zh-CN', 'en-US'];
    if (!validLanguages.includes(config.language)) {
      errors.push(`语言必须是以下之一: ${validLanguages.join(', ')}`);
    }

    // 验证提交格式
    const validFormats = ['conventional', 'simple'];
    if (!validFormats.includes(config.commitFormat)) {
      errors.push(`提交格式必须是以下之一: ${validFormats.join(', ')}`);
    }

    // 验证 maxTokens
    if (config.maxTokens <= 0) {
      errors.push('最大token数必须大于0');
    } else if (config.maxTokens > 4000) {
      errors.push('最大token数不能超过4000');
    }

    // 验证 temperature
    if (config.temperature < 0 || config.temperature > 2) {
      errors.push('温度参数必须在0到2之间');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 更新配置项
   * @param key 配置键
   * @param value 配置值
   * @param target 配置目标（全局或工作区）
   */
  async updateConfig(
    key: keyof ExtensionConfig,
    value: string | number,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    // API密钥特殊处理，存储到 SecretStorage
    if (key === 'apiKey') {
      await this.storeApiKey(String(value));
      this.invalidateCache();
      return;
    }

    const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
    await config.update(key, value, target);
    this.invalidateCache();
  }

  /**
   * 安全存储 API 密钥到 SecretStorage
   * @param apiKey API密钥
   */
  async storeApiKey(apiKey: string): Promise<void> {
    if (!apiKey || apiKey.trim() === '') {
      await this.context.secrets.delete(ConfigurationManager.SECRET_KEY_API_KEY);
    } else {
      await this.context.secrets.store(ConfigurationManager.SECRET_KEY_API_KEY, apiKey);
    }
    this.invalidateCache();
  }

  /**
   * 获取存储的 API 密钥
   * @returns API密钥或undefined
   */
  async getApiKey(): Promise<string | undefined> {
    return await this.context.secrets.get(ConfigurationManager.SECRET_KEY_API_KEY);
  }

  /**
   * 删除存储的 API 密钥
   */
  async deleteApiKey(): Promise<void> {
    await this.context.secrets.delete(ConfigurationManager.SECRET_KEY_API_KEY);
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
    const config = await this.getConfig();

    // 欢迎信息
    const proceed = await vscode.window.showInformationMessage(
      '欢迎使用AI Git Commit！让我们开始配置。',
      '开始配置',
      '取消'
    );

    if (proceed !== '开始配置') {
      return false;
    }

    // 配置 API 端点
    const apiEndpoint = await vscode.window.showInputBox({
      prompt: '步骤 1/3: 请输入OpenAI兼容API的端点URL',
      value: config.apiEndpoint,
      placeHolder: 'https://api.openai.com/v1',
      validateInput: (value) => {
        if (!value || value.trim() === '') {
          return 'API端点不能为空';
        }
        if (!this.isValidUrl(value)) {
          return 'API端点格式无效';
        }
        return null;
      },
    });

    if (!apiEndpoint) {
      return false; // 用户取消
    }

    // 配置 API 密钥
    const apiKey = await vscode.window.showInputBox({
      prompt: '步骤 2/3: 请输入API密钥',
      password: true,
      placeHolder: 'sk-...',
      validateInput: (value) => {
        if (!value || value.trim() === '') {
          return 'API密钥不能为空';
        }
        return null;
      },
    });

    if (!apiKey) {
      return false; // 用户取消
    }

    // 配置模型名称
    const modelName = await vscode.window.showInputBox({
      prompt: '步骤 3/3: 请输入模型名称',
      value: config.modelName,
      placeHolder: 'gpt-3.5-turbo',
      validateInput: (value) => {
        if (!value || value.trim() === '') {
          return '模型名称不能为空';
        }
        return null;
      },
    });

    if (!modelName) {
      return false; // 用户取消
    }

    // 保存配置
    try {
      await this.updateConfig('apiEndpoint', apiEndpoint);
      await this.updateConfig('apiKey', apiKey);
      await this.updateConfig('modelName', modelName);

      // 询问是否测试连接
      const testConnection = await vscode.window.showInformationMessage(
        '配置已保存！是否测试API连接？',
        '测试连接',
        '跳过'
      );

      if (testConnection === '测试连接') {
        await this.testAPIConnection();
      } else {
        void vscode.window.showInformationMessage('配置完成！您可以开始使用AI Git Commit了。');
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`保存配置失败: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 测试API连接
   * 发送一个简单的请求来验证配置是否正确
   */
  async testAPIConnection(): Promise<boolean> {
    return await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: '正在测试API连接...',
        cancellable: false,
      },
      async () => {
        try {
          const config = await this.getConfig();
          const axios = await import('axios');

          const endpoint = config.apiEndpoint.endsWith('/chat/completions')
            ? config.apiEndpoint
            : `${config.apiEndpoint.replace(/\/$/, '')}/chat/completions`;

          const response = await axios.default.post<{ status: number }>(
            endpoint,
            {
              model: config.modelName,
              messages: [{ role: 'user', content: 'test' }],
              max_tokens: 5,
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.apiKey}`,
              },
              timeout: 10000,
            }
          );

          if (response.status === 200) {
            void vscode.window.showInformationMessage('✅ API连接测试成功！配置正确。');
            return true;
          } else {
            void vscode.window.showWarningMessage(`⚠️ API返回了非预期的状态码: ${response.status}`);
            return false;
          }
        } catch (error: unknown) {
          const err = error as {
            response?: { status: number; data?: { error?: { message?: string } } };
            code?: string;
            message: string;
          };
          let errorMessage = 'API连接测试失败';

          if (err.response) {
            const status = err.response.status;
            if (status === 401) {
              errorMessage = '❌ API认证失败：请检查API密钥是否正确';
            } else if (status === 404) {
              errorMessage = '❌ API端点不存在：请检查端点URL和模型名称';
            } else {
              errorMessage = `❌ API错误 (${status}): ${err.response.data?.error?.message || '未知错误'}`;
            }
          } else if (err.code === 'ECONNREFUSED') {
            errorMessage = '❌ 连接被拒绝：请检查API端点是否正确';
          } else if (err.code === 'ETIMEDOUT') {
            errorMessage = '❌ 连接超时：请检查网络连接';
          } else {
            errorMessage = `❌ ${err.message}`;
          }

          void vscode.window.showErrorMessage(errorMessage);
          return false;
        }
      }
    );
  }

  /**
   * 验证URL格式
   * @param url URL字符串
   * @returns 是否为有效URL
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 监听配置变更
   * @param callback 配置变更时的回调函数
   * @returns Disposable对象
   */
  onConfigurationChanged(callback: (config: ExtensionConfig) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration(ConfigurationManager.CONFIG_SECTION)) {
        const config = await this.getConfig();
        callback(config);
      }
    });
  }

  /**
   * 获取API提供商
   * @returns 提供商ID
   */
  getProvider(): string {
    const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
    return config.get<string>('provider', 'openai');
  }

  /**
   * 设置API提供商
   * @param provider 提供商ID
   * @param target 配置目标（全局或工作区）
   */
  async setProvider(
    provider: string,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
    await config.update('provider', provider, target);
    this.invalidateCache();
  }

  /**
   * 获取完整配置（包括提供商）
   * @returns 完整的配置对象
   */
  async getFullConfig(): Promise<FullConfig> {
    const baseConfig = await this.getConfig();
    const provider = this.getProvider();

    return {
      ...baseConfig,
      provider,
    };
  }

  /**
   * 保存完整配置
   * @param config 完整配置对象
   * @param target 配置目标（全局或工作区）
   */
  async saveFullConfig(
    config: FullConfig,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    // 保存提供商
    await this.setProvider(config.provider, target);

    // 保存API密钥到SecretStorage
    await this.storeApiKey(config.apiKey);

    // 保存其他配置项
    const vsConfig = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
    await vsConfig.update('apiEndpoint', config.apiEndpoint, target);
    await vsConfig.update('modelName', config.modelName, target);
    await vsConfig.update('language', config.language, target);
    await vsConfig.update('commitFormat', config.commitFormat, target);
    await vsConfig.update('maxTokens', config.maxTokens, target);
    await vsConfig.update('temperature', config.temperature, target);

    // 清除缓存
    this.invalidateCache();
  }

  /**
   * 获取配置摘要（用于显示）
   * 使用5秒TTL缓存机制提高性能
   * @returns 配置摘要对象
   */
  async getConfigSummary(): Promise<ConfigSummary> {
    // 检查缓存是否有效
    const now = Date.now();
    if (this.configSummaryCache && now - this.cacheTimestamp < ConfigurationManager.CACHE_TTL) {
      return this.configSummaryCache;
    }

    // 生成新的配置摘要
    const summary = await this.generateConfigSummary();

    // 更新缓存
    this.configSummaryCache = summary;
    this.cacheTimestamp = now;

    return summary;
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
        apiKeyMasked: this.maskApiKey(config.apiKey),
        baseUrl: config.apiEndpoint || '',
        modelName: config.modelName || '',
        isConfigured,
      };
    } catch (error) {
      console.error('Error getting config summary:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));

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
    this.configSummaryCache = undefined;
    this.cacheTimestamp = 0;
  }

  /**
   * 遮蔽API密钥显示
   * @param apiKey API密钥
   * @returns 遮蔽后的API密钥
   */
  private maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.trim() === '') {
      return '未设置';
    }
    if (apiKey.length < 8) {
      return '****';
    }
    return apiKey.substring(0, 4) + '****' + apiKey.substring(apiKey.length - 4);
  }

  /**
   * 配置迁移
   * 检测旧版本配置并迁移到新格式
   */
  async migrateConfiguration(): Promise<void> {
    const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);
    let migrationPerformed = false;

    // 1. 迁移API密钥从settings.json到SecretStorage（已在getConfig中处理，这里确认）
    const settingsApiKey = config.get<string>('apiKey', '');
    if (settingsApiKey) {
      await this.storeApiKey(settingsApiKey);
      await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
      migrationPerformed = true;
    }

    // 2. 如果没有provider配置，根据apiEndpoint推断提供商
    const currentProvider = config.get<string>('provider');
    if (!currentProvider) {
      const apiEndpoint = config.get<string>('apiEndpoint', '');
      const inferredProvider = this.inferProviderFromEndpoint(apiEndpoint);

      if (inferredProvider) {
        await this.setProvider(inferredProvider);
        migrationPerformed = true;
      }
    }

    // 3. 显示迁移完成通知
    if (migrationPerformed) {
      void vscode.window.showInformationMessage('✅ AI Git Commit 配置已成功迁移到新版本格式');
    }
  }

  /**
   * 根据API端点推断提供商
   * @param endpoint API端点URL
   * @returns 推断的提供商ID
   */
  private inferProviderFromEndpoint(endpoint: string): string {
    if (!endpoint) {
      return 'openai'; // 默认为OpenAI
    }

    const lowerEndpoint = endpoint.toLowerCase();

    // 检测Azure OpenAI
    if (lowerEndpoint.includes('azure') || lowerEndpoint.includes('.openai.azure.com')) {
      return 'azure-openai';
    }

    // 检测Ollama
    if (lowerEndpoint.includes('localhost:11434') || lowerEndpoint.includes('127.0.0.1:11434')) {
      return 'ollama';
    }

    // 检测OpenAI官方
    if (lowerEndpoint.includes('api.openai.com')) {
      return 'openai';
    }

    // 其他情况视为自定义
    return 'custom';
  }
}
