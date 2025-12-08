import * as vscode from 'vscode';
import { ConfigurationManager } from './ConfigurationManager';
import { GitService } from './GitService';
import { LLMService } from './LLMService';
import { UIManager } from '../utils/UIManager';
import { ErrorHandler } from '../utils/ErrorHandler';
import { ConfigurationInterceptor } from './ConfigurationInterceptor';
import { CommitMessagePreviewManager } from './CommitMessagePreviewManager';
import { isError } from '../utils/typeGuards';
import { GitChange } from '../types';

/**
 * 命令处理器类
 * 协调各个模块完成提交信息生成的完整流程
 */
export class CommandHandler {
  private readonly configInterceptor: ConfigurationInterceptor;

  constructor(
    private readonly configManager: ConfigurationManager,
    private readonly gitService: GitService,
    private readonly llmService: LLMService,
    private readonly uiManager: UIManager,
    private readonly errorHandler: ErrorHandler,
    private readonly previewManager: CommitMessagePreviewManager
  ) {
    this.configInterceptor = new ConfigurationInterceptor(configManager);
  }

  /**
   * 生成提交信息的主命令
   * 编排完整的生成流程
   */
  async generateCommitMessage(): Promise<void> {
    // 使用配置拦截器检查配置状态
    const canProceed = await this.configInterceptor.interceptOperation(async () => {
      await this.doGenerateCommitMessage();
    });

    if (!canProceed) {
      // 配置向导已打开或操作被拦截，不继续执行
      return;
    }
  }

  /**
   * 实际执行生成提交信息的逻辑
   */
  private async doGenerateCommitMessage(): Promise<void> {
    try {
      this.errorHandler.logInfo('开始生成提交信息', 'CommandHandler');

      // 验证前置条件
      const prerequisitesValid = await this.validatePrerequisites();
      if (!prerequisitesValid) {
        return;
      }

      const result = await this.generateMessage();

      if (!result) {
        // 生成失败或用户取消
        return;
      }

      const { commitMessage, changes } = result;

      // 显示预览和编辑界面
      try {
        const editedMessage = await this.previewManager.showPreview(commitMessage, changes);

        // 将编辑后的提交信息填充到SCM输入框
        this.gitService.setCommitMessage(editedMessage);

        this.errorHandler.logInfo('提交信息已填充到SCM输入框', 'CommandHandler');
        this.uiManager.showStatusBarMessage('✅ 提交信息已生成到 Git 面板', 3000);
      } catch (error) {
        // 用户取消了预览
        const err = isError(error) ? error : new Error(String(error));
        if (err.message.includes('取消') || err.message.includes('关闭')) {
          this.uiManager.showStatusBarMessage('⚠️ 已取消提交信息生成', 3000);
        } else {
          throw error;
        }
      }
    } catch (error) {
      const err = isError(error) ? error : new Error(String(error));
      await this.errorHandler.handleError(err, 'generateCommitMessage');
    }
  }

  /**
   * 验证前置条件
   * 检查Git状态（配置检查由拦截器处理）
   * @returns 前置条件是否满足
   */
  private async validatePrerequisites(): Promise<boolean> {
    this.errorHandler.logInfo('验证前置条件', 'CommandHandler');

    // 检查是否为Git仓库
    if (!this.gitService.isGitRepository()) {
      const action = await this.uiManager.showError('当前工作区不是Git仓库', '打开源代码管理');
      if (action === '打开源代码管理') {
        void vscode.commands.executeCommand('workbench.view.scm');
      }
      return false;
    }

    // 检查是否有暂存的变更
    const hasStagedChanges = this.gitService.hasStagedChanges();
    if (!hasStagedChanges) {
      const action = await this.uiManager.showError(
        '暂存区没有变更。请先使用 git add 暂存要提交的文件。',
        '打开源代码管理'
      );
      if (action === '打开源代码管理') {
        void vscode.commands.executeCommand('workbench.view.scm');
      }
      return false;
    }

    this.errorHandler.logInfo('前置条件验证通过', 'CommandHandler');
    return true;
  }

  /**
   * 生成提交信息
   * @returns 生成的提交信息和变更列表，如果失败则返回null
   */
  private async generateMessage(): Promise<{ commitMessage: string; changes: GitChange[] } | null> {
    try {
      return await this.uiManager.showEnhancedProgress(
        '正在生成提交信息...',
        async (progress, token) => {
          // 检查是否已取消
          if (token.isCancellationRequested) {
            throw new Error('操作已取消');
          }

          // 获取暂存的变更 (20%)
          progress.report({ message: '获取Git变更...', increment: 0 });
          this.errorHandler.logInfo('获取暂存的变更', 'CommandHandler');
          const changes = await this.gitService.getStagedChanges();

          if (token.isCancellationRequested) {
            throw new Error('操作已取消');
          }

          if (changes.length === 0) {
            throw new Error('暂存区没有变更');
          }

          this.errorHandler.logInfo(`获取到 ${changes.length} 个文件变更`, 'CommandHandler');
          progress.report({ message: '获取Git变更完成', increment: 20 });

          // 获取配置 (10%)
          if (token.isCancellationRequested) {
            throw new Error('操作已取消');
          }

          progress.report({ message: '读取配置...', increment: 10 });
          const config = await this.configManager.getConfig();

          // 调用LLM生成提交信息 (60%)
          if (token.isCancellationRequested) {
            throw new Error('操作已取消');
          }

          progress.report({ message: '调用AI生成提交信息...', increment: 10 });
          this.errorHandler.logInfo('调用LLM服务生成提交信息', 'CommandHandler');
          const commitMessage = await this.llmService.generateCommitMessage(changes, config);

          if (token.isCancellationRequested) {
            throw new Error('操作已取消');
          }

          progress.report({ message: '提交信息生成完成', increment: 60 });
          this.errorHandler.logInfo('提交信息生成成功', 'CommandHandler');

          return { commitMessage, changes };
        },
        {
          cancellable: true,
          showEstimatedTime: true,
        }
      );
    } catch (error) {
      const err = isError(error) ? error : new Error(String(error));

      // 如果是用户取消操作，显示友好提示
      if (err.message === '操作已取消') {
        this.uiManager.showStatusBarMessage('⚠️ 提交信息生成已取消', 3000);
        return null;
      }

      await this.errorHandler.handleError(err, 'generateMessage');
      return null;
    }
  }
}
