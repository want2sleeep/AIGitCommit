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
        'apiEndpoint': 'https://api.openai.com/v1',
        'apiKey': '',
        'modelName': 'gpt-3.5-turbo',
        'language': 'zh-CN',
        'commitFormat': 'conventional',
        'maxTokens': 500,
        'temperature': 0.7
    };

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock secrets storage
        mockSecrets = {
            get: jest.fn(),
            store: jest.fn(),
            delete: jest.fn()
        };

        // Mock extension context
        mockContext = {
            secrets: mockSecrets,
            subscriptions: [],
            extensionPath: '/test/path',
            globalState: {
                get: jest.fn(),
                update: jest.fn()
            },
            workspaceState: {
                get: jest.fn(),
                update: jest.fn()
            }
        };

        // Mock configuration
        mockConfig = {
            get: jest.fn((key: string, defaultValue?: any) => {
                return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
            }),
            update: jest.fn()
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
                temperature: 0.7
            });
        });

        it('should migrate API key from config to secrets', async () => {
            mockSecrets.get.mockResolvedValue(null);
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'apiKey') return 'old-api-key';
                return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
            });

            await configManager.getConfig();

            expect(mockSecrets.store).toHaveBeenCalledWith('aiGitCommit.apiKey', 'old-api-key');
            expect(mockConfig.update).toHaveBeenCalledWith('apiKey', '', vscode.ConfigurationTarget.Global);
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
            expect(result.errors).toContain('API端点不能为空');
        });

        it('should detect invalid API endpoint URL', async () => {
            mockSecrets.get.mockResolvedValue('test-api-key');
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'apiEndpoint') return 'invalid-url';
                return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
            });

            const result = await configManager.validateConfig();

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('API端点格式无效，必须是有效的URL');
        });

        it('should detect missing API key', async () => {
            mockSecrets.get.mockResolvedValue('');

            const result = await configManager.validateConfig();

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('API密钥不能为空');
        });

        it('should detect missing model name', async () => {
            mockSecrets.get.mockResolvedValue('test-api-key');
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'modelName') return '';
                return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
            });

            const result = await configManager.validateConfig();

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('模型名称不能为空');
        });

        it('should detect invalid language', async () => {
            mockSecrets.get.mockResolvedValue('test-api-key');
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'language') return 'invalid-lang';
                return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
            });

            const result = await configManager.validateConfig();

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('语言必须是以下之一'))).toBe(true);
        });

        it('should detect invalid commit format', async () => {
            mockSecrets.get.mockResolvedValue('test-api-key');
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'commitFormat') return 'invalid-format';
                return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
            });

            const result = await configManager.validateConfig();

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('提交格式必须是以下之一'))).toBe(true);
        });

        it('should detect invalid maxTokens (too small)', async () => {
            mockSecrets.get.mockResolvedValue('test-api-key');
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'maxTokens') return 0;
                return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
            });

            const result = await configManager.validateConfig();

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('最大token数必须大于0');
        });

        it('should detect invalid maxTokens (too large)', async () => {
            mockSecrets.get.mockResolvedValue('test-api-key');
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'maxTokens') return 5000;
                return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
            });

            const result = await configManager.validateConfig();

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('最大token数不能超过4000');
        });

        it('should detect invalid temperature (too low)', async () => {
            mockSecrets.get.mockResolvedValue('test-api-key');
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'temperature') return -0.1;
                return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
            });

            const result = await configManager.validateConfig();

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('温度参数必须在0到2之间');
        });

        it('should detect invalid temperature (too high)', async () => {
            mockSecrets.get.mockResolvedValue('test-api-key');
            mockConfig.get.mockImplementation((key: string, defaultValue?: any) => {
                if (key === 'temperature') return 2.1;
                return defaultConfigs[key] !== undefined ? defaultConfigs[key] : defaultValue;
            });

            const result = await configManager.validateConfig();

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('温度参数必须在0到2之间');
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

            expect(mockConfig.update).toHaveBeenCalledWith('modelName', 'gpt-4', vscode.ConfigurationTarget.Global);
        });

        it('should store API key in secrets', async () => {
            await configManager.updateConfig('apiKey', 'new-api-key');

            expect(mockSecrets.store).toHaveBeenCalledWith('aiGitCommit.apiKey', 'new-api-key');
            expect(mockConfig.update).not.toHaveBeenCalled();
        });

        it('should use specified configuration target', async () => {
            await configManager.updateConfig('language', 'en-US', vscode.ConfigurationTarget.Workspace);

            expect(mockConfig.update).toHaveBeenCalledWith('language', 'en-US', vscode.ConfigurationTarget.Workspace);
        });
    });

    describe('storeApiKey', () => {
        it('should store API key in secrets', async () => {
            await configManager.storeApiKey('test-key');

            expect(mockSecrets.store).toHaveBeenCalledWith('aiGitCommit.apiKey', 'test-key');
        });

        it('should delete API key when empty string provided', async () => {
            await configManager.storeApiKey('');

            expect(mockSecrets.delete).toHaveBeenCalledWith('aiGitCommit.apiKey');
        });

        it('should delete API key when whitespace string provided', async () => {
            await configManager.storeApiKey('   ');

            expect(mockSecrets.delete).toHaveBeenCalledWith('aiGitCommit.apiKey');
        });
    });

    describe('getApiKey', () => {
        it('should retrieve API key from secrets', async () => {
            mockSecrets.get.mockResolvedValue('stored-key');

            const key = await configManager.getApiKey();

            expect(key).toBe('stored-key');
            expect(mockSecrets.get).toHaveBeenCalledWith('aiGitCommit.apiKey');
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

            expect(mockSecrets.delete).toHaveBeenCalledWith('aiGitCommit.apiKey');
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
});
