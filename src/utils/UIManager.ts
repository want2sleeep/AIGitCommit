import * as vscode from 'vscode';
import { CommitAction } from '../types';

/**
 * UI管理器类
 * 负责处理所有用户交互界面
 */
export class UIManager {
  private statusBarItem: vscode.StatusBarItem | undefined;

  /**
   * 显示提交信息输入框
   * @param initialMessage 初始提交信息
   * @returns 用户的操作选择
   */
  async showCommitMessageInput(initialMessage: string): Promise<CommitAction> {
    // 创建快速选择项
    const items: vscode.QuickPickItem[] = [
      {
        label: '$(check) 接受并提交',
        description: '使用生成的提交信息',
        detail: initialMessage,
      },
      {
        label: '$(edit) 编辑后提交',
        description: '修改提交信息后再提交',
      },
      {
        label: '$(refresh) 重新生成',
        description: '生成新的提交信息',
      },
      {
        label: '$(close) 取消',
        description: '放弃此次操作',
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: '选择操作',
      title: 'AI生成的提交信息',
    });

    if (!selected) {
      return { action: 'cancel' };
    }

    // 根据用户选择返回相应操作
    if (selected.label.includes('接受并提交')) {
      return { action: 'commit', message: initialMessage };
    } else if (selected.label.includes('编辑后提交')) {
      const editedMessage = await vscode.window.showInputBox({
        prompt: '编辑提交信息',
        value: initialMessage,
        placeHolder: '输入提交信息',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return '提交信息不能为空';
          }
          return null;
        },
      });

      if (!editedMessage) {
        return { action: 'cancel' };
      }

      return { action: 'commit', message: editedMessage };
    } else if (selected.label.includes('重新生成')) {
      return { action: 'regenerate' };
    } else {
      return { action: 'cancel' };
    }
  }

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
