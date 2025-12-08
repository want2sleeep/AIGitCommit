/**
 * ConfigPresetManager 属性测试
 *
 * **Feature: project-optimization-recommendations, Property 15: 配置预设往返一致性**
 * **验证需求: 6.4**
 */

import * as fc from 'fast-check';
import { ConfigPresetManager } from '../ConfigPresetManager';
import { FullConfig } from '../../types';

// Mock VSCode ExtensionContext
const createMockContext = () => {
  const storage = new Map<string, unknown>();
  return {
    globalState: {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        return storage.get(key) ?? defaultValue;
      }),
      update: jest.fn(async (key: string, value: unknown) => {
        storage.set(key, value);
      }),
      keys: jest.fn(() => Array.from(storage.keys())),
      setKeysForSync: jest.fn(),
    },
    workspaceState: {
      get: jest.fn(),
      update: jest.fn(),
      keys: jest.fn(() => []),
      setKeysForSync: jest.fn(),
    },
    subscriptions: [],
    extensionPath: '/mock/path',
    extensionUri: {} as any,
    environmentVariableCollection: {} as any,
    storagePath: '/mock/storage',
    globalStoragePath: '/mock/global-storage',
    logPath: '/mock/log',
    extensionMode: 3,
    storageUri: {} as any,
    globalStorageUri: {} as any,
    logUri: {} as any,
    extension: {} as any,
    secrets: {} as any,
    languageModelAccessInformation: {} as any,
  } as any;
};

// Mock ConfigurationManager
const createMockConfigManager = () => {
  let currentConfig: FullConfig = {
    provider: 'openai',
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: 'test-key',
    modelName: 'gpt-3.5-turbo',
    language: 'zh-CN',
    commitFormat: 'conventional',
    maxTokens: 1000,
    temperature: 0.7,
  };

  return {
    getFullConfig: jest.fn(async () => currentConfig),
    saveFullConfig: jest.fn(async (config: FullConfig) => {
      currentConfig = config;
    }),
  } as any;
};

describe('ConfigPresetManager 属性测试', () => {
  /**
   * 属性 15: 配置预设往返一致性
   * *对于任何* 配置预设，应用预设后再创建预设应当得到等价的配置
   * **验证需求: 6.4**
   */
  describe('属性 15: 配置预设往返一致性', () => {
    it('应当在应用预设后能够创建等价的预设', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            provider: fc.constantFrom('openai', 'azure', 'ollama'),
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            modelName: fc.string({ minLength: 1 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          async (config) => {
            const context = createMockContext();
            const configManager = createMockConfigManager();
            const manager = new ConfigPresetManager(context, configManager);

            // 创建原始预设
            const originalPreset = await manager.createPreset({
              name: '测试预设',
              description: '用于属性测试',
              config,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // 应用预设
            await manager.applyPreset(originalPreset.id);

            // 从当前配置创建新预设
            const newPreset = await manager.createPresetFromCurrent('往返测试');

            // 验证：新预设的配置应该与原始预设的配置等价
            expect(newPreset.config.provider).toBe(originalPreset.config.provider);
            expect(newPreset.config.apiEndpoint).toBe(originalPreset.config.apiEndpoint);
            expect(newPreset.config.apiKey).toBe(originalPreset.config.apiKey);
            expect(newPreset.config.modelName).toBe(originalPreset.config.modelName);
            expect(newPreset.config.language).toBe(originalPreset.config.language);
            expect(newPreset.config.commitFormat).toBe(originalPreset.config.commitFormat);
            expect(newPreset.config.maxTokens).toBe(originalPreset.config.maxTokens);
            expect(newPreset.config.temperature).toBe(originalPreset.config.temperature);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当正确保存和检索预设', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string(),
          fc.record({
            provider: fc.constantFrom('openai', 'azure', 'ollama'),
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            modelName: fc.string({ minLength: 1 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          async (name, description, config) => {
            const context = createMockContext();
            const configManager = createMockConfigManager();
            const manager = new ConfigPresetManager(context, configManager);

            // 创建预设
            const preset = await manager.createPreset({
              name,
              description,
              config,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // 检索预设
            const retrieved = manager.getPreset(preset.id);

            // 验证：检索到的预设应该与创建的预设一致
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe(name);
            expect(retrieved?.description).toBe(description);
            expect(retrieved?.config).toEqual(config);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当支持更新预设', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            provider: fc.constantFrom('openai', 'azure', 'ollama'),
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            modelName: fc.string({ minLength: 1 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          fc.string({ minLength: 1 }),
          async (config, newName) => {
            const context = createMockContext();
            const configManager = createMockConfigManager();
            const manager = new ConfigPresetManager(context, configManager);

            // 创建预设
            const preset = await manager.createPreset({
              name: '原始名称',
              description: '原始描述',
              config,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // 更新预设
            await manager.updatePreset(preset.id, { name: newName });

            // 检索更新后的预设
            const updated = manager.getPreset(preset.id);

            // 验证：名称应该已更新
            expect(updated?.name).toBe(newName);
            // 验证：配置应该保持不变
            expect(updated?.config).toEqual(config);
            // 验证：ID 应该保持不变
            expect(updated?.id).toBe(preset.id);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当支持删除预设', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1 }),
              description: fc.string(),
              config: fc.record({
                provider: fc.constantFrom('openai', 'azure', 'ollama'),
                apiEndpoint: fc.webUrl(),
                apiKey: fc.string({ minLength: 10 }),
                modelName: fc.string({ minLength: 1 }),
                language: fc.constantFrom('zh-CN', 'en-US'),
                commitFormat: fc.constantFrom('conventional', 'simple'),
                maxTokens: fc.integer({ min: 100, max: 4000 }),
                temperature: fc.float({ min: 0, max: 2 }),
              }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (presets) => {
            const context = createMockContext();
            const configManager = createMockConfigManager();
            const manager = new ConfigPresetManager(context, configManager);

            // 创建所有预设
            const createdPresets = [];
            for (const preset of presets) {
              const created = await manager.createPreset({
                ...preset,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              createdPresets.push(created);
            }

            // 获取初始预设列表
            const initialPresets = manager.getPresets();
            const initialCount = initialPresets.length;

            // 删除第一个预设
            if (createdPresets.length > 0) {
              const firstPreset = createdPresets[0];
              if (firstPreset) {
                await manager.deletePreset(firstPreset.id);

                // 验证：预设数量应该减少1
                const afterDelete = manager.getPresets();
                expect(afterDelete.length).toBe(initialCount - 1);

                // 验证：被删除的预设不应该存在
                const deleted = manager.getPreset(firstPreset.id);
                expect(deleted).toBeUndefined();
              }
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('应当正确处理配置的所有字段', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            provider: fc.constantFrom('openai', 'azure', 'ollama', 'custom'),
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            modelName: fc.string({ minLength: 1 }),
            language: fc.constantFrom('zh-CN', 'en-US', 'ja-JP'),
            commitFormat: fc.constantFrom('conventional', 'simple', 'custom'),
            maxTokens: fc.integer({ min: 1, max: 10000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          async (config) => {
            const context = createMockContext();
            const configManager = createMockConfigManager();
            const manager = new ConfigPresetManager(context, configManager);

            // 创建预设
            const preset = await manager.createPreset({
              name: '完整配置测试',
              description: '测试所有配置字段',
              config,
              createdAt: new Date(),
              updatedAt: new Date(),
            });

            // 检索预设
            const retrieved = manager.getPreset(preset.id);

            // 验证：所有配置字段都应该正确保存和检索
            expect(retrieved?.config.provider).toBe(config.provider);
            expect(retrieved?.config.apiEndpoint).toBe(config.apiEndpoint);
            expect(retrieved?.config.apiKey).toBe(config.apiKey);
            expect(retrieved?.config.modelName).toBe(config.modelName);
            expect(retrieved?.config.language).toBe(config.language);
            expect(retrieved?.config.commitFormat).toBe(config.commitFormat);
            expect(retrieved?.config.maxTokens).toBe(config.maxTokens);
            expect(retrieved?.config.temperature).toBe(config.temperature);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
