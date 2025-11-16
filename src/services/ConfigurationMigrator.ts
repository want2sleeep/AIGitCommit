import * as vscode from 'vscode';
import { ConfigurationError } from '../errors';
import { CONFIG_CONSTANTS } from '../constants';
import { ConfigurationProvider } from './ConfigurationProvider';

/**
 * 配置迁移器
 * 负责从旧版本配置迁移到新版本
 */
export class ConfigurationMigrator {
  constructor(private readonly configProvider: ConfigurationProvider) {}

  /**
   * 配置迁移
   * 检测旧版本配置并迁移到新格式
   * @throws {ConfigurationError} 当配置迁移失败时
   */
  async migrateConfiguration(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration(CONFIG_CONSTANTS.SECTION);
      let migrationPerformed = false;

      // 1. 迁移API密钥从settings.json到SecretStorage（已在getConfig中处理，这里确认）
      const settingsApiKey = config.get<string>('apiKey', '');
      if (settingsApiKey) {
        await this.configProvider.storeApiKey(settingsApiKey);
        await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
        migrationPerformed = true;
      }

      // 2. 如果没有provider配置，根据apiEndpoint推断提供商
      const currentProvider = config.get<string>('provider');
      if (!currentProvider) {
        const apiEndpoint = config.get<string>('apiEndpoint', '');
        const inferredProvider = this.inferProviderFromEndpoint(apiEndpoint);

        if (inferredProvider) {
          await this.configProvider.setProvider(inferredProvider);
          migrationPerformed = true;
        }
      }

      // 3. 显示迁移完成通知
      if (migrationPerformed) {
        void vscode.window.showInformationMessage('✅ AI Git Commit 配置已成功迁移到新版本格式');
      }
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      throw new ConfigurationError(
        `配置迁移失败: ${error instanceof Error ? error.message : String(error)}。请手动检查配置设置。`,
        'migration'
      );
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
