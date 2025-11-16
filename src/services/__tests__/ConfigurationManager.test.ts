import * as vscode from 'vscode';
import { ConfigurationManager } from '../ConfigurationManager';

// vscode module is automatically mocked via jest.config.js moduleNameMapper

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  let mockContext: any;
  let mockSecrets: any;
  let mockConfig: any;

  // Default configuration values
  const defaultConfigs: Record<string, any> = {
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: '',
    modelName: 'gpt-3.5-turbo',
    language: 'zh-CN',
    commitFormat: 'conventional',
    maxTokens: 500,
    temperature: 0.7,
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock secrets storage
    mockSecrets = {
      get: jest.fn(),
      store: jest.fn(),
      delete: jest.fn(),
    };

    // Mock extension context
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

    // Mock configuration
    mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      }),
      update: jest.fn(),
    };

    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue(mockConfig);

    configManager = new ConfigurationManager(mockContext);
  });

  describe('getConfig', () => {
    it('should return complete configuration', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');

      const config = await configManager.getConfig();

      expect(config).toEqual({
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'test-api-key',
        modelName: 'gpt-3.5-turbo',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
      });
    });

    it('should migrate API key from config to secrets', async () => {
      mockSecrets.get.mockResolvedValue(null);
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'apiKey') return 'old-api-key';
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      await configManager.getConfig();

      expect(mockSecrets.store).toHaveBeenCalledWith('aigitcommit.apiKey', 'old-api-key');
      expect(mockConfig.update).toHaveBeenCalledWith(
        'apiKey',
        '',
        vscode.ConfigurationTarget.Global
      );
    });

    it('should return empty API key when not configured', async () => {
      mockSecrets.get.mockResolvedValue(null);

      const config = await configManager.getConfig();

      expect(config.apiKey).toBe('');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');

      const result = await configManager.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing API endpoint', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'apiEndpoint') return '';
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const result = await configManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('API端点不能为空'))).toBe(true);
    });

    it('should detect invalid API endpoint URL', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'apiEndpoint') return 'invalid-url';
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const result = await configManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('API端点格式无效'))).toBe(true);
    });

    it('should detect missing API key', async () => {
      mockSecrets.get.mockResolvedValue('');

      const result = await configManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('API密钥不能为空'))).toBe(true);
    });

    it('should detect missing model name', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'modelName') return '';
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const result = await configManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('模型名称不能为空'))).toBe(true);
    });

    it('should detect invalid language', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'language') return 'invalid-lang';
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const result = await configManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('语言配置无效'))).toBe(true);
    });

    it('should detect invalid commit format', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'commitFormat') return 'invalid-format';
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const result = await configManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('提交格式无效'))).toBe(true);
    });

    it('should detect invalid maxTokens (too small)', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'maxTokens') return 0;
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const result = await configManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('最大token数必须大于0'))).toBe(true);
    });

    it('should detect invalid maxTokens (too large)', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'maxTokens') return 5000;
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const result = await configManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('最大token数不能超过4000'))).toBe(true);
    });

    it('should detect invalid temperature (too low)', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'temperature') return -0.1;
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const result = await configManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('温度参数必须在0到2之间'))).toBe(true);
    });

    it('should detect invalid temperature (too high)', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'temperature') return 2.1;
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const result = await configManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('温度参数必须在0到2之间'))).toBe(true);
    });

    it('should detect multiple validation errors', async () => {
      mockSecrets.get.mockResolvedValue('');
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'apiEndpoint') return '';
        if (key === 'modelName') return '';
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const result = await configManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('updateConfig', () => {
    it('should update regular config value', async () => {
      await configManager.updateConfig('modelName', 'gpt-4');

      expect(mockConfig.update).toHaveBeenCalledWith(
        'modelName',
        'gpt-4',
        vscode.ConfigurationTarget.Global
      );
    });

    it('should store API key in secrets', async () => {
      await configManager.updateConfig('apiKey', 'new-api-key');

      expect(mockSecrets.store).toHaveBeenCalledWith('aigitcommit.apiKey', 'new-api-key');
      expect(mockConfig.update).not.toHaveBeenCalled();
    });

    it('should use specified configuration target', async () => {
      await configManager.updateConfig('language', 'en-US', vscode.ConfigurationTarget.Workspace);

      expect(mockConfig.update).toHaveBeenCalledWith(
        'language',
        'en-US',
        vscode.ConfigurationTarget.Workspace
      );
    });
  });

  describe('storeApiKey', () => {
    it('should store API key in secrets', async () => {
      await configManager.storeApiKey('test-key');

      expect(mockSecrets.store).toHaveBeenCalledWith('aigitcommit.apiKey', 'test-key');
    });

    it('should delete API key when empty string provided', async () => {
      await configManager.storeApiKey('');

      expect(mockSecrets.delete).toHaveBeenCalledWith('aigitcommit.apiKey');
    });

    it('should delete API key when whitespace string provided', async () => {
      await configManager.storeApiKey('   ');

      expect(mockSecrets.delete).toHaveBeenCalledWith('aigitcommit.apiKey');
    });
  });

  describe('getApiKey', () => {
    it('should retrieve API key from secrets', async () => {
      mockSecrets.get.mockResolvedValue('stored-key');

      const key = await configManager.getApiKey();

      expect(key).toBe('stored-key');
      expect(mockSecrets.get).toHaveBeenCalledWith('aigitcommit.apiKey');
    });

    it('should return undefined when no key stored', async () => {
      mockSecrets.get.mockResolvedValue(undefined);

      const key = await configManager.getApiKey();

      expect(key).toBeUndefined();
    });
  });

  describe('deleteApiKey', () => {
    it('should delete API key from secrets', async () => {
      await configManager.deleteApiKey();

      expect(mockSecrets.delete).toHaveBeenCalledWith('aigitcommit.apiKey');
    });
  });

  describe('isConfigured', () => {
    it('should return true when configuration is valid', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');

      const result = await configManager.isConfigured();

      expect(result).toBe(true);
    });

    it('should return false when configuration is invalid', async () => {
      mockSecrets.get.mockResolvedValue('');

      const result = await configManager.isConfigured();

      expect(result).toBe(false);
    });
  });

  describe('getProvider', () => {
    it('should return configured provider', () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'provider') return 'qwen';
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const provider = configManager.getProvider();

      expect(provider).toBe('qwen');
    });

    it('should return default provider when not configured', () => {
      const provider = configManager.getProvider();

      expect(provider).toBe('openai');
    });
  });

  describe('setProvider', () => {
    it('should set provider to global configuration', async () => {
      await configManager.setProvider('ollama');

      expect(mockConfig.update).toHaveBeenCalledWith(
        'provider',
        'ollama',
        vscode.ConfigurationTarget.Global
      );
    });

    it('should set provider to workspace configuration when specified', async () => {
      await configManager.setProvider('qwen', vscode.ConfigurationTarget.Workspace);

      expect(mockConfig.update).toHaveBeenCalledWith(
        'provider',
        'qwen',
        vscode.ConfigurationTarget.Workspace
      );
    });
  });

  describe('getFullConfig', () => {
    it('should return complete configuration with provider', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'provider') return 'azure-openai';
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const config = await configManager.getFullConfig();

      expect(config).toEqual({
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'test-api-key',
        modelName: 'gpt-3.5-turbo',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
        provider: 'azure-openai',
      });
    });

    it('should include default provider when not configured', async () => {
      mockSecrets.get.mockResolvedValue('test-api-key');

      const config = await configManager.getFullConfig();

      expect(config.provider).toBe('openai');
    });
  });

  describe('saveFullConfig', () => {
    it('should save all configuration values including provider', async () => {
      const fullConfig = {
        provider: 'ollama',
        apiKey: 'new-api-key',
        apiEndpoint: 'http://localhost:11434/v1',
        modelName: 'llama2',
        language: 'en-US',
        commitFormat: 'simple',
        maxTokens: 1000,
        temperature: 0.5,
      };

      await configManager.saveFullConfig(fullConfig);

      expect(mockConfig.update).toHaveBeenCalledWith(
        'provider',
        'ollama',
        vscode.ConfigurationTarget.Global
      );
      expect(mockSecrets.store).toHaveBeenCalledWith('aigitcommit.apiKey', 'new-api-key');
      expect(mockConfig.update).toHaveBeenCalledWith(
        'apiEndpoint',
        'http://localhost:11434/v1',
        vscode.ConfigurationTarget.Global
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        'modelName',
        'llama2',
        vscode.ConfigurationTarget.Global
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        'language',
        'en-US',
        vscode.ConfigurationTarget.Global
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        'commitFormat',
        'simple',
        vscode.ConfigurationTarget.Global
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        'maxTokens',
        1000,
        vscode.ConfigurationTarget.Global
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        'temperature',
        0.5,
        vscode.ConfigurationTarget.Global
      );
    });

    it('should save to workspace configuration when specified', async () => {
      const fullConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        modelName: 'gpt-4',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
      };

      await configManager.saveFullConfig(fullConfig, vscode.ConfigurationTarget.Workspace);

      expect(mockConfig.update).toHaveBeenCalledWith(
        'provider',
        'openai',
        vscode.ConfigurationTarget.Workspace
      );
      expect(mockConfig.update).toHaveBeenCalledWith(
        'apiEndpoint',
        'https://api.openai.com/v1',
        vscode.ConfigurationTarget.Workspace
      );
    });
  });

  describe('getConfigSummary', () => {
    it('should return configuration summary with masked API key', async () => {
      mockSecrets.get.mockResolvedValue('sk-1234567890abcdef');
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'provider') return 'openai';
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      const summary = await configManager.getConfigSummary();

      expect(summary).toEqual({
        provider: 'openai',
        apiKeyMasked: 'sk-1****cdef',
        baseUrl: 'https://api.openai.com/v1',
        modelName: 'gpt-3.5-turbo',
        isConfigured: true,
      });
    });

    it('should show masked key as **** for short API keys', async () => {
      mockSecrets.get.mockResolvedValue('short');

      const summary = await configManager.getConfigSummary();

      expect(summary.apiKeyMasked).toBe('****');
    });

    it('should indicate when configuration is incomplete', async () => {
      mockSecrets.get.mockResolvedValue('');

      const summary = await configManager.getConfigSummary();

      expect(summary.isConfigured).toBe(false);
    });
  });

  describe('migrateConfiguration', () => {
    it('should migrate API key from settings to SecretStorage', async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'apiKey') return 'old-settings-key';
        if (key === 'provider') return 'openai';
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      await configManager.migrateConfiguration();

      expect(mockSecrets.store).toHaveBeenCalledWith('aigitcommit.apiKey', 'old-settings-key');
      expect(mockConfig.update).toHaveBeenCalledWith(
        'apiKey',
        undefined,
        vscode.ConfigurationTarget.Global
      );
    });

    it('should infer provider from endpoint when provider not configured', async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'apiEndpoint') return 'https://dashscope.aliyuncs.com/compatible-mode/v1';
        if (key === 'provider') return undefined;
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      await configManager.migrateConfiguration();

      expect(mockConfig.update).toHaveBeenCalledWith(
        'provider',
        'qwen',
        vscode.ConfigurationTarget.Global
      );
    });

    it('should not migrate when configuration is already up to date', async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'apiKey') return '';
        if (key === 'provider') return 'openai';
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      await configManager.migrateConfiguration();

      // Should not call store or update when nothing to migrate
      expect(mockSecrets.store).not.toHaveBeenCalled();
    });
  });

  describe('inferProviderFromEndpoint', () => {
    it('should infer qwen from Qwen endpoint', async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'apiEndpoint') return 'https://dashscope.aliyuncs.com/compatible-mode/v1';
        if (key === 'provider') return undefined;
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      await configManager.migrateConfiguration();

      expect(mockConfig.update).toHaveBeenCalledWith(
        'provider',
        'qwen',
        vscode.ConfigurationTarget.Global
      );
    });

    it('should infer ollama from localhost endpoint', async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'apiEndpoint') return 'http://localhost:11434/v1';
        if (key === 'provider') return undefined;
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      await configManager.migrateConfiguration();

      expect(mockConfig.update).toHaveBeenCalledWith(
        'provider',
        'ollama',
        vscode.ConfigurationTarget.Global
      );
    });

    it('should infer openai from OpenAI official endpoint', async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'apiEndpoint') return 'https://api.openai.com/v1';
        if (key === 'provider') return undefined;
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      await configManager.migrateConfiguration();

      expect(mockConfig.update).toHaveBeenCalledWith(
        'provider',
        'openai',
        vscode.ConfigurationTarget.Global
      );
    });

    it('should infer custom for unknown endpoints', async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'apiEndpoint') return 'https://custom-api.example.com/v1';
        if (key === 'provider') return undefined;
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
      });

      await configManager.migrateConfiguration();

      expect(mockConfig.update).toHaveBeenCalledWith(
        'provider',
        'openai-compatible',
        vscode.ConfigurationTarget.Global
      );
    });

    it('should default to openai when endpoint is empty', async () => {
      mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'apiEndpoint') return '';
        if (key === 'provider') return undefined;
        return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
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
