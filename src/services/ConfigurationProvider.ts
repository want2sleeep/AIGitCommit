import * as vscode from 'vscode';
import { ExtensionConfig, FullConfig } from '../types';
import { ConfigurationError } from '../errors';
import { CONFIG_CONSTANTS } from '../constants';

/**
 * 配置提供者
 * 负责读取和写入配置数据
 */
export class ConfigurationProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * 获取插件配置
   * @returns 完整的配置对象
   * @throws {ConfigurationError} 当配置读取失败时
   */
  async getConfig(): Promise<ExtensionConfig> {
    try {
      const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.SECTION);

      // 优先从 SecretStorage 读取 API 密钥
      let apiKey = await this.context.secrets.get(CONFIG_CONSTANTS.SECRET_KEY_API_KEY);

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
        chunkModel: config.get<string>('chunkModel', ''),
      };
    } catch (error) {
      throw new ConfigurationError(
        `无法读取配置: ${error instanceof Error ? error.message : String(error)}`,
        'config'
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
    try {
      // API密钥特殊处理，存储到 SecretStorage
      if (key === 'apiKey') {
        await this.storeApiKey(String(value));
        return;
      }

      const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.SECTION);
      await config.update(key, value, target);
    } catch (error) {
      throw new ConfigurationError(
        `无法更新配置项 "${key}": ${error instanceof Error ? error.message : String(error)}`,
        key
      );
    }
  }

  /**
   * 安全存储 API 密钥到 SecretStorage
   * @param apiKey API密钥
   * @throws {ConfigurationError} 当密钥存储失败时
   */
  async storeApiKey(apiKey: string): Promise<void> {
    try {
      if (!apiKey || apiKey.trim() === '') {
        await this.context.secrets.delete(CONFIG_CONSTANTS.SECRET_KEY_API_KEY);
      } else {
        await this.context.secrets.store(CONFIG_CONSTANTS.SECRET_KEY_API_KEY, apiKey);
      }
    } catch (error) {
      throw new ConfigurationError(
        `无法存储API密钥到安全存储: ${error instanceof Error ? error.message : String(error)}`,
        'apiKey'
      );
    }
  }

  /**
   * 获取存储的 API 密钥
   * @returns API密钥或undefined
   * @throws {ConfigurationError} 当密钥读取失败时
   */
  async getApiKey(): Promise<string | undefined> {
    try {
      return await this.context.secrets.get(CONFIG_CONSTANTS.SECRET_KEY_API_KEY);
    } catch (error) {
      throw new ConfigurationError(
        `无法从安全存储读取API密钥: ${error instanceof Error ? error.message : String(error)}`,
        'apiKey'
      );
    }
  }

  /**
   * 删除存储的 API 密钥
   * @throws {ConfigurationError} 当密钥删除失败时
   */
  async deleteApiKey(): Promise<void> {
    try {
      await this.context.secrets.delete(CONFIG_CONSTANTS.SECRET_KEY_API_KEY);
    } catch (error) {
      throw new ConfigurationError(
        `无法删除API密钥: ${error instanceof Error ? error.message : String(error)}`,
        'apiKey'
      );
    }
  }

  /**
   * 获取API提供商
   * @returns 提供商ID
   */
  getProvider(): string {
    const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.SECTION);
    return config.get<string>('provider', 'openai');
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
    try {
      if (!provider || provider.trim() === '') {
        throw new ConfigurationError('提供商ID不能为空', 'provider');
      }

      const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.SECTION);
      await config.update('provider', provider, target);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(
        `无法设置提供商: ${error instanceof Error ? error.message : String(error)}`,
        'provider'
      );
    }
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
   * @throws {ConfigurationError} 当配置保存失败时
   */
  async saveFullConfig(
    config: FullConfig,
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global
  ): Promise<void> {
    try {
      // 验证配置对象
      if (!config) {
        throw new ConfigurationError('配置对象不能为空', 'config');
      }

      // 保存提供商
      await this.setProvider(config.provider, target);

      // 保存API密钥到SecretStorage
      await this.storeApiKey(config.apiKey);

      // 保存其他配置项
      const vsConfig = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.SECTION);
      await vsConfig.update('apiEndpoint', config.apiEndpoint, target);
      await vsConfig.update('modelName', config.modelName, target);
      await vsConfig.update('language', config.language, target);
      await vsConfig.update('commitFormat', config.commitFormat, target);
      await vsConfig.update('maxTokens', config.maxTokens, target);
      await vsConfig.update('temperature', config.temperature, target);

      // 保存 chunkModel（如果提供）
      if (config.chunkModel !== undefined) {
        await vsConfig.update('chunkModel', config.chunkModel, target);
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(
        `无法保存完整配置: ${error instanceof Error ? error.message : String(error)}`,
        'fullConfig'
      );
    }
  }

  /**
   * 监听配置变更
   * @param callback 配置变更时的回调函数
   * @returns Disposable对象
   */
  onConfigurationChanged(callback: (config: ExtensionConfig) => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(async (e) => {
      if (e.affectsConfiguration(CONFIG_CONSTANTS.SECTION)) {
        const config = await this.getConfig();
        callback(config);
      }
    });
  }
}
