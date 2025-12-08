import * as vscode from 'vscode';
import { ErrorType } from '../types';
import { Ii18nService } from '../services/i18nService';

/**
 * 错误处理器类
 * 统一处理插件中的各种错误，提供用户友好的错误消息和日志记录
 */
export class ErrorHandler {
  private outputChannel: vscode.OutputChannel;
  private retryCallback: (() => Promise<void>) | null = null;
  private i18n: Ii18nService | null = null;

  constructor(i18n?: Ii18nService) {
    this.outputChannel = vscode.window.createOutputChannel('AI Git Commit');
    this.i18n = i18n || null;
  }

  /**
   * 设置 i18n 服务
   * @param i18n i18n 服务实例
   */
  public setI18nService(i18n: Ii18nService): void {
    this.i18n = i18n;
  }

  /**
   * 设置重试回调函数
   * @param callback 重试时要执行的回调函数
   */
  public setRetryCallback(callback: (() => Promise<void>) | null): void {
    this.retryCallback = callback;
  }

  /**
   * 处理错误
   * @param error 错误对象
   * @param context 错误上下文信息
   */
  public async handleError(error: Error, context: string): Promise<void> {
    const errorType = this.classifyError(error);
    const userMessage = this.getUserFriendlyMessage(error, errorType);

    // 记录错误日志
    this.logError(error, context, errorType);

    // 显示用户友好的错误消息
    await this.showErrorToUser(userMessage, errorType);
  }

  /**
   * 分类错误类型
   * @param error 错误对象
   * @returns 错误类型
   */
  // 错误关键词映射表
  private readonly errorKeywords = {
    [ErrorType.ConfigurationError]: ['configuration', 'config', 'api key', 'endpoint'],
    [ErrorType.GitError]: ['git', 'repository', 'staged', 'commit'],
    [ErrorType.NetworkError]: ['network', 'timeout', 'econnrefused', 'enotfound'],
    [ErrorType.APIError]: ['api', '401', '403', '429', '500', 'unauthorized', 'rate limit'],
  };

  /**
   * 分类错误类型
   * @param error 错误对象
   * @returns 错误类型
   */
  private classifyError(error: Error): ErrorType {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // 按优先级检查错误类型
    if (this.isConfigurationError(errorMessage)) {
      return ErrorType.ConfigurationError;
    }

    if (this.isGitError(errorMessage)) {
      return ErrorType.GitError;
    }

    if (this.isNetworkError(errorMessage, errorName)) {
      return ErrorType.NetworkError;
    }

    if (this.isAPIError(errorMessage)) {
      return ErrorType.APIError;
    }

    return ErrorType.UnknownError;
  }

  /**
   * 检查是否为配置错误
   * @param message 错误消息
   * @returns 是否为配置错误
   */
  private isConfigurationError(message: string): boolean {
    return this.containsAnyKeyword(message, this.errorKeywords[ErrorType.ConfigurationError]);
  }

  /**
   * 检查是否为Git错误
   * @param message 错误消息
   * @returns 是否为Git错误
   */
  private isGitError(message: string): boolean {
    return this.containsAnyKeyword(message, this.errorKeywords[ErrorType.GitError]);
  }

  /**
   * 检查是否为网络错误
   * @param message 错误消息
   * @param name 错误名称
   * @returns 是否为网络错误
   */
  private isNetworkError(message: string, name: string): boolean {
    return (
      this.containsAnyKeyword(message, this.errorKeywords[ErrorType.NetworkError]) ||
      name.includes('network')
    );
  }

  /**
   * 检查是否为API错误
   * @param message 错误消息
   * @returns 是否为API错误
   */
  private isAPIError(message: string): boolean {
    return this.containsAnyKeyword(message, this.errorKeywords[ErrorType.APIError]);
  }

  /**
   * 检查消息是否包含任意关键词
   * @param message 消息文本
   * @param keywords 关键词数组
   * @returns 是否包含任意关键词
   */
  private containsAnyKeyword(message: string, keywords: string[]): boolean {
    return keywords.some((keyword) => message.includes(keyword));
  }

  /**
   * 获取用户友好的错误消息
   * @param error 错误对象
   * @param errorType 错误类型
   * @returns 用户友好的错误消息
   */
  private getUserFriendlyMessage(error: Error, errorType: ErrorType): string {
    switch (errorType) {
      case ErrorType.ConfigurationError:
        return this.getConfigurationErrorMessage(error);

      case ErrorType.GitError:
        return this.getGitErrorMessage(error);

      case ErrorType.APIError:
        return this.getAPIErrorMessage(error);

      case ErrorType.NetworkError:
        return this.getNetworkErrorMessage(error);

      case ErrorType.UnknownError:
      default:
        return this.getUnknownErrorMessage(error);
    }
  }

  /**
   * 获取配置错误消息
   */
  private getConfigurationErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('api key')) {
      return this.formatErrorMessage(
        'error.config.apiKeyMissing.title',
        'error.config.apiKeyMissing.reason',
        'error.config.apiKeyMissing.solutions'
      );
    }

    if (message.includes('endpoint')) {
      return this.formatErrorMessage(
        'error.config.endpointInvalid.title',
        'error.config.endpointInvalid.reason',
        'error.config.endpointInvalid.solutions'
      );
    }

    if (message.includes('model')) {
      return this.formatErrorMessage(
        'error.config.modelMissing.title',
        'error.config.modelMissing.reason',
        'error.config.modelMissing.solutions'
      );
    }

    return this.formatErrorMessage(
      'error.config.general.title',
      'error.config.general.reason',
      'error.config.general.solutions',
      { message: error.message }
    );
  }

  /**
   * 获取Git错误消息
   */
  private getGitErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('not a git repository')) {
      return this.formatErrorMessage(
        'error.git.notRepository.title',
        'error.git.notRepository.reason',
        'error.git.notRepository.solutions'
      );
    }

    if (message.includes('no staged changes') || message.includes('nothing to commit')) {
      return this.formatErrorMessage(
        'error.git.noChanges.title',
        'error.git.noChanges.reason',
        'error.git.noChanges.solutions'
      );
    }

    if (message.includes('git not found')) {
      return this.formatErrorMessage(
        'error.git.notFound.title',
        'error.git.notFound.reason',
        'error.git.notFound.solutions'
      );
    }

    return this.formatErrorMessage(
      'error.git.general.title',
      'error.git.general.reason',
      'error.git.general.solutions',
      { message: error.message }
    );
  }

  // API错误类型检测映射
  private readonly apiErrorPatterns: Array<{ keywords: string[]; type: string }> = [
    { keywords: ['401', 'unauthorized'], type: '401' },
    { keywords: ['403', 'forbidden'], type: '403' },
    { keywords: ['429', 'rate limit'], type: '429' },
    { keywords: ['404'], type: '404' },
    { keywords: ['500', '502', '503'], type: '5xx' },
  ];

  /**
   * 获取API错误消息
   * @param error 错误对象
   * @returns 格式化的错误消息
   */
  private getAPIErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();

    // 检查特定的错误类型
    const errorType = this.detectAPIErrorType(message);

    if (errorType === '401') {
      return this.formatErrorMessage(
        'error.api.401.title',
        'error.api.401.reason',
        'error.api.401.solutions'
      );
    }

    if (errorType === '403') {
      return this.formatErrorMessage(
        'error.api.403.title',
        'error.api.403.reason',
        'error.api.403.solutions'
      );
    }

    if (errorType === '404') {
      return this.formatErrorMessage(
        'error.api.404.title',
        'error.api.404.reason',
        'error.api.404.solutions'
      );
    }

    if (errorType === '429') {
      return this.formatErrorMessage(
        'error.api.429.title',
        'error.api.429.reason',
        'error.api.429.solutions'
      );
    }

    if (errorType === '5xx') {
      return this.formatErrorMessage(
        'error.api.5xx.title',
        'error.api.5xx.reason',
        'error.api.5xx.solutions'
      );
    }

    // 默认错误消息
    return this.formatErrorMessage(
      'error.api.general.title',
      'error.api.general.reason',
      'error.api.general.solutions',
      { message: error.message }
    );
  }

  /**
   * 检测API错误类型
   * @param message 错误消息
   * @returns 错误类型标识
   */
  private detectAPIErrorType(message: string): string | null {
    for (const pattern of this.apiErrorPatterns) {
      if (pattern.keywords.some((keyword) => message.includes(keyword))) {
        return pattern.type;
      }
    }
    return null;
  }

  /**
   * 获取网络错误消息
   */
  private getNetworkErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) {
      return this.formatErrorMessage(
        'error.network.timeout.title',
        'error.network.timeout.reason',
        'error.network.timeout.solutions'
      );
    }

    if (message.includes('econnrefused')) {
      return this.formatErrorMessage(
        'error.network.refused.title',
        'error.network.refused.reason',
        'error.network.refused.solutions'
      );
    }

    if (message.includes('enotfound')) {
      return this.formatErrorMessage(
        'error.network.notFound.title',
        'error.network.notFound.reason',
        'error.network.notFound.solutions'
      );
    }

    return this.formatErrorMessage(
      'error.network.general.title',
      'error.network.general.reason',
      'error.network.general.solutions',
      { message: error.message }
    );
  }

  /**
   * 获取未知错误消息
   */
  private getUnknownErrorMessage(error: Error): string {
    return this.formatErrorMessage(
      'error.unknown.title',
      'error.unknown.reason',
      'error.unknown.solutions',
      { message: error.message }
    );
  }

  /**
   * 格式化错误消息
   * @param titleKey 标题翻译键
   * @param reasonKey 原因翻译键
   * @param solutionsKey 解决方案翻译键
   * @param params 参数对象
   * @returns 格式化的错误消息
   */
  private formatErrorMessage(
    titleKey: string,
    reasonKey: string,
    solutionsKey: string,
    params?: Record<string, string | number>
  ): string {
    if (!this.i18n) {
      // 如果 i18n 未初始化，返回基本错误消息
      const errorMessage = params?.['message'] || 'Unknown error';
      return `Error: ${errorMessage}`;
    }

    const title = this.i18n.t(titleKey, params);
    const reason = this.i18n.t(reasonKey, params);
    const solutions = this.i18n.t(solutionsKey, params);

    return `${title}\n\n${reason}\n\n${solutions}`;
  }

  /**
   * 向用户显示错误消息
   * @param message 错误消息
   * @param errorType 错误类型
   */
  private async showErrorToUser(message: string, errorType: ErrorType): Promise<void> {
    const actions = this.getErrorActions(errorType);

    if (actions.length > 0) {
      const action = await vscode.window.showErrorMessage(message, ...actions);
      if (action) {
        this.handleErrorAction(action);
      }
    } else {
      void vscode.window.showErrorMessage(message);
    }
  }

  /**
   * 获取错误相关的操作按钮
   * @param errorType 错误类型
   * @returns 操作按钮数组
   */
  private getErrorActions(errorType: ErrorType): string[] {
    if (!this.i18n) {
      // 如果 i18n 未初始化，返回英文按钮
      switch (errorType) {
        case ErrorType.ConfigurationError:
          return ['Open Settings', 'Configuration Wizard'];
        case ErrorType.GitError:
          return ['Open Source Control'];
        case ErrorType.APIError:
        case ErrorType.NetworkError:
          return ['Retry', 'View Logs'];
        case ErrorType.UnknownError:
          return ['View Logs'];
        default:
          return [];
      }
    }

    switch (errorType) {
      case ErrorType.ConfigurationError:
        return [this.i18n.t('error.action.openSettings'), this.i18n.t('error.action.configWizard')];

      case ErrorType.GitError:
        return [this.i18n.t('error.action.openScm')];

      case ErrorType.APIError:
      case ErrorType.NetworkError:
        return [this.i18n.t('error.action.retry'), this.i18n.t('error.action.viewLogs')];

      case ErrorType.UnknownError:
        return [this.i18n.t('error.action.viewLogs')];

      default:
        return [];
    }
  }

  /**
   * 处理错误操作
   * @param action 操作名称
   */
  private handleErrorAction(action: string): void {
    // 获取本地化的操作名称
    const openSettings = this.i18n?.t('error.action.openSettings') || 'Open Settings';
    const configWizard = this.i18n?.t('error.action.configWizard') || 'Configuration Wizard';
    const openScm = this.i18n?.t('error.action.openScm') || 'Open Source Control';
    const viewLogs = this.i18n?.t('error.action.viewLogs') || 'View Logs';
    const retry = this.i18n?.t('error.action.retry') || 'Retry';

    if (action === openSettings) {
      void vscode.commands.executeCommand('workbench.action.openSettings', 'aigitcommit');
    } else if (action === configWizard) {
      void vscode.commands.executeCommand('aigitcommit.configureSettings');
    } else if (action === openScm) {
      void vscode.commands.executeCommand('workbench.view.scm');
    } else if (action === viewLogs) {
      this.outputChannel.show();
    } else if (action === retry) {
      if (this.retryCallback) {
        this.logInfo('用户请求重试操作', 'ErrorHandler');
        void this.retryCallback().catch((error: Error) => {
          this.logError(error, '重试操作失败');
        });
      }
    }
  }

  /**
   * 记录错误日志
   * @param error 错误对象
   * @param context 错误上下文
   * @param errorType 错误类型
   */
  public logError(error: Error, context: string, errorType?: ErrorType): void {
    const timestamp = new Date().toISOString();
    const type = errorType || this.classifyError(error);

    this.outputChannel.appendLine('');
    this.outputChannel.appendLine(`[${timestamp}] ERROR`);
    this.outputChannel.appendLine(`Context: ${context}`);
    this.outputChannel.appendLine(`Type: ${type}`);
    this.outputChannel.appendLine(`Message: ${error.message}`);

    if (error.stack) {
      this.outputChannel.appendLine(`Stack: ${error.stack}`);
    }

    this.outputChannel.appendLine('---');
  }

  /**
   * 记录信息日志
   * @param message 日志消息
   * @param context 上下文
   */
  public logInfo(message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    this.outputChannel.appendLine(`[${timestamp}] INFO${contextStr}: ${message}`);
  }

  /**
   * 记录警告日志
   * @param message 警告消息
   * @param context 上下文
   */
  public logWarning(message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    this.outputChannel.appendLine(`[${timestamp}] WARNING${contextStr}: ${message}`);
  }

  /**
   * 显示输出通道
   */
  public showOutputChannel(): void {
    this.outputChannel.show();
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.outputChannel.dispose();
  }
}
