import * as vscode from 'vscode';
import { ErrorType } from '../types';

/**
 * 错误处理器类
 * 统一处理插件中的各种错误，提供用户友好的错误消息和日志记录
 */
export class ErrorHandler {
    private outputChannel: vscode.OutputChannel;
    private retryCallback: (() => Promise<void>) | null = null;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('AI Git Commit Generator');
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
    private classifyError(error: Error): ErrorType {
        const errorMessage = error.message.toLowerCase();
        const errorName = error.name.toLowerCase();

        // 配置错误
        if (errorMessage.includes('configuration') || 
            errorMessage.includes('config') ||
            errorMessage.includes('api key') ||
            errorMessage.includes('endpoint')) {
            return ErrorType.ConfigurationError;
        }

        // Git错误
        if (errorMessage.includes('git') || 
            errorMessage.includes('repository') ||
            errorMessage.includes('staged') ||
            errorMessage.includes('commit')) {
            return ErrorType.GitError;
        }

        // 网络错误
        if (errorMessage.includes('network') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('econnrefused') ||
            errorMessage.includes('enotfound') ||
            errorName.includes('network')) {
            return ErrorType.NetworkError;
        }

        // API错误
        if (errorMessage.includes('api') ||
            errorMessage.includes('401') ||
            errorMessage.includes('403') ||
            errorMessage.includes('429') ||
            errorMessage.includes('500') ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('rate limit')) {
            return ErrorType.APIError;
        }

        // 未知错误
        return ErrorType.UnknownError;
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
            return '❌ API密钥未配置或无效\n\n' +
                   '解决方案：\n' +
                   '1. 点击"配置向导"按钮，按照提示输入API密钥\n' +
                   '2. 或点击"打开设置"，在设置中配置 aiGitCommit.apiKey\n' +
                   '3. 确保API密钥有效且具有访问权限';
        }
        
        if (message.includes('endpoint')) {
            return '❌ API端点配置无效\n\n' +
                   '解决方案：\n' +
                   '1. 点击"打开设置"，检查 aiGitCommit.apiEndpoint 配置\n' +
                   '2. 确保URL格式正确（如：https://api.openai.com/v1）\n' +
                   '3. 如使用本地服务，确保服务已启动且可访问';
        }
        
        if (message.includes('model')) {
            return '❌ 模型名称未配置\n\n' +
                   '解决方案：\n' +
                   '1. 点击"配置向导"设置模型名称\n' +
                   '2. 或在设置中配置 aiGitCommit.modelName\n' +
                   '3. 常用模型：gpt-4, gpt-3.5-turbo, claude-3-opus 等';
        }
        
        return `❌ 配置错误\n\n${error.message}\n\n` +
               '解决方案：\n' +
               '点击"配置向导"完成初始配置，或点击"打开设置"手动配置';
    }

    /**
     * 获取Git错误消息
     */
    private getGitErrorMessage(error: Error): string {
        const message = error.message.toLowerCase();
        
        if (message.includes('not a git repository')) {
            return '❌ 当前工作区不是Git仓库\n\n' +
                   '解决方案：\n' +
                   '1. 在终端运行 git init 初始化Git仓库\n' +
                   '2. 或打开一个已存在的Git仓库\n' +
                   '3. 确保在正确的工作区目录中';
        }
        
        if (message.includes('no staged changes') || message.includes('nothing to commit')) {
            return '❌ 暂存区没有变更\n\n' +
                   '解决方案：\n' +
                   '1. 点击"打开源代码管理"查看变更的文件\n' +
                   '2. 使用 git add 命令或在源代码管理视图中暂存文件\n' +
                   '3. 暂存后再次运行此命令生成提交信息';
        }
        
        if (message.includes('git not found')) {
            return '❌ 未找到Git\n\n' +
                   '解决方案：\n' +
                   '1. 从 https://git-scm.com 下载并安装Git\n' +
                   '2. 确保Git已添加到系统PATH环境变量\n' +
                   '3. 重启VSCode使环境变量生效';
        }
        
        return `❌ Git错误\n\n${error.message}\n\n` +
               '解决方案：\n' +
               '点击"打开源代码管理"检查Git状态，或查看日志了解详细错误信息';
    }

    /**
     * 获取API错误消息
     */
    private getAPIErrorMessage(error: Error): string {
        const message = error.message.toLowerCase();
        
        if (message.includes('401') || message.includes('unauthorized')) {
            return '❌ API认证失败（401 Unauthorized）\n\n' +
                   '解决方案：\n' +
                   '1. 检查API密钥是否正确配置\n' +
                   '2. 确认API密钥未过期或被撤销\n' +
                   '3. 点击"打开设置"重新配置API密钥\n' +
                   '4. 点击"重试"在修正配置后重新尝试';
        }
        
        if (message.includes('403') || message.includes('forbidden')) {
            return '❌ API访问被拒绝（403 Forbidden）\n\n' +
                   '解决方案：\n' +
                   '1. 检查API密钥是否具有所需权限\n' +
                   '2. 确认账户余额充足（如适用）\n' +
                   '3. 验证API端点是否正确\n' +
                   '4. 点击"查看日志"了解详细错误信息';
        }
        
        if (message.includes('429') || message.includes('rate limit')) {
            return '❌ API请求频率超限（429 Rate Limit）\n\n' +
                   '解决方案：\n' +
                   '1. 等待几分钟后点击"重试"\n' +
                   '2. 检查是否有其他应用在使用同一API密钥\n' +
                   '3. 考虑升级API服务计划以获得更高限额\n' +
                   '4. 点击"查看日志"查看具体限流信息';
        }
        
        if (message.includes('404')) {
            return '❌ API端点或模型不存在（404 Not Found）\n\n' +
                   '解决方案：\n' +
                   '1. 检查API端点URL是否正确\n' +
                   '2. 验证模型名称是否正确（如：gpt-4, gpt-3.5-turbo）\n' +
                   '3. 确认所选模型在您的API服务中可用\n' +
                   '4. 点击"打开设置"修正配置';
        }
        
        if (message.includes('500') || message.includes('502') || message.includes('503')) {
            return '❌ API服务器错误（5xx Server Error）\n\n' +
                   '解决方案：\n' +
                   '1. 这是服务端问题，通常是暂时性的\n' +
                   '2. 等待几分钟后点击"重试"\n' +
                   '3. 检查API服务状态页面\n' +
                   '4. 如持续出现，点击"查看日志"并联系服务提供商';
        }
        
        return `❌ API调用失败\n\n${error.message}\n\n` +
               '解决方案：\n' +
               '1. 点击"重试"重新尝试\n' +
               '2. 点击"查看日志"了解详细错误信息\n' +
               '3. 检查API配置是否正确';
    }

    /**
     * 获取网络错误消息
     */
    private getNetworkErrorMessage(error: Error): string {
        const message = error.message.toLowerCase();
        
        if (message.includes('timeout')) {
            return '❌ 网络请求超时\n\n' +
                   '解决方案：\n' +
                   '1. 检查网络连接是否正常\n' +
                   '2. 如使用VPN或代理，确保配置正确\n' +
                   '3. 点击"重试"重新尝试\n' +
                   '4. 考虑在设置中增加超时时间限制';
        }
        
        if (message.includes('econnrefused')) {
            return '❌ 连接被拒绝（ECONNREFUSED）\n\n' +
                   '解决方案：\n' +
                   '1. 检查API端点URL是否正确\n' +
                   '2. 如使用本地服务，确保服务已启动\n' +
                   '3. 验证端口号是否正确\n' +
                   '4. 检查防火墙设置是否阻止了连接';
        }
        
        if (message.includes('enotfound')) {
            return '❌ 无法解析域名（ENOTFOUND）\n\n' +
                   '解决方案：\n' +
                   '1. 检查网络连接是否正常\n' +
                   '2. 验证API端点域名是否正确\n' +
                   '3. 尝试使用其他DNS服务器\n' +
                   '4. 检查是否需要配置代理';
        }
        
        return '❌ 网络连接失败\n\n' +
               '解决方案：\n' +
               '1. 检查网络连接是否正常\n' +
               '2. 验证API端点配置是否正确\n' +
               '3. 点击"重试"重新尝试\n' +
               '4. 点击"查看日志"了解详细错误信息';
    }

    /**
     * 获取未知错误消息
     */
    private getUnknownErrorMessage(error: Error): string {
        return `❌ 发生未知错误\n\n${error.message}\n\n` +
               '解决方案：\n' +
               '1. 点击"查看日志"了解详细错误信息\n' +
               '2. 尝试重启VSCode\n' +
               '3. 如问题持续，请在GitHub上报告此问题';
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
                await this.handleErrorAction(action);
            }
        } else {
            vscode.window.showErrorMessage(message);
        }
    }

    /**
     * 获取错误相关的操作按钮
     * @param errorType 错误类型
     * @returns 操作按钮数组
     */
    private getErrorActions(errorType: ErrorType): string[] {
        switch (errorType) {
            case ErrorType.ConfigurationError:
                return ['打开设置', '配置向导'];
            
            case ErrorType.GitError:
                return ['打开源代码管理'];
            
            case ErrorType.APIError:
            case ErrorType.NetworkError:
                return ['重试', '查看日志'];
            
            case ErrorType.UnknownError:
                return ['查看日志'];
            
            default:
                return [];
        }
    }

    /**
     * 处理错误操作
     * @param action 操作名称
     */
    private async handleErrorAction(action: string): Promise<void> {
        switch (action) {
            case '打开设置':
                await vscode.commands.executeCommand('workbench.action.openSettings', 'aiGitCommit');
                break;
            
            case '配置向导':
                await vscode.commands.executeCommand('aiGitCommit.configureSettings');
                break;
            
            case '打开源代码管理':
                await vscode.commands.executeCommand('workbench.view.scm');
                break;
            
            case '查看日志':
                this.outputChannel.show();
                break;
            
            case '重试':
                if (this.retryCallback) {
                    this.logInfo('用户请求重试操作', 'ErrorHandler');
                    try {
                        await this.retryCallback();
                    } catch (error) {
                        this.logError(error as Error, '重试操作失败');
                    }
                }
                break;
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
