import * as vscode from 'vscode';
import {
  ConfigurationManager,
  GitService,
  LLMService,
  CommandHandler,
  ProviderManager,
  ConfigurationPanelManager,
} from './services';
import { UIManager } from './utils/UIManager';
import { ErrorHandler } from './utils/ErrorHandler';
import { COMMANDS } from './constants';
import { ConfigSummary } from './types';

// 全局服务实例
let commandHandler: CommandHandler;
let errorHandler: ErrorHandler;
let uiManager: UIManager;
let statusBarItem: vscode.StatusBarItem;
let configurationPanelManager: ConfigurationPanelManager;
let tooltipUpdateTimer: NodeJS.Timeout | undefined;

/**
 * 验证命令是否已注册
 * @param commandId 命令标识符
 * @returns 命令是否已注册
 */
async function isCommandRegistered(commandId: string): Promise<boolean> {
  try {
    const commands = await vscode.commands.getCommands(true);
    return commands.includes(commandId);
  } catch (error) {
    console.error(`Failed to check command registration: ${commandId}`, error);
    return false;
  }
}

/**
 * 创建命令链接（带验证）
 * @param commandId 命令标识符
 * @param linkText 链接文本
 * @returns Markdown格式的命令链接或纯文本
 */
async function createCommandLink(commandId: string, linkText: string): Promise<string> {
  const isRegistered = await isCommandRegistered(commandId);

  if (!isRegistered) {
    errorHandler?.logWarning(
      `Command not registered when creating link: ${commandId}`,
      'Extension'
    );
    return linkText; // 返回纯文本而不是链接
  }

  return `[${linkText}](command:${commandId})`;
}

/**
 * 创建默认tooltip
 */
function createDefaultTooltip(): vscode.MarkdownString {
  const tooltip = new vscode.MarkdownString('**AI Git Commit**\n\n使用AI生成提交信息');
  tooltip.isTrusted = true;
  return tooltip;
}

/**
 * 创建未配置状态的tooltip
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
 */
async function updateStatusBarTooltip(
  configManager: ConfigurationManager,
  statusBarItem: vscode.StatusBarItem
): Promise<void> {
  try {
    const summary = await configManager.getConfigSummary();

    // 检查summary是否为null或undefined
    if (!summary) {
      console.warn('Config summary is null or undefined');
      statusBarItem.tooltip = createDefaultTooltip();
      return;
    }

    if (!summary.isConfigured) {
      statusBarItem.tooltip = await createUnconfiguredTooltip();
      return;
    }

    statusBarItem.tooltip = await createConfiguredTooltip(summary);
  } catch (error) {
    console.error('Failed to update status bar tooltip:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    statusBarItem.tooltip = createDefaultTooltip();
  }
}

/**
 * 调度tooltip更新（带防抖）
 * 使用100ms防抖避免频繁更新
 */
function scheduleTooltipUpdate(
  configManager: ConfigurationManager,
  statusBarItem: vscode.StatusBarItem
): void {
  // 清除之前的定时器
  if (tooltipUpdateTimer) {
    clearTimeout(tooltipUpdateTimer);
  }

  // 设置新的定时器（100ms防抖）
  tooltipUpdateTimer = setTimeout(() => {
    updateStatusBarTooltip(configManager, statusBarItem).catch((err) => {
      console.error('Failed to update tooltip:', err);
    });
  }, 100);
}

/**
 * 获取提供商显示名称
 */
function getProviderDisplayName(providerId: string): string {
  const providerNames: { [key: string]: string } = {
    openai: 'OpenAI',
    'azure-openai': 'Azure OpenAI',
    ollama: 'Ollama',
    custom: '自定义',
  };
  return providerNames[providerId] || providerId;
}

/**
 * 验证命令是否已注册（开发模式）
 * @param errorHandler 错误处理器
 */
async function verifyCommandRegistration(errorHandler: ErrorHandler): Promise<void> {
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
 * @param context 扩展上下文
 * @param commandHandler 命令处理器
 * @param configurationPanelManager 配置面板管理器
 * @param errorHandler 错误处理器
 * @returns 命令disposable数组
 */
function registerCommands(
  commandHandler: CommandHandler,
  configurationPanelManager: ConfigurationPanelManager,
  errorHandler: ErrorHandler
): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

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
    const configCommand = vscode.commands.registerCommand(COMMANDS.CONFIGURE_SETTINGS, () => {
      errorHandler.logInfo(`Executing command: ${COMMANDS.CONFIGURE_SETTINGS}`, 'Extension');
      try {
        configurationPanelManager.showPanel();
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
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('AI Git Commit is now active');

  try {
    // 初始化错误处理器（最先初始化，用于后续日志记录）
    errorHandler = new ErrorHandler();
    errorHandler.logInfo('Extension activation started', 'Extension');

    // 初始化UI管理器
    uiManager = new UIManager();

    // 初始化配置管理器
    const configManager = new ConfigurationManager(context);

    // 初始化其他服务
    const gitService = new GitService();
    const llmService = new LLMService();
    const providerManager = new ProviderManager();

    // 初始化配置面板管理器
    configurationPanelManager = ConfigurationPanelManager.getInstance(
      context,
      configManager,
      providerManager
    );

    // 初始化命令处理器
    commandHandler = new CommandHandler(
      configManager,
      gitService,
      llmService,
      uiManager,
      errorHandler
    );

    // 注册命令（在服务初始化后立即注册）
    const commandDisposables = registerCommands(
      commandHandler,
      configurationPanelManager,
      errorHandler
    );
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

    // 监听配置变更
    const configChangeListener = configManager.onConfigurationChanged(() => {
      errorHandler.logInfo('Configuration changed', 'Extension');

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
      { dispose: () => configurationPanelManager.dispose() }
    );

    errorHandler.logInfo('Extension activation completed successfully', 'Extension');
  } catch (error) {
    console.error('Extension activation failed:', error);
    if (errorHandler) {
      errorHandler.logError(error as Error, 'Extension activation failed');
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(`AI Git Commit插件激活失败: ${errorMessage}`);
    throw error;
  }
}

/**
 * 插件停用时调用
 */
export function deactivate(): void {
  console.log('AI Git Commit is now deactivated');

  if (errorHandler) {
    errorHandler.logInfo('插件停用', 'Extension');
  }
}
