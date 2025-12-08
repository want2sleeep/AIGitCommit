import * as vscode from 'vscode';
import { UIManager } from '../utils/UIManager';

/**
 * UIManager单元测试
 * 测试UI管理器的核心功能
 */
describe('UIManager', () => {
  let uiManager: UIManager;

  beforeEach(() => {
    jest.clearAllMocks();
    uiManager = new UIManager();
  });

  afterEach(() => {
    uiManager.dispose();
  });

  describe('showProgress', () => {
    it('should execute task with progress indicator', async () => {
      const title = '正在处理...';
      const taskResult = 'task completed';
      const mockTask = jest.fn().mockResolvedValue(taskResult);

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (options, task) => {
          expect(options.location).toBe(vscode.ProgressLocation.Notification);
          expect(options.title).toBe(title);
          expect(options.cancellable).toBe(false);

          const mockProgress = { report: jest.fn() } as vscode.Progress<{
            message?: string;
            increment?: number;
          }>;
          return task(mockProgress, {} as vscode.CancellationToken);
        });

      const result = await uiManager.showProgress(title, mockTask);

      expect(result).toBe(taskResult);
      expect(mockTask).toHaveBeenCalled();
      expect(mockWithProgress).toHaveBeenCalled();

      mockWithProgress.mockRestore();
    });

    it('should pass progress object to task', async () => {
      const title = '正在生成...';
      let capturedProgress: vscode.Progress<{ message?: string; increment?: number }> | undefined;

      const mockTask = jest.fn().mockImplementation((progress) => {
        capturedProgress = progress;
        progress.report({ message: '步骤1', increment: 50 });
        return Promise.resolve('done');
      });

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (_options, task) => {
          const mockProgress = {
            report: jest.fn(),
          } as vscode.Progress<{ message?: string; increment?: number }>;
          return task(mockProgress, {} as vscode.CancellationToken);
        });

      await uiManager.showProgress(title, mockTask);

      expect(capturedProgress).toBeDefined();
      expect(capturedProgress!.report).toHaveBeenCalledWith({ message: '步骤1', increment: 50 });

      mockWithProgress.mockRestore();
    });

    it('should propagate task errors', async () => {
      const title = '正在处理...';
      const testError = new Error('Task failed');
      const mockTask = jest.fn().mockRejectedValue(testError);

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (_options, task) => {
          const mockProgress = { report: jest.fn() } as vscode.Progress<{
            message?: string;
            increment?: number;
          }>;
          return task(mockProgress, {} as vscode.CancellationToken);
        });

      await expect(uiManager.showProgress(title, mockTask)).rejects.toThrow('Task failed');

      mockWithProgress.mockRestore();
    });
  });

  describe('showError', () => {
    it('should display error message without actions', async () => {
      const errorMessage = '发生错误';

      const mockShowError = jest
        .spyOn(vscode.window, 'showErrorMessage')
        .mockResolvedValue(undefined);

      const result = await uiManager.showError(errorMessage);

      expect(mockShowError).toHaveBeenCalledWith(errorMessage);
      expect(result).toBeUndefined();

      mockShowError.mockRestore();
    });

    it('should display error message with actions and return selected action', async () => {
      const errorMessage = '配置错误';
      const actions = ['打开设置', '取消'];

      const mockShowError = jest
        .spyOn(vscode.window, 'showErrorMessage')
        .mockResolvedValue('打开设置' as any);

      const result = await uiManager.showError(errorMessage, ...actions);

      expect(mockShowError).toHaveBeenCalledWith(errorMessage, '打开设置', '取消');
      expect(result).toBe('打开设置');

      mockShowError.mockRestore();
    });

    it('should return undefined when user dismisses error with actions', async () => {
      const errorMessage = '操作失败';
      const actions = ['重试', '取消'];

      const mockShowError = jest
        .spyOn(vscode.window, 'showErrorMessage')
        .mockResolvedValue(undefined);

      const result = await uiManager.showError(errorMessage, ...actions);

      expect(mockShowError).toHaveBeenCalledWith(errorMessage, '重试', '取消');
      expect(result).toBeUndefined();

      mockShowError.mockRestore();
    });

    it('should handle multiple action buttons', async () => {
      const errorMessage = 'API调用失败';
      const actions = ['重试', '配置', '查看日志', '取消'];

      const mockShowError = jest
        .spyOn(vscode.window, 'showErrorMessage')
        .mockResolvedValue('查看日志' as any);

      const result = await uiManager.showError(errorMessage, ...actions);

      expect(mockShowError).toHaveBeenCalledWith(errorMessage, '重试', '配置', '查看日志', '取消');
      expect(result).toBe('查看日志');

      mockShowError.mockRestore();
    });
  });

  describe('showStatusBarMessage', () => {
    it('should display status bar message with default timeout', () => {
      const message = '操作成功';

      const mockSetStatusBarMessage = jest
        .spyOn(vscode.window, 'setStatusBarMessage')
        .mockReturnValue({
          dispose: jest.fn(),
        } as vscode.Disposable);

      uiManager.showStatusBarMessage(message);

      expect(mockSetStatusBarMessage).toHaveBeenCalledWith(message, 3000);

      mockSetStatusBarMessage.mockRestore();
    });

    it('should display status bar message with custom timeout', () => {
      const message = '正在处理...';
      const timeout = 5000;

      const mockSetStatusBarMessage = jest
        .spyOn(vscode.window, 'setStatusBarMessage')
        .mockReturnValue({
          dispose: jest.fn(),
        } as vscode.Disposable);

      uiManager.showStatusBarMessage(message, timeout);

      expect(mockSetStatusBarMessage).toHaveBeenCalledWith(message, timeout);

      mockSetStatusBarMessage.mockRestore();
    });

    it('should handle zero timeout', () => {
      const message = '即时消息';
      const timeout = 0;

      const mockSetStatusBarMessage = jest
        .spyOn(vscode.window, 'setStatusBarMessage')
        .mockReturnValue({
          dispose: jest.fn(),
        } as vscode.Disposable);

      uiManager.showStatusBarMessage(message, timeout);

      expect(mockSetStatusBarMessage).toHaveBeenCalledWith(message, timeout);

      mockSetStatusBarMessage.mockRestore();
    });
  });

  describe('showEnhancedProgress', () => {
    it('should execute task with enhanced progress and cancellation support', async () => {
      const title = '正在生成提交信息...';
      const taskResult = 'commit message';
      const mockTask = jest.fn().mockResolvedValue(taskResult);

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (options, task) => {
          expect(options.location).toBe(vscode.ProgressLocation.Notification);
          expect(options.title).toBe(title);
          expect(options.cancellable).toBe(true);

          const mockProgress = { report: jest.fn() } as vscode.Progress<{
            message?: string;
            increment?: number;
          }>;
          const mockToken = { isCancellationRequested: false } as vscode.CancellationToken;
          return task(mockProgress, mockToken);
        });

      const result = await uiManager.showEnhancedProgress(title, mockTask);

      expect(result).toBe(taskResult);
      expect(mockTask).toHaveBeenCalled();
      expect(mockWithProgress).toHaveBeenCalled();

      mockWithProgress.mockRestore();
    });

    it('should show estimated time remaining in progress message', async () => {
      const title = '正在处理...';
      const reportedMessages: string[] = [];

      const mockTask = jest.fn().mockImplementation(async (progress) => {
        progress.report({ message: '步骤1', increment: 25 });
        progress.report({ message: '步骤2', increment: 25 });
        progress.report({ message: '步骤3', increment: 25 });
        return 'done';
      });

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (_options, task) => {
          const mockProgress = {
            report: jest.fn((value) => {
              if (value.message) {
                reportedMessages.push(value.message);
              }
            }),
          } as unknown as vscode.Progress<{ message?: string; increment?: number }>;
          const mockToken = { isCancellationRequested: false } as vscode.CancellationToken;
          return task(mockProgress, mockToken);
        });

      await uiManager.showEnhancedProgress(title, mockTask, {
        showEstimatedTime: true,
      });

      // 验证至少有一条消息包含剩余时间信息
      const hasTimeEstimate = reportedMessages.some((msg) => msg.includes('剩余'));
      expect(hasTimeEstimate).toBe(true);

      mockWithProgress.mockRestore();
    });

    it('should support cancellation when cancellable is true', async () => {
      const title = '可取消的任务';
      let tokenPassed: vscode.CancellationToken | undefined;

      const mockTask = jest.fn().mockImplementation(async (_progress, token) => {
        tokenPassed = token;
        return 'result';
      });

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (options, task) => {
          expect(options.cancellable).toBe(true);
          const mockProgress = { report: jest.fn() } as vscode.Progress<{
            message?: string;
            increment?: number;
          }>;
          const mockToken = { isCancellationRequested: false } as vscode.CancellationToken;
          return task(mockProgress, mockToken);
        });

      await uiManager.showEnhancedProgress(title, mockTask, {
        cancellable: true,
      });

      expect(tokenPassed).toBeDefined();
      expect(mockWithProgress).toHaveBeenCalled();

      mockWithProgress.mockRestore();
    });

    it('should not show estimated time when showEstimatedTime is false', async () => {
      const title = '正在处理...';
      const reportedMessages: string[] = [];

      const mockTask = jest.fn().mockImplementation(async (progress) => {
        progress.report({ message: '步骤1', increment: 50 });
        return 'done';
      });

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (_options, task) => {
          const mockProgress = {
            report: jest.fn((value) => {
              if (value.message) {
                reportedMessages.push(value.message);
              }
            }),
          } as unknown as vscode.Progress<{ message?: string; increment?: number }>;
          const mockToken = { isCancellationRequested: false } as vscode.CancellationToken;
          return task(mockProgress, mockToken);
        });

      await uiManager.showEnhancedProgress(title, mockTask, {
        showEstimatedTime: false,
      });

      // 验证消息不包含剩余时间信息
      const hasTimeEstimate = reportedMessages.some((msg) => msg.includes('剩余'));
      expect(hasTimeEstimate).toBe(false);

      mockWithProgress.mockRestore();
    });

    it('should use default options when not provided', async () => {
      const title = '默认选项任务';
      const mockTask = jest.fn().mockResolvedValue('result');

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (options, task) => {
          // 默认应该是可取消的
          expect(options.cancellable).toBe(true);
          const mockProgress = { report: jest.fn() } as vscode.Progress<{
            message?: string;
            increment?: number;
          }>;
          const mockToken = { isCancellationRequested: false } as vscode.CancellationToken;
          return task(mockProgress, mockToken);
        });

      await uiManager.showEnhancedProgress(title, mockTask);

      expect(mockWithProgress).toHaveBeenCalled();

      mockWithProgress.mockRestore();
    });
  });

  describe('dispose', () => {
    it('should dispose status bar item if it exists', () => {
      const mockDispose = jest.fn();
      (uiManager as any).statusBarItem = {
        dispose: mockDispose,
      };

      uiManager.dispose();

      expect(mockDispose).toHaveBeenCalled();
    });

    it('should not throw error if status bar item does not exist', () => {
      (uiManager as any).statusBarItem = undefined;

      expect(() => uiManager.dispose()).not.toThrow();
    });
  });
});
