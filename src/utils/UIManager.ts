import * as vscode from 'vscode';

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
