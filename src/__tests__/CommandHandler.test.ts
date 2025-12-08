import * as vscode from 'vscode';
import { CommandHandler } from '../services/CommandHandler';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { GitService } from '../services/GitService';
import { LLMService } from '../services/LLMService';
import { UIManager } from '../utils/UIManager';
import { ErrorHandler } from '../utils/ErrorHandler';
import { CommitMessagePreviewManager } from '../services/CommitMessagePreviewManager';
import { ExtensionConfig, GitChange, ChangeStatus } from '../types';

/**
 * CommandHandler单元测试
 * 测试命令处理器的核心功能
 */
describe('CommandHandler', () => {
  let commandHandler: CommandHandler;
  let mockConfigManager: jest.Mocked<ConfigurationManager>;
  let mockGitService: jest.Mocked<GitService>;
  let mockLLMService: jest.Mocked<LLMService>;
  let mockUIManager: jest.Mocked<UIManager>;
  let mockErrorHandler: jest.Mocked<ErrorHandler>;

  const mockConfig: ExtensionConfig = {
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: 'test-api-key',
    modelName: 'gpt-3.5-turbo',
    language: 'zh-CN',
    commitFormat: 'conventional',
    maxTokens: 500,
    temperature: 0.7,
  };

  const mockChanges: GitChange[] = [
    {
      path: 'src/test.ts',
      status: ChangeStatus.Modified,
      diff: '+console.log("test")',
      additions: 1,
      deletions: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock vscode.workspace.getConfiguration for ConfigurationInterceptor
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'autoRedirectToConfiguration') {
          return true;
        }
        return defaultValue;
      }),
    });

    // Create mocked services
    mockConfigManager = {
      isConfigured: jest.fn(),
      validateConfig: jest.fn(),
      getConfig: jest.fn(),
      showConfigurationWizard: jest.fn(),
      getApiKey: jest.fn().mockResolvedValue('test-api-key'),
      getProvider: jest.fn().mockReturnValue('openai'),
    } as unknown as jest.Mocked<ConfigurationManager>;

    mockGitService = {
      isGitRepository: jest.fn(),
      hasStagedChanges: jest.fn(),
      getStagedChanges: jest.fn(),
      commitWithMessage: jest.fn(),
      setCommitMessage: jest.fn(),
    } as unknown as jest.Mocked<GitService>;

    mockLLMService = {
      generateCommitMessage: jest.fn(),
    } as unknown as jest.Mocked<LLMService>;

    mockUIManager = {
      showProgress: jest.fn(),
      showEnhancedProgress: jest.fn(),
      showError: jest.fn(),
      showStatusBarMessage: jest.fn(),
    } as unknown as jest.Mocked<UIManager>;

    mockErrorHandler = {
      handleError: jest.fn(),
      setRetryCallback: jest.fn(),
      logInfo: jest.fn(),
      logError: jest.fn(),
      logWarning: jest.fn(),
    } as unknown as jest.Mocked<ErrorHandler>;

    const mockPreviewManager = {
      showPreview: jest.fn().mockImplementation(async (message: string) => message),
      dispose: jest.fn(),
    } as unknown as jest.Mocked<CommitMessagePreviewManager>;

    commandHandler = new CommandHandler(
      mockConfigManager,
      mockGitService,
      mockLLMService,
      mockUIManager,
      mockErrorHandler,
      mockPreviewManager
    );
  });

  describe('generateCommitMessage - Complete Flow', () => {
    it('should complete full commit message generation and set message in SCM input box', async () => {
      // Setup mocks for successful flow
      // Ensure configuration is valid
      mockConfigManager.getApiKey = jest.fn().mockResolvedValue('test-api-key');
      mockConfigManager.getProvider = jest.fn().mockReturnValue('openai');
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);

      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(true);
      mockGitService.getStagedChanges.mockResolvedValue(mockChanges);
      mockLLMService.generateCommitMessage.mockResolvedValue('feat: add test feature');

      // Mock UI interactions
      mockUIManager.showEnhancedProgress.mockImplementation(async (_message, task) => {
        const mockProgress = { report: jest.fn() } as vscode.Progress<{ message?: string }>;
        const mockToken = { isCancellationRequested: false } as vscode.CancellationToken;
        return task(mockProgress, mockToken);
      });

      // Execute
      await commandHandler.generateCommitMessage();

      // Verify flow
      expect(mockGitService.isGitRepository).toHaveBeenCalled();
      expect(mockGitService.hasStagedChanges).toHaveBeenCalled();
      expect(mockGitService.getStagedChanges).toHaveBeenCalled();
      expect(mockLLMService.generateCommitMessage).toHaveBeenCalledWith(mockChanges, mockConfig);
      expect(mockGitService.setCommitMessage).toHaveBeenCalledWith('feat: add test feature');
      expect(mockUIManager.showStatusBarMessage).toHaveBeenCalledWith(
        expect.stringContaining('提交信息已生成'),
        3000
      );
    });
  });

  describe('Prerequisite Validation', () => {
    it('should fail when not a git repository', async () => {
      // Ensure configuration is valid so we reach Git validation
      mockConfigManager.getApiKey = jest.fn().mockResolvedValue('test-api-key');
      mockConfigManager.getProvider = jest.fn().mockReturnValue('openai');
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);

      mockGitService.isGitRepository.mockReturnValue(false);
      mockUIManager.showError.mockResolvedValue('打开源代码管理');

      const executeCommandSpy = jest
        .spyOn(vscode.commands, 'executeCommand')
        .mockResolvedValue(undefined);

      await commandHandler.generateCommitMessage();

      expect(mockUIManager.showError).toHaveBeenCalledWith(
        '当前工作区不是Git仓库',
        '打开源代码管理'
      );
      expect(executeCommandSpy).toHaveBeenCalledWith('workbench.view.scm');
      expect(mockGitService.getStagedChanges).not.toHaveBeenCalled();

      executeCommandSpy.mockRestore();
    });

    it('should fail when no staged changes', async () => {
      // Ensure configuration is valid so we reach Git validation
      mockConfigManager.getApiKey = jest.fn().mockResolvedValue('test-api-key');
      mockConfigManager.getProvider = jest.fn().mockReturnValue('openai');
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);

      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(false);
      mockUIManager.showError.mockResolvedValue(undefined);

      await commandHandler.generateCommitMessage();

      expect(mockUIManager.showError).toHaveBeenCalledWith(
        '暂存区没有变更。请先使用 git add 暂存要提交的文件。',
        '打开源代码管理'
      );
      expect(mockGitService.getStagedChanges).not.toHaveBeenCalled();
    });

    it('should fail when configuration is invalid', async () => {
      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(true);
      // Mock configuration as not configured (empty API key)
      mockConfigManager.getApiKey = jest.fn().mockResolvedValue('');
      mockConfigManager.showConfigurationWizard.mockResolvedValue(false);

      await commandHandler.generateCommitMessage();

      // Configuration interceptor should open wizard
      expect(mockConfigManager.showConfigurationWizard).toHaveBeenCalled();
      // Should not proceed to get staged changes
      expect(mockGitService.getStagedChanges).not.toHaveBeenCalled();
    });

    it('should open configuration wizard when not configured', async () => {
      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(true);
      // Mock configuration as not configured
      mockConfigManager.getApiKey = jest.fn().mockResolvedValue('');
      mockConfigManager.showConfigurationWizard.mockResolvedValue(true);

      await commandHandler.generateCommitMessage();

      // Configuration interceptor should open wizard
      expect(mockConfigManager.showConfigurationWizard).toHaveBeenCalled();
      // Should not proceed to get staged changes
      expect(mockGitService.getStagedChanges).not.toHaveBeenCalled();
    });
  });

  describe('User Interaction Flow', () => {
    beforeEach(() => {
      // Setup valid prerequisites
      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(true);
      mockConfigManager.isConfigured.mockResolvedValue(true);
      mockGitService.getStagedChanges.mockResolvedValue(mockChanges);
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);
      mockLLMService.generateCommitMessage.mockResolvedValue('feat: test message');

      mockUIManager.showEnhancedProgress.mockImplementation(async (_message, task) => {
        const mockProgress = { report: jest.fn() } as vscode.Progress<{ message?: string }>;
        const mockToken = { isCancellationRequested: false } as vscode.CancellationToken;
        return task(mockProgress, mockToken);
      });
    });

    it('should show progress indicators during operations', async () => {
      await commandHandler.generateCommitMessage();

      // Progress should be shown for generation
      expect(mockUIManager.showEnhancedProgress).toHaveBeenCalledWith(
        '正在生成提交信息...',
        expect.any(Function),
        expect.objectContaining({
          cancellable: true,
          showEstimatedTime: true,
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(true);
      mockConfigManager.isConfigured.mockResolvedValue(true);
    });

    it('should handle errors during message generation', async () => {
      const testError = new Error('LLM API failed');
      mockGitService.getStagedChanges.mockResolvedValue(mockChanges);
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);
      mockLLMService.generateCommitMessage.mockRejectedValue(testError);

      mockUIManager.showEnhancedProgress.mockImplementation(async (_message, task) => {
        const mockProgress = { report: jest.fn() } as vscode.Progress<{ message?: string }>;
        const mockToken = { isCancellationRequested: false } as vscode.CancellationToken;
        return task(mockProgress, mockToken);
      });

      await commandHandler.generateCommitMessage();

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(testError, 'generateMessage');
      expect(mockGitService.setCommitMessage).not.toHaveBeenCalled();
    });

    it('should handle empty changes array', async () => {
      mockGitService.getStagedChanges.mockResolvedValue([]);
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);

      mockUIManager.showEnhancedProgress.mockImplementation(async (_message, task) => {
        const mockProgress = { report: jest.fn() } as vscode.Progress<{ message?: string }>;
        const mockToken = { isCancellationRequested: false } as vscode.CancellationToken;
        return task(mockProgress, mockToken);
      });

      await commandHandler.generateCommitMessage();

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: '暂存区没有变更' }),
        'generateMessage'
      );
    });
  });

  describe('Logging', () => {
    beforeEach(() => {
      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(true);
      mockConfigManager.isConfigured.mockResolvedValue(true);
      mockGitService.getStagedChanges.mockResolvedValue(mockChanges);
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);
      mockLLMService.generateCommitMessage.mockResolvedValue('feat: test');

      mockUIManager.showEnhancedProgress.mockImplementation(async (_message, task) => {
        const mockProgress = { report: jest.fn() } as vscode.Progress<{ message?: string }>;
        const mockToken = { isCancellationRequested: false } as vscode.CancellationToken;
        return task(mockProgress, mockToken);
      });
    });

    it('should log key steps during execution', async () => {
      await commandHandler.generateCommitMessage();

      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('开始生成提交信息', 'CommandHandler');
      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith(
        '提交信息已填充到SCM输入框',
        'CommandHandler'
      );
    });
  });
});
