import * as vscode from 'vscode';
import { ConfigurationManager, GitService, LLMService, CommandHandler } from './services';
import { UIManager } from './utils/UIManager';
import { ErrorHandler } from './utils/ErrorHandler';

// 全局服务实例
let commandHandler: CommandHandler;
let errorHandler: ErrorHandler;
let uiManager: UIManager;
let statusBarItem: vscode.StatusBarItem;

/**
 * 插件激活时调用
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('AI Git Commit Generator is now active');

    // 初始化所有服务模块
    const configManager = new ConfigurationManager(context);
    const gitService = new GitService();
    const llmService = new LLMService();
    errorHandler = new ErrorHandler();
    uiManager = new UIManager();

    // 初始化命令处理器
    commandHandler = new CommandHandler(
        configManager,
        gitService,
        llmService,
        uiManager,
        errorHandler
    );

    // 创建状态栏项
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    statusBarItem.command = 'aiGitCommit.generateMessage';
    statusBarItem.text = '$(sparkle) AI Commit';
    statusBarItem.tooltip = '使用AI生成提交信息';
    
    // 只在Git仓库中显示状态栏项
    if (gitService.isGitRepository()) {
        statusBarItem.show();
    }

    // 注册生成提交信息命令
    const generateCommand = vscode.commands.registerCommand(
        'aiGitCommit.generateMessage',
        async () => {
            await commandHandler.generateCommitMessage();
        }
    );

    // 注册配置向导命令
    const configWizardCommand = vscode.commands.registerCommand(
        'aiGitCommit.configureSettings',
        async () => {
            await configManager.showConfigurationWizard();
        }
    );

    // 监听配置变更
    const configChangeListener = configManager.onConfigurationChanged(async (config) => {
        errorHandler.logInfo('配置已更改', 'Extension');
        console.log('Configuration changed:', { ...config, apiKey: '***' });
        
        // 验证新配置
        const validation = await configManager.validateConfig();
        if (!validation.valid) {
            vscode.window.showWarningMessage(
                `配置验证失败: ${validation.errors.join(', ')}`
            );
        }
    });

    // 监听工作区变化，更新状态栏显示
    const workspaceChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        if (gitService.isGitRepository()) {
            statusBarItem.show();
        } else {
            statusBarItem.hide();
        }
    });

    // 注册所有disposable对象
    context.subscriptions.push(
        generateCommand,
        configWizardCommand,
        configChangeListener,
        workspaceChangeListener,
        statusBarItem,
        errorHandler,
        uiManager
    );

    errorHandler.logInfo('插件激活成功', 'Extension');
}

/**
 * 插件停用时调用
 */
export function deactivate() {
    console.log('AI Git Commit Generator is now deactivated');
    
    if (errorHandler) {
        errorHandler.logInfo('插件停用', 'Extension');
    }
}
