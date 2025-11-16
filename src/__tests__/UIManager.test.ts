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

  describe('showCommitMessageInput', () => {
    it('should return commit action when user accepts message', async () => {
      const initialMessage = 'feat: add new feature';
      const mockQuickPick = jest.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
        label: '$(check) 接受并提交',
        description: '使用生成的提交信息',
        detail: initialMessage,
      } as vscode.QuickPickItem);

      const result = await uiManager.showCommitMessageInput(initialMessage);

      expect(mockQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ label: expect.stringContaining('接受并提交') }),
        ]),
        expect.objectContaining({
          placeHolder: '选择操作',
          title: 'AI生成的提交信息',
        })
      );
      expect(result).toEqual({ action: 'commit', message: initialMessage });

      mockQuickPick.mockRestore();
    });

    it('should return commit action with edited message when user edits', async () => {
      const initialMessage = 'feat: add feature';
      const editedMessage = 'feat: add new feature with tests';

      const mockQuickPick = jest.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
        label: '$(edit) 编辑后提交',
        description: '修改提交信息后再提交',
      } as vscode.QuickPickItem);

      const mockInputBox = jest
        .spyOn(vscode.window, 'showInputBox')
        .mockResolvedValue(editedMessage);

      const result = await uiManager.showCommitMessageInput(initialMessage);

      expect(mockInputBox).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: '编辑提交信息',
          value: initialMessage,
          placeHolder: '输入提交信息',
          validateInput: expect.any(Function),
        })
      );
      expect(result).toEqual({ action: 'commit', message: editedMessage });

      mockQuickPick.mockRestore();
      mockInputBox.mockRestore();
    });

    it('should validate edited message is not empty', async () => {
      const initialMessage = 'feat: add feature';

      const mockQuickPick = jest.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
        label: '$(edit) 编辑后提交',
        description: '修改提交信息后再提交',
      } as vscode.QuickPickItem);

      let validateFunction: ((value: string) => string | null) | undefined;
      const mockInputBox = jest
        .spyOn(vscode.window, 'showInputBox')
        .mockImplementation((options) => {
          validateFunction = options?.validateInput as (value: string) => string | null;
          return Promise.resolve('valid message');
        });

      await uiManager.showCommitMessageInput(initialMessage);

      expect(validateFunction).toBeDefined();
      expect(validateFunction!('')).toBe('提交信息不能为空');
      expect(validateFunction!('   ')).toBe('提交信息不能为空');
      expect(validateFunction!('valid message')).toBeNull();

      mockQuickPick.mockRestore();
      mockInputBox.mockRestore();
    });

    it('should return cancel when user cancels edit', async () => {
      const initialMessage = 'feat: add feature';

      const mockQuickPick = jest.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
        label: '$(edit) 编辑后提交',
        description: '修改提交信息后再提交',
      } as vscode.QuickPickItem);

      const mockInputBox = jest.spyOn(vscode.window, 'showInputBox').mockResolvedValue(undefined);

      const result = await uiManager.showCommitMessageInput(initialMessage);

      expect(result).toEqual({ action: 'cancel' });

      mockQuickPick.mockRestore();
      mockInputBox.mockRestore();
    });

    it('should return regenerate action when user requests regeneration', async () => {
      const initialMessage = 'feat: add feature';

      const mockQuickPick = jest.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
        label: '$(refresh) 重新生成',
        description: '生成新的提交信息',
      } as vscode.QuickPickItem);

      const result = await uiManager.showCommitMessageInput(initialMessage);

      expect(result).toEqual({ action: 'regenerate' });

      mockQuickPick.mockRestore();
    });

    it('should return cancel action when user cancels', async () => {
      const initialMessage = 'feat: add feature';

      const mockQuickPick = jest.spyOn(vscode.window, 'showQuickPick').mockResolvedValue({
        label: '$(close) 取消',
        description: '放弃此次操作',
      } as vscode.QuickPickItem);

      const result = await uiManager.showCommitMessageInput(initialMessage);

      expect(result).toEqual({ action: 'cancel' });

      mockQuickPick.mockRestore();
    });

    it('should return cancel when user dismisses quick pick', async () => {
      const initialMessage = 'feat: add feature';

      const mockQuickPick = jest.spyOn(vscode.window, 'showQuickPick').mockResolvedValue(undefined);

      const result = await uiManager.showCommitMessageInput(initialMessage);

      expect(result).toEqual({ action: 'cancel' });

      mockQuickPick.mockRestore();
    });
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
