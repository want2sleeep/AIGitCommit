/**
 * 进度管理器服务
 * 负责显示大型 Diff 处理的进度反馈
 *
 * 功能：
 * 1. 显示处理开始通知
 * 2. 更新处理进度
 * 3. 显示处理完成信息
 * 4. 报告错误信息
 */

import * as vscode from 'vscode';
import { IProgressManager } from '../types/interfaces';

/**
 * 进度管理器实现类
 */
export class ProgressManager implements IProgressManager {
  private totalChunks: number = 0;
  private completedChunks: number = 0;
  private startTime: number = 0;
  private progressReporter: vscode.Progress<{ message?: string; increment?: number }> | null = null;
  private progressResolve: (() => void) | null = null;

  /**
   * 开始进度跟踪
   * @param totalChunks 总块数
   */
  start(totalChunks: number): void {
    this.totalChunks = totalChunks;
    this.completedChunks = 0;
    this.startTime = Date.now();
  }

  /**
   * 更新进度
   * @param completedChunks 已完成块数
   */
  update(completedChunks: number): void {
    this.completedChunks = completedChunks;
    if (this.progressReporter) {
      const percentage = Math.round((completedChunks / this.totalChunks) * 100);
      const increment = (1 / this.totalChunks) * 100;
      this.progressReporter.report({
        message: `处理中... ${completedChunks}/${this.totalChunks} (${percentage}%)`,
        increment,
      });
    }
  }

  /**
   * 完成进度跟踪
   * @param processingTime 处理时间（毫秒）
   */
  complete(processingTime: number): void {
    if (this.progressResolve) {
      this.progressResolve();
      this.progressResolve = null;
      this.progressReporter = null;
    }

    const seconds = (processingTime / 1000).toFixed(1);
    void vscode.window.showInformationMessage(
      `✅ 大型 Diff 处理完成！处理了 ${this.totalChunks} 个块，耗时 ${seconds} 秒`
    );
  }

  /**
   * 报告错误
   * @param error 错误信息
   */
  reportError(error: string): void {
    if (this.progressResolve) {
      this.progressResolve();
      this.progressResolve = null;
      this.progressReporter = null;
    }

    void vscode.window.showErrorMessage(`❌ 大型 Diff 处理失败: ${error}`);
  }

  /**
   * 使用 VSCode Progress API 执行带进度的操作
   * @param totalChunks 总块数
   * @param operation 要执行的操作
   * @returns 操作结果
   */
  async withProgress<T>(totalChunks: number, operation: () => Promise<T>): Promise<T> {
    this.start(totalChunks);

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: '正在处理大型 Diff...',
        cancellable: false,
      },
      async (progress) => {
        this.progressReporter = progress;

        progress.report({
          message: `准备处理 ${totalChunks} 个块...`,
          increment: 0,
        });

        try {
          const result = await operation();
          const processingTime = Date.now() - this.startTime;
          this.complete(processingTime);
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.reportError(errorMessage);
          throw error;
        }
      }
    );
  }

  /**
   * 获取当前进度信息
   */
  getProgress(): { total: number; completed: number; percentage: number } {
    const percentage =
      this.totalChunks > 0 ? Math.round((this.completedChunks / this.totalChunks) * 100) : 0;
    return {
      total: this.totalChunks,
      completed: this.completedChunks,
      percentage,
    };
  }

  /**
   * 获取已用时间（毫秒）
   */
  getElapsedTime(): number {
    return this.startTime > 0 ? Date.now() - this.startTime : 0;
  }
}
