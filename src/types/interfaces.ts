import * as vscode from 'vscode';
import { GitChange, ExtensionConfig, ValidationResult, FullConfig, ConfigSummary } from './index';
import { DiffSplitLevel } from '../constants';

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

// ============================================================================
// 大型 Diff 处理相关接口
// ============================================================================

/**
 * 大型 Diff 处理配置接口
 * 定义了处理超出 LLM 上下文窗口限制的大型提交时的配置参数
 */
export interface LargeDiffConfig {
  /** 是否启用 Map-Reduce 处理 */
  enableMapReduce: boolean;
  /** 自定义 token 限制（覆盖自动检测） */
  customTokenLimit?: number;
  /** 安全边界百分比（0-100） */
  safetyMarginPercent: number;
  /** 最大并发 API 请求数 */
  maxConcurrentRequests: number;
}

/**
 * Chunk 上下文信息接口
 * 包含拆分后的 diff 块的上下文信息，用于保持语义连贯性
 */
export interface ChunkContext {
  /** 文件头部信息（diff --git a/... b/...） */
  fileHeader: string;
  /** 函数名（如果可识别） */
  functionName?: string;
  /** 前一个块的摘要（用于后续块的上下文） */
  previousSummary?: string;
  /** 相关文件列表（用于逻辑分组） */
  relatedFiles?: string[];
}

/**
 * Diff 块数据结构接口
 * 表示拆分后的单个 diff 片段
 */
export interface DiffChunk {
  /** 块内容 */
  content: string;
  /** 文件路径 */
  filePath: string;
  /** 当前块索引（从 0 开始） */
  chunkIndex: number;
  /** 总块数 */
  totalChunks: number;
  /** 拆分级别 */
  splitLevel: DiffSplitLevel;
  /** 上下文信息 */
  context: ChunkContext;
}

/**
 * 块摘要接口
 * 表示单个 chunk 处理后的结果
 */
export interface ChunkSummary {
  /** 文件路径 */
  filePath: string;
  /** 摘要内容 */
  summary: string;
  /** 块索引 */
  chunkIndex: number;
  /** 是否处理成功 */
  success: boolean;
  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * 处理配置接口
 * 定义了 chunk 处理器的运行时配置
 */
export interface ProcessConfig {
  /** 最大并发数 */
  concurrency: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 初始重试延迟（毫秒） */
  initialRetryDelay: number;
}

/**
 * Token 估算器接口
 * 定义了 token 数量估算和限制判断的标准接口
 */
export interface ITokenEstimator {
  /**
   * 估算文本的 token 数量
   * @param text 待估算的文本
   * @returns 估算的 token 数量
   */
  estimate(text: string): number;

  /**
   * 获取当前模型的有效 token 限制
   * @returns 有效限制（已应用安全边界）
   */
  getEffectiveLimit(): number;

  /**
   * 判断文本是否需要拆分
   * @param text 待检查的文本
   * @returns 是否需要拆分
   */
  needsSplit(text: string): boolean;

  /**
   * 获取模型的原始 token 限制
   * @param modelName 模型名称
   * @returns 原始限制
   */
  getModelLimit(modelName: string): number;
}

/**
 * Diff 拆分器接口
 * 定义了将大型 diff 递归拆分为可处理 chunks 的标准接口
 */
export interface IDiffSplitter {
  /**
   * 拆分 diff 内容
   * @param diff 原始 diff 内容
   * @param maxTokens 最大 token 数
   * @returns 拆分后的 chunks
   */
  split(diff: string, maxTokens: number): DiffChunk[];

  /**
   * 按文件边界拆分
   * @param diff 原始 diff
   * @returns 按文件拆分的 chunks
   */
  splitByFiles(diff: string): DiffChunk[];

  /**
   * 按 Hunk 边界拆分单个文件的 diff
   * @param fileDiff 单文件 diff
   * @param maxTokens 最大 token 数
   * @returns 按 Hunk 拆分的 chunks
   */
  splitByHunks(fileDiff: string, maxTokens: number): DiffChunk[];

  /**
   * 按行拆分单个 Hunk
   * @param hunk 单个 Hunk 内容
   * @param maxTokens 最大 token 数
   * @returns 按行拆分的 chunks
   */
  splitByLines(hunk: string, maxTokens: number): DiffChunk[];
}

/**
 * Chunk 摘要生成器接口
 * 定义了为单个 chunk 生成摘要的标准接口
 */
export interface IChunkSummaryGenerator {
  /**
   * 为 chunk 生成摘要
   * @param prompt 包含上下文的提示词
   * @returns 生成的摘要
   */
  generateSummary(prompt: string): Promise<string>;
}

/**
 * 块处理器接口
 * 定义了并发处理多个 chunks 的标准接口（Map 阶段）
 */
export interface IChunkProcessor {
  /**
   * 并发处理多个 chunks
   * @param chunks 待处理的 chunks
   * @param config 处理配置
   * @returns 处理结果（摘要列表）
   */
  processChunks(chunks: DiffChunk[], config: ProcessConfig): Promise<ChunkSummary[]>;

  /**
   * 处理单个 chunk
   * @param chunk 待处理的 chunk
   * @param config 处理配置
   * @returns 处理结果
   */
  processChunk(chunk: DiffChunk, config: ProcessConfig): Promise<ChunkSummary>;
}

/**
 * 摘要合并器接口
 * 定义了将多个摘要合并为最终提交信息的标准接口（Reduce 阶段）
 */
export interface ISummaryMerger {
  /**
   * 合并摘要为最终提交信息
   * @param summaries 摘要列表
   * @param config 扩展配置
   * @returns 最终提交信息
   */
  merge(summaries: ChunkSummary[], config: ExtensionConfig): Promise<string>;

  /**
   * 递归合并（当摘要总量超限时）
   * @param summaries 摘要列表
   * @param config 扩展配置
   * @returns 合并后的摘要
   */
  recursiveMerge(summaries: ChunkSummary[], config: ExtensionConfig): Promise<string>;
}

/**
 * 大型 Diff 处理器接口
 * 整体协调器，协调各组件完成大型 diff 的处理
 */
export interface ILargeDiffHandler {
  /**
   * 处理大型 diff
   * @param changes Git 变更列表
   * @param config 扩展配置
   * @returns 生成的提交信息
   */
  handle(changes: GitChange[], config: ExtensionConfig): Promise<string>;

  /**
   * 检查是否需要使用大型 diff 处理
   * @param changes Git 变更列表
   * @returns 是否需要
   */
  needsLargeDiffHandling(changes: GitChange[]): boolean;
}

/**
 * 进度管理器接口
 * 定义了显示处理进度的标准接口
 */
export interface IProgressManager {
  /**
   * 开始进度跟踪
   * @param totalChunks 总块数
   */
  start(totalChunks: number): void;

  /**
   * 更新进度
   * @param completedChunks 已完成块数
   */
  update(completedChunks: number): void;

  /**
   * 完成进度跟踪
   * @param processingTime 处理时间（毫秒）
   */
  complete(processingTime: number): void;

  /**
   * 报告错误
   * @param error 错误信息
   */
  reportError(error: string): void;
}
