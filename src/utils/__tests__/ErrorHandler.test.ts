import * as vscode from 'vscode';
import { ErrorHandler } from '../ErrorHandler';
import { ErrorType } from '../../types';
import { Ii18nService } from '../../services/i18nService';

// 创建 mock i18n 服务，返回中文消息
const createMockI18nService = (): Ii18nService => {
  const translations: Record<string, string> = {
    // 配置错误
    'error.config.apiKeyMissing.title': '❌ API密钥未配置',
    'error.config.apiKeyMissing.reason': '原因：未找到有效的API密钥配置',
    'error.config.apiKeyMissing.solutions': '解决方案：\n1. 打开设置配置API密钥\n2. 运行配置向导',
    'error.config.endpointInvalid.title': '❌ API端点配置无效',
    'error.config.endpointInvalid.reason': '原因：API端点URL格式不正确',
    'error.config.endpointInvalid.solutions':
      '解决方案：\n1. 检查API端点URL格式\n2. 确保URL以http://或https://开头',
    'error.config.modelMissing.title': '❌ 模型未配置',
    'error.config.modelMissing.reason': '原因：未指定要使用的model模型',
    'error.config.modelMissing.solutions':
      '解决方案：\n1. 在设置中配置模型名称\n2. 运行配置向导选择模型',
    'error.config.general.title': '❌ 配置错误',
    'error.config.general.reason': '原因：配置验证失败',
    'error.config.general.solutions': '解决方案：\n1. 检查配置项是否完整\n2. 运行配置向导重新配置',
    // Git 错误
    'error.git.notRepository.title': '❌ 非Git仓库',
    'error.git.notRepository.reason': '原因：当前目录不是Git仓库',
    'error.git.notRepository.solutions':
      '解决方案：\n1. 运行 git init 初始化仓库\n2. 打开一个Git仓库目录',
    'error.git.noChanges.title': '❌ 暂存区为空',
    'error.git.noChanges.reason': '原因：没有已暂存的更改',
    'error.git.noChanges.solutions':
      '解决方案：\n1. 使用 git add 添加文件到暂存区\n2. 在源代码管理中暂存更改',
    'error.git.notFound.title': '❌ 未找到Git',
    'error.git.notFound.reason': '原因：系统中未安装Git',
    'error.git.notFound.solutions':
      '解决方案：\n1. 从 git-scm.com 下载安装Git\n2. 确保Git已添加到系统PATH',
    'error.git.general.title': '❌ Git错误',
    'error.git.general.reason': '原因：Git操作失败',
    'error.git.general.solutions': '解决方案：\n1. 检查Git仓库状态\n2. 查看日志获取详细信息',
    // API 错误
    'error.api.401.title': '❌ 401 认证失败',
    'error.api.401.reason': '原因：API密钥无效或已过期',
    'error.api.401.solutions': '解决方案：\n1. 检查API密钥是否正确\n2. 重新生成API密钥',
    'error.api.403.title': '❌ 403 访问被拒绝',
    'error.api.403.reason': '原因：没有访问该资源的权限',
    'error.api.403.solutions': '解决方案：\n1. 检查API密钥权限\n2. 确认账户状态正常',
    'error.api.404.title': '❌ 404 资源不存在',
    'error.api.404.reason': '原因：请求的API端点或模型不存在',
    'error.api.404.solutions': '解决方案：\n1. 检查API端点URL\n2. 确认模型名称正确',
    'error.api.429.title': '❌ 429 频率超限',
    'error.api.429.reason': '原因：API请求频率超过限制',
    'error.api.429.solutions': '解决方案：\n1. 等待一段时间后重试\n2. 检查API配额使用情况',
    'error.api.5xx.title': '❌ 5xx 服务器错误',
    'error.api.5xx.reason': '原因：API服务器内部错误',
    'error.api.5xx.solutions': '解决方案：\n1. 稍后重试\n2. 检查API服务状态',
    'error.api.general.title': '❌ API调用失败',
    'error.api.general.reason': '原因：API请求失败',
    'error.api.general.solutions': '解决方案：\n1. 检查网络连接\n2. 查看日志获取详细信息',
    // 网络错误
    'error.network.timeout.title': '❌ 请求超时',
    'error.network.timeout.reason': '原因：网络请求超时',
    'error.network.timeout.solutions': '解决方案：\n1. 检查网络连接\n2. 稍后重试',
    'error.network.refused.title': '❌ 连接被拒绝',
    'error.network.refused.reason': '原因：无法连接到服务器 (ECONNREFUSED)',
    'error.network.refused.solutions':
      '解决方案：\n1. 检查服务器地址是否正确\n2. 确认服务器正在运行',
    'error.network.notFound.title': '❌ 域名解析失败',
    'error.network.notFound.reason': '原因：无法解析域名 (ENOTFOUND)',
    'error.network.notFound.solutions': '解决方案：\n1. 检查API端点URL\n2. 检查网络连接',
    'error.network.general.title': '❌ 网络连接失败',
    'error.network.general.reason': '原因：网络连接出现问题',
    'error.network.general.solutions': '解决方案：\n1. 检查网络连接\n2. 检查防火墙设置',
    // 未知错误
    'error.unknown.title': '❌ 未知错误',
    'error.unknown.reason': '原因：发生了未预期的错误',
    'error.unknown.solutions': '解决方案：\n1. 查看日志获取详细信息\n2. 重试操作',
    // 操作按钮
    'error.action.openSettings': '打开设置',
    'error.action.configWizard': '配置向导',
    'error.action.openScm': '打开源代码管理',
    'error.action.viewLogs': '查看日志',
    'error.action.retry': '重试',
  };

  return {
    t: (key: string, params?: Record<string, string | number>): string => {
      let result = translations[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
        // 如果有 message 参数，追加到结果中
        if (params['message'] && !result.includes(String(params['message']))) {
          result += `\n详情：${params['message']}`;
        }
      }
      return result;
    },
    getCurrentLanguage: () => 'zh-CN',
    setLanguage: jest.fn(),
    getSupportedLanguages: () => ['zh-CN', 'en-US'],
    loadLanguageResources: jest.fn().mockResolvedValue(undefined),
  };
};

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockOutputChannel: any;
  let mockI18nService: Ii18nService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock output channel
    mockOutputChannel = {
      appendLine: jest.fn(),
      show: jest.fn(),
      dispose: jest.fn(),
    };

    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);

    // 创建带有 i18n 服务的 ErrorHandler
    mockI18nService = createMockI18nService();
    errorHandler = new ErrorHandler(mockI18nService);
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
    it('should set retry callback', async () => {
      const callback = jest.fn().mockResolvedValue(undefined);
      errorHandler.setRetryCallback(callback);

      // Verify by triggering retry
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('重试');
      const error = new Error('API error');

      await errorHandler.handleError(error, 'test');

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(callback).toHaveBeenCalled();
    });

    it('should clear retry callback', async () => {
      const callback = jest.fn().mockResolvedValue(undefined);
      errorHandler.setRetryCallback(callback);
      errorHandler.setRetryCallback(null);

      // Verify callback is cleared
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('重试');
      const error = new Error('API error');

      await errorHandler.handleError(error, 'test');

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Callback should not be called
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Additional Coverage', () => {
    it('should handle error classification with mixed case keywords', async () => {
      const errors = [
        new Error('Configuration Error'),
        new Error('GIT Repository not found'),
        new Error('API Error occurred'),
        new Error('NETWORK timeout'),
      ];

      const expectedTypes = [
        ErrorType.ConfigurationError,
        ErrorType.GitError,
        ErrorType.APIError,
        ErrorType.NetworkError,
      ];

      for (let i = 0; i < errors.length; i++) {
        const error = errors[i];
        const expectedType = expectedTypes[i];
        if (!error || !expectedType) continue;

        await errorHandler.handleError(error, 'test');

        const logCalls = mockOutputChannel.appendLine.mock.calls;
        const typeLog = logCalls.find((call: any[]) => call[0].includes('Type:'));
        expect(typeLog[0]).toContain(expectedType);

        mockOutputChannel.appendLine.mockClear();
      }
    });

    it('should handle errors with multiple matching keywords', async () => {
      const error = new Error('Git configuration error in repository');
      await errorHandler.handleError(error, 'test');

      const logCalls = mockOutputChannel.appendLine.mock.calls;
      const typeLog = logCalls.find((call: any[]) => call[0].includes('Type:'));
      // Should classify as configuration error (checked first)
      expect(typeLog[0]).toContain(ErrorType.ConfigurationError);
    });

    it('should handle error when user dismisses action dialog', async () => {
      const error = new Error('Configuration missing');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      // Should not throw error when user dismisses
      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    });

    it('should handle errors with empty messages', async () => {
      const error = new Error('');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('未知错误');
    });

    it('should handle errors without error name property', async () => {
      const error = new Error('Test error');
      delete (error as any).name;

      await errorHandler.handleError(error, 'test');

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });

    it('should classify errors with API status codes in different formats', async () => {
      const errors = [
        new Error('Error 401'),
        new Error('Status: 403'),
        new Error('HTTP 429'),
        new Error('Code 500'),
      ];

      for (const error of errors) {
        await errorHandler.handleError(error, 'test');

        const logCalls = mockOutputChannel.appendLine.mock.calls;
        const typeLog = logCalls.find((call: any[]) => call[0].includes('Type:'));
        expect(typeLog[0]).toContain(ErrorType.APIError);

        mockOutputChannel.appendLine.mockClear();
      }
    });

    it('should handle generic configuration error message', async () => {
      const error = new Error('Configuration validation failed');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('配置错误');
      expect(message).toContain('Configuration validation failed');
    });

    it('should handle generic git error message', async () => {
      const error = new Error('Git operation failed');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('Git错误');
      expect(message).toContain('Git operation failed');
    });

    it('should handle generic API error message', async () => {
      const error = new Error('API request failed');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('API调用失败');
      expect(message).toContain('API request failed');
    });

    it('should handle generic network error message', async () => {
      const error = new Error('Network connection failed');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('网络连接失败');
    });

    it('should handle 502 and 503 server errors', async () => {
      const errors = [
        new Error('API error 502 Bad Gateway'),
        new Error('API returned 503 Service Unavailable'),
      ];

      for (const error of errors) {
        (vscode.window.showErrorMessage as jest.Mock).mockClear();
        await errorHandler.handleError(error, 'test');

        const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
        expect(message).toContain('服务器错误');
        expect(message).toContain('5');
      }
    });

    it('should log retry operation info when retry is triggered', async () => {
      const error = new Error('API timeout');
      const retryCallback = jest.fn().mockResolvedValue(undefined);
      errorHandler.setRetryCallback(retryCallback);

      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('重试');

      await errorHandler.handleError(error, 'test');

      // Should log retry info
      const logCalls = mockOutputChannel.appendLine.mock.calls.map((call: any[]) => call[0]);
      expect(logCalls.some((log: string) => log.includes('重试'))).toBe(true);
    });

    it('should handle unknown action gracefully', async () => {
      const error = new Error('Test error');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Unknown Action');

      await errorHandler.handleError(error, 'test');

      // Should not throw error or execute any command
      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
      expect(mockOutputChannel.show).not.toHaveBeenCalled();
    });

    it('should classify error by name when message is generic', async () => {
      const error = new Error('Something went wrong');
      error.name = 'NetworkError';

      await errorHandler.handleError(error, 'test');

      const logCalls = mockOutputChannel.appendLine.mock.calls;
      const typeLog = logCalls.find((call: any[]) => call[0].includes('Type:'));
      expect(typeLog[0]).toContain(ErrorType.NetworkError);
    });

    it('should handle errors with special characters in message', async () => {
      const error = new Error('Error: API key "test@123" is invalid!');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      const message = (vscode.window.showErrorMessage as jest.Mock).mock.calls[0][0];
      expect(message).toContain('API密钥');
    });

    it('should handle very long error messages', async () => {
      const longMessage = 'Error: ' + 'x'.repeat(1000);
      const error = new Error(longMessage);
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });

    it('should handle errors with newlines in message', async () => {
      const error = new Error('Line 1\nLine 2\nLine 3');
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue(undefined);

      await errorHandler.handleError(error, 'test');

      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
    });

    it('should handle multiple sequential errors', async () => {
      const errors = [new Error('Error 1'), new Error('Error 2'), new Error('Error 3')];

      for (const error of errors) {
        await errorHandler.handleError(error, 'test');
      }

      // All errors should be logged
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      const logCalls = mockOutputChannel.appendLine.mock.calls;
      expect(logCalls.length).toBeGreaterThan(errors.length);
    });
  });
});
