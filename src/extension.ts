import * as vscode from 'vscode';
import { ConfigurationPanelManager } from './services';
import { UIManager } from './utils/UIManager';
import { COMMANDS } from './constants';
import { ConfigSummary } from './types';
import { ServiceContainer, ServiceKeys, configureServices } from './services/ServiceContainer';
import { IConfigurationManager, IErrorHandler, IGitService } from './types/interfaces';
import { CommandHandler } from './services/CommandHandler';

// 全局服务容器和实例
let serviceContainer: ServiceContainer;
let statusBarItem: vscode.StatusBarItem;
let tooltipUpdateTimer: NodeJS.Timeout | undefined;

/**
 * 验证命令是否已注册
 * 用于开发和调试阶段验证命令是否正确注册到VSCode
 *
 * @param commandId - 要检查的命令标识符
 * @returns Promise<boolean> - 如果命令已注册返回true，否则返回false
 */
async function isCommandRegistered(commandId: string): Promise<boolean> {
  try {
    const commands = await vscode.commands.getCommands(true);
    return commands.includes(commandId);
  } catch (error) {
    return false;
  }
}

/**
 * 创建命令链接（带验证）
 * 在创建Markdown命令链接前验证命令是否已注册，避免创建无效链接
 * 如果命令未注册，返回纯文本而不是链接
 *
 * @param commandId - 命令标识符
 * @param linkText - 链接显示文本
 * @returns Promise<string> - Markdown格式的命令链接或纯文本
 */
async function createCommandLink(commandId: string, linkText: string): Promise<string> {
  const isRegistered = await isCommandRegistered(commandId);

  if (!isRegistered) {
    // 尝试从容器获取errorHandler记录警告
    try {
      const errorHandler = serviceContainer?.resolve<IErrorHandler>(ServiceKeys.ErrorHandler);
      errorHandler?.logWarning(
        `Command not registered when creating link: ${commandId}`,
        'Extension'
      );
    } catch {
      // 容器未初始化，忽略
    }
    return linkText; // 返回纯文本而不是链接
  }

  return `[${linkText}](command:${commandId})`;
}

/**
 * 创建默认tooltip
 * 当配置信息不可用时显示的基本tooltip
 *
 * @returns vscode.MarkdownString - 包含基本信息的Markdown字符串
 */
function createDefaultTooltip(): vscode.MarkdownString {
  const tooltip = new vscode.MarkdownString('**AI Git Commit**\n\n使用AI生成提交信息');
  tooltip.isTrusted = true;
  return tooltip;
}

/**
 * 创建未配置状态的tooltip
 * 当扩展未完成配置时显示的tooltip，包含配置向导链接
 *
 * @returns Promise<vscode.MarkdownString> - 包含未配置提示和配置链接的Markdown字符串
 */
async function createUnconfiguredTooltip(): Promise<vscode.MarkdownString> {
  const configLink = await createCommandLink(COMMANDS.CONFIGURE_SETTINGS, '配置设置');

  const tooltip = new vscode.MarkdownString(
    '**AI Git Commit**\n\n' + '⚠️ 未配置\n\n' + '点击生成提交信息\n\n' + configLink
  );
  tooltip.isTrusted = true;
  return tooltip;
}

/**
 * 创建已配置状态的tooltip
 * 显示当前配置的详细信息，包括提供商、API密钥（脱敏）、Base URL和模型名称
 *
 * @param summary - 配置摘要对象
 * @returns Promise<vscode.MarkdownString> - 包含配置详情的Markdown字符串
 */
async function createConfiguredTooltip(summary: ConfigSummary): Promise<vscode.MarkdownString> {
  const providerName = getProviderDisplayName(summary.provider);
  const configLink = await createCommandLink(COMMANDS.CONFIGURE_SETTINGS, '编辑配置');

  const tooltip = new vscode.MarkdownString(
    '**AI Git Commit**\n\n' +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      `**提供商:** ${providerName}\n\n` +
      `**API密钥:** ${summary.apiKeyMasked}\n\n` +
      `**Base URL:** ${summary.baseUrl}\n\n` +
      `**模型:** ${summary.modelName}\n\n` +
      '━━━━━━━━━━━━━━━━━━━━\n\n' +
      '点击生成提交信息\n\n' +
      configLink
  );
  tooltip.isTrusted = true;
  return tooltip;
}

/**
 * 更新状态栏tooltip
 * 根据当前配置状态动态更新状态栏的tooltip内容
 * 如果配置完整则显示详细信息，否则显示未配置提示
 *
 * @param configManager - 配置管理器实例
 * @param statusBarItem - 状态栏项实例
 * @returns Promise<void>
 */
async function updateStatusBarTooltip(
  configManager: IConfigurationManager,
  statusBarItem: vscode.StatusBarItem
): Promise<void> {
  try {
    const summary = await configManager.getConfigSummary();

    // 检查summary是否为null或undefined
    if (!summary) {
      statusBarItem.tooltip = createDefaultTooltip();
      return;
    }

    if (!summary.isConfigured) {
      statusBarItem.tooltip = await createUnconfiguredTooltip();
      return;
    }

    statusBarItem.tooltip = await createConfiguredTooltip(summary);
  } catch (error) {
    statusBarItem.tooltip = createDefaultTooltip();
  }
}

/**
 * 调度tooltip更新（带防抖）
 * 使用100ms防抖机制避免配置频繁变更时的重复更新
 * 这是一个性能优化措施，确保tooltip更新不会影响用户体验
 *
 * @param configManager - 配置管理器实例
 * @param statusBarItem - 状态栏项实例
 */
function scheduleTooltipUpdate(
  configManager: IConfigurationManager,
  statusBarItem: vscode.StatusBarItem
): void {
  // 清除之前的定时器
  if (tooltipUpdateTimer) {
    clearTimeout(tooltipUpdateTimer);
  }

  // 设置新的定时器（100ms防抖）
  tooltipUpdateTimer = setTimeout(() => {
    updateStatusBarTooltip(configManager, statusBarItem).catch(() => {
      // Tooltip update failed, ignore silently
    });
  }, 100);
}

/**
 * 获取提供商显示名称
 * 将提供商ID转换为用户友好的显示名称
 *
 * @param providerId - 提供商ID（如：'openai', 'azure-openai'）
 * @returns string - 提供商的显示名称，如果未找到则返回原ID
 */
function getProviderDisplayName(providerId: string): string {
  const providerNames: { [key: string]: string } = {
    openai: 'OpenAI',
    ollama: 'Ollama',
    custom: '自定义',
  };
  return providerNames[providerId] || providerId;
}

/**
 * 验证命令是否已注册（开发模式）
 * 仅在非生产环境下执行，用于开发和调试阶段验证所有命令是否正确注册
 * 如果发现未注册的命令，会记录警告并显示提示消息
 *
 * @param errorHandler - 错误处理器实例，用于记录日志
 * @returns Promise<void>
 */
async function verifyCommandRegistration(errorHandler: IErrorHandler): Promise<void> {
  // 仅在开发模式下执行验证
  if (process.env['NODE_ENV'] !== 'production') {
    try {
      const registeredCommands = await vscode.commands.getCommands(true);
      const expectedCommands = Object.values(COMMANDS);

      for (const command of expectedCommands) {
        if (registeredCommands.includes(command)) {
          errorHandler.logInfo(`Command verified: ${command}`, 'Extension');
        } else {
          errorHandler.logWarning(`Command not found: ${command}`, 'Extension');
          void vscode.window.showWarningMessage(`命令未注册: ${command}`);
        }
      }
    } catch (error) {
      errorHandler.logError(error as Error, 'Command verification failed');
    }
  }
}

/**
 * 注册扩展命令
 * 注册所有扩展提供的VSCode命令，包括：
 * - aigitcommit.generateMessage: 生成AI提交信息
 * - aigitcommit.configureSettings: 打开配置面板
 *
 * 每个命令都包含错误处理和日志记录
 *
 * @param container - 服务容器实例
 * @returns vscode.Disposable[] - 命令disposable数组，用于清理资源
 */
function registerCommands(container: ServiceContainer): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  // 解析服务
  const commandHandler = container.resolve<CommandHandler>(ServiceKeys.CommandHandler);
  const configurationPanelManager = container.resolve<ConfigurationPanelManager>(
    ServiceKeys.ConfigurationPanelManager
  );
  const errorHandler = container.resolve<IErrorHandler>(ServiceKeys.ErrorHandler);

  try {
    // 注册生成提交信息命令
    errorHandler.logInfo(`Registering command: ${COMMANDS.GENERATE_MESSAGE}`, 'Extension');
    const generateCommand = vscode.commands.registerCommand(COMMANDS.GENERATE_MESSAGE, async () => {
      errorHandler.logInfo(`Executing command: ${COMMANDS.GENERATE_MESSAGE}`, 'Extension');
      try {
        await commandHandler.generateCommitMessage();
        errorHandler.logInfo(`Command completed: ${COMMANDS.GENERATE_MESSAGE}`, 'Extension');
      } catch (error) {
        errorHandler.logError(error as Error, `Command failed: ${COMMANDS.GENERATE_MESSAGE}`);
        throw error;
      }
    });
    disposables.push(generateCommand);
    errorHandler.logInfo(
      `Command registered successfully: ${COMMANDS.GENERATE_MESSAGE}`,
      'Extension'
    );

    // 注册配置面板命令
    errorHandler.logInfo(`Registering command: ${COMMANDS.CONFIGURE_SETTINGS}`, 'Extension');
    const configCommand = vscode.commands.registerCommand(COMMANDS.CONFIGURE_SETTINGS, async () => {
      errorHandler.logInfo(`Executing command: ${COMMANDS.CONFIGURE_SETTINGS}`, 'Extension');
      try {
        await configurationPanelManager.showPanel();
        errorHandler.logInfo(
          `Command completed: ${COMMANDS.CONFIGURE_SETTINGS} - Configuration panel opened`,
          'Extension'
        );
      } catch (error) {
        errorHandler.logError(error as Error, `Command failed: ${COMMANDS.CONFIGURE_SETTINGS}`);
        const errorMessage = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`打开配置面板失败: ${errorMessage}`);
      }
    });
    disposables.push(configCommand);
    errorHandler.logInfo(
      `Command registered successfully: ${COMMANDS.CONFIGURE_SETTINGS}`,
      'Extension'
    );
  } catch (error) {
    errorHandler.logError(error as Error, 'Command registration failed');
    const errorMessage = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`命令注册失败: ${errorMessage}`);
  }

  return disposables;
}

/**
 * 插件激活时调用
 * VSCode扩展的入口函数，负责：
 * 1. 初始化所有服务实例（ErrorHandler, UIManager, ConfigurationManager等）
 * 2. 注册扩展命令
 * 3. 创建和配置状态栏项
 * 4. 设置配置变更监听器
 * 5. 执行配置迁移（从旧版本升级）
 *
 * 如果激活过程中发生错误，会记录日志并向用户显示错误消息
 *
 * @param context - VSCode扩展上下文，包含扩展的生命周期和资源管理
 * @returns Promise<void>
 * @throws 如果激活失败会抛出错误
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    // 初始化服务容器
    serviceContainer = configureServices(context);

    // 解析核心服务
    const errorHandler = serviceContainer.resolve<IErrorHandler>(ServiceKeys.ErrorHandler);
    const configManager = serviceContainer.resolve<IConfigurationManager>(
      ServiceKeys.ConfigurationManager
    );
    const gitService = serviceContainer.resolve<IGitService>(ServiceKeys.GitService);
    const uiManager = serviceContainer.resolve<UIManager>(ServiceKeys.UIManager);
    const configurationPanelManager = serviceContainer.resolve<ConfigurationPanelManager>(
      ServiceKeys.ConfigurationPanelManager
    );

    errorHandler.logInfo('Extension activation started', 'Extension');
    errorHandler.logInfo('Service container initialized', 'Extension');

    // 注册命令（使用服务容器）
    const commandDisposables = registerCommands(serviceContainer);
    context.subscriptions.push(...commandDisposables);

    // 验证命令注册（开发模式）
    await verifyCommandRegistration(errorHandler);

    // 执行配置迁移（在命令注册后执行）
    await configManager.migrateConfiguration();

    // 创建状态栏项
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = COMMANDS.GENERATE_MESSAGE;
    statusBarItem.text = '$(sparkle) AI Commit';
    statusBarItem.tooltip = createDefaultTooltip();

    // 始终显示状态栏按钮，即使不在Git仓库中
    // 这样用户可以随时查看配置和访问设置
    statusBarItem.show();

    // 异步更新tooltip
    updateStatusBarTooltip(configManager, statusBarItem).catch((err) => {
      errorHandler.logError(err as Error, 'Failed to initialize status bar tooltip');
    });

    // 获取配置拦截器（用于缓存失效和异步初始化）
    const configInterceptor = serviceContainer.resolve<{
      checkConfigurationStatus: () => Promise<unknown>;
      invalidateCache: () => void;
    }>(ServiceKeys.ConfigurationInterceptor);

    // 异步预加载配置状态到缓存（不阻塞激活流程）
    void (async (): Promise<void> => {
      try {
        await configInterceptor.checkConfigurationStatus();
        errorHandler.logInfo('Configuration status preloaded', 'Extension');
      } catch (error) {
        errorHandler.logError(error as Error, 'Failed to preload configuration status');
      }
    })();

    // 监听配置变更
    const configChangeListener = configManager.onConfigurationChanged(() => {
      errorHandler.logInfo('Configuration changed', 'Extension');

      // 使配置状态缓存失效
      configInterceptor.invalidateCache();
      errorHandler.logInfo('Configuration cache invalidated', 'Extension');

      void configManager.validateConfig().then((validation) => {
        if (!validation.valid) {
          void vscode.window.showWarningMessage(`配置验证失败: ${validation.errors.join(', ')}`);
        }
      });

      scheduleTooltipUpdate(configManager, statusBarItem);
    });

    // 监听工作区变化
    const workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(() => {
      if (gitService.isGitRepository()) {
        statusBarItem.show();
      } else {
        statusBarItem.hide();
      }
    });

    // 注册所有disposable对象
    context.subscriptions.push(
      configChangeListener,
      workspaceChangeListener,
      statusBarItem,
      errorHandler,
      uiManager,
      { dispose: () => configurationPanelManager.dispose() },
      { dispose: () => serviceContainer.clear() }
    );

    errorHandler.logInfo('Extension activation completed successfully', 'Extension');
  } catch (error) {
    // 尝试从容器获取errorHandler，如果失败则直接记录
    try {
      const errorHandler = serviceContainer?.resolve<IErrorHandler>(ServiceKeys.ErrorHandler);
      if (errorHandler) {
        errorHandler.logError(error as Error, 'Extension activation failed');
      }
    } catch {
      // 容器未初始化，忽略
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`AI Git Commit插件激活失败: ${errorMessage}`);
    throw error;
  }
}

/**
 * 插件停用时调用
 * VSCode扩展的清理函数，在扩展停用或VSCode关闭时执行
 * 记录停用日志，资源清理由VSCode的disposable机制自动处理
 */
export function deactivate(): void {
  try {
    const errorHandler = serviceContainer?.resolve<IErrorHandler>(ServiceKeys.ErrorHandler);
    if (errorHandler) {
      errorHandler.logInfo('插件停用', 'Extension');
    }
  } catch {
    // 容器可能已清理，忽略
  }
}
