import * as vscode from 'vscode';

/**
 * 进度报告器接口
 * 扩展了VSCode的Progress接口，添加了预计剩余时间
 */
export interface EnhancedProgress
  extends vscode.Progress<{ message?: string; increment?: number }> {
  /**
   * 报告进度，包含预计剩余时间
   * @param value 进度值
   */
  report(value: { message?: string; increment?: number; estimatedTimeRemaining?: number }): void;
}

/**
 * 进度跟踪器
 * 用于计算预计剩余时间
 */
class ProgressTracker {
  private startTime: number;
  private currentProgress: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * 更新进度并计算预计剩余时间
   * @param increment 进度增量
   * @returns 预计剩余时间（毫秒）
   */
  updateProgress(increment: number): number {
    this.currentProgress += increment;

    if (this.currentProgress <= 0 || this.currentProgress >= 100) {
      return 0;
    }

    const elapsed = Date.now() - this.startTime;
    const estimatedTotal = (elapsed / this.currentProgress) * 100;
    const remaining = estimatedTotal - elapsed;

    return Math.max(0, remaining);
  }

  /**
   * 格式化剩余时间为可读字符串
   * @param milliseconds 毫秒数
   * @returns 格式化的时间字符串
   */
  static formatTime(milliseconds: number): string {
    if (milliseconds < 1000) {
      return '不到 1 秒';
    }

    const seconds = Math.ceil(milliseconds / 1000);

    if (seconds < 60) {
      return `约 ${seconds} 秒`;
    }

    const minutes = Math.ceil(seconds / 60);
    return `约 ${minutes} 分钟`;
  }
}

/**
 * UI管理器类
 * 负责处理所有用户交互界面
 */
export class UIManager {
  private statusBarItem: vscode.StatusBarItem | undefined;

  /**
   * 显示进度指示器
   * @param title 进度标题
   * @param task 要执行的任务
   * @returns 任务执行结果
   */
  async showProgress<T>(
    title: string,
    task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<T>
  ): Promise<T> {
    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: false,
      },
      task
    );
  }

  /**
   * 显示增强的进度指示器，支持预计剩余时间和取消功能
   * @param title 进度标题
   * @param task 要执行的任务，接收进度报告器和取消令牌
   * @param options 进度选项
   * @returns 任务执行结果
   */
  async showEnhancedProgress<T>(
    title: string,
    task: (
      progress: vscode.Progress<{ message?: string; increment?: number }>,
      token: vscode.CancellationToken
    ) => Promise<T>,
    options?: {
      cancellable?: boolean;
      showEstimatedTime?: boolean;
    }
  ): Promise<T> {
    const { cancellable = true, showEstimatedTime = true } = options || {};
    const tracker = new ProgressTracker();

    return vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable,
      },
      async (progress, token) => {
        // 创建增强的进度报告器
        const enhancedProgress: vscode.Progress<{ message?: string; increment?: number }> = {
          report: (value: { message?: string; increment?: number }) => {
            let message = value.message || '';

            // 如果有进度增量，计算预计剩余时间
            if (showEstimatedTime && value.increment) {
              const remainingMs = tracker.updateProgress(value.increment);
              if (remainingMs > 0) {
                const timeStr = ProgressTracker.formatTime(remainingMs);
                message = message ? `${message} (剩余 ${timeStr})` : `剩余 ${timeStr}`;
              }
            }

            progress.report({
              message,
              increment: value.increment,
            });
          },
        };

        // 执行任务
        return task(enhancedProgress, token);
      }
    );
  }

  /**
   * 显示错误消息
   * @param message 错误消息
   * @param actions 可选的操作按钮
   * @returns 用户选择的操作
   */
  async showError(message: string, ...actions: string[]): Promise<string | undefined> {
    if (actions.length > 0) {
      return vscode.window.showErrorMessage(message, ...actions);
    } else {
      void vscode.window.showErrorMessage(message);
      return undefined;
    }
  }

  /**
   * 在状态栏显示消息
   * @param message 要显示的消息
   * @param timeout 显示时长（毫秒），默认3000ms
   */
  showStatusBarMessage(message: string, timeout: number = 3000): void {
    vscode.window.setStatusBarMessage(message, timeout);
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
    }
  }
}
