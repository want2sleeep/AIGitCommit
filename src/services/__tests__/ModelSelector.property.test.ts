/**
 * ModelSelector 属性测试
 *
 * 使用 fast-check 进行属性测试，验证以下正确性属性：
 * - 属性 1: 用户配置优先级
 * - 属性 2: 智能降级正确性
 * - 属性 3: 默认模型保持
 *
 * **Feature: hybrid-model-strategy**
 * **验证需求: 1.3, 2.1, 2.2, 2.3, 2.4, 4.2, 4.3**
 */

import * as fc from 'fast-check';
import { ModelSelector } from '../ModelSelector';
import { LogManager } from '../LogManager';
import { FullConfig } from '../../types';

// Mock LogManager
const createMockLogger = (): LogManager => {
  return {
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as any;
};

describe('ModelSelector 属性测试', () => {
  /**
   * 属性 1: 用户配置优先级
   * *对于任意* 配置了 `chunkModel` 的扩展配置，Map 阶段应当使用配置的 `chunkModel` 而非智能降级的模型
   * **Feature: hybrid-model-strategy, Property 1: 用户配置优先级**
   * **验证需求: 1.3, 2.4, 4.2**
   */
  describe('属性 1: 用户配置优先级', () => {
    it('应当优先使用用户配置的 chunkModel', () => {
      fc.assert(
        fc.property(
          // 生成任意的主模型配置
          fc.record({
            provider: fc.constantFrom('openai', 'gemini', 'azure', 'ollama', 'custom'),
            modelName: fc.constantFrom(
              'gpt-4',
              'gpt-4-turbo',
              'gpt-4o',
              'gpt-3.5-turbo',
              'gemini-pro',
              'gemini-1.5-pro',
              'claude-3',
              'llama-2'
            ),
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          // 生成有效的 chunkModel（非空且不仅包含空格）
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
          (config, chunkModel) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              chunkModel,
            };

            const selectedModel = selector.selectMapModel(fullConfig);

            // 验证：应当返回用户配置的 chunkModel
            expect(selectedModel).toBe(chunkModel);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当在 chunkModel 为空字符串时使用智能降级', () => {
      fc.assert(
        fc.property(
          fc.record({
            provider: fc.constantFrom('openai', 'gemini'),
            modelName: fc.constantFrom('gpt-4', 'gemini-pro'),
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          (config) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              chunkModel: '', // 空字符串
            };

            const selectedModel = selector.selectMapModel(fullConfig);

            // 验证：应当使用智能降级，而不是空字符串
            expect(selectedModel).not.toBe('');
            expect(selectedModel).toBeTruthy();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当在 chunkModel 为仅空格时使用智能降级', () => {
      fc.assert(
        fc.property(
          fc.record({
            provider: fc.constantFrom('openai', 'gemini'),
            modelName: fc.constantFrom('gpt-4', 'gemini-pro'),
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          fc.integer({ min: 1, max: 10 }),
          (config, spaceCount) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              chunkModel: ' '.repeat(spaceCount), // 仅空格
            };

            const selectedModel = selector.selectMapModel(fullConfig);

            // 验证：应当使用智能降级，而不是空格字符串
            expect(selectedModel.trim()).toBeTruthy();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性 2: 智能降级正确性
   * *对于任意* 未配置 `chunkModel` 的情况，当主模型是 GPT-4 系列（非 mini）时，
   * 智能降级应当返回 "gpt-4o-mini"；当主模型是 "gemini-pro" 时，应当返回 "gemini-1.5-flash"
   * **Feature: hybrid-model-strategy, Property 2: 智能降级正确性**
   * **验证需求: 2.1, 2.2, 4.3**
   */
  describe('属性 2: 智能降级正确性', () => {
    it('应当将 GPT-4 系列（非 mini）降级为 gpt-4o-mini', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4-32k'),
          fc.record({
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          (modelName, config) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              provider: 'openai',
              modelName,
              chunkModel: undefined, // 未配置
            };

            const selectedModel = selector.selectMapModel(fullConfig);

            // 验证：应当降级为 gpt-4o-mini
            expect(selectedModel).toBe('gpt-4o-mini');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当将 gemini-pro 和 gemini-1.5-pro 降级为 gemini-1.5-flash', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('gemini-pro', 'gemini-1.5-pro'),
          fc.record({
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          (modelName, config) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              provider: 'gemini',
              modelName,
              chunkModel: undefined, // 未配置
            };

            const selectedModel = selector.selectMapModel(fullConfig);

            // 验证：应当降级为 gemini-1.5-flash
            expect(selectedModel).toBe('gemini-1.5-flash');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当不降级 gpt-4o-mini（已经是轻量级模型）', () => {
      fc.assert(
        fc.property(
          fc.record({
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          (config) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              provider: 'openai',
              modelName: 'gpt-4o-mini',
              chunkModel: undefined, // 未配置
            };

            const selectedModel = selector.selectMapModel(fullConfig);

            // 验证：应当保持原模型
            expect(selectedModel).toBe('gpt-4o-mini');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当不降级 gemini-1.5-flash（已经是轻量级模型）', () => {
      fc.assert(
        fc.property(
          fc.record({
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          (config) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              provider: 'gemini',
              modelName: 'gemini-1.5-flash',
              chunkModel: undefined, // 未配置
            };

            const selectedModel = selector.selectMapModel(fullConfig);

            // 验证：应当保持原模型
            expect(selectedModel).toBe('gemini-1.5-flash');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性 3: 默认模型保持
   * *对于任意* 非特殊主模型（不在降级映射表中），智能降级应当返回原主模型
   * **Feature: hybrid-model-strategy, Property 3: 默认模型保持**
   * **验证需求: 2.3**
   */
  describe('属性 3: 默认模型保持', () => {
    it('应当保持非特殊 OpenAI 模型不变', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'text-davinci-003'),
          fc.record({
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          (modelName, config) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              provider: 'openai',
              modelName,
              chunkModel: undefined, // 未配置
            };

            const selectedModel = selector.selectMapModel(fullConfig);

            // 验证：应当保持原模型
            expect(selectedModel).toBe(modelName);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当保持非特殊 Gemini 模型不变', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('gemini-1.0-pro', 'gemini-ultra'),
          fc.record({
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          (modelName, config) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              provider: 'gemini',
              modelName,
              chunkModel: undefined, // 未配置
            };

            const selectedModel = selector.selectMapModel(fullConfig);

            // 验证：应当保持原模型
            expect(selectedModel).toBe(modelName);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当保持本地提供商的模型不变', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ollama', 'lmstudio', 'localai', 'custom'),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          (provider, modelName, config) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              provider,
              modelName,
              chunkModel: undefined, // 未配置
            };

            const selectedModel = selector.selectMapModel(fullConfig);

            // 验证：本地提供商应当保持原模型
            expect(selectedModel).toBe(modelName);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当保持未知提供商的模型不变', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('anthropic', 'cohere', 'huggingface', 'unknown-provider'),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          (provider, modelName, config) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              provider,
              modelName,
              chunkModel: undefined, // 未配置
            };

            const selectedModel = selector.selectMapModel(fullConfig);

            // 验证：未知提供商应当保持原模型
            expect(selectedModel).toBe(modelName);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当保持任意自定义模型名称不变（非降级目标）', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('openai', 'gemini', 'azure'),
          // 生成符合模型名称格式的字符串（只包含字母、数字、连字符、下划线和点号）
          fc.stringMatching(/^[a-zA-Z0-9._-]{3,50}$/).filter(
            (name) =>
              // 排除会被降级的模型
              !name.includes('gpt-4') &&
              name !== 'gemini-pro' &&
              name !== 'gemini-1.5-pro' &&
              // 排除 JavaScript 内置属性名和方法名
              name !== 'toString' &&
              name !== 'valueOf' &&
              name !== 'constructor' &&
              name !== 'prototype' &&
              name !== '__proto__' &&
              name !== 'hasOwnProperty' &&
              name !== 'isPrototypeOf' &&
              name !== 'propertyIsEnumerable' &&
              name !== 'toLocaleString' &&
              name !== '__defineGetter__' &&
              name !== '__defineSetter__' &&
              name !== '__lookupGetter__' &&
              name !== '__lookupSetter__'
          ),
          fc.record({
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          (provider, modelName, config) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              provider,
              modelName,
              chunkModel: undefined, // 未配置
            };

            const selectedModel = selector.selectMapModel(fullConfig);

            // 验证：非降级目标的模型应当保持不变
            expect(selectedModel).toBe(modelName);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 属性 12: 无效模型回退
   * *对于任意* 配置的无效 `chunkModel`（不存在或不可用），系统应当回退到主模型
   * **Feature: hybrid-model-strategy, Property 12: 无效模型回退**
   * **验证需求: 8.1, 8.3**
   */
  describe('属性 12: 无效模型回退', () => {
    it('应当在 chunkModel 无效时回退到主模型', () => {
      fc.assert(
        fc.property(
          // 生成有效的主模型配置
          fc.record({
            provider: fc.constantFrom('openai', 'gemini', 'azure', 'ollama'),
            modelName: fc.constantFrom(
              'gpt-4',
              'gpt-4o-mini',
              'gpt-3.5-turbo',
              'gemini-pro',
              'gemini-1.5-flash'
            ),
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          // 生成无效的 chunkModel（排除空字符串和仅空格，因为它们会触发智能降级）
          fc.oneof(
            fc.constant('model!invalid'), // 包含特殊字符
            fc.constant('ab'), // 过短
            fc.constant('a'.repeat(101)), // 过长
            fc.constant('model@name#test'), // 多个特殊字符
            fc.constant('模型名称'), // 非 ASCII 字符
            fc.constant('model name with spaces') // 包含空格
          ),
          (config, invalidChunkModel) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              chunkModel: invalidChunkModel,
            };

            // 使用 selectAndValidateMapModel 方法，它会验证并在失败时回退
            const selectedModel = selector.selectAndValidateMapModel(fullConfig);

            // 验证：应当回退到主模型
            expect(selectedModel).toBe(config.modelName);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当在 chunkModel 验证失败时回退到主模型（即使智能降级可用）', () => {
      fc.assert(
        fc.property(
          // 生成会触发智能降级的配置
          fc.record({
            provider: fc.constantFrom('openai', 'gemini'),
            modelName: fc.constantFrom('gpt-4', 'gpt-4-turbo', 'gemini-pro'),
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          // 生成无效的 chunkModel（排除空字符串，因为空字符串会触发智能降级而非回退）
          fc.constantFrom('!!!', 'x', 'a'.repeat(150), 'model!invalid', 'model name'),
          (config, invalidChunkModel) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              chunkModel: invalidChunkModel,
            };

            const selectedModel = selector.selectAndValidateMapModel(fullConfig);

            // 验证：应当回退到主模型，而不是智能降级的模型
            expect(selectedModel).toBe(config.modelName);

            // 确保不是降级后的模型
            if (config.provider === 'openai' && config.modelName.includes('gpt-4')) {
              expect(selectedModel).not.toBe('gpt-4o-mini');
            }
            if (config.provider === 'gemini' && config.modelName === 'gemini-pro') {
              expect(selectedModel).not.toBe('gemini-1.5-flash');
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当在 chunkModel 与 provider 不匹配时回退到主模型', () => {
      fc.assert(
        fc.property(
          fc.record({
            provider: fc.constantFrom('openai', 'gemini'),
            modelName: fc.constantFrom('gpt-4', 'gemini-pro'),
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          (config) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            // 使用与 provider 不匹配的 chunkModel
            const mismatchedChunkModel =
              config.provider === 'openai' ? 'gemini-1.5-flash' : 'gpt-4o-mini';

            const fullConfig: FullConfig = {
              ...config,
              chunkModel: mismatchedChunkModel,
            };

            const selectedModel = selector.selectAndValidateMapModel(fullConfig);

            // 验证：应当回退到主模型
            expect(selectedModel).toBe(config.modelName);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当在主模型也无效时仍然返回主模型（记录错误）', () => {
      fc.assert(
        fc.property(
          fc.record({
            provider: fc.constantFrom('openai', 'gemini'),
            modelName: fc.constantFrom('!!!', '', 'x'), // 无效的主模型
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          fc.constantFrom('invalid!model', '', 'ab'),
          (config, invalidChunkModel) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              chunkModel: invalidChunkModel,
            };

            const selectedModel = selector.selectAndValidateMapModel(fullConfig);

            // 验证：即使主模型无效，也应当返回主模型（系统会记录错误）
            expect(selectedModel).toBe(config.modelName);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当在 chunkModel 为 null 或 undefined 时使用智能降级而非回退', () => {
      fc.assert(
        fc.property(
          fc.record({
            provider: fc.constantFrom('openai', 'gemini'),
            modelName: fc.constantFrom('gpt-4', 'gemini-pro'),
            apiEndpoint: fc.webUrl(),
            apiKey: fc.string({ minLength: 10 }),
            language: fc.constantFrom('zh-CN', 'en-US'),
            commitFormat: fc.constantFrom('conventional', 'simple'),
            maxTokens: fc.integer({ min: 100, max: 4000 }),
            temperature: fc.float({ min: 0, max: 2 }),
          }),
          (config) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const fullConfig: FullConfig = {
              ...config,
              chunkModel: undefined, // 未配置，应当触发智能降级
            };

            const selectedModel = selector.selectAndValidateMapModel(fullConfig);

            // 验证：应当使用智能降级，而不是主模型
            if (config.provider === 'openai' && config.modelName === 'gpt-4') {
              expect(selectedModel).toBe('gpt-4o-mini');
            } else if (config.provider === 'gemini' && config.modelName === 'gemini-pro') {
              expect(selectedModel).toBe('gemini-1.5-flash');
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 额外测试：验证模型验证功能
   */
  describe('模型验证功能', () => {
    it('应当拒绝空模型 ID', () => {
      fc.assert(
        fc.property(fc.constantFrom('', '   ', '\t', '\n'), (modelId) => {
          const logger = createMockLogger();
          const selector = new ModelSelector(logger);

          const isValid = selector.validateModel(modelId);

          // 验证：空模型 ID 应当被拒绝
          expect(isValid).toBe(false);

          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('应当接受有效格式的模型 ID', () => {
      fc.assert(
        fc.property(
          // 生成符合模型名称格式的字符串（只包含字母、数字、连字符、下划线和点号，长度 3-100）
          fc.stringMatching(/^[a-zA-Z0-9._-]{3,100}$/),
          (modelId) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const isValid = selector.validateModel(modelId);

            // 验证：符合格式的模型 ID 应当被接受
            expect(isValid).toBe(true);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当拒绝包含特殊字符的模型 ID', () => {
      fc.assert(
        fc.property(
          // 生成包含特殊字符的字符串
          fc.constantFrom('model!name', 'model@name', 'model#name', 'model$name', 'model name'),
          (modelId) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const isValid = selector.validateModel(modelId);

            // 验证：包含特殊字符的模型 ID 应当被拒绝
            expect(isValid).toBe(false);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('应当拒绝过短或过长的模型 ID', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 2 }), // 过短
            fc.string({ minLength: 101, maxLength: 200 }) // 过长
          ),
          (modelId) => {
            const logger = createMockLogger();
            const selector = new ModelSelector(logger);

            const isValid = selector.validateModel(modelId);

            // 验证：长度不合理的模型 ID 应当被拒绝
            expect(isValid).toBe(false);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
