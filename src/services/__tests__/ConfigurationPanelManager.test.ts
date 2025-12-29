import * as vscode from 'vscode';
import { ConfigurationPanelManager } from '../ConfigurationPanelManager';
import { ConfigurationManager } from '../ConfigurationManager';
import { ProviderManager } from '../ProviderManager';
import { CustomCandidatesManager } from '../CustomCandidatesManager';

describe('ConfigurationPanelManager', () => {
  let panelManager: ConfigurationPanelManager;
  let mockContext: any;
  let mockConfigManager: jest.Mocked<ConfigurationManager>;
  let mockProviderManager: jest.Mocked<ProviderManager>;
  let mockCandidatesManager: jest.Mocked<CustomCandidatesManager>;
  let mockPanel: any;
  let mockWebview: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance
    (ConfigurationPanelManager as any).instance = undefined;

    // Default mock for getFullConfig (can be overridden in specific tests)
    const defaultConfig = {
      provider: 'openai',
      apiKey: 'test-key',
      apiEndpoint: 'https://api.openai.com/v1',
      modelName: 'gpt-3.5-turbo',
      language: 'zh-CN',
      commitFormat: 'conventional',
      maxTokens: 500,
      temperature: 0.7,
    };

    // Mock webview
    mockWebview = {
      html: '',
      postMessage: jest.fn(),
      onDidReceiveMessage: jest.fn(),
      cspSource: 'vscode-resource:',
      asWebviewUri: jest.fn((uri) => uri),
    };

    // Mock webview panel
    mockPanel = {
      webview: mockWebview,
      reveal: jest.fn(),
      dispose: jest.fn(),
      onDidDispose: jest.fn((callback) => {
        // Store callback for later invocation
        mockPanel._disposeCallback = callback;
        return { dispose: jest.fn() };
      }),
      _disposeCallback: null as any,
    };

    // Mock vscode.window.createWebviewPanel
    (vscode.window as any).createWebviewPanel = jest.fn(() => mockPanel);

    // Mock extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/path',
      secrets: {
        get: jest.fn(),
        store: jest.fn(),
        delete: jest.fn(),
      },
      globalState: {
        get: jest.fn(),
        update: jest.fn(),
      },
      workspaceState: {
        get: jest.fn(),
        update: jest.fn(),
      },
    };

    // Mock ConfigurationManager
    mockConfigManager = {
      getFullConfig: jest.fn().mockResolvedValue(defaultConfig),
      saveFullConfig: jest.fn(),
      getConfig: jest.fn(),
      validateConfig: jest.fn(),
      updateConfig: jest.fn(),
      storeApiKey: jest.fn(),
      getApiKey: jest.fn(),
      deleteApiKey: jest.fn(),
      isConfigured: jest.fn(),
      getProvider: jest.fn(),
      setProvider: jest.fn(),
      getConfigSummary: jest.fn(),
      migrateConfiguration: jest.fn(),
      getCustomBaseUrls: jest.fn(() => []),
      getCustomModelNames: jest.fn(() => []),
      addCustomBaseUrl: jest.fn(),
      addCustomModelName: jest.fn(),
    } as any;

    // Mock ProviderManager
    mockProviderManager = {
      getProviders: jest.fn(() => [
        {
          id: 'openai',
          name: 'OpenAI',
          defaultBaseUrl: 'https://api.openai.com/v1',
          defaultModel: 'gpt-3.5-turbo',
          description: 'OpenAI官方API服务',
        },
        {
          id: 'qwen',
          name: 'Qwen (通义千问)',
          defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          defaultModel: 'qwen-turbo',
          description: '阿里云通义千问API服务',
        },
        {
          id: 'ollama',
          name: 'Ollama',
          defaultBaseUrl: 'http://localhost:11434/v1',
          defaultModel: 'llama2',
          description: '本地Ollama服务',
        },
        {
          id: 'vllm',
          name: 'vLLM',
          defaultBaseUrl: 'http://localhost:8000/v1',
          defaultModel: 'meta-llama/Llama-2-7b-chat-hf',
          description: '本地vLLM服务',
        },
        {
          id: 'openai-compatible',
          name: 'OpenAI Compatible',
          defaultBaseUrl: '',
          defaultModel: '',
          description: '自定义OpenAI兼容服务',
        },
      ]),
      getProviderById: jest.fn(),
      getDefaultConfig: jest.fn(),
    } as any;

    // Mock CustomCandidatesManager
    mockCandidatesManager = {
      saveCustomBaseUrl: jest.fn().mockResolvedValue({ success: true, retries: 0, added: true }),
      saveCustomModelName: jest.fn().mockResolvedValue({ success: true, retries: 0, added: true }),
      removeCustomBaseUrl: jest.fn().mockResolvedValue({ success: true, removed: true }),
      removeCustomModelName: jest.fn().mockResolvedValue({ success: true, removed: true }),
      validateBaseUrl: jest.fn().mockReturnValue({ valid: true }),
      validateModelName: jest.fn().mockReturnValue({ valid: true }),
    } as any;

    panelManager = ConfigurationPanelManager.getInstance(
      mockContext,
      mockConfigManager,
      mockProviderManager,
      mockCandidatesManager
    );
  });

  describe('showPanel', () => {
    beforeEach(() => {
      // Mock getFullConfig for showPanel
      mockConfigManager.getFullConfig.mockResolvedValue({
        provider: 'openai',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        modelName: 'gpt-3.5-turbo',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
      });
    });

    it('should create a new webview panel', async () => {
      await panelManager.showPanel();

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'aigitcommitConfig',
        'AI Git Commit 配置',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [],
        }
      );
    });

    it('should set webview HTML content', async () => {
      await panelManager.showPanel();

      expect(mockWebview.html).toBeTruthy();
      expect(mockWebview.html).toContain('AI Git Commit 配置');
      expect(mockWebview.html).toContain('provider-selector');
      expect(mockWebview.html).toContain('api-key');
      expect(mockWebview.html).toContain('base-url');
      expect(mockWebview.html).toContain('model-name');
    });

    it('should register message handler', async () => {
      await panelManager.showPanel();

      expect(mockWebview.onDidReceiveMessage).toHaveBeenCalled();
    });

    it('should register dispose handler', async () => {
      await panelManager.showPanel();

      expect(mockPanel.onDidDispose).toHaveBeenCalled();
    });

    it('should load current configuration on panel creation', async () => {
      mockConfigManager.getFullConfig.mockResolvedValue({
        provider: 'openai',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        modelName: 'gpt-3.5-turbo',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
      });

      await panelManager.showPanel();

      expect(mockConfigManager.getFullConfig).toHaveBeenCalled();
    });

    it('should reveal existing panel instead of creating new one', async () => {
      await panelManager.showPanel();
      const firstCallCount = (vscode.window.createWebviewPanel as jest.Mock).mock.calls.length;

      await panelManager.showPanel();

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(firstCallCount);
      expect(mockPanel.reveal).toHaveBeenCalledWith(vscode.ViewColumn.One);
    });

    it('should include CSP in HTML content', async () => {
      await panelManager.showPanel();

      expect(mockWebview.html).toContain('Content-Security-Policy');
      expect(mockWebview.html).toContain('nonce-');
    });

    it('should include all provider options in HTML', async () => {
      await panelManager.showPanel();

      expect(mockWebview.html).toContain('value="openai"');
      expect(mockWebview.html).toContain('value="qwen"');
      expect(mockWebview.html).toContain('value="ollama"');
      expect(mockWebview.html).toContain('value="vllm"');
      expect(mockWebview.html).toContain('value="openai-compatible"');
    });
  });

  describe('handleMessage', () => {
    let messageHandler: (message: any) => Promise<void>;

    beforeEach(async () => {
      await panelManager.showPanel();
      messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    });

    describe('load command', () => {
      it('should load current configuration', async () => {
        mockConfigManager.getFullConfig.mockResolvedValue({
          provider: 'openai',
          apiKey: 'test-key',
          apiEndpoint: 'https://api.openai.com/v1',
          modelName: 'gpt-3.5-turbo',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 500,
          temperature: 0.7,
        });

        await messageHandler({ command: 'load' });

        expect(mockConfigManager.getFullConfig).toHaveBeenCalled();
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'loadConfig',
          data: {
            provider: 'openai',
            apiKey: 'test-key',
            baseUrl: 'https://api.openai.com/v1',
            modelName: 'gpt-3.5-turbo',
          },
        });
      });

      it('should show error message when loading fails', async () => {
        mockConfigManager.getFullConfig.mockRejectedValue(new Error('Load failed'));

        await messageHandler({ command: 'load' });

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          expect.stringContaining('加载配置失败')
        );
      });
    });

    describe('save command', () => {
      it('should save valid configuration', async () => {
        mockConfigManager.getFullConfig.mockResolvedValue({
          provider: 'openai',
          apiKey: 'old-key',
          apiEndpoint: 'https://api.openai.com/v1',
          modelName: 'gpt-3.5-turbo',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 500,
          temperature: 0.7,
        });

        const configData = {
          provider: 'qwen',
          apiKey: 'new-key',
          baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          modelName: 'qwen-turbo',
        };

        await messageHandler({ command: 'save', data: configData });

        expect(mockConfigManager.saveFullConfig).toHaveBeenCalledWith({
          provider: 'qwen',
          apiKey: 'new-key',
          apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          modelName: 'qwen-turbo',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 500,
          temperature: 0.7,
        });
      });

      it('should send success message after saving', async () => {
        mockConfigManager.getFullConfig.mockResolvedValue({
          provider: 'openai',
          apiKey: 'test-key',
          apiEndpoint: 'https://api.openai.com/v1',
          modelName: 'gpt-3.5-turbo',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 500,
          temperature: 0.7,
        });

        const configData = {
          provider: 'openai',
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
          modelName: 'gpt-3.5-turbo',
        };

        await messageHandler({ command: 'save', data: configData });

        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'saveResult',
          data: {
            success: true,
            message: '配置已成功保存',
          },
        });
        expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('配置已成功保存');
      });

      it('should reject invalid configuration with empty API key', async () => {
        const configData = {
          provider: 'openai',
          apiKey: '',
          baseUrl: 'https://api.openai.com/v1',
          modelName: 'gpt-3.5-turbo',
        };

        await messageHandler({ command: 'save', data: configData });

        expect(mockConfigManager.saveFullConfig).not.toHaveBeenCalled();
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'saveResult',
          data: {
            success: false,
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'apiKey',
                message: 'API密钥不能为空',
              }),
            ]),
          },
        });
      });

      it('should reject invalid configuration with empty base URL', async () => {
        const configData = {
          provider: 'openai',
          apiKey: 'test-key',
          baseUrl: '',
          modelName: 'gpt-3.5-turbo',
        };

        await messageHandler({ command: 'save', data: configData });

        expect(mockConfigManager.saveFullConfig).not.toHaveBeenCalled();
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'saveResult',
          data: {
            success: false,
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'baseUrl',
                message: 'Base URL不能为空',
              }),
            ]),
          },
        });
      });

      it('should reject invalid configuration with invalid URL format', async () => {
        const configData = {
          provider: 'openai',
          apiKey: 'test-key',
          baseUrl: 'not-a-valid-url',
          modelName: 'gpt-3.5-turbo',
        };

        await messageHandler({ command: 'save', data: configData });

        expect(mockConfigManager.saveFullConfig).not.toHaveBeenCalled();
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'saveResult',
          data: {
            success: false,
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'baseUrl',
                message: 'Base URL格式无效，必须是有效的URL',
              }),
            ]),
          },
        });
      });

      it('should reject invalid configuration with empty model name', async () => {
        const configData = {
          provider: 'openai',
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
          modelName: '',
        };

        await messageHandler({ command: 'save', data: configData });

        expect(mockConfigManager.saveFullConfig).not.toHaveBeenCalled();
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'saveResult',
          data: {
            success: false,
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'modelName',
                message: '模型名称不能为空',
              }),
            ]),
          },
        });
      });

      it('should handle multiple validation errors', async () => {
        const configData = {
          provider: 'openai',
          apiKey: '',
          baseUrl: '',
          modelName: '',
        };

        await messageHandler({ command: 'save', data: configData });

        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'saveResult',
          data: {
            success: false,
            errors: expect.arrayContaining([
              expect.objectContaining({ field: 'apiKey' }),
              expect.objectContaining({ field: 'baseUrl' }),
              expect.objectContaining({ field: 'modelName' }),
            ]),
          },
        });
      });

      it('should show error message when saving fails', async () => {
        mockConfigManager.getFullConfig.mockResolvedValue({
          provider: 'openai',
          apiKey: 'test-key',
          apiEndpoint: 'https://api.openai.com/v1',
          modelName: 'gpt-3.5-turbo',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 500,
          temperature: 0.7,
        });
        mockConfigManager.saveFullConfig.mockRejectedValue(new Error('Save failed'));

        const configData = {
          provider: 'openai',
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
          modelName: 'gpt-3.5-turbo',
        };

        await messageHandler({ command: 'save', data: configData });

        expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
          expect.stringContaining('保存配置失败')
        );
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'saveResult',
          data: {
            success: false,
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'general',
                message: expect.stringContaining('保存配置失败'),
              }),
            ]),
          },
        });
      });
    });

    describe('validate command', () => {
      it('should validate configuration and return result', async () => {
        const configData = {
          provider: 'openai',
          apiKey: 'test-key',
          baseUrl: 'https://api.openai.com/v1',
          modelName: 'gpt-3.5-turbo',
        };

        await messageHandler({ command: 'validate', data: configData });

        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'validationResult',
          data: {
            valid: true,
            errors: [],
            confirmations: expect.arrayContaining([
              '✅ 配置验证通过',
              '✅ 提供商: openai',
              '✅ 模型: gpt-3.5-turbo',
              '💡 配置已准备就绪，可以保存',
            ]),
          },
        });
      });

      it('should return validation errors for invalid configuration', async () => {
        const configData = {
          provider: 'openai',
          apiKey: '',
          baseUrl: 'invalid-url',
          modelName: '',
        };

        await messageHandler({ command: 'validate', data: configData });

        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'validationResult',
          data: {
            valid: false,
            errors: expect.arrayContaining([
              expect.objectContaining({ field: 'apiKey' }),
              expect.objectContaining({ field: 'baseUrl' }),
              expect.objectContaining({ field: 'modelName' }),
            ]),
          },
        });
      });
    });

    describe('providerChanged command', () => {
      it('should update defaults when provider changes to OpenAI', async () => {
        mockProviderManager.getDefaultConfig.mockReturnValue({
          baseUrl: 'https://api.openai.com/v1',
          modelName: 'gpt-3.5-turbo',
        });

        await messageHandler({ command: 'providerChanged', data: { provider: 'openai' } });

        expect(mockProviderManager.getDefaultConfig).toHaveBeenCalledWith('openai');
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'updateDefaults',
          data: {
            baseUrl: 'https://api.openai.com/v1',
            modelName: 'gpt-3.5-turbo',
          },
        });
      });

      it('should update defaults when provider changes to Azure OpenAI', async () => {
        mockProviderManager.getDefaultConfig.mockReturnValue({
          baseUrl: 'https://<your-resource>.openai.azure.com',
          modelName: 'gpt-35-turbo',
        });

        await messageHandler({ command: 'providerChanged', data: { provider: 'qwen' } });

        expect(mockProviderManager.getDefaultConfig).toHaveBeenCalledWith('qwen');
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'updateDefaults',
          data: {
            baseUrl: 'https://<your-resource>.openai.azure.com',
            modelName: 'gpt-35-turbo',
          },
        });
      });

      it('should update defaults when provider changes to Ollama', async () => {
        mockProviderManager.getDefaultConfig.mockReturnValue({
          baseUrl: 'http://localhost:11434/v1',
          modelName: 'llama2',
        });

        await messageHandler({ command: 'providerChanged', data: { provider: 'ollama' } });

        expect(mockProviderManager.getDefaultConfig).toHaveBeenCalledWith('ollama');
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'updateDefaults',
          data: {
            baseUrl: 'http://localhost:11434/v1',
            modelName: 'llama2',
          },
        });
      });

      it('should clear defaults when provider changes to openai-compatible', async () => {
        mockProviderManager.getDefaultConfig.mockReturnValue({
          baseUrl: '',
          modelName: '',
        });

        await messageHandler({
          command: 'providerChanged',
          data: { provider: 'openai-compatible', currentBaseUrl: '', currentModelName: '' },
        });

        expect(mockProviderManager.getDefaultConfig).toHaveBeenCalledWith('openai-compatible');
        // For openai-compatible, should send updateInputControls instead of updateDefaults
        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'updateInputControls',
          data: expect.objectContaining({
            baseUrl: '',
            modelName: '',
            baseUrlHtml: expect.any(String),
            modelNameHtml: expect.any(String),
          }),
        });
      });
    });
  });

  describe('loadCurrentConfig', () => {
    it('should load and post configuration to webview', async () => {
      mockConfigManager.getFullConfig.mockResolvedValue({
        provider: 'qwen',
        apiKey: 'qwen-key',
        apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        modelName: 'gpt-4',
        language: 'en-US',
        commitFormat: 'simple',
        maxTokens: 1000,
        temperature: 0.5,
      });

      await panelManager.showPanel();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'loadConfig',
        data: {
          provider: 'qwen',
          apiKey: 'qwen-key',
          baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          modelName: 'gpt-4',
        },
      });
    });

    it('should handle errors when loading configuration', async () => {
      mockConfigManager.getFullConfig.mockRejectedValue(new Error('Config load error'));

      // showPanel will throw if config loading fails
      await expect(panelManager.showPanel()).rejects.toThrow('Config load error');
    });
  });

  describe('saveConfig', () => {
    let messageHandler: (message: any) => Promise<void>;

    beforeEach(async () => {
      await panelManager.showPanel();
      messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    });

    it('should merge new config with existing config', async () => {
      mockConfigManager.getFullConfig.mockResolvedValue({
        provider: 'openai',
        apiKey: 'old-key',
        apiEndpoint: 'https://api.openai.com/v1',
        modelName: 'gpt-3.5-turbo',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
      });

      const newConfig = {
        provider: 'ollama',
        apiKey: 'new-key',
        baseUrl: 'http://localhost:11434/v1',
        modelName: 'llama2',
      };

      await messageHandler({ command: 'save', data: newConfig });

      expect(mockConfigManager.saveFullConfig).toHaveBeenCalledWith({
        provider: 'ollama',
        apiKey: 'new-key',
        apiEndpoint: 'http://localhost:11434/v1',
        modelName: 'llama2',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
      });
    });
  });

  describe('validateConfig', () => {
    let messageHandler: (message: any) => Promise<void>;

    beforeEach(async () => {
      await panelManager.showPanel();
      messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    });

    it('should validate API key is not empty', async () => {
      const config = {
        provider: 'openai',
        apiKey: '   ',
        baseUrl: 'https://api.openai.com/v1',
        modelName: 'gpt-3.5-turbo',
      };

      await messageHandler({ command: 'validate', data: config });

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'validationResult',
        data: {
          valid: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'apiKey',
              message: 'API密钥不能为空',
            }),
          ]),
        },
      });
    });

    it('should validate base URL is not empty', async () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        baseUrl: '   ',
        modelName: 'gpt-3.5-turbo',
      };

      await messageHandler({ command: 'validate', data: config });

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'validationResult',
        data: {
          valid: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'baseUrl',
              message: 'Base URL不能为空',
            }),
          ]),
        },
      });
    });

    it('should validate base URL format', async () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        baseUrl: 'ftp://invalid.com',
        modelName: 'gpt-3.5-turbo',
      };

      await messageHandler({ command: 'validate', data: config });

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'validationResult',
        data: {
          valid: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'baseUrl',
              message: 'Base URL格式无效，必须是有效的URL',
            }),
          ]),
        },
      });
    });

    it('should validate model name is not empty', async () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
        modelName: '   ',
      };

      await messageHandler({ command: 'validate', data: config });

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'validationResult',
        data: {
          valid: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'modelName',
              message: '模型名称不能为空',
            }),
          ]),
        },
      });
    });

    it('should accept valid http URLs', async () => {
      const config = {
        provider: 'ollama',
        apiKey: 'test-key',
        baseUrl: 'http://localhost:11434/v1',
        modelName: 'llama2',
      };

      await messageHandler({ command: 'validate', data: config });

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'validationResult',
        data: {
          valid: true,
          errors: [],
          confirmations: expect.arrayContaining([
            '✅ 配置验证通过',
            '✅ 提供商: ollama',
            '✅ 模型: llama2',
            '💡 配置已准备就绪，可以保存',
          ]),
        },
      });
    });

    it('should accept valid https URLs', async () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
        modelName: 'gpt-3.5-turbo',
      };

      await messageHandler({ command: 'validate', data: config });

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'validationResult',
        data: {
          valid: true,
          errors: [],
          confirmations: expect.arrayContaining([
            '✅ 配置验证通过',
            '✅ 提供商: openai',
            '✅ 模型: gpt-3.5-turbo',
            '💡 配置已准备就绪，可以保存',
          ]),
        },
      });
    });
  });

  describe('panel lifecycle', () => {
    it('should clean up panel reference on dispose', async () => {
      await panelManager.showPanel();

      // Trigger dispose callback
      if (mockPanel._disposeCallback) {
        mockPanel._disposeCallback();
      }

      // Show panel again should create new panel
      await panelManager.showPanel();

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
    });

    it('should dispose panel when dispose is called', async () => {
      await panelManager.showPanel();

      panelManager.dispose();

      expect(mockPanel.dispose).toHaveBeenCalled();
    });

    it('should handle dispose when panel does not exist', () => {
      // Don't create panel
      expect(() => panelManager.dispose()).not.toThrow();
    });
  });

  describe('singleton pattern', () => {
    it('should return same instance on multiple getInstance calls', () => {
      const instance1 = ConfigurationPanelManager.getInstance(
        mockContext,
        mockConfigManager,
        mockProviderManager,
        mockCandidatesManager
      );
      const instance2 = ConfigurationPanelManager.getInstance(
        mockContext,
        mockConfigManager,
        mockProviderManager,
        mockCandidatesManager
      );

      expect(instance1).toBe(instance2);
    });
  });

  describe('message handling edge cases', () => {
    let messageHandler: (message: any) => Promise<void>;

    beforeEach(async () => {
      await panelManager.showPanel();
      messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    });

    it('should handle save command with missing data', async () => {
      await messageHandler({ command: 'save' });

      expect(mockConfigManager.saveFullConfig).not.toHaveBeenCalled();
    });

    it('should handle save command with incomplete data', async () => {
      await messageHandler({ command: 'save', data: { provider: 'openai' } });

      expect(mockConfigManager.saveFullConfig).not.toHaveBeenCalled();
    });

    it('should handle validate command with missing data', async () => {
      await messageHandler({ command: 'validate' });

      expect(mockWebview.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: 'validationResult' })
      );
    });

    it('should handle validate command with incomplete data', async () => {
      await messageHandler({ command: 'validate', data: { provider: 'openai' } });

      expect(mockWebview.postMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: 'validationResult' })
      );
    });

    it('should handle providerChanged command with missing data', async () => {
      await messageHandler({ command: 'providerChanged' });

      expect(mockProviderManager.getDefaultConfig).not.toHaveBeenCalled();
    });

    it('should handle providerChanged command with incomplete data', async () => {
      await messageHandler({ command: 'providerChanged', data: {} });

      expect(mockProviderManager.getDefaultConfig).not.toHaveBeenCalled();
    });

    it('should handle unknown command gracefully', async () => {
      await expect(messageHandler({ command: 'unknown' as any })).resolves.not.toThrow();
    });

    it('should handle save with non-Error exception', async () => {
      mockConfigManager.getFullConfig.mockResolvedValue({
        provider: 'openai',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        modelName: 'gpt-3.5-turbo',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
      });
      mockConfigManager.saveFullConfig.mockRejectedValue('String error');

      const configData = {
        provider: 'openai',
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1',
        modelName: 'gpt-3.5-turbo',
      };

      await messageHandler({ command: 'save', data: configData });

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('保存配置失败')
      );
    });

    it('should handle load with non-Error exception', async () => {
      mockConfigManager.getFullConfig.mockRejectedValue('String error');

      await messageHandler({ command: 'load' });

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('加载配置失败')
      );
    });
  });

  describe('URL validation', () => {
    let messageHandler: (message: any) => Promise<void>;

    beforeEach(async () => {
      await panelManager.showPanel();
      messageHandler = (mockWebview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    });

    it('should reject URLs with unsupported protocols', async () => {
      const testCases = [
        'ftp://example.com',
        'file:///path/to/file',
        'ws://example.com',
        'wss://example.com',
      ];

      for (const baseUrl of testCases) {
        const config = {
          provider: 'openai',
          apiKey: 'test-key',
          baseUrl,
          modelName: 'gpt-3.5-turbo',
        };

        await messageHandler({ command: 'validate', data: config });

        expect(mockWebview.postMessage).toHaveBeenCalledWith({
          command: 'validationResult',
          data: {
            valid: false,
            errors: expect.arrayContaining([
              expect.objectContaining({
                field: 'baseUrl',
                message: 'Base URL格式无效，必须是有效的URL',
              }),
            ]),
          },
        });
      }
    });

    it('should accept URLs with ports', async () => {
      const config = {
        provider: 'ollama',
        apiKey: 'test-key',
        baseUrl: 'http://localhost:8080/v1',
        modelName: 'llama2',
      };

      await messageHandler({ command: 'validate', data: config });

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'validationResult',
        data: {
          valid: true,
          errors: [],
          confirmations: expect.arrayContaining([
            '✅ 配置验证通过',
            '✅ 提供商: ollama',
            '✅ 模型: llama2',
            '💡 配置已准备就绪，可以保存',
          ]),
        },
      });
    });

    it('should accept URLs with paths', async () => {
      const config = {
        provider: 'openai',
        apiKey: 'test-key',
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        modelName: 'gpt-3.5-turbo',
      };

      await messageHandler({ command: 'validate', data: config });

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'validationResult',
        data: {
          valid: true,
          errors: [],
          confirmations: expect.arrayContaining([
            '✅ 配置验证通过',
            '✅ 提供商: openai',
            '✅ 模型: gpt-3.5-turbo',
            '💡 配置已准备就绪，可以保存',
          ]),
        },
      });
    });
  });

  describe('handleRemoveCandidate', () => {
    let messageHandler: (message: any) => Promise<void>;

    beforeEach(async () => {
      mockConfigManager.getFullConfig.mockResolvedValue({
        provider: 'openai-compatible',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.example.com',
        modelName: 'gpt-3.5-turbo',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
      });

      mockConfigManager.getCustomBaseUrls.mockReturnValue([
        'https://custom1.com',
        'https://custom2.com',
      ]);
      mockConfigManager.getCustomModelNames.mockReturnValue(['model1', 'model2']);

      await panelManager.showPanel();
      messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];
    });

    it('应当成功删除自定义 Base URL', async () => {
      mockCandidatesManager.removeCustomBaseUrl.mockResolvedValue({
        success: true,
        removed: true,
      });

      await messageHandler({
        command: 'removeCandidate',
        data: { type: 'baseUrl', value: 'https://custom1.com' },
      });

      expect(mockCandidatesManager.removeCustomBaseUrl).toHaveBeenCalledWith('https://custom1.com');
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'candidateRemoved',
        data: expect.objectContaining({
          type: 'baseUrl',
          value: 'https://custom1.com',
        }),
      });
    });

    it('应当成功删除自定义模型名称', async () => {
      mockCandidatesManager.removeCustomModelName.mockResolvedValue({
        success: true,
        removed: true,
      });

      await messageHandler({
        command: 'removeCandidate',
        data: { type: 'modelName', value: 'model1' },
      });

      expect(mockCandidatesManager.removeCustomModelName).toHaveBeenCalledWith('model1');
      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'candidateRemoved',
        data: expect.objectContaining({
          type: 'modelName',
          value: 'model1',
        }),
      });
    });

    it('应当处理删除失败的情况', async () => {
      mockCandidatesManager.removeCustomBaseUrl.mockResolvedValue({
        success: false,
        error: '删除失败',
        removed: false,
      });

      await messageHandler({
        command: 'removeCandidate',
        data: { type: 'baseUrl', value: 'https://custom1.com' },
      });

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'candidateRemoveFailed',
        data: expect.objectContaining({
          type: 'baseUrl',
          value: 'https://custom1.com',
          error: '删除失败',
        }),
      });
    });

    it('应当处理删除时的异常', async () => {
      mockCandidatesManager.removeCustomBaseUrl.mockRejectedValue(new Error('网络错误'));

      await messageHandler({
        command: 'removeCandidate',
        data: { type: 'baseUrl', value: 'https://custom1.com' },
      });

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        command: 'candidateRemoveFailed',
        data: expect.objectContaining({
          type: 'baseUrl',
          value: 'https://custom1.com',
          error: '网络错误',
        }),
      });
    });
  });
});
