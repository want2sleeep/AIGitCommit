import * as vscode from 'vscode';
import {
  IGitService,
  ILLMService,
  IConfigurationManager,
  IErrorHandler,
  ITokenEstimator,
  IDiffSplitter,
  IChunkProcessor,
  ISummaryMerger,
  ILargeDiffHandler,
  IProgressManager,
} from '../types/interfaces';
import { ConfigurationManager } from './ConfigurationManager';
import { ConfigurationStatusChecker } from './ConfigurationStatusChecker';
import { ConfigurationInterceptor } from './ConfigurationInterceptor';
import { FirstTimeUserGuide } from './FirstTimeUserGuide';
import { GitService } from './GitService';
import { LLMService } from './LLMService';
import { CommandHandler } from './CommandHandler';
import { ProviderManager } from './ProviderManager';
import { ConfigurationPanelManager } from './ConfigurationPanelManager';
import { CustomCandidatesManager } from './CustomCandidatesManager';
import { UIManager } from '../utils/UIManager';
import { ErrorHandler } from '../utils/ErrorHandler';
import { CacheManager } from './CacheManager';
import { RequestQueueManager } from './RequestQueueManager';
import { ResourceCleanupManager } from './ResourceCleanupManager';
import { CommitMessagePreviewManager } from './CommitMessagePreviewManager';
import { TemplateManager } from './TemplateManager';
import { HistoryManager } from './HistoryManager';
import { ConfigPresetManager } from './ConfigPresetManager';
import { WelcomePageManager } from './WelcomePageManager';
import { TokenEstimator } from './TokenEstimator';
import { DiffSplitter } from './DiffSplitter';
import { ChunkProcessor } from './ChunkProcessor';
import { SummaryMerger } from './SummaryMerger';
import { LargeDiffHandler } from './LargeDiffHandler';
import { ProgressManager } from './ProgressManager';
import { SmartDiffFilter, FilterFeedback, ISmartDiffFilter } from './SmartDiffFilter';
import { LogManager } from './LogManager';
import { ModelSelector } from './ModelSelector';
import { HybridModelFeedback } from './HybridModelFeedback';
import { HybridModelNotification } from './HybridModelNotification';
import { ExtensionConfig } from '../types';

/**
 * 服务容器类
 * 实现轻量级依赖注入容器，管理服务的创建和生命周期
 */
export class ServiceContainer {
  private services = new Map<string, unknown>();
  private factories = new Map<string, () => unknown>();
  private singletons = new Set<string>();

  /**
   * 注册服务工厂函数
   * @param key 服务标识符
   * @param factory 服务工厂函数
   * @param singleton 是否为单例（默认true）
   */
  register<T>(key: string, factory: () => T, singleton: boolean = true): void {
    this.factories.set(key, factory as () => unknown);
    if (singleton) {
      this.singletons.add(key);
    }
  }

  /**
   * 注册服务实例
   * @param key 服务标识符
   * @param instance 服务实例
   */
  registerInstance<T>(key: string, instance: T): void {
    this.services.set(key, instance);
    this.singletons.add(key);
  }

  /**
   * 解析服务
   * @param key 服务标识符
   * @returns 服务实例
   * @throws {Error} 当服务未注册时
   */
  resolve<T>(key: string): T {
    // 如果已经有实例，直接返回
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    // 获取工厂函数
    const factory = this.factories.get(key);
    if (!factory) {
      throw new Error(`Service not registered: ${key}`);
    }

    // 创建实例
    const instance = factory() as T;

    // 如果是单例，缓存实例
    if (this.singletons.has(key)) {
      this.services.set(key, instance);
    }

    return instance;
  }

  /**
   * 检查服务是否已注册
   * @param key 服务标识符
   * @returns 是否已注册
   */
  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  /**
   * 清除所有服务
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }

  /**
   * 获取所有已注册的服务键
   * @returns 服务键数组
   */
  getRegisteredKeys(): string[] {
    const keys = new Set<string>();
    this.services.forEach((_, key) => keys.add(key));
    this.factories.forEach((_, key) => keys.add(key));
    return Array.from(keys);
  }
}

/**
 * 服务键常量
 * 定义所有服务的标识符
 */
export const ServiceKeys = {
  ErrorHandler: 'ErrorHandler',
  UIManager: 'UIManager',
  CacheManager: 'CacheManager',
  RequestQueueManager: 'RequestQueueManager',
  ResourceCleanupManager: 'ResourceCleanupManager',
  ConfigurationManager: 'ConfigurationManager',
  ConfigurationStatusChecker: 'ConfigurationStatusChecker',
  ConfigurationInterceptor: 'ConfigurationInterceptor',
  FirstTimeUserGuide: 'FirstTimeUserGuide',
  GitService: 'GitService',
  LLMService: 'LLMService',
  ProviderManager: 'ProviderManager',
  CustomCandidatesManager: 'CustomCandidatesManager',
  ConfigurationPanelManager: 'ConfigurationPanelManager',
  CommitMessagePreviewManager: 'CommitMessagePreviewManager',
  CommandHandler: 'CommandHandler',
  // 大型 Diff 处理相关服务
  TokenEstimator: 'TokenEstimator',
  DiffSplitter: 'DiffSplitter',
  ChunkProcessor: 'ChunkProcessor',
  SummaryMerger: 'SummaryMerger',
  LargeDiffHandler: 'LargeDiffHandler',
  ProgressManager: 'ProgressManager',
  SmartDiffFilter: 'SmartDiffFilter',
  ModelSelector: 'ModelSelector',
  HybridModelFeedback: 'HybridModelFeedback',
  HybridModelNotification: 'HybridModelNotification',
} as const;

/**
 * 配置服务容器
 * 注册所有服务及其依赖关系
 * @param context VSCode扩展上下文
 * @returns 配置好的服务容器
 */
export function configureServices(context: vscode.ExtensionContext): ServiceContainer {
  const container = new ServiceContainer();

  // 注册基础服务（无依赖）
  container.register<IErrorHandler>(ServiceKeys.ErrorHandler, () => new ErrorHandler());

  container.register(ServiceKeys.UIManager, () => new UIManager());

  container.register(ServiceKeys.CacheManager, () => new CacheManager());

  container.register(ServiceKeys.RequestQueueManager, () => new RequestQueueManager());

  container.register(ServiceKeys.ResourceCleanupManager, () => new ResourceCleanupManager());

  container.register<IConfigurationManager>(
    ServiceKeys.ConfigurationManager,
    () => new ConfigurationManager(context)
  );

  // 注册配置相关服务（依赖ConfigurationManager）
  container.register(ServiceKeys.ConfigurationStatusChecker, () => {
    const configManager = container.resolve<ConfigurationManager>(ServiceKeys.ConfigurationManager);
    return new ConfigurationStatusChecker(configManager);
  });

  container.register(ServiceKeys.ConfigurationInterceptor, () => {
    const configManager = container.resolve<ConfigurationManager>(ServiceKeys.ConfigurationManager);
    return new ConfigurationInterceptor(configManager);
  });

  container.register(ServiceKeys.FirstTimeUserGuide, () => {
    const configManager = container.resolve<ConfigurationManager>(ServiceKeys.ConfigurationManager);
    return new FirstTimeUserGuide(configManager);
  });

  container.register<IGitService>(ServiceKeys.GitService, () => new GitService());

  // 注册大型 Diff 处理相关服务
  const defaultLargeDiffConfig = {
    enableMapReduce: true,
    customTokenLimit: undefined,
    safetyMarginPercent: 85,
    maxConcurrentRequests: 5,
  };

  container.register<ITokenEstimator>(ServiceKeys.TokenEstimator, () => {
    // 使用默认模型名称，实际使用时会通过配置获取
    return new TokenEstimator('gpt-4', defaultLargeDiffConfig);
  });

  container.register<IDiffSplitter>(ServiceKeys.DiffSplitter, () => {
    const tokenEstimator = container.resolve<ITokenEstimator>(ServiceKeys.TokenEstimator);
    return new DiffSplitter(tokenEstimator);
  });

  container.register<IProgressManager>(ServiceKeys.ProgressManager, () => new ProgressManager());

  // 注册 ModelSelector（需要 LogManager）
  container.register(ServiceKeys.ModelSelector, () => {
    const logger = new LogManager();
    return new ModelSelector(logger);
  });

  // 创建摘要生成器（占位符实现，实际使用时会被替换）
  const createSummaryGenerator = (): { generateSummary: (prompt: string) => Promise<string> } => ({
    generateSummary: (prompt: string): Promise<string> => {
      // 占位符实现，实际使用时会通过 LLMService 生成
      return Promise.resolve(`摘要: ${prompt.substring(0, 100)}...`);
    },
  });

  container.register<IChunkProcessor>(ServiceKeys.ChunkProcessor, () => {
    return new ChunkProcessor(createSummaryGenerator());
  });

  container.register<ISummaryMerger>(ServiceKeys.SummaryMerger, () => {
    const tokenEstimator = container.resolve<ITokenEstimator>(ServiceKeys.TokenEstimator);
    return new SummaryMerger(tokenEstimator, createSummaryGenerator());
  });

  // 注册 SmartDiffFilter（需要在 LargeDiffHandler 之前注册）
  // 注意：SmartDiffFilter 需要 LLMService，但 LLMService 需要 LargeDiffHandler
  // 因此我们延迟注册 SmartDiffFilter，在 LLMService 注册后

  container.register<ILargeDiffHandler>(ServiceKeys.LargeDiffHandler, () => {
    const tokenEstimator = container.resolve<ITokenEstimator>(ServiceKeys.TokenEstimator);
    const diffSplitter = container.resolve<IDiffSplitter>(ServiceKeys.DiffSplitter);
    const chunkProcessor = container.resolve<IChunkProcessor>(ServiceKeys.ChunkProcessor);
    const summaryMerger = container.resolve<ISummaryMerger>(ServiceKeys.SummaryMerger);
    const modelSelector = container.resolve<ModelSelector>(ServiceKeys.ModelSelector);
    // SmartDiffFilter 将在 LLMService 注册后通过 setter 注入
    return new LargeDiffHandler(
      tokenEstimator,
      diffSplitter,
      chunkProcessor,
      summaryMerger,
      createSummaryGenerator(),
      undefined, // largeDiffConfig
      undefined, // smartDiffFilter
      undefined, // filterFeedback
      modelSelector // modelSelector
    );
  });

  container.register<ILLMService>(ServiceKeys.LLMService, () => {
    const llmService = new LLMService();
    // 设置大型 Diff 处理器
    const largeDiffHandler = container.resolve<ILargeDiffHandler>(ServiceKeys.LargeDiffHandler);
    llmService.setLargeDiffHandler(largeDiffHandler);
    return llmService;
  });

  // 注册 SmartDiffFilter（在 LLMService 之后，因为需要 LLMService）
  container.register<ISmartDiffFilter>(ServiceKeys.SmartDiffFilter, () => {
    const llmService = container.resolve<ILLMService>(ServiceKeys.LLMService);
    const configManager = container.resolve<IConfigurationManager>(
      ServiceKeys.ConfigurationManager
    );

    // 创建一个占位符配置对象，实际配置将在运行时从 LLMService 获取
    const placeholderConfig: ExtensionConfig = {
      apiEndpoint: '',
      apiKey: '',
      modelName: 'gpt-4o-mini',
      language: 'en',
      commitFormat: 'conventional',
      maxTokens: 1000,
      temperature: 0.7,
    };

    // 创建 LogManager 实例（可选）
    const logger = new LogManager();

    // 从 ConfigurationManager 读取智能过滤配置
    const smartFilterConfig = configManager.getSmartFilterConfig();

    // 创建 SmartDiffFilter 实例
    const smartDiffFilter = new SmartDiffFilter(llmService, placeholderConfig, logger, {
      minFilesThreshold: smartFilterConfig.minFilesThreshold,
      maxFileListSize: smartFilterConfig.maxFileListSize,
      filterTimeout: smartFilterConfig.filterTimeout,
    });

    // 将 SmartDiffFilter 注入到 LargeDiffHandler
    const largeDiffHandler = container.resolve<ILargeDiffHandler>(ServiceKeys.LargeDiffHandler);
    largeDiffHandler.setSmartDiffFilter(smartDiffFilter);

    return smartDiffFilter;
  });

  // 注册 HybridModelFeedback（需要在 LargeDiffHandler 之后注册并注入）
  container.register(ServiceKeys.HybridModelFeedback, () => {
    const hybridModelOutputChannel = vscode.window.createOutputChannel(
      'AI Git Commit - Hybrid Model'
    );
    return new HybridModelFeedback(hybridModelOutputChannel);
  });

  // 创建 FilterFeedback 实例并注入到 LargeDiffHandler
  const configManager = container.resolve<IConfigurationManager>(ServiceKeys.ConfigurationManager);
  const smartFilterConfig = configManager.getSmartFilterConfig();
  const filterOutputChannel = vscode.window.createOutputChannel('AI Git Commit - Smart Filter');

  // 创建 FilterFeedback 实例（从配置读取参数）
  const filterFeedback = new FilterFeedback(
    filterOutputChannel,
    smartFilterConfig.showFilterStats,
    smartFilterConfig.enableDetailedLogging
  );

  // 注入 FilterFeedback 到 LargeDiffHandler
  const largeDiffHandler = container.resolve<ILargeDiffHandler>(ServiceKeys.LargeDiffHandler);
  largeDiffHandler.setFilterFeedback(filterFeedback);

  // 注入 HybridModelFeedback 到 LargeDiffHandler
  const hybridModelFeedback = container.resolve<HybridModelFeedback>(
    ServiceKeys.HybridModelFeedback
  );
  largeDiffHandler.setHybridModelFeedback(hybridModelFeedback);

  container.register(ServiceKeys.ProviderManager, () => new ProviderManager());

  // 注册自定义候选项管理器（依赖ConfigurationManager和ErrorHandler）
  container.register(ServiceKeys.CustomCandidatesManager, () => {
    const configManager = container.resolve<ConfigurationManager>(ServiceKeys.ConfigurationManager);
    const errorHandler = container.resolve<ErrorHandler>(ServiceKeys.ErrorHandler);
    return new CustomCandidatesManager(configManager, errorHandler);
  });

  // 注册配置面板管理器（依赖ConfigurationManager、ProviderManager和CustomCandidatesManager）
  container.register(ServiceKeys.ConfigurationPanelManager, () => {
    const configManager = container.resolve<ConfigurationManager>(ServiceKeys.ConfigurationManager);
    const providerManager = container.resolve<ProviderManager>(ServiceKeys.ProviderManager);
    const candidatesManager = container.resolve<CustomCandidatesManager>(
      ServiceKeys.CustomCandidatesManager
    );
    return ConfigurationPanelManager.getInstance(
      context,
      configManager,
      providerManager,
      candidatesManager
    );
  });

  // 注册提交信息预览管理器
  container.register(ServiceKeys.CommitMessagePreviewManager, () => {
    return new CommitMessagePreviewManager(context);
  });

  // 注册命令处理器（依赖多个服务）
  container.register(ServiceKeys.CommandHandler, () => {
    const configManager = container.resolve<ConfigurationManager>(ServiceKeys.ConfigurationManager);
    const gitService = container.resolve<GitService>(ServiceKeys.GitService);
    const llmService = container.resolve<LLMService>(ServiceKeys.LLMService);
    const uiManager = container.resolve<UIManager>(ServiceKeys.UIManager);
    const errorHandler = container.resolve<ErrorHandler>(ServiceKeys.ErrorHandler);
    const previewManager = container.resolve<CommitMessagePreviewManager>(
      ServiceKeys.CommitMessagePreviewManager
    );

    return new CommandHandler(
      configManager,
      gitService,
      llmService,
      uiManager,
      errorHandler,
      previewManager
    );
  });

  // 注册模板管理器
  container.register('templateManager', () => {
    return new TemplateManager(context);
  });

  // 注册历史记录管理器
  container.register('historyManager', () => {
    return new HistoryManager(context);
  });

  // 注册配置预设管理器
  container.register('configPresetManager', () => {
    const configManager = container.resolve<ConfigurationManager>(ServiceKeys.ConfigurationManager);
    return new ConfigPresetManager(context, configManager);
  });

  // 注册欢迎页面管理器
  container.register('welcomePageManager', () => {
    return new WelcomePageManager(context, container);
  });

  // 注册混合模型通知管理器
  container.register(ServiceKeys.HybridModelNotification, () => {
    return new HybridModelNotification(context);
  });

  return container;
}
