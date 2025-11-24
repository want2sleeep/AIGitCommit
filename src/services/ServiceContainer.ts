import * as vscode from 'vscode';
import {
  IGitService,
  ILLMService,
  IConfigurationManager,
  IErrorHandler,
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
  ConfigurationManager: 'ConfigurationManager',
  ConfigurationStatusChecker: 'ConfigurationStatusChecker',
  ConfigurationInterceptor: 'ConfigurationInterceptor',
  FirstTimeUserGuide: 'FirstTimeUserGuide',
  GitService: 'GitService',
  LLMService: 'LLMService',
  ProviderManager: 'ProviderManager',
  CustomCandidatesManager: 'CustomCandidatesManager',
  ConfigurationPanelManager: 'ConfigurationPanelManager',
  CommandHandler: 'CommandHandler',
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

  container.register<ILLMService>(ServiceKeys.LLMService, () => new LLMService());

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

  // 注册命令处理器（依赖多个服务）
  container.register(ServiceKeys.CommandHandler, () => {
    const configManager = container.resolve<ConfigurationManager>(ServiceKeys.ConfigurationManager);
    const gitService = container.resolve<GitService>(ServiceKeys.GitService);
    const llmService = container.resolve<LLMService>(ServiceKeys.LLMService);
    const uiManager = container.resolve<UIManager>(ServiceKeys.UIManager);
    const errorHandler = container.resolve<ErrorHandler>(ServiceKeys.ErrorHandler);

    return new CommandHandler(configManager, gitService, llmService, uiManager, errorHandler);
  });

  return container;
}
