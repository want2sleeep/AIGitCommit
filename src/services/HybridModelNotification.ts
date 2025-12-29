import * as vscode from 'vscode';

/**
 * 混合模型策略通知管理器
 * 负责在首次使用时提示用户新功能，并记录混合模型策略的启用状态
 *
 * 需求 7.4: 当升级后首次运行时，系统应当在日志中提示用户可以配置 chunk 模型以优化性能
 */
export class HybridModelNotification {
  private static readonly NOTIFICATION_SHOWN_KEY = 'aigitcommit.hybridModelNotificationShown';
  private static readonly HYBRID_MODEL_ENABLED_KEY = 'aigitcommit.hybridModelEnabled';

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * 检查是否应该显示混合模型策略通知
   * @returns 是否应该显示通知
   */
  shouldShowNotification(): boolean {
    const shown = this.context.globalState.get<boolean>(
      HybridModelNotification.NOTIFICATION_SHOWN_KEY,
      false
    );
    return !shown;
  }

  /**
   * 显示混合模型策略功能通知
   * 在首次使用时提示用户新功能
   */
  async showFeatureNotification(): Promise<void> {
    if (!this.shouldShowNotification()) {
      return;
    }

    const message = `🚀 新功能：混合模型策略

AI Git Commit 现在支持混合模型策略，可以显著降低处理大型提交的成本和时间！

• 在 Map 阶段使用轻量级模型（如 gpt-4o-mini）处理 chunks
• 在 Reduce 阶段使用高质量模型生成最终提交信息
• 可节省高达 85% 的 token 成本

您可以在配置中设置 "Chunk Model" 来启用此功能。`;

    const action = await vscode.window.showInformationMessage(
      message,
      '了解更多',
      '稍后提醒',
      '不再显示'
    );

    if (action === '了解更多') {
      // 打开文档链接
      await vscode.env.openExternal(
        vscode.Uri.parse('https://github.com/Sma1lboy/ai-git-commit#hybrid-model-strategy')
      );
      // 标记为已显示
      await this.markNotificationShown();
    } else if (action === '不再显示') {
      // 标记为已显示
      await this.markNotificationShown();
    }
    // 如果选择"稍后提醒"，不标记为已显示，下次还会提示
  }

  /**
   * 标记通知已显示
   */
  async markNotificationShown(): Promise<void> {
    await this.context.globalState.update(HybridModelNotification.NOTIFICATION_SHOWN_KEY, true);
  }

  /**
   * 记录混合模型策略的启用状态
   * @param enabled 是否启用
   */
  async recordHybridModelStatus(enabled: boolean): Promise<void> {
    await this.context.globalState.update(
      HybridModelNotification.HYBRID_MODEL_ENABLED_KEY,
      enabled
    );
  }

  /**
   * 获取混合模型策略的启用状态
   * @returns 是否启用
   */
  isHybridModelEnabled(): boolean {
    return this.context.globalState.get<boolean>(
      HybridModelNotification.HYBRID_MODEL_ENABLED_KEY,
      false
    );
  }

  /**
   * 在输出频道记录混合模型策略信息
   * @param outputChannel 输出频道
   * @param chunkModel 配置的 chunk 模型
   */
  logHybridModelInfo(outputChannel: vscode.OutputChannel, chunkModel?: string): void {
    if (chunkModel) {
      outputChannel.appendLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      outputChannel.appendLine('💡 混合模型策略已启用');
      outputChannel.appendLine(`   Chunk 模型: ${chunkModel}`);
      outputChannel.appendLine('   这将在处理大型提交时显著降低成本和时间');
      outputChannel.appendLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      outputChannel.appendLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      outputChannel.appendLine('💡 提示：您可以配置 Chunk Model 以优化性能');
      outputChannel.appendLine('   在配置中设置 "aigitcommit.chunkModel" 可以：');
      outputChannel.appendLine('   • 使用轻量级模型处理 chunks（如 gpt-4o-mini）');
      outputChannel.appendLine('   • 节省高达 85% 的 token 成本');
      outputChannel.appendLine('   • 显著提升处理速度');
      outputChannel.appendLine('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }

  /**
   * 重置通知状态（用于测试）
   */
  async resetNotificationState(): Promise<void> {
    await this.context.globalState.update(
      HybridModelNotification.NOTIFICATION_SHOWN_KEY,
      undefined
    );
    await this.context.globalState.update(
      HybridModelNotification.HYBRID_MODEL_ENABLED_KEY,
      undefined
    );
  }
}
