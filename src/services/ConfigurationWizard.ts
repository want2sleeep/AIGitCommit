import * as vscode from 'vscode';
import { ExtensionConfig } from '../types';
import { ConfigurationError } from '../errors';
import { validateApiEndpoint, validateApiKey, validateModelName } from '../utils/validationUtils';
import { buildUrl } from '../utils/common';
import { ConfigurationProvider } from './ConfigurationProvider';

/**
 * 配置向导
 * 负责引导用户完成初始配置和测试连接
 */
export class ConfigurationWizard {
  constructor(private readonly configProvider: ConfigurationProvider) {}

  /**
   * 显示配置向导
   * 引导用户完成初始配置
   */
  async showConfigurationWizard(): Promise<boolean> {
    const config = await this.configProvider.getConfig();

    if (!(await this.showWelcomeMessage())) {
      return false;
    }

    const apiEndpoint = await this.promptForAPIEndpoint(config.apiEndpoint);
    if (!apiEndpoint) {
      return false;
    }

    const apiKey = await this.promptForAPIKey();
    if (!apiKey) {
      return false;
    }

    const modelName = await this.promptForModelName(config.modelName);
    if (!modelName) {
      return false;
    }

    return await this.saveWizardConfiguration(apiEndpoint, apiKey, modelName);
  }

  /**
   * 显示欢迎消息
   * @returns 用户是否选择继续
   */
  private async showWelcomeMessage(): Promise<boolean> {
    const proceed = await vscode.window.showInformationMessage(
      '欢迎使用AI Git Commit！让我们开始配置。',
      '开始配置',
      '取消'
    );
    return proceed === '开始配置';
  }

  /**
   * 提示用户输入API端点
   * @param defaultValue 默认值
   * @returns API端点或undefined（用户取消）
   */
  private async promptForAPIEndpoint(defaultValue: string): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: '步骤 1/3: 请输入OpenAI兼容API的端点URL',
      value: defaultValue,
      placeHolder: 'https://api.openai.com/v1',
      validateInput: validateApiEndpoint,
    });
  }

  /**
   * 提示用户输入API密钥
   * @returns API密钥或undefined（用户取消）
   */
  private async promptForAPIKey(): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: '步骤 2/3: 请输入API密钥',
      password: true,
      placeHolder: 'sk-...',
      validateInput: validateApiKey,
    });
  }

  /**
   * 提示用户输入模型名称
   * @param defaultValue 默认值
   * @returns 模型名称或undefined（用户取消）
   */
  private async promptForModelName(defaultValue: string): Promise<string | undefined> {
    return await vscode.window.showInputBox({
      prompt: '步骤 3/3: 请输入模型名称',
      value: defaultValue,
      placeHolder: 'gpt-3.5-turbo',
      validateInput: validateModelName,
    });
  }

  /**
   * 保存向导配置
   * @param apiEndpoint API端点
   * @param apiKey API密钥
   * @param modelName 模型名称
   * @returns 是否保存成功
   */
  private async saveWizardConfiguration(
    apiEndpoint: string,
    apiKey: string,
    modelName: string
  ): Promise<boolean> {
    try {
      await this.configProvider.updateConfig('apiEndpoint', apiEndpoint);
      await this.configProvider.updateConfig('apiKey', apiKey);
      await this.configProvider.updateConfig('modelName', modelName);

      await this.promptForConnectionTest();
      return true;
    } catch (error) {
      this.showConfigurationSaveError(error);
      return false;
    }
  }

  /**
   * 提示用户是否测试连接
   */
  private async promptForConnectionTest(): Promise<void> {
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
  }

  /**
   * 显示配置保存错误
   * @param error 错误对象
   */
  private showConfigurationSaveError(error: unknown): void {
    if (error instanceof ConfigurationError) {
      void vscode.window.showErrorMessage(
        `配置保存失败: ${error.message}${error.field ? ` (字段: ${error.field})` : ''}`
      );
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      void vscode.window.showErrorMessage(`保存配置失败: ${errorMessage}`);
    }
  }

  /**
   * 测试API连接
   * 发送一个简单的请求来验证配置是否正确
   * @throws {ConfigurationError} 当配置无效时
   * @throws {APIError} 当API调用失败时
   * @throws {NetworkError} 当网络连接失败时
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
          const config = await this.configProvider.getConfig();
          this.validateConnectionConfig(config);

          const axios = await import('axios');
          const endpoint = this.buildChatCompletionsEndpoint(config.apiEndpoint);
          const response = await this.sendTestRequest(axios.default, endpoint, config);

          return this.handleTestResponse(response);
        } catch (error: unknown) {
          return this.handleTestError(error);
        }
      }
    );
  }

  /**
   * 验证连接测试所需的配置
   * @param config 配置对象
   * @throws {ConfigurationError} 当配置不完整时
   */
  private validateConnectionConfig(config: ExtensionConfig): void {
    if (!config.apiEndpoint || !config.apiKey || !config.modelName) {
      throw new ConfigurationError(
        '配置不完整，无法测试连接。请确保已配置API端点、API密钥和模型名称。',
        'testConnection'
      );
    }
  }

  /**
   * 构建聊天完成端点URL
   * @param apiEndpoint API端点
   * @returns 完整的聊天完成端点URL
   */
  private buildChatCompletionsEndpoint(apiEndpoint: string): string {
    return apiEndpoint.endsWith('/chat/completions')
      ? apiEndpoint
      : buildUrl(apiEndpoint, '/chat/completions');
  }

  /**
   * 发送测试请求
   * @param axios Axios实例
   * @param endpoint API端点
   * @param config 配置对象
   * @returns 响应对象
   */
  private async sendTestRequest(
    axios: typeof import('axios').default,
    endpoint: string,
    config: ExtensionConfig
  ): Promise<{ status: number }> {
    return await axios.post<{ status: number }>(
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
  }

  /**
   * 处理测试响应
   * @param response 响应对象
   * @returns 测试是否成功
   */
  private handleTestResponse(response: { status: number }): boolean {
    if (response.status === 200) {
      void vscode.window.showInformationMessage('✅ API连接测试成功！配置正确。');
      return true;
    } else {
      void vscode.window.showWarningMessage(`⚠️ API返回了非预期的状态码: ${response.status}`);
      return false;
    }
  }

  /**
   * 处理测试错误
   * @param error 错误对象
   * @returns 测试是否成功（总是false）
   */
  private handleTestError(error: unknown): boolean {
    interface AxiosErrorResponse {
      response?: {
        status: number;
        data?: {
          error?: {
            message?: string;
          };
        };
      };
      code?: string;
      message?: string;
    }

    const err = error as AxiosErrorResponse;

    if (error instanceof ConfigurationError) {
      void vscode.window.showErrorMessage(error.message);
      return false;
    }

    if (err.response) {
      return this.handleAPIResponseError(err.response);
    }

    if (err.code) {
      return this.handleNetworkError(err.code, err.message || '未知错误');
    }

    const errorMessage = err.message || '未知错误';
    void vscode.window.showErrorMessage(`❌ 连接测试失败: ${errorMessage}`);
    return false;
  }

  /**
   * 处理API响应错误
   * @param response 响应对象
   * @returns 测试是否成功（总是false）
   */
  private handleAPIResponseError(response: {
    status: number;
    data?: { error?: { message?: string } };
  }): boolean {
    const status = response.status;
    const apiErrorMessage = response.data?.error?.message || '未知错误';
    const userMessage = this.getAPIErrorMessage(status, apiErrorMessage);

    void vscode.window.showErrorMessage(userMessage);
    return false;
  }

  /**
   * 获取API错误消息
   * @param status HTTP状态码
   * @param apiErrorMessage API返回的错误消息
   * @returns 用户友好的错误消息
   */
  private getAPIErrorMessage(status: number, apiErrorMessage: string): string {
    const errorMap: Record<number, string> = {
      401: '❌ API认证失败：请检查API密钥是否正确',
      404: '❌ API端点不存在：请检查端点URL和模型名称是否正确',
      429: '❌ API请求频率限制：请稍后再试',
      500: `❌ API服务器错误 (${status})：服务暂时不可用，请稍后再试`,
      503: `❌ API服务器错误 (${status})：服务暂时不可用，请稍后再试`,
    };

    return errorMap[status] || `❌ API错误 (${status}): ${apiErrorMessage}`;
  }

  /**
   * 处理网络错误
   * @param code 错误代码
   * @param message 错误消息
   * @returns 测试是否成功（总是false）
   */
  private handleNetworkError(code: string, message: string): boolean {
    const networkErrorMap: Record<string, { message: string; userMessage: string }> = {
      ECONNREFUSED: {
        message: '连接被拒绝：无法连接到API端点',
        userMessage: '❌ 连接被拒绝：请检查API端点是否正确，以及网络连接是否正常',
      },
      ETIMEDOUT: {
        message: '连接超时：API响应时间过长',
        userMessage: '❌ 连接超时：请检查网络连接，或尝试增加超时时间',
      },
      ENOTFOUND: {
        message: 'DNS解析失败：无法找到API端点域名',
        userMessage: '❌ 无法解析域名：请检查API端点URL是否正确',
      },
    };

    const errorInfo = networkErrorMap[code];
    if (errorInfo) {
      void vscode.window.showErrorMessage(errorInfo.userMessage);
      return false;
    }

    void vscode.window.showErrorMessage(`❌ 连接测试失败: ${message}`);
    return false;
  }
}
