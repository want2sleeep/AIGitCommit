import * as vscode from 'vscode';
import { GitChange, ExtensionConfig, ValidationResult, FullConfig, ConfigSummary } from './index';

/**
 * Git服务接口
 * 定义Git操作的标准接口
 */
export interface IGitService {
  /**
   * 检查当前工作区是否为Git仓库
   * @returns 是否为Git仓库
   */
  isGitRepository(): boolean;

  /**
   * 获取Git仓库根目录
   * @returns 仓库根目录路径
   * @throws {GitOperationError} 当Git仓库不可用时
   */
  getRepositoryRoot(): string;

  /**
   * 获取暂存区的变更
   * @returns Git变更列表
   * @throws {GitOperationError} 当Git仓库不可用或获取变更失败时
   */
  getStagedChanges(): Promise<GitChange[]>;

  /**
   * 格式化变更信息为可读文本
   * @param changes Git变更列表
   * @returns 格式化的变更信息
   */
  formatChanges(changes: GitChange[]): string;

  /**
   * 执行Git提交
   * @param message 提交信息
   * @throws {GitOperationError} 当Git仓库不可用或提交失败时
   */
  commitWithMessage(message: string): Promise<void>;

  /**
   * 检查是否有暂存的变更
   * @returns 是否有暂存的变更
   */
  hasStagedChanges(): boolean;
}

/**
 * LLM服务接口
 * 定义大语言模型服务的标准接口
 */
export interface ILLMService {
  /**
   * 生成提交信息
   * @param changes Git变更列表
   * @param config 插件配置
   * @returns 生成的提交信息
   * @throws {APIError} 当API调用失败时
   * @throws {NetworkError} 当网络连接失败时
   */
  generateCommitMessage(changes: GitChange[], config: ExtensionConfig): Promise<string>;
}

/**
 * 配置管理器接口
 * 定义配置管理的标准接口
 */
export interface IConfigurationManager {
  /**
   * 获取插件配置
   * @returns 完整的配置对象
   * @throws {ConfigurationError} 当配置读取失败时
   */
  getConfig(): Promise<ExtensionConfig>;

  /**
   * 验证配置的有效性
   * @returns 验证结果，包含是否有效和错误信息
   * @throws {ConfigurationError} 当配置验证过程失败时
   */
  validateConfig(): Promise<ValidationResult>;

  /**
   * 更新配置项
   * @param key 配置键
   * @param value 配置值
   * @param target 配置目标（全局或工作区）
   * @throws {ConfigurationError} 当配置更新失败时
   */
  updateConfig(
    key: keyof ExtensionConfig,
    value: string | number,
    target?: vscode.ConfigurationTarget
  ): Promise<void>;

  /**
   * 安全存储 API 密钥到 SecretStorage
   * @param apiKey API密钥
   * @throws {ConfigurationError} 当密钥存储失败时
   */
  storeApiKey(apiKey: string): Promise<void>;

  /**
   * 获取存储的 API 密钥
   * @returns API密钥或undefined
   * @throws {ConfigurationError} 当密钥读取失败时
   */
  getApiKey(): Promise<string | undefined>;

  /**
   * 删除存储的 API 密钥
   * @throws {ConfigurationError} 当密钥删除失败时
   */
  deleteApiKey(): Promise<void>;

  /**
   * 检查配置是否完整
   * @returns 配置是否完整
   */
  isConfigured(): Promise<boolean>;

  /**
   * 显示配置向导
   * 引导用户完成初始配置
   * @returns 配置是否成功完成
   */
  showConfigurationWizard(): Promise<boolean>;

  /**
   * 测试API连接
   * 发送一个简单的请求来验证配置是否正确
   * @returns 测试是否成功
   * @throws {ConfigurationError} 当配置无效时
   * @throws {APIError} 当API调用失败时
   * @throws {NetworkError} 当网络连接失败时
   */
  testAPIConnection(): Promise<boolean>;

  /**
   * 监听配置变更
   * @param callback 配置变更时的回调函数
   * @returns Disposable对象
   */
  onConfigurationChanged(callback: (config: ExtensionConfig) => void): vscode.Disposable;

  /**
   * 获取API提供商
   * @returns 提供商ID
   */
  getProvider(): string;

  /**
   * 设置API提供商
   * @param provider 提供商ID
   * @param target 配置目标（全局或工作区）
   * @throws {ConfigurationError} 当提供商设置失败时
   */
  setProvider(provider: string, target?: vscode.ConfigurationTarget): Promise<void>;

  /**
   * 获取完整配置（包括提供商）
   * @returns 完整的配置对象
   */
  getFullConfig(): Promise<FullConfig>;

  /**
   * 保存完整配置
   * @param config 完整配置对象
   * @param target 配置目标（全局或工作区）
   * @throws {ConfigurationError} 当配置保存失败时
   */
  saveFullConfig(config: FullConfig, target?: vscode.ConfigurationTarget): Promise<void>;

  /**
   * 获取配置摘要（用于显示）
   * @returns 配置摘要对象
   */
  getConfigSummary(): Promise<ConfigSummary>;

  /**
   * 配置迁移
   * 检测旧版本配置并迁移到新格式
   * @throws {ConfigurationError} 当配置迁移失败时
   */
  migrateConfiguration(): Promise<void>;
}

/**
 * 错误处理器接口
 * 定义错误处理的标准接口
 */
export interface IErrorHandler {
  /**
   * 设置重试回调函数
   * @param callback 重试时要执行的回调函数
   */
  setRetryCallback(callback: (() => Promise<void>) | null): void;

  /**
   * 处理错误
   * @param error 错误对象
   * @param context 错误上下文信息
   */
  handleError(error: Error, context: string): Promise<void>;

  /**
   * 记录错误日志
   * @param error 错误对象
   * @param context 错误上下文
   * @param errorType 错误类型（可选）
   */
  logError(error: Error, context: string, errorType?: string): void;

  /**
   * 记录信息日志
   * @param message 日志消息
   * @param context 上下文（可选）
   */
  logInfo(message: string, context?: string): void;

  /**
   * 记录警告日志
   * @param message 警告消息
   * @param context 上下文（可选）
   */
  logWarning(message: string, context?: string): void;

  /**
   * 显示输出通道
   */
  showOutputChannel(): void;

  /**
   * 清理资源
   */
  dispose(): void;
}
