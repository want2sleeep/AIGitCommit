import * as vscode from 'vscode';
import { CommandHandler } from '../services/CommandHandler';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { GitService } from '../services/GitService';
import { LLMService } from '../services/LLMService';
import { UIManager } from '../utils/UIManager';
import { ErrorHandler } from '../utils/ErrorHandler';

/**
 * Integration Tests
 * Tests complete workflows and module collaboration
 */
describe('Integration Tests', () => {
  let commandHandler: CommandHandler;
  let configManager: ConfigurationManager;
  let gitService: GitService;
  let llmService: LLMService;
  let uiManager: UIManager;
  let errorHandler: ErrorHandler;

  let mockContext: vscode.ExtensionContext;
  let mockSecrets: { get: jest.Mock; store: jest.Mock; delete: jest.Mock };
  let mockConfig: { get: jest.Mock; update: jest.Mock };
  let mockGitExtension: vscode.Extension<unknown>;
  let mockGitApi: { repositories: unknown[] };
  let mockRepository: {
    state: { indexChanges: unknown[]; workingTreeChanges: unknown[] };
    rootUri: vscode.Uri;
    show: jest.Mock;
    diff: jest.Mock;
    commit: jest.Mock;
  };
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock secrets storage
    mockSecrets = {
      get: jest.fn().mockResolvedValue('test-api-key'),
      store: jest.fn(),
      delete: jest.fn(),
    };

    // Setup mock extension context
    mockContext = {
      secrets: mockSecrets,
      subscriptions: [],
      extensionPath: '/test/path',
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as vscode.ExtensionContext;

    // Setup mock configuration
    mockConfig = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        const configs: Record<string, unknown> = {
          apiEndpoint: 'https://api.openai.com/v1',
          apiKey: '',
          modelName: 'gpt-3.5-turbo',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 500,
          temperature: 0.7,
          provider: 'openai',
        };
        return configs[key] !== undefined ? configs[key] : defaultValue;
      }),
      update: jest.fn(),
    };

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

    // Setup mock workspace.fs
    (vscode.workspace as unknown as { fs: unknown }).fs = {
      stat: jest.fn().mockResolvedValue({ size: 1024 }),
    };

    // Setup mock Git repository
    mockRepository = {
      state: {
        indexChanges: [
          {
            uri: vscode.Uri.file('/test/repo/src/test.ts'),
            status: 0,
            originalUri: vscode.Uri.file('/test/repo/src/test.ts'),
          },
        ],
        workingTreeChanges: [],
      },
      rootUri: vscode.Uri.file('/test/repo'),
      show: jest
        .fn()
        .mockResolvedValueOnce("export function hello() {\n    console.log('Hello');\n}")
        .mockResolvedValueOnce(
          "export function hello() {\n    console.log('Hello World');\n}\n\nexport function goodbye() {\n    console.log('Goodbye');\n}"
        ),
      diff: jest.fn().mockResolvedValue(`diff --git a/src/test.ts b/src/test.ts
index 1234567..abcdefg 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,5 +1,8 @@
 export function hello() {
-    console.log('Hello');
+    console.log('Hello World');
+}
+
+export function goodbye() {
+    console.log('Goodbye');
 }`),
      commit: jest.fn().mockResolvedValue(undefined),
    };

    mockGitApi = {
      repositories: [mockRepository],
    };

    mockGitExtension = {
      isActive: true,
      exports: {
        getAPI: jest.fn().mockReturnValue(mockGitApi),
      },
      activate: jest.fn().mockResolvedValue({
        getAPI: jest.fn().mockReturnValue(mockGitApi),
      }),
    } as unknown as vscode.Extension<unknown>;

    (vscode.extensions.getExtension as jest.Mock).mockReturnValue(mockGitExtension);

    // Setup mock fetch for LLM API
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                'feat(test): add goodbye function and update hello message\n\n- Modified hello function to print "Hello World"\n- Added new goodbye function',
            },
          },
        ],
      }),
    });
    global.fetch = mockFetch as unknown as typeof fetch;

    // Initialize services
    configManager = new ConfigurationManager(mockContext as vscode.ExtensionContext);
    gitService = new GitService();
    llmService = new LLMService();
    errorHandler = new ErrorHandler();
    uiManager = new UIManager();
    commandHandler = new CommandHandler(
      configManager,
      gitService,
      llmService,
      uiManager,
      errorHandler
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Test 1: Complete Commit Message Generation Flow
   */
  describe('Complete Commit Message Generation Flow', () => {
    it('should successfully generate and commit message', async () => {
      const mockShowInputBox = jest
        .spyOn(vscode.window, 'showInputBox')
        .mockResolvedValue(
          'feat(test): add goodbye function and update hello message\n\n- Modified hello function to print "Hello World"\n- Added new goodbye function'
        );

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (_options, task) => {
          return task({ report: jest.fn() }, {
            isCancellationRequested: false,
          } as vscode.CancellationToken);
        });

      const mockShowInformationMessage = jest
        .spyOn(vscode.window, 'showInformationMessage')
        .mockResolvedValue(undefined);

      await commandHandler.generateCommitMessage();

      // Verify configuration was loaded
      expect(mockSecrets).toHaveProperty('get');
      expect((mockSecrets as { get: jest.Mock }).get).toHaveBeenCalledWith('aigitcommit.apiKey');

      // Verify Git extension was accessed
      expect(vscode.extensions.getExtension).toHaveBeenCalledWith('vscode.git');

      // Verify LLM API was called
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          }),
          body: expect.any(String),
        })
      );

      // Verify commit message was shown to user
      expect(mockShowInputBox).toHaveBeenCalled();

      // Verify commit was executed
      expect(mockRepository.commit).toHaveBeenCalledWith(expect.stringContaining('feat(test)'));

      // Verify success message
      expect(mockShowInformationMessage).toHaveBeenCalledWith(expect.stringContaining('提交成功'));

      mockShowInputBox.mockRestore();
      mockWithProgress.mockRestore();
      mockShowInformationMessage.mockRestore();
    });

    it('should handle user cancellation during message editing', async () => {
      const mockShowInputBox = jest
        .spyOn(vscode.window, 'showInputBox')
        .mockResolvedValue(undefined);

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (_options, task) => {
          return task({ report: jest.fn() }, {
            isCancellationRequested: false,
          } as vscode.CancellationToken);
        });

      await commandHandler.generateCommitMessage();

      // Verify commit was not executed
      expect(mockRepository.commit).not.toHaveBeenCalled();

      mockShowInputBox.mockRestore();
      mockWithProgress.mockRestore();
    });

    it('should coordinate all modules in correct order', async () => {
      const configSpy = jest.spyOn(configManager, 'getConfig');
      const validateSpy = jest.spyOn(configManager, 'validateConfig');
      const gitChangesSpy = jest.spyOn(gitService, 'getStagedChanges');
      const llmGenerateSpy = jest.spyOn(llmService, 'generateCommitMessage');

      jest.spyOn(vscode.window, 'showInputBox').mockResolvedValue('test message');
      jest.spyOn(vscode.window, 'withProgress').mockImplementation(async (_options, task) => {
        return task({ report: jest.fn() }, {
          isCancellationRequested: false,
        } as vscode.CancellationToken);
      });

      await commandHandler.generateCommitMessage();

      // Verify module call order
      expect(configSpy).toHaveBeenCalled();
      expect(validateSpy).toHaveBeenCalled();
      expect(gitChangesSpy).toHaveBeenCalled();
      expect(llmGenerateSpy).toHaveBeenCalled();

      configSpy.mockRestore();
      validateSpy.mockRestore();
      gitChangesSpy.mockRestore();
      llmGenerateSpy.mockRestore();
    });
  });

  /**
   * Test 2: Configuration Wizard Flow
   */
  describe('Configuration Wizard Flow', () => {
    it('should complete configuration wizard successfully', async () => {
      const mockShowInformationMessage = jest
        .spyOn(vscode.window, 'showInformationMessage')
        .mockResolvedValueOnce('开始配置' as never)
        .mockResolvedValueOnce('测试连接' as never);

      const mockShowInputBox = jest
        .spyOn(vscode.window, 'showInputBox')
        .mockResolvedValueOnce('https://api.openai.com/v1')
        .mockResolvedValueOnce('sk-test-key-12345')
        .mockResolvedValueOnce('gpt-4');

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (_options, task) => {
          return task({ report: jest.fn() }, {
            isCancellationRequested: false,
          } as vscode.CancellationToken);
        });

      // Mock axios for API connection test
      const mockAxios = {
        default: {
          post: jest.fn().mockResolvedValue({ status: 200 }),
        },
      };
      jest.mock('axios', () => mockAxios);

      const result = await configManager.showConfigurationWizard();

      expect(result).toBe(true);
      expect(mockShowInputBox).toHaveBeenCalledTimes(3);
      expect(mockConfig.update).toHaveBeenCalledWith('apiEndpoint', 'https://api.openai.com/v1');
      expect(mockConfig.update).toHaveBeenCalledWith('modelName', 'gpt-4');
      expect(mockSecrets.store).toHaveBeenCalledWith('aigitcommit.apiKey', 'sk-test-key-12345');

      mockShowInformationMessage.mockRestore();
      mockShowInputBox.mockRestore();
      mockWithProgress.mockRestore();
    });

    it('should handle user cancellation during wizard', async () => {
      const mockShowInformationMessage = jest
        .spyOn(vscode.window, 'showInformationMessage')
        .mockResolvedValueOnce('开始配置' as never);

      const mockShowInputBox = jest
        .spyOn(vscode.window, 'showInputBox')
        .mockResolvedValueOnce(undefined);

      const result = await configManager.showConfigurationWizard();

      expect(result).toBe(false);
      expect(mockConfig.update).not.toHaveBeenCalled();

      mockShowInformationMessage.mockRestore();
      mockShowInputBox.mockRestore();
    });

    it('should validate configuration inputs', async () => {
      const mockShowInformationMessage = jest
        .spyOn(vscode.window, 'showInformationMessage')
        .mockResolvedValueOnce('开始配置' as never)
        .mockResolvedValueOnce('跳过' as never);

      const mockShowInputBox = jest
        .spyOn(vscode.window, 'showInputBox')
        .mockImplementation(async (options) => {
          if (options?.validateInput) {
            // Test invalid URL
            const urlError = options.validateInput('invalid-url');
            expect(urlError).toBeTruthy();

            // Test empty API key
            const keyError = options.validateInput('');
            expect(keyError).toBeTruthy();
          }
          return 'https://api.openai.com/v1';
        });

      await configManager.showConfigurationWizard();

      mockShowInformationMessage.mockRestore();
      mockShowInputBox.mockRestore();
    });
  });

  /**
   * Test 3: Error Recovery Flow
   */
  describe('Error Recovery Flow', () => {
    it('should recover from API rate limit error with retry', async () => {
      let callCount = 0;
      mockFetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject({
            response: {
              status: 429,
              data: { error: { message: 'Rate limit exceeded' } },
            },
            isAxiosError: true,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'feat: test commit' } }],
          }),
        });
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const mockShowInputBox = jest
        .spyOn(vscode.window, 'showInputBox')
        .mockResolvedValue('feat: test commit');

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (_options, task) => {
          return task({ report: jest.fn() }, {
            isCancellationRequested: false,
          } as vscode.CancellationToken);
        });

      await commandHandler.generateCommitMessage();

      // Verify retry occurred
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockRepository.commit).toHaveBeenCalled();

      mockShowInputBox.mockRestore();
      mockWithProgress.mockRestore();
    });

    it('should handle configuration error and show wizard', async () => {
      (mockSecrets as { get: jest.Mock }).get.mockResolvedValue('');

      const mockShowErrorMessage = jest
        .spyOn(vscode.window, 'showErrorMessage')
        .mockResolvedValue('配置向导' as never);

      const mockShowInformationMessage = jest
        .spyOn(vscode.window, 'showInformationMessage')
        .mockResolvedValue('取消' as never);

      await commandHandler.generateCommitMessage();

      expect(mockShowErrorMessage).toHaveBeenCalled();
      expect(mockShowInformationMessage).toHaveBeenCalled();

      mockShowErrorMessage.mockRestore();
      mockShowInformationMessage.mockRestore();
    });

    it('should handle Git error when no staged changes', async () => {
      mockRepository.state.indexChanges = [];

      const mockShowErrorMessage = jest
        .spyOn(vscode.window, 'showErrorMessage')
        .mockResolvedValue(undefined as never);

      await commandHandler.generateCommitMessage();

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('暂存区没有变更'),
        expect.any(String)
      );

      mockShowErrorMessage.mockRestore();
    });

    it('should handle network error with proper error message', async () => {
      mockFetch = jest.fn().mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused',
        isAxiosError: true,
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const mockShowInputBox = jest
        .spyOn(vscode.window, 'showInputBox')
        .mockResolvedValue(undefined);

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (_options, task) => {
          return task({ report: jest.fn() }, {
            isCancellationRequested: false,
          } as vscode.CancellationToken);
        });

      const mockShowErrorMessage = jest
        .spyOn(vscode.window, 'showErrorMessage')
        .mockResolvedValue(undefined as never);

      await commandHandler.generateCommitMessage();

      expect(mockShowErrorMessage).toHaveBeenCalled();

      mockShowInputBox.mockRestore();
      mockWithProgress.mockRestore();
      mockShowErrorMessage.mockRestore();
    });

    it('should handle API authentication error', async () => {
      mockFetch = jest.fn().mockRejectedValue({
        response: {
          status: 401,
          data: { error: { message: 'Invalid API key' } },
        },
        isAxiosError: true,
      });
      global.fetch = mockFetch as unknown as typeof fetch;

      const mockShowInputBox = jest
        .spyOn(vscode.window, 'showInputBox')
        .mockResolvedValue(undefined);

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (_options, task) => {
          return task({ report: jest.fn() }, {
            isCancellationRequested: false,
          } as vscode.CancellationToken);
        });

      const mockShowErrorMessage = jest
        .spyOn(vscode.window, 'showErrorMessage')
        .mockResolvedValue(undefined as never);

      await commandHandler.generateCommitMessage();

      expect(mockShowErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('API认证失败'),
        expect.any(String),
        expect.any(String)
      );

      mockShowInputBox.mockRestore();
      mockWithProgress.mockRestore();
      mockShowErrorMessage.mockRestore();
    });
  });

  /**
   * Test 4: End-to-End Module Integration
   */
  describe('End-to-End Module Integration', () => {
    it('should integrate ConfigurationManager with LLMService', async () => {
      const config = await configManager.getConfig();
      const changes = await gitService.getStagedChanges();

      const message = await llmService.generateCommitMessage(changes, config);

      expect(message).toBeTruthy();
      expect(message).toContain('feat(test)');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(config.apiEndpoint),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${config.apiKey}`,
          }),
        })
      );
    });

    it('should integrate GitService with CommandHandler', async () => {
      const hasStagedChanges = gitService.hasStagedChanges();
      expect(hasStagedChanges).toBe(true);

      const changes = await gitService.getStagedChanges();
      expect(changes).toHaveLength(1);
      expect(changes[0]?.path).toContain('test.ts');
    });

    it('should integrate ErrorHandler with all services', async () => {
      const logSpy = jest.spyOn(errorHandler, 'logError');

      mockFetch = jest.fn().mockRejectedValue(new Error('Test error'));
      global.fetch = mockFetch as unknown as typeof fetch;

      const mockShowInputBox = jest
        .spyOn(vscode.window, 'showInputBox')
        .mockResolvedValue(undefined);

      const mockWithProgress = jest
        .spyOn(vscode.window, 'withProgress')
        .mockImplementation(async (_options, task) => {
          return task({ report: jest.fn() }, {
            isCancellationRequested: false,
          } as vscode.CancellationToken);
        });

      jest.spyOn(vscode.window, 'showErrorMessage').mockResolvedValue(undefined as never);

      await commandHandler.generateCommitMessage();

      expect(logSpy).toHaveBeenCalled();

      mockShowInputBox.mockRestore();
      mockWithProgress.mockRestore();
      logSpy.mockRestore();
    });
  });

  /**
   * Test 5: Configuration Migration Flow
   */
  describe('Configuration Migration Flow', () => {
    it('should migrate API key from settings to SecretStorage', async () => {
      mockConfig.get = jest.fn((key: string) => {
        if (key === 'apiKey') return 'old-api-key';
        return '';
      });

      await configManager.migrateConfiguration();

      expect(mockSecrets.store).toHaveBeenCalledWith('aigitcommit.apiKey', 'old-api-key');
      expect(mockConfig.update).toHaveBeenCalledWith(
        'apiKey',
        undefined,
        vscode.ConfigurationTarget.Global
      );
    });

    it('should infer provider from API endpoint', async () => {
      mockConfig.get = jest.fn((key: string) => {
        if (key === 'apiEndpoint') return 'https://api.openai.com/v1';
        if (key === 'provider') return undefined;
        return '';
      });

      await configManager.migrateConfiguration();

      expect(mockConfig.update).toHaveBeenCalledWith(
        'provider',
        'openai',
        vscode.ConfigurationTarget.Global
      );
    });
  });
});
