import * as vscode from 'vscode';
import { CommandHandler } from '../services/CommandHandler';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { GitService } from '../services/GitService';
import { LLMService } from '../services/LLMService';
import { UIManager } from '../utils/UIManager';
import { ErrorHandler } from '../utils/ErrorHandler';
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

    // Create mocked services
    mockConfigManager = {
      isConfigured: jest.fn(),
      validateConfig: jest.fn(),
      getConfig: jest.fn(),
      showConfigurationWizard: jest.fn(),
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

    commandHandler = new CommandHandler(
      mockConfigManager,
      mockGitService,
      mockLLMService,
      mockUIManager,
      mockErrorHandler
    );
  });

  describe('generateCommitMessage - Complete Flow', () => {
    it('should complete full commit message generation and set message in SCM input box', async () => {
      // Setup mocks for successful flow
      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(true);
      mockConfigManager.isConfigured.mockResolvedValue(true);
      mockGitService.getStagedChanges.mockResolvedValue(mockChanges);
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);
      mockLLMService.generateCommitMessage.mockResolvedValue('feat: add test feature');

      // Mock UI interactions
      mockUIManager.showProgress.mockImplementation(async (_message, task) => {
        return task({ report: jest.fn() } as vscode.Progress<{ message?: string }>);
      });

      // Execute
      await commandHandler.generateCommitMessage();

      // Verify flow
      expect(mockGitService.isGitRepository).toHaveBeenCalled();
      expect(mockGitService.hasStagedChanges).toHaveBeenCalled();
      expect(mockConfigManager.isConfigured).toHaveBeenCalled();
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
      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(false);
      mockUIManager.showError.mockResolvedValue(undefined);

      await commandHandler.generateCommitMessage();

      expect(mockUIManager.showError).toHaveBeenCalledWith(
        '暂存区没有变更。请先使用 git add 暂存要提交的文件。',
        '打开源代码管理'
      );
      expect(mockConfigManager.isConfigured).not.toHaveBeenCalled();
    });

    it('should fail when configuration is invalid', async () => {
      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(true);
      mockConfigManager.isConfigured.mockResolvedValue(false);
      mockConfigManager.validateConfig.mockResolvedValue({
        valid: false,
        errors: ['API密钥未配置', '模型名称无效'],
      });
      mockUIManager.showError.mockResolvedValue('配置向导');

      await commandHandler.generateCommitMessage();

      expect(mockConfigManager.validateConfig).toHaveBeenCalled();
      expect(mockUIManager.showError).toHaveBeenCalledWith(
        expect.stringContaining('配置无效'),
        '配置向导',
        '打开设置'
      );
      expect(mockConfigManager.showConfigurationWizard).toHaveBeenCalled();
      expect(mockGitService.getStagedChanges).not.toHaveBeenCalled();
    });

    it('should open settings when user selects that option', async () => {
      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(true);
      mockConfigManager.isConfigured.mockResolvedValue(false);
      mockConfigManager.validateConfig.mockResolvedValue({
        valid: false,
        errors: ['配置错误'],
      });
      mockUIManager.showError.mockResolvedValue('打开设置');

      const executeCommandSpy = jest
        .spyOn(vscode.commands, 'executeCommand')
        .mockResolvedValue(undefined);

      await commandHandler.generateCommitMessage();

      expect(executeCommandSpy).toHaveBeenCalledWith(
        'workbench.action.openSettings',
        'aigitcommit'
      );

      executeCommandSpy.mockRestore();
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

      mockUIManager.showProgress.mockImplementation(async (_message, task) => {
        return task({ report: jest.fn() } as vscode.Progress<{ message?: string }>);
      });
    });

    it('should show progress indicators during operations', async () => {
      await commandHandler.generateCommitMessage();

      // Progress should be shown for generation
      expect(mockUIManager.showProgress).toHaveBeenCalledWith(
        '正在生成提交信息...',
        expect.any(Function)
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

      mockUIManager.showProgress.mockImplementation(async (_message, task) => {
        return task({ report: jest.fn() } as vscode.Progress<{ message?: string }>);
      });

      await commandHandler.generateCommitMessage();

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(testError, 'generateMessage');
      expect(mockGitService.setCommitMessage).not.toHaveBeenCalled();
    });

    it('should handle empty changes array', async () => {
      mockGitService.getStagedChanges.mockResolvedValue([]);
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);

      mockUIManager.showProgress.mockImplementation(async (_message, task) => {
        return task({ report: jest.fn() } as vscode.Progress<{ message?: string }>);
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

      mockUIManager.showProgress.mockImplementation(async (_message, task) => {
        return task({ report: jest.fn() } as vscode.Progress<{ message?: string }>);
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
