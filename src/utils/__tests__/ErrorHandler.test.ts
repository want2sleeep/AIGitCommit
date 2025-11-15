import * as vscode from 'vscode';
import { ErrorHandler } from '../ErrorHandler';
import { ErrorType } from '../../types';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockOutputChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock output channel
    mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    };

    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);

    errorHandler = new ErrorHandler();
  });

  afterEach(() => {
    errorHandler.dispose();
  });

  describe('Error Classification', () => {
    it('should classify configuration errors correctly', async () => {
      const configErrors = [
        new Error('Configuration is missing'),
        new Error('API key is required'),
        new Error('Invalid endpoint URL'),
        new Error('Config validation failed'),
      ];

      for (const error of configErrors) {
        await errorHandler.handleError(error, 'test');

        // Verify error was logged with correct type
        const logCalls = mockOutputChannel.appendLine.mock.calls;
        const typeLog = logCalls.find((call: any[]) => call[0].includes('Type:'));
        expect(typeLog[0]).toContain(ErrorType.ConfigurationError);

        mockOutputChannel.appendLine.mockClear();
      }
    });

    it('should classify Git errors correctly', async () => {
      const gitErrors = [
        new Error('Not a git repository'),
        new Error('No staged changes found'),
        new Error('Git command failed'),
        new Error('Failed to commit changes'),
      ];

      for (const error of gitErrors) {
        await errorHandler.handleError(error, 'test');

        const logCalls = mockOutputChannel.appendLine.mock.calls;
        const typeLog = logCalls.find((call: any[]) => call[0].includes('Type:'));
        expect(typeLog[0]).toContain(ErrorType.GitError);

        mockOutputChannel.appendLine.mockClear();
      }
    });

    it('should classify API errors correctly', async () => {
      const apiErrors = [
        new Error('API call failed with 401'),
        new Error('Unauthorized access'),
        new Error('Rate limit exceeded (429)'),
        new Error('API returned 500 error'),
        new Error('403 Forbidden'),
      ];

      for (const error of apiErrors) {
        await errorHandler.handleError(error, 'test');

        const logCalls = mockOutputChannel.appendLine.mock.calls;
        const typeLog = logCalls.find((call: any[]) => call[0].includes('Type:'));
        expect(typeLog[0]).toContain(ErrorType.APIError);

        mockOutputChannel.appendLine.mockClear();
      }
    });

    it('should classify network errors correctly', async () => {
      const networkErrors = [
        new Error('Network timeout'),
        new Error('ECONNREFUSED'),
        new Error('ENOTFOUND domain.com'),
        new Error('Connection failed'),
      ];

      const lastError = networkErrors[3];
      if (lastError) {
        lastError.name = 'NetworkError';
      }

      for (const error of networkErrors) {
        await errorHandler.handleError(error, 'test');

        const logCalls = mockOutputChannel.appendLine.mock.calls;
        const typeLog = logCalls.find((call: any[]) => call[0].includes('Type:'));
        expect(typeLog[0]).toContain(ErrorType.NetworkError);

        mockOutputChannel.appendLine.mockClear();
      }
    });

    it('should classify unknown errors as UnknownError', async () => {
      const unknownError = new Error('Something unexpected happened');

      await errorHandler.handleError(unknownError, 'test');

      const logCalls = mockOutputChannel.appendLine.mock.calls;
      const typeLog = logCalls.find((call: any[]) => call[0].includes('Type:'));
      expect(typeLog[0]).toContain(ErrorType.UnknownError);
    });
  });

  describe('User-Friendly Messages', () => {
    it('should generate friendly message for API key configuration error', async () => {
      const error = new Error('API key is missing');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('API密钥');
      expect(message).toContain('解决方案');
    });

    it('should generate friendly message for endpoint configuration error', async () => {
      const error = new Error('Invalid endpoint URL');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('API端点');
      expect(message).toContain('解决方案');
    });

    it('should generate friendly message for model configuration error', async () => {
      const error = new Error('Model name is required');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      // The error should be classified as configuration error and contain model-related message
      expect(message).toContain('解决方案');
      expect(message.toLowerCase()).toContain('model');
    });

    it('should generate friendly message for not a git repository error', async () => {
      const error = new Error('Not a git repository');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('Git仓库');
      expect(message).toContain('git init');
    });

    it('should generate friendly message for no staged changes error', async () => {
      const error = new Error('No staged changes');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('暂存区');
      expect(message).toContain('git add');
    });

    it('should generate friendly message for git not found error', async () => {
      const error = new Error('Git not found');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('未找到Git');
      expect(message).toContain('git-scm.com');
    });

    it('should generate friendly message for 401 API error', async () => {
      const error = new Error('API returned 401 Unauthorized');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('401');
      expect(message).toContain('认证失败');
    });

    it('should generate friendly message for 403 API error', async () => {
      const error = new Error('403 Forbidden');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('403');
      expect(message).toContain('访问被拒绝');
    });

    it('should generate friendly message for 429 rate limit error', async () => {
      const error = new Error('Rate limit exceeded (429)');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('429');
      expect(message).toContain('频率超限');
    });

    it('should generate friendly message for 404 API error', async () => {
      const error = new Error('API returned 404 Not Found');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('404');
      expect(message).toContain('不存在');
    });

    it('should generate friendly message for 500 server error', async () => {
      const error = new Error('Server error 500');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('服务器错误');
      expect(message).toContain('5');
    });

    it('should generate friendly message for timeout error', async () => {
      const error = new Error('Request timeout');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('超时');
      expect(message).toContain('网络');
    });

    it('should generate friendly message for ECONNREFUSED error', async () => {
      const error = new Error('ECONNREFUSED');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('连接被拒绝');
      expect(message).toContain('ECONNREFUSED');
    });

    it('should generate friendly message for ENOTFOUND error', async () => {
      const error = new Error('ENOTFOUND api.example.com');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('域名');
      expect(message).toContain('ENOTFOUND');
    });

    it('should generate friendly message for unknown errors', async () => {
      const error = new Error('Something went wrong');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('未知错误');
      expect(message).toContain('Something went wrong');
    });

    it('should include original error message in user-friendly messages', async () => {
      const error = new Error('Specific error details');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('Specific error details');
    });
  });

  describe('Error Actions', () => {
    it('should provide correct actions for configuration errors', async () => {
      const error = new Error('Configuration missing');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const actions = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0].slice(1);
      expect(actions).toContain('打开设置');
      expect(actions).toContain('配置向导');
    });

    it('should provide correct actions for Git errors', async () => {
      const error = new Error('No staged changes');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const actions = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0].slice(1);
      expect(actions).toContain('打开源代码管理');
    });

    it('should provide correct actions for API errors', async () => {
      const error = new Error('API call failed with 401');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const actions = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0].slice(1);
      expect(actions).toContain('重试');
      expect(actions).toContain('查看日志');
    });

    it('should provide correct actions for network errors', async () => {
      const error = new Error('Network timeout');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const actions = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0].slice(1);
      expect(actions).toContain('重试');
      expect(actions).toContain('查看日志');
    });

    it('should provide correct actions for unknown errors', async () => {
      const error = new Error('Unknown error');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const actions = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0].slice(1);
      expect(actions).toContain('查看日志');
    });

    it('should execute open settings action', async () => {
      const error = new Error('Configuration missing');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('打开设置');

      await errorHandler.handleError(error, 'test');

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.openSettings',
        'aigitcommit'
      );
    });

    it('should execute configuration wizard action', async () => {
      const error = new Error('API key missing');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('配置向导');

      await errorHandler.handleError(error, 'test');

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('aigitcommit.configureSettings');
    });

    it('should execute open source control action', async () => {
      const error = new Error('No staged changes');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('打开源代码管理');

      await errorHandler.handleError(error, 'test');

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('workbench.view.scm');
    });

    it('should show output channel for view logs action', async () => {
      const error = new Error('API error');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('查看日志');

      await errorHandler.handleError(error, 'test');

      expect(mockOutputChannel.show).toHaveBeenCalled();
    });

    it('should execute retry callback when retry action selected', async () => {
      const error = new Error('API timeout');
      const retryCallback = jest.fn().mockResolvedValue(undefined);
      errorHandler.setRetryCallback(retryCallback);

      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('重试');

      await errorHandler.handleError(error, 'test');

      expect(retryCallback).toHaveBeenCalled();
    });

    it('should handle retry callback errors gracefully', async () => {
      const error = new Error('API timeout');
      const retryCallback = jest.fn().mockRejectedValue(new Error('Retry failed'));
      errorHandler.setRetryCallback(retryCallback);

      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('重试');

      await errorHandler.handleError(error, 'test');

      expect(retryCallback).toHaveBeenCalled();
      // Should log the retry error
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });

    it('should not execute retry when callback is null', async () => {
      const error = new Error('API timeout');
      errorHandler.setRetryCallback(null);

      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('重试');

      await errorHandler.handleError(error, 'test');

      // Should not throw error
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });
  });

  describe('Logging', () => {
    it('should log error with context and type', async () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      errorHandler.logError(error, 'Test context', ErrorType.APIError);

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const logCalls = mockOutputChannel.appendLine.mock.calls.map((call: any[]) => call[0]);

      expect(logCalls.some((log: string) => log.includes('ERROR'))).toBe(true);
      expect(logCalls.some((log: string) => log.includes('Test context'))).toBe(true);
      expect(logCalls.some((log: string) => log.includes(ErrorType.APIError))).toBe(true);
      expect(logCalls.some((log: string) => log.includes('Test error'))).toBe(true);
      expect(logCalls.some((log: string) => log.includes('Error stack trace'))).toBe(true);
    });

    it('should log error without stack trace', async () => {
      const error = new Error('Test error');
      delete error.stack;

      errorHandler.logError(error, 'Test context');

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const logCalls = mockOutputChannel.appendLine.mock.calls.map((call: any[]) => call[0]);

      expect(logCalls.some((log: string) => log.includes('Test error'))).toBe(true);
    });

    it('should log info messages', () => {
      errorHandler.logInfo('Test info message', 'Test context');

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const logCall = mockOutputChannel.appendLine.mock.calls[0][0];

      expect(logCall).toContain('INFO');
      expect(logCall).toContain('Test context');
      expect(logCall).toContain('Test info message');
    });

    it('should log info messages without context', () => {
      errorHandler.logInfo('Test info message');

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const logCall = mockOutputChannel.appendLine.mock.calls[0][0];

      expect(logCall).toContain('INFO');
      expect(logCall).toContain('Test info message');
    });

    it('should log warning messages', () => {
      errorHandler.logWarning('Test warning', 'Test context');

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const logCall = mockOutputChannel.appendLine.mock.calls[0][0];

      expect(logCall).toContain('WARNING');
      expect(logCall).toContain('Test context');
      expect(logCall).toContain('Test warning');
    });

    it('should log warning messages without context', () => {
      errorHandler.logWarning('Test warning');

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const logCall = mockOutputChannel.appendLine.mock.calls[0][0];

      expect(logCall).toContain('WARNING');
      expect(logCall).toContain('Test warning');
    });

    it('should include timestamp in logs', () => {
      errorHandler.logInfo('Test message');

      const logCall = mockOutputChannel.appendLine.mock.calls[0][0];
      // Check for ISO timestamp format
      expect(logCall).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Output Channel Management', () => {
    it('should create output channel on initialization', () => {
      expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('AI Git Commit');
    });

    it('should show output channel when requested', () => {
      errorHandler.showOutputChannel();

      expect(mockOutputChannel.show).toHaveBeenCalled();
    });

    it('should dispose output channel on cleanup', () => {
      errorHandler.dispose();

      expect(mockOutputChannel.dispose).toHaveBeenCalled();
    });
  });

  describe('Retry Callback Management', () => {
    it('should set retry callback', () => {
      const callback = jest.fn();
      errorHandler.setRetryCallback(callback);

      // Verify by triggering retry
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('重试');
      const error = new Error('API error');

      errorHandler.handleError(error, 'test');
    });

    it('should clear retry callback', () => {
      const callback = jest.fn();
      errorHandler.setRetryCallback(callback);
      errorHandler.setRetryCallback(null);

      // Verify callback is cleared
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('重试');
      const error = new Error('API error');

      errorHandler.handleError(error, 'test');

      // Callback should not be called
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
