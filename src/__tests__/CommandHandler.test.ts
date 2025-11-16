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
    } as unknown as jest.Mocked<GitService>;

    mockLLMService = {
      generateCommitMessage: jest.fn(),
    } as unknown as jest.Mocked<LLMService>;

    mockUIManager = {
      showCommitMessageInput: jest.fn(),
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
    it('should complete full commit message generation and commit successfully', async () => {
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

      mockUIManager.showCommitMessageInput.mockResolvedValue({
        action: 'commit',
        message: 'feat: add test feature',
      });

      // Execute
      await commandHandler.generateCommitMessage();

      // Verify flow
      expect(mockErrorHandler.setRetryCallback).toHaveBeenCalledWith(expect.any(Function));
      expect(mockGitService.isGitRepository).toHaveBeenCalled();
      expect(mockGitService.hasStagedChanges).toHaveBeenCalled();
      expect(mockConfigManager.isConfigured).toHaveBeenCalled();
      expect(mockGitService.getStagedChanges).toHaveBeenCalled();
      expect(mockLLMService.generateCommitMessage).toHaveBeenCalledWith(mockChanges, mockConfig);
      expect(mockUIManager.showCommitMessageInput).toHaveBeenCalledWith('feat: add test feature');
      expect(mockGitService.commitWithMessage).toHaveBeenCalledWith('feat: add test feature');
      expect(mockErrorHandler.setRetryCallback).toHaveBeenCalledWith(null);
    });

    it('should handle regenerate action and generate new message', async () => {
      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(true);
      mockConfigManager.isConfigured.mockResolvedValue(true);
      mockGitService.getStagedChanges.mockResolvedValue(mockChanges);
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);

      // First generation
      mockLLMService.generateCommitMessage
        .mockResolvedValueOnce('feat: first message')
        .mockResolvedValueOnce('feat: second message');

      mockUIManager.showProgress.mockImplementation(async (_message, task) => {
        return task({ report: jest.fn() } as vscode.Progress<{ message?: string }>);
      });

      // User requests regeneration, then commits
      mockUIManager.showCommitMessageInput
        .mockResolvedValueOnce({ action: 'regenerate' })
        .mockResolvedValueOnce({ action: 'commit', message: 'feat: second message' });

      await commandHandler.generateCommitMessage();

      // Verify regeneration happened
      expect(mockLLMService.generateCommitMessage).toHaveBeenCalledTimes(2);
      expect(mockUIManager.showCommitMessageInput).toHaveBeenCalledTimes(2);
      expect(mockGitService.commitWithMessage).toHaveBeenCalledWith('feat: second message');
    });

    it('should handle cancel action and stop flow', async () => {
      mockGitService.isGitRepository.mockReturnValue(true);
      mockGitService.hasStagedChanges.mockReturnValue(true);
      mockConfigManager.isConfigured.mockResolvedValue(true);
      mockGitService.getStagedChanges.mockResolvedValue(mockChanges);
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);
      mockLLMService.generateCommitMessage.mockResolvedValue('feat: test message');

      mockUIManager.showProgress.mockImplementation(async (_message, task) => {
        return task({ report: jest.fn() } as vscode.Progress<{ message?: string }>);
      });

      mockUIManager.showCommitMessageInput.mockResolvedValue({ action: 'cancel' });

      await commandHandler.generateCommitMessage();

      // Verify commit was not called
      expect(mockGitService.commitWithMessage).not.toHaveBeenCalled();
      expect(mockUIManager.showStatusBarMessage).toHaveBeenCalledWith('已取消生成提交信息');
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

    it('should show commit message to user and handle accept action', async () => {
      mockUIManager.showCommitMessageInput.mockResolvedValue({
        action: 'commit',
        message: 'feat: test message',
      });

      await commandHandler.generateCommitMessage();

      expect(mockUIManager.showCommitMessageInput).toHaveBeenCalledWith('feat: test message');
      expect(mockGitService.commitWithMessage).toHaveBeenCalledWith('feat: test message');
    });

    it('should handle multiple regeneration requests', async () => {
      mockLLMService.generateCommitMessage
        .mockResolvedValueOnce('feat: message 1')
        .mockResolvedValueOnce('feat: message 2')
        .mockResolvedValueOnce('feat: message 3');

      mockUIManager.showCommitMessageInput
        .mockResolvedValueOnce({ action: 'regenerate' })
        .mockResolvedValueOnce({ action: 'regenerate' })
        .mockResolvedValueOnce({ action: 'commit', message: 'feat: message 3' });

      await commandHandler.generateCommitMessage();

      expect(mockLLMService.generateCommitMessage).toHaveBeenCalledTimes(3);
      expect(mockUIManager.showCommitMessageInput).toHaveBeenCalledTimes(3);
      expect(mockGitService.commitWithMessage).toHaveBeenCalledWith('feat: message 3');
    });

    it('should show progress indicators during operations', async () => {
      mockUIManager.showCommitMessageInput.mockResolvedValue({
        action: 'commit',
        message: 'feat: test',
      });

      await commandHandler.generateCommitMessage();

      // Progress should be shown for generation and commit
      expect(mockUIManager.showProgress).toHaveBeenCalledWith(
        '正在生成提交信息...',
        expect.any(Function)
      );
      expect(mockUIManager.showProgress).toHaveBeenCalledWith('正在提交...', expect.any(Function));
    });

    it('should show success message after commit', async () => {
      mockUIManager.showCommitMessageInput.mockResolvedValue({
        action: 'commit',
        message: 'feat: test',
      });

      const showInfoSpy = jest
        .spyOn(vscode.window, 'showInformationMessage')
        .mockResolvedValue(undefined);

      await commandHandler.generateCommitMessage();

      expect(showInfoSpy).toHaveBeenCalledWith('✅ 提交成功！');
      expect(mockUIManager.showStatusBarMessage).toHaveBeenCalledWith('✅ 提交成功', 3000);

      showInfoSpy.mockRestore();
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
      expect(mockGitService.commitWithMessage).not.toHaveBeenCalled();
    });

    it('should handle errors during commit', async () => {
      const testError = new Error('Git commit failed');
      mockGitService.getStagedChanges.mockResolvedValue(mockChanges);
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);
      mockLLMService.generateCommitMessage.mockResolvedValue('feat: test');
      mockGitService.commitWithMessage.mockRejectedValue(testError);

      mockUIManager.showProgress.mockImplementation(async (_message, task) => {
        return task({ report: jest.fn() } as vscode.Progress<{ message?: string }>);
      });

      mockUIManager.showCommitMessageInput.mockResolvedValue({
        action: 'commit',
        message: 'feat: test',
      });

      await commandHandler.generateCommitMessage();

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(testError, 'performCommit');
    });

    it('should set and clear retry callback', async () => {
      mockGitService.getStagedChanges.mockResolvedValue(mockChanges);
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);
      mockLLMService.generateCommitMessage.mockResolvedValue('feat: test');

      mockUIManager.showProgress.mockImplementation(async (_message, task) => {
        return task({ report: jest.fn() } as vscode.Progress<{ message?: string }>);
      });

      mockUIManager.showCommitMessageInput.mockResolvedValue({ action: 'cancel' });

      await commandHandler.generateCommitMessage();

      // Verify retry callback was set at start and cleared at end
      expect(mockErrorHandler.setRetryCallback).toHaveBeenCalledWith(expect.any(Function));
      expect(mockErrorHandler.setRetryCallback).toHaveBeenCalledWith(null);
    });

    it('should handle errors in main flow', async () => {
      const testError = new Error('Unexpected error');
      mockGitService.getStagedChanges.mockRejectedValue(testError);
      mockConfigManager.getConfig.mockResolvedValue(mockConfig);

      mockUIManager.showProgress.mockImplementation(async (_message, task) => {
        return task({ report: jest.fn() } as vscode.Progress<{ message?: string }>);
      });

      await commandHandler.generateCommitMessage();

      expect(mockErrorHandler.handleError).toHaveBeenCalledWith(testError, 'generateMessage');
      expect(mockErrorHandler.setRetryCallback).toHaveBeenCalledWith(null);
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
      mockUIManager.showCommitMessageInput.mockResolvedValue({
        action: 'commit',
        message: 'feat: test',
      });

      await commandHandler.generateCommitMessage();

      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('开始生成提交信息', 'CommandHandler');
      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('验证前置条件', 'CommandHandler');
      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('前置条件验证通过', 'CommandHandler');
      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('获取暂存的变更', 'CommandHandler');
      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith(
        '获取到 1 个文件变更',
        'CommandHandler'
      );
      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith(
        '调用LLM服务生成提交信息',
        'CommandHandler'
      );
      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('提交信息生成成功', 'CommandHandler');
      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('执行Git提交', 'CommandHandler');
      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('提交成功', 'CommandHandler');
    });

    it('should log regeneration requests', async () => {
      mockUIManager.showCommitMessageInput
        .mockResolvedValueOnce({ action: 'regenerate' })
        .mockResolvedValueOnce({ action: 'commit', message: 'feat: test' });

      await commandHandler.generateCommitMessage();

      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith(
        '用户请求重新生成提交信息',
        'CommandHandler'
      );
    });

    it('should log cancellation', async () => {
      mockUIManager.showCommitMessageInput.mockResolvedValue({ action: 'cancel' });

      await commandHandler.generateCommitMessage();

      expect(mockErrorHandler.logInfo).toHaveBeenCalledWith('用户取消操作', 'CommandHandler');
    });
  });
});
