import * as vscode from 'vscode';
import { IConfigurationManager } from '../types/interfaces';

/**
 * 首次用户引导
 * 为首次用户提供友好的引导界面
 */
export class FirstTimeUserGuide {
  constructor(private configManager: IConfigurationManager) {}

  /**
   * 显示欢迎消息
   */
  async showWelcomeMessage(): Promise<void> {
    const message = `欢迎使用 AI Git Commit！

这个扩展可以帮助您：
• 自动分析代码变更
• 生成高质量的提交信息
• 支持多种 AI 提供商（OpenAI、Azure、Ollama 等）

在开始使用之前，我们需要完成一些简单的配置。`;

    await vscode.window.showInformationMessage(message, { modal: true }, '开始配置');
  }

  /**
   * 启动配置向导（首次用户模式）
   * @returns 配置是否完成
   */
  async startWizard(): Promise<boolean> {
    // 显示欢迎消息
    await this.showWelcomeMessage();

    // 启动配置向导
    const success = await this.configManager.showConfigurationWizard();

    if (success) {
      // 显示完成消息
      await this.showCompletionMessage();
    }

    return success;
  }

  /**
   * 显示配置完成消息
   */
  async showCompletionMessage(): Promise<void> {
    const message = `✅ 配置完成！

您现在可以开始使用 AI Git Commit 了。

使用方法：
1. 在 Git 暂存区添加变更
2. 点击 SCM 视图中的"生成 AI 提交信息"按钮
3. 或使用快捷键 Ctrl+Shift+G C

祝您使用愉快！`;

    await vscode.window.showInformationMessage(message, { modal: false });
  }
}
