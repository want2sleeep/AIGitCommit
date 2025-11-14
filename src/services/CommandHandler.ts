import * as vscode from 'vscode';
import { ConfigurationManager } from './ConfigurationManager';
import { GitService } from './GitService';
import { LLMService } from './LLMService';
import { UIManager } from '../utils/UIManager';
import { ErrorHandler } from '../utils/ErrorHandler';

/**
 * 命令处理器类
 * 协调各个模块完成提交信息生成的完整流程
 */
export class CommandHandler {
    constructor(
        private readonly configManager: ConfigurationManager,
        private readonly gitService: GitService,
        private readonly llmService: LLMService,
        private readonly uiManager: UIManager,
        private readonly errorHandler: ErrorHandler
    ) {}

    /**
     * 生成提交信息的主命令
     * 编排完整的生成流程
     */
    async generateCommitMessage(): Promise<void> {
        // 设置重试回调
        this.errorHandler.setRetryCallback(() => this.generateCommitMessage());

        try {
            this.errorHandler.logInfo('开始生成提交信息', 'CommandHandler');

            // 验证前置条件
            const prerequisitesValid = await this.validatePrerequisites();
            if (!prerequisitesValid) {
                return;
            }

            // 生成提交信息（可能需要多次重试）
            let shouldRegenerate = true;
            while (shouldRegenerate) {
                const commitMessage = await this.generateMessage();
                
                if (!commitMessage) {
                    // 生成失败或用户取消
                    return;
                }

                // 显示提交信息并获取用户操作
                const action = await this.uiManager.showCommitMessageInput(commitMessage);

                switch (action.action) {
                    case 'commit':
                        // 执行提交
                        await this.performCommit(action.message!);
                        shouldRegenerate = false;
                        break;

                    case 'regenerate':
                        // 重新生成
                        this.errorHandler.logInfo('用户请求重新生成提交信息', 'CommandHandler');
                        shouldRegenerate = true;
                        break;

                    case 'cancel':
                        // 取消操作
                        this.errorHandler.logInfo('用户取消操作', 'CommandHandler');
                        this.uiManager.showStatusBarMessage('已取消生成提交信息');
                        shouldRegenerate = false;
                        break;
                }
            }

        } catch (error) {
            await this.errorHandler.handleError(error as Error, 'generateCommitMessage');
        } finally {
            // 清除重试回调
            this.errorHandler.setRetryCallback(null);
        }
    }

    /**
     * 验证前置条件
     * 检查配置和Git状态
     * @returns 前置条件是否满足
     */
    private async validatePrerequisites(): Promise<boolean> {
        this.errorHandler.logInfo('验证前置条件', 'CommandHandler');

        // 检查是否为Git仓库
        if (!this.gitService.isGitRepository()) {
            await this.uiManager.showError(
                '当前工作区不是Git仓库',
                '打开源代码管理'
            ).then(action => {
                if (action === '打开源代码管理') {
                    vscode.commands.executeCommand('workbench.view.scm');
                }
            });
            return false;
        }

        // 检查是否有暂存的变更
        const hasStagedChanges = await this.gitService.hasStagedChanges();
        if (!hasStagedChanges) {
            await this.uiManager.showError(
                '暂存区没有变更。请先使用 git add 暂存要提交的文件。',
                '打开源代码管理'
            ).then(action => {
                if (action === '打开源代码管理') {
                    vscode.commands.executeCommand('workbench.view.scm');
                }
            });
            return false;
        }

        // 验证配置
        const configValid = await this.configManager.isConfigured();
        if (!configValid) {
            const validation = await this.configManager.validateConfig();
            const errorMessage = `配置无效:\n${validation.errors.join('\n')}`;
            
            await this.uiManager.showError(
                errorMessage,
                '配置向导',
                '打开设置'
            ).then(async action => {
                if (action === '配置向导') {
                    await this.configManager.showConfigurationWizard();
                } else if (action === '打开设置') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'aigitcommit');
                }
            });
            return false;
        }

        this.errorHandler.logInfo('前置条件验证通过', 'CommandHandler');
        return true;
    }

    /**
     * 生成提交信息
     * @returns 生成的提交信息，如果失败则返回null
     */
    private async generateMessage(): Promise<string | null> {
        try {
            return await this.showProgress('正在生成提交信息...', async (progress) => {
                // 获取暂存的变更
                progress.report({ message: '获取Git变更...' });
                this.errorHandler.logInfo('获取暂存的变更', 'CommandHandler');
                const changes = await this.gitService.getStagedChanges();

                if (changes.length === 0) {
                    throw new Error('暂存区没有变更');
                }

                this.errorHandler.logInfo(`获取到 ${changes.length} 个文件变更`, 'CommandHandler');

                // 获取配置
                progress.report({ message: '读取配置...' });
                const config = await this.configManager.getConfig();

                // 调用LLM生成提交信息
                progress.report({ message: '调用AI生成提交信息...' });
                this.errorHandler.logInfo('调用LLM服务生成提交信息', 'CommandHandler');
                const commitMessage = await this.llmService.generateCommitMessage(changes, config);

                this.errorHandler.logInfo('提交信息生成成功', 'CommandHandler');
                return commitMessage;
            });
        } catch (error) {
            await this.errorHandler.handleError(error as Error, 'generateMessage');
            return null;
        }
    }

    /**
     * 执行Git提交
     * @param message 提交信息
     */
    private async performCommit(message: string): Promise<void> {
        try {
            await this.showProgress('正在提交...', async () => {
                this.errorHandler.logInfo('执行Git提交', 'CommandHandler');
                await this.gitService.commitWithMessage(message);
            });

            this.errorHandler.logInfo('提交成功', 'CommandHandler');
            vscode.window.showInformationMessage('✅ 提交成功！');
            this.uiManager.showStatusBarMessage('✅ 提交成功', 3000);

        } catch (error) {
            await this.errorHandler.handleError(error as Error, 'performCommit');
            throw error;
        }
    }

    /**
     * 显示进度指示器并执行任务
     * @param message 进度消息
     * @param task 要执行的任务
     * @returns 任务执行结果
     */
    private async showProgress<T>(
        message: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
    ): Promise<T> {
        return this.uiManager.showProgress(message, task);
    }
}
