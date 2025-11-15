import * as vscode from 'vscode';
import { CommandHandler } from '../services/CommandHandler';
import { ConfigurationManager } from '../services/ConfigurationManager';
import { GitService } from '../services/GitService';
import { LLMService } from '../services/LLMService';
import { UIManager } from '../utils/UIManager';
import { ErrorHandler } from '../utils/ErrorHandler';

/**
 * 集成测试：完整的提交信息生成流程
 * 测试各模块协作是否正确
 */
describe('Integration: Complete Commit Message Generation Flow', () => {
  let commandHandler: CommandHandler;
  let configManager: ConfigurationManager;
  let gitService: GitService;
  let llmService: LLMService;
  let uiManager: UIManager;
  let errorHandler: ErrorHandler;

  let mockContext: unknown;
  let mockSecrets: unknown;
  let mockConfig: unknown;
  let mockGitExtension: unknown;
  let mockGitApi: unknown;
  let mockRepository: unknown;

  // Mock fetch for LLM API calls
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
    };

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
            status: 0, // Modified
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
    };

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

  describe('Successful Flow', () => {
    it('should complete full commit message generation flow', async () => {
      // Mock UI interactions
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

      // Execute the command
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

      // Verify the request body contains the diff
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body as string);
      expect(requestBody.model).toBe('gpt-3.5-turbo');
      expect(requestBody.messages).toHaveLength(2);
      expect(requestBody.messages[0].role).toBe('system');
      expect(requestBody.messages[1].role).toBe('user');
      expect(requestBody.messages[1].content).toContain('src/test.ts');

      // Verify progress was shown
      expect(mockWithProgress).toHaveBeenCalled();

      // Verify commit message was shown to user
      expect(mockShowInputBox).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('编辑提交信息'),
          value: expect.stringContaining('feat(test)'),
          placeHolder: expect.any(String),
        })
      );

      mockShowInputBox.mockRestore();
      mockWithProgress.mockRestore();
    });
  });

  describe('Module Collaboration', () => {
    it('should properly coordinate between all modules', async () => {
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

      // Verify module call order and collaboration
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
});
