/**
 * 混合模型反馈管理器
 * 提供清晰的用户反馈，让用户了解混合模型策略的使用情况
 */

import * as vscode from 'vscode';

/**
 * 混合模型反馈管理器
 */
export class HybridModelFeedback {
  private outputChannel: vscode.OutputChannel;

  /**
   * 创建 HybridModelFeedback 实例
   * @param outputChannel 输出频道
   */
  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * 记录模型选择信息
   * @param mapModel Map 阶段选择的模型
   * @param reduceModel Reduce 阶段使用的模型（主模型）
   * @param chunkCount 将要处理的 chunk 数量
   */
  logModelSelection(mapModel: string, reduceModel: string, chunkCount: number): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine(`[${timestamp}] 混合模型策略 - 模型选择`);
    this.outputChannel.appendLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.outputChannel.appendLine(`Map 阶段模型: ${mapModel}`);
    this.outputChannel.appendLine(`Reduce 阶段模型: ${reduceModel}`);
    this.outputChannel.appendLine(`Chunk 数量: ${chunkCount}`);
    this.outputChannel.appendLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  }

  /**
   * 记录处理开始
   * @param chunkCount 处理的 chunk 数量
   */
  logProcessingStart(chunkCount: number): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine(`[${timestamp}] 开始处理 ${chunkCount} 个 chunks...`);
  }

  /**
   * 记录处理完成
   * @param chunkCount 处理的 chunk 数量
   * @param processingTimeMs 处理时间（毫秒）
   */
  logProcessingComplete(chunkCount: number, processingTimeMs: number): void {
    const timestamp = new Date().toISOString();
    const seconds = (processingTimeMs / 1000).toFixed(2);
    this.outputChannel.appendLine(`[${timestamp}] 处理完成`);
    this.outputChannel.appendLine(`  - 处理的 chunks: ${chunkCount}`);
    this.outputChannel.appendLine(`  - 总耗时: ${seconds}秒 (${processingTimeMs}ms)`);
    this.outputChannel.appendLine(
      `  - 平均每个 chunk: ${(processingTimeMs / chunkCount).toFixed(0)}ms`
    );
  }

  /**
   * 显示混合模型使用情况
   * @param mapModel Map 阶段使用的模型
   * @param reduceModel Reduce 阶段使用的模型
   * @param chunkCount 处理的 chunk 数量
   * @param tokenSavings 估算的 token 节省百分比
   * @param processingTimeMs 处理时间（毫秒）
   */
  showUsageSummary(
    mapModel: string,
    reduceModel: string,
    chunkCount: number,
    tokenSavings: number,
    processingTimeMs?: number
  ): void {
    const timestamp = new Date().toISOString();

    // 在输出频道显示详细信息
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine(`[${timestamp}] 混合模型策略 - 使用摘要`);
    this.outputChannel.appendLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.outputChannel.appendLine(`Map 阶段: 使用 ${mapModel} 处理 ${chunkCount} 个 chunks`);
    this.outputChannel.appendLine(`Reduce 阶段: 使用 ${reduceModel} 生成最终提交信息`);
    this.outputChannel.appendLine(`Token 节省: 约 ${tokenSavings}%`);

    if (processingTimeMs !== undefined) {
      const seconds = (processingTimeMs / 1000).toFixed(2);
      this.outputChannel.appendLine(`处理时间: ${seconds}秒`);
    }

    this.outputChannel.appendLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // 可选：显示通知（仅在首次使用或显著节省时）
    if (tokenSavings > 70) {
      vscode.window.showInformationMessage(
        `💡 混合模型策略节省了约 ${tokenSavings}% 的 token 成本！`
      );
    }
  }

  /**
   * 显示模型回退警告
   * @param attemptedModel 尝试使用的模型
   * @param fallbackModel 回退到的模型
   */
  showFallbackWarning(attemptedModel: string, fallbackModel: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine(`[${timestamp}] ⚠️ 模型回退警告`);
    this.outputChannel.appendLine(`尝试使用的模型: ${attemptedModel}`);
    this.outputChannel.appendLine(`回退到的模型: ${fallbackModel}`);
    this.outputChannel.appendLine(`原因: Chunk 模型不可用或验证失败`);
  }

  /**
   * 记录智能降级信息
   * @param primaryModel 主模型
   * @param downgradedModel 降级后的模型
   */
  logSmartDowngrade(primaryModel: string, downgradedModel: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine(`[${timestamp}] 智能降级`);
    this.outputChannel.appendLine(`主模型: ${primaryModel}`);
    this.outputChannel.appendLine(`降级为: ${downgradedModel}`);
    this.outputChannel.appendLine(`原因: 自动选择轻量级模型以优化成本和性能`);
  }

  /**
   * 显示输出频道
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}
