/**
 * 向后兼容性属性测试
 *
 * 使用 fast-check 进行属性测试，验证以下正确性属性：
 * - 属性 10: 向后兼容性
 * - 属性 11: Map-Reduce 禁用时忽略 chunk 模型
 */

import * as fc from 'fast-check';
import { ModelSelector } from '../ModelSelector';
import { LogManager } from '../LogManager';
import { FullConfig } from '../../types';

// 生成器：生成 OpenAI 模型名称
const openaiModelArb = fc.constantFrom(
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-4-32k',
  'gpt-3.5-turbo',
  'gpt-4o-mini',
  'text-davinci-003'
);

// 生成器：生成 Gemini 模型名称
const geminiModelArb = fc.constantFrom('gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash');

// 生成器：生成本地模型名称
const localModelArb = fc.constantFrom('llama2', 'mistral', 'codellama', 'phi-2');

// 生成器：生成匹配的 provider 和 modelName 对
const providerModelPairArb = fc.oneof(
  fc.record({
    provider: fc.constant('openai'),
    modelName: openaiModelArb,
  }),
  fc.record({
    provider: fc.constant('gemini'),
    modelName: geminiModelArb,
  }),
  fc.record({
    provider: fc.constantFrom('ollama', 'lmstudio', 'localai', 'custom'),
    modelName: localModelArb,
  }),
  fc.record({
    provider: fc.constant('azure'),
    modelName: openaiModelArb, // Azure 使用 OpenAI 模型
  })
);

// 生成器：生成配置对象（不包含 chunkModel）
const configWithoutChunkModelArb = fc
  .record({
    providerModel: providerModelPairArb,
    apiKey: fc.string({ minLength: 10, maxLength: 100 }),
    apiEndpoint: fc.webUrl(),
    language: fc.constantFrom('zh-CN', 'en-US'),
    commitFormat: fc.constantFrom('conventional', 'simple'),
    maxTokens: fc.integer({ min: 100, max: 8000 }),
    temperature: fc.double({ min: 0, max: 2 }),
  })
  .map((config) => ({
    provider: config.providerModel.provider,
    modelName: config.providerModel.modelName,
    apiKey: config.apiKey,
    apiEndpoint: config.apiEndpoint,
    language: config.language,
    commitFormat: config.commitFormat,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
  }));

// 生成器：生成空值或空白字符串
const emptyChunkModelArb = fc.oneof(
  fc.constant(undefined),
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n\r '),
  fc.constant(null as unknown as undefined)
);

describe('向后兼容性属性测试', () => {
  let logger: LogManager;
  let selector: ModelSelector;

  beforeEach(() => {
    logger = new LogManager();
    selector = new ModelSelector(logger);
  });

  /**
   * **Feature: hybrid-model-strategy, Property 10: 向后兼容性**
   * **验证: 需求 7.1, 7.3**
   *
   * 对于任意未配置 chunkModel 且禁用了智能降级的情况，系统应当在所有阶段使用主模型
   */
  describe('属性 10: 向后兼容性', () => {
    it('未配置 chunkModel 时应使用智能降级或主模型', () => {
      fc.assert(
        fc.property(configWithoutChunkModelArb, emptyChunkModelArb, (baseConfig, chunkModel) => {
          const config: FullConfig = {
            ...baseConfig,
            chunkModel,
          };

          const selectedModel = selector.selectMapModel(config);

          // 验证返回的模型不为空
          if (!selectedModel || selectedModel.trim() === '') {
            return false;
          }

          // 验证返回的是有效模型（要么是主模型，要么是降级后的模型）
          const validModels = [config.modelName, 'gpt-4o-mini', 'gemini-1.5-flash'];

          return validModels.includes(selectedModel);
        }),
        { numRuns: 100 }
      );
    });

    it('OpenAI GPT-4 系列未配置时应降级为 gpt-4o-mini', () => {
      fc.assert(
        fc.property(
          openaiModelArb.filter((m) => m.includes('gpt-4') && !m.includes('mini')),
          emptyChunkModelArb,
          (modelName, chunkModel) => {
            const config: FullConfig = {
              provider: 'openai',
              modelName,
              apiKey: 'test-key',
              apiEndpoint: 'https://api.openai.com/v1',
              language: 'zh-CN',
              commitFormat: 'conventional',
              maxTokens: 2000,
              temperature: 0.7,
              chunkModel,
            };

            const selectedModel = selector.selectMapModel(config);

            // GPT-4 系列（非 mini）应降级为 gpt-4o-mini
            return selectedModel === 'gpt-4o-mini';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Gemini Pro 系列未配置时应降级为 gemini-1.5-flash', () => {
      fc.assert(
        fc.property(
          geminiModelArb.filter((m) => m.includes('pro')),
          emptyChunkModelArb,
          (modelName, chunkModel) => {
            const config: FullConfig = {
              provider: 'gemini',
              modelName,
              apiKey: 'test-key',
              apiEndpoint: 'https://generativelanguage.googleapis.com/v1',
              language: 'zh-CN',
              commitFormat: 'conventional',
              maxTokens: 2000,
              temperature: 0.7,
              chunkModel,
            };

            const selectedModel = selector.selectMapModel(config);

            // Gemini Pro 系列应降级为 gemini-1.5-flash
            return selectedModel === 'gemini-1.5-flash';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('本地提供商未配置时应保持主模型', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ollama', 'lmstudio', 'localai', 'custom'),
          localModelArb,
          emptyChunkModelArb,
          (provider, modelName, chunkModel) => {
            const config: FullConfig = {
              provider,
              modelName,
              apiKey: '',
              apiEndpoint: 'http://localhost:11434',
              language: 'zh-CN',
              commitFormat: 'conventional',
              maxTokens: 2000,
              temperature: 0.7,
              chunkModel,
            };

            const selectedModel = selector.selectMapModel(config);

            // 本地提供商应保持主模型
            return selectedModel === modelName;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('非特殊模型未配置时应保持主模型', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('gpt-3.5-turbo', 'gpt-4o-mini', 'gemini-1.5-flash'),
          emptyChunkModelArb,
          (modelName, chunkModel) => {
            const config: FullConfig = {
              provider: 'openai',
              modelName,
              apiKey: 'test-key',
              apiEndpoint: 'https://api.openai.com/v1',
              language: 'zh-CN',
              commitFormat: 'conventional',
              maxTokens: 2000,
              temperature: 0.7,
              chunkModel,
            };

            const selectedModel = selector.selectMapModel(config);

            // 非特殊模型应保持主模型
            return selectedModel === modelName;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('未配置时选择的模型应能通过验证', () => {
      fc.assert(
        fc.property(configWithoutChunkModelArb, emptyChunkModelArb, (baseConfig, chunkModel) => {
          const config: FullConfig = {
            ...baseConfig,
            chunkModel,
          };

          const selectedModel = selector.selectMapModel(config);
          const isValid = selector.validateModel(selectedModel, config.provider);

          // 选择的模型应当是有效的
          return isValid === true;
        }),
        { numRuns: 100 }
      );
    });

    it('selectAndValidateMapModel 应返回有效模型', () => {
      fc.assert(
        fc.property(configWithoutChunkModelArb, emptyChunkModelArb, (baseConfig, chunkModel) => {
          const config: FullConfig = {
            ...baseConfig,
            chunkModel,
          };

          const validatedModel = selector.selectAndValidateMapModel(config);

          // 应返回非空的有效模型
          if (!validatedModel || validatedModel.trim() === '') {
            return false;
          }

          // 验证返回的模型是有效的
          return selector.validateModel(validatedModel, config.provider);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: hybrid-model-strategy, Property 11: Map-Reduce 禁用时忽略 chunk 模型**
   * **验证: 需求 7.2**
   *
   * 对于任意禁用了 Map-Reduce 功能的配置，系统应当忽略 chunkModel 配置并使用主模型
   *
   * 注意：这个属性主要在 LargeDiffHandler 层面验证，因为 enableMapReduce 是 LargeDiffConfig 的一部分
   * ModelSelector 本身不关心 Map-Reduce 是否启用，它只负责选择合适的模型
   * 这里我们验证 ModelSelector 的选择逻辑在各种情况下都是正确的
   */
  describe('属性 11: Map-Reduce 禁用时忽略 chunk 模型', () => {
    it('ModelSelector 应始终返回有效模型（无论 Map-Reduce 状态）', () => {
      fc.assert(
        fc.property(
          configWithoutChunkModelArb,
          fc.string({ minLength: 1, maxLength: 50 }),
          (baseConfig, chunkModel) => {
            const config: FullConfig = {
              ...baseConfig,
              chunkModel, // 配置了 chunkModel
            };

            // ModelSelector 不关心 Map-Reduce 是否启用
            // 它只负责根据配置选择合适的模型
            const selectedModel = selector.selectMapModel(config);

            // 验证返回的模型是有效的
            return selectedModel !== undefined && selectedModel.trim() !== '';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('配置了 chunkModel 时应优先使用（ModelSelector 层面）', () => {
      fc.assert(
        fc.property(
          openaiModelArb,
          fc.oneof(fc.constant('gpt-4o-mini'), fc.constant('gpt-3.5-turbo')),
          (modelName, chunkModel) => {
            const config: FullConfig = {
              provider: 'openai',
              modelName,
              apiKey: 'test-key',
              apiEndpoint: 'https://api.openai.com/v1',
              language: 'zh-CN',
              commitFormat: 'conventional',
              maxTokens: 2000,
              temperature: 0.7,
              chunkModel,
            };

            const selectedModel = selector.selectMapModel(config);

            // 如果配置了 chunkModel，应使用它
            return selectedModel === chunkModel;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('未配置 chunkModel 时应使用智能降级或主模型', () => {
      fc.assert(
        fc.property(openaiModelArb, emptyChunkModelArb, (modelName, chunkModel) => {
          const config: FullConfig = {
            provider: 'openai',
            modelName,
            apiKey: 'test-key',
            apiEndpoint: 'https://api.openai.com/v1',
            language: 'zh-CN',
            commitFormat: 'conventional',
            maxTokens: 2000,
            temperature: 0.7,
            chunkModel,
          };

          const selectedModel = selector.selectMapModel(config);

          // 应使用智能降级或主模型
          const validModels = [modelName, 'gpt-4o-mini'];
          return validModels.includes(selectedModel);
        }),
        { numRuns: 100 }
      );
    });

    it('模型验证结果应一致（与配置无关）', () => {
      fc.assert(
        fc.property(configWithoutChunkModelArb, (baseConfig) => {
          const config: FullConfig = {
            ...baseConfig,
          };

          const selectedModel = selector.selectMapModel(config);
          const isValid = selector.validateModel(selectedModel, config.provider);

          // 验证结果应该一致
          return isValid === true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('边缘情况和鲁棒性', () => {
    it('应处理各种空值组合', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(undefined),
            fc.constant(null as unknown as undefined),
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t'),
            fc.constant('\n'),
            fc.constant('\r'),
            fc.constant('\t\n\r ')
          ),
          (chunkModel) => {
            const config: FullConfig = {
              provider: 'openai',
              modelName: 'gpt-4',
              apiKey: 'test-key',
              apiEndpoint: 'https://api.openai.com/v1',
              language: 'zh-CN',
              commitFormat: 'conventional',
              maxTokens: 2000,
              temperature: 0.7,
              chunkModel,
            };

            const selectedModel = selector.selectMapModel(config);

            // 所有空值情况都应触发智能降级
            return selectedModel === 'gpt-4o-mini';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应处理未知提供商', () => {
      fc.assert(
        fc.property(
          fc
            .string({ minLength: 1, maxLength: 20 })
            .filter(
              (s) =>
                !['openai', 'azure', 'gemini', 'ollama', 'lmstudio', 'localai', 'custom'].includes(
                  s
                )
            ),
          fc.string({ minLength: 1, maxLength: 50 }),
          emptyChunkModelArb,
          (provider, modelName, chunkModel) => {
            const config: FullConfig = {
              provider,
              modelName,
              apiKey: 'test-key',
              apiEndpoint: 'https://example.com',
              language: 'zh-CN',
              commitFormat: 'conventional',
              maxTokens: 2000,
              temperature: 0.7,
              chunkModel,
            };

            const selectedModel = selector.selectMapModel(config);

            // 未知提供商应保持主模型
            return selectedModel === modelName;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应处理极端配置值', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100000 }),
          fc.double({ min: 0, max: 10 }),
          emptyChunkModelArb,
          (maxTokens, temperature, chunkModel) => {
            const config: FullConfig = {
              provider: 'openai',
              modelName: 'gpt-4',
              apiKey: 'test-key',
              apiEndpoint: 'https://api.openai.com/v1',
              language: 'zh-CN',
              commitFormat: 'conventional',
              maxTokens,
              temperature,
              chunkModel,
            };

            const selectedModel = selector.selectMapModel(config);

            // 即使配置值极端，也应能正常选择模型
            return selectedModel === 'gpt-4o-mini';
          }
        ),
        { numRuns: 100 }
      );
    });

    it('选择的模型应始终是字符串类型', () => {
      fc.assert(
        fc.property(configWithoutChunkModelArb, emptyChunkModelArb, (baseConfig, chunkModel) => {
          const config: FullConfig = {
            ...baseConfig,
            chunkModel,
          };

          const selectedModel = selector.selectMapModel(config);

          // 返回值应该是字符串
          return typeof selectedModel === 'string';
        }),
        { numRuns: 100 }
      );
    });

    it('选择的模型应始终非空', () => {
      fc.assert(
        fc.property(configWithoutChunkModelArb, emptyChunkModelArb, (baseConfig, chunkModel) => {
          const config: FullConfig = {
            ...baseConfig,
            chunkModel,
          };

          const selectedModel = selector.selectMapModel(config);

          // 返回值应该非空
          return selectedModel.length > 0;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('幂等性和一致性', () => {
    it('多次调用应返回相同结果', () => {
      fc.assert(
        fc.property(configWithoutChunkModelArb, emptyChunkModelArb, (baseConfig, chunkModel) => {
          const config: FullConfig = {
            ...baseConfig,
            chunkModel,
          };

          const result1 = selector.selectMapModel(config);
          const result2 = selector.selectMapModel(config);
          const result3 = selector.selectMapModel(config);

          // 多次调用应返回相同结果（幂等性）
          return result1 === result2 && result2 === result3;
        }),
        { numRuns: 100 }
      );
    });

    it('相同配置应产生相同的验证结果', () => {
      fc.assert(
        fc.property(configWithoutChunkModelArb, emptyChunkModelArb, (baseConfig, chunkModel) => {
          const config: FullConfig = {
            ...baseConfig,
            chunkModel,
          };

          const selectedModel = selector.selectMapModel(config);
          const isValid1 = selector.validateModel(selectedModel, config.provider);
          const isValid2 = selector.validateModel(selectedModel, config.provider);

          // 相同的模型和提供商应产生相同的验证结果
          return isValid1 === isValid2;
        }),
        { numRuns: 100 }
      );
    });
  });
});
