import * as fc from 'fast-check';
import { ConfigurationValidator } from '../ConfigurationValidator';
import { ExtensionConfig } from '../../types';

/**
 * Feature: hybrid-model-strategy, Property 13: 模型名称格式验证
 *
 * 属性测试：验证 ConfigurationValidator 能够正确验证 chunkModel 的格式
 * 验证需求 9.1
 */
describe('ConfigurationValidator 属性测试', () => {
  let validator: ConfigurationValidator;

  beforeEach(() => {
    validator = new ConfigurationValidator();
  });

  const createValidConfig = (): ExtensionConfig => ({
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: 'test-api-key-12345',
    modelName: 'gpt-4',
    language: 'zh-CN',
    commitFormat: 'conventional',
    maxTokens: 1000,
    temperature: 0.7,
  });

  describe('属性 13: 模型名称格式验证', () => {
    /**
     * 验证需求 9.1: 当用户配置 chunkModel 时，系统应当验证模型名称格式是否有效
     */
    it('应当接受所有有效的模型名称格式', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => /^[a-zA-Z0-9\-_./]+$/.test(s)),
          (validModelName) => {
            const config = createValidConfig();
            config.chunkModel = validModelName;

            const result = validator.validateConfig(config);

            // 有效的模型名称应该通过验证（可能有其他错误，但不应该有格式错误）
            const hasFormatError = result.errors.some((e) => e.includes('模型名称格式无效'));
            expect(hasFormatError).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当拒绝包含特殊字符的模型名称', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => {
            const trimmed = s.trim();
            // 过滤掉空字符串和只包含有效字符的字符串
            return trimmed !== '' && /[^a-zA-Z0-9\-_./]/.test(trimmed);
          }),
          (invalidModelName) => {
            const config = createValidConfig();
            config.chunkModel = invalidModelName;

            const result = validator.validateConfig(config);

            // 包含特殊字符的模型名称应该被拒绝
            expect(result.valid).toBe(false);
            const hasFormatError = result.errors.some((e) => e.includes('模型名称格式无效'));
            expect(hasFormatError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当拒绝仅包含空格的模型名称', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim() === '' && s.length > 0),
          (spacesOnly) => {
            const config = createValidConfig();
            config.chunkModel = spacesOnly;

            const result = validator.validateConfig(config);

            // 仅包含空格的字符串应该被拒绝
            expect(result.valid).toBe(false);
            const hasEmptyError = result.errors.some((e) => e.includes('不能为空字符串'));
            expect(hasEmptyError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当正确处理包含连字符的模型名称', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc
              .array(fc.constantFrom('a', 'b', 'c', '1', '2', '3'), { minLength: 1, maxLength: 10 })
              .map((arr) => arr.join('')),
            fc
              .array(fc.constantFrom('x', 'y', 'z', '4', '5', '6'), { minLength: 1, maxLength: 10 })
              .map((arr) => arr.join(''))
          ),
          ([part1, part2]) => {
            const config = createValidConfig();
            config.chunkModel = `${part1}-${part2}`;

            const result = validator.validateConfig(config);

            // 包含连字符的有效模型名称应该通过验证
            const hasFormatError = result.errors.some((e) => e.includes('模型名称格式无效'));
            expect(hasFormatError).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当正确处理包含下划线的模型名称', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc
              .array(fc.constantFrom('a', 'b', 'c', '1', '2', '3'), { minLength: 1, maxLength: 10 })
              .map((arr) => arr.join('')),
            fc
              .array(fc.constantFrom('x', 'y', 'z', '4', '5', '6'), { minLength: 1, maxLength: 10 })
              .map((arr) => arr.join(''))
          ),
          ([part1, part2]) => {
            const config = createValidConfig();
            config.chunkModel = `${part1}_${part2}`;

            const result = validator.validateConfig(config);

            // 包含下划线的有效模型名称应该通过验证
            const hasFormatError = result.errors.some((e) => e.includes('模型名称格式无效'));
            expect(hasFormatError).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当正确处理包含点的模型名称', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc
              .array(fc.constantFrom('a', 'b', 'c', '1', '2', '3'), { minLength: 1, maxLength: 10 })
              .map((arr) => arr.join('')),
            fc
              .array(fc.constantFrom('x', 'y', 'z', '4', '5', '6'), { minLength: 1, maxLength: 10 })
              .map((arr) => arr.join(''))
          ),
          ([part1, part2]) => {
            const config = createValidConfig();
            config.chunkModel = `${part1}.${part2}`;

            const result = validator.validateConfig(config);

            // 包含点的有效模型名称应该通过验证
            const hasFormatError = result.errors.some((e) => e.includes('模型名称格式无效'));
            expect(hasFormatError).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当正确处理复杂的有效模型名称', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc
              .array(fc.constantFrom('a', 'b', 'c', '1', '2', '3'), { minLength: 1, maxLength: 5 })
              .map((arr) => arr.join('')),
            fc
              .array(fc.constantFrom('x', 'y', 'z', '4', '5', '6'), { minLength: 1, maxLength: 5 })
              .map((arr) => arr.join('')),
            fc
              .array(fc.constantFrom('m', 'n', 'o', '7', '8', '9'), { minLength: 1, maxLength: 5 })
              .map((arr) => arr.join(''))
          ),
          ([part1, part2, part3]) => {
            const config = createValidConfig();
            config.chunkModel = `${part1}-${part2}_${part3}.v1`;

            const result = validator.validateConfig(config);

            // 复杂但有效的模型名称应该通过验证
            const hasFormatError = result.errors.some((e) => e.includes('模型名称格式无效'));
            expect(hasFormatError).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当允许未配置 chunkModel（undefined）', () => {
      fc.assert(
        fc.property(fc.constant(undefined), (undefinedValue) => {
          const config = createValidConfig();
          config.chunkModel = undefinedValue;

          const result = validator.validateConfig(config);

          // undefined 应该被允许（表示未配置）
          const hasChunkModelError = result.errors.some((e) => e.includes('Chunk 模型'));
          expect(hasChunkModelError).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Provider 匹配性验证', () => {
    it('应当警告 OpenAI provider 使用非 OpenAI 模型', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('gemini-1.5-flash'),
            fc.constant('gemini-pro'),
            fc.constant('qwen-turbo'),
            fc.constant('qwen-plus')
          ),
          (nonOpenAIModel) => {
            const config = createValidConfig();
            config.chunkModel = nonOpenAIModel;

            const result = validator.validateConfig(config, 'openai');

            // 应该有警告
            expect(result.valid).toBe(false);
            const hasProviderWarning = result.errors.some((e) => e.includes('可能与提供商'));
            expect(hasProviderWarning).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当允许 OpenAI provider 使用 OpenAI 模型', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('gpt-4o-mini'),
            fc.constant('gpt-3.5-turbo'),
            fc.constant('gpt-4'),
            fc.constant('gpt-4-turbo')
          ),
          (openAIModel) => {
            const config = createValidConfig();
            config.chunkModel = openAIModel;

            const result = validator.validateConfig(config, 'openai');

            // 不应该有 provider 匹配警告
            const hasProviderWarning = result.errors.some((e) => e.includes('可能与提供商'));
            expect(hasProviderWarning).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当允许本地 provider 使用任意模型', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('ollama'), fc.constant('vllm'), fc.constant('openai-compatible')),
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => /^[a-zA-Z0-9\-_.]+$/.test(s)),
          (localProvider, anyModel) => {
            const config = createValidConfig();
            config.chunkModel = anyModel;

            const result = validator.validateConfig(config, localProvider);

            // 本地 provider 不应该有 provider 匹配警告
            const hasProviderWarning = result.errors.some((e) => e.includes('可能与提供商'));
            expect(hasProviderWarning).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当警告主模型和 chunk 模型来自不同系列', () => {
      fc.assert(
        fc.property(
          fc.record({
            primaryModel: fc.oneof(fc.constant('gpt-4'), fc.constant('gpt-4-turbo')),
            chunkModel: fc.oneof(fc.constant('gemini-1.5-flash'), fc.constant('gemini-pro')),
          }),
          ({ primaryModel, chunkModel }) => {
            const config = createValidConfig();
            config.modelName = primaryModel;
            config.chunkModel = chunkModel;

            const result = validator.validateConfig(config, 'openai');

            // 应该有不同系列的警告
            const hasFamilyWarning = result.errors.some((e) => e.includes('来自不同的模型系列'));
            expect(hasFamilyWarning).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('边界情况测试', () => {
    it('应当处理非常长的模型名称', () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.constantFrom('a', 'b', 'c', '1', '2', '3', '-', '_', '.'), {
              minLength: 100,
              maxLength: 200,
            })
            .map((arr) => arr.join('')),
          (longModelName: string) => {
            const config = createValidConfig();
            config.chunkModel = longModelName;

            const result = validator.validateConfig(config);

            // 只要格式有效，长度不应该是问题
            const hasFormatError = result.errors.some((e) => e.includes('模型名称格式无效'));
            expect(hasFormatError).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('应当处理单字符模型名称', () => {
      fc.assert(
        fc.property(fc.constantFrom('a', 'b', 'c', '1', '2', '3'), (singleChar) => {
          const config = createValidConfig();
          config.chunkModel = singleChar;

          const result = validator.validateConfig(config);

          // 单字符应该被接受
          const hasFormatError = result.errors.some((e) => e.includes('模型名称格式无效'));
          expect(hasFormatError).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('应当处理仅包含数字的模型名称', () => {
      fc.assert(
        fc.property(
          fc
            .array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9'), {
              minLength: 1,
              maxLength: 20,
            })
            .map((arr) => arr.join('')),
          (numericModel: string) => {
            const config = createValidConfig();
            config.chunkModel = numericModel;

            const result = validator.validateConfig(config);

            // 纯数字应该被接受
            const hasFormatError = result.errors.some((e) => e.includes('模型名称格式无效'));
            expect(hasFormatError).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当处理前后有空格的模型名称', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z0-9\-_.]+$/.test(s)),
          fc.nat({ max: 5 }),
          fc.nat({ max: 5 }),
          (modelName, leadingSpaces, trailingSpaces) => {
            const config = createValidConfig();
            config.chunkModel = ' '.repeat(leadingSpaces) + modelName + ' '.repeat(trailingSpaces);

            const result = validator.validateConfig(config);

            // 系统应该 trim 空格并验证
            // 如果 trim 后为空，应该报错
            if (modelName.trim() === '') {
              expect(result.valid).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('配置一致性测试', () => {
    it('应当保持验证结果的一致性', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => /^[a-zA-Z0-9\-_.]+$/.test(s)),
          (validModel) => {
            const config = createValidConfig();
            config.chunkModel = validModel;

            // 多次验证应该得到相同结果
            const result1 = validator.validateConfig(config);
            const result2 = validator.validateConfig(config);

            expect(result1.valid).toBe(result2.valid);
            expect(result1.errors.length).toBe(result2.errors.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当正确处理配置的多个错误', () => {
      fc.assert(
        fc.property(
          fc.record({
            apiKey: fc.constant(''),
            chunkModel: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => {
              const trimmed = s.trim();
              return trimmed !== '' && /[^a-zA-Z0-9\-_./]/.test(trimmed);
            }),
          }),
          ({ apiKey, chunkModel }) => {
            const config = createValidConfig();
            config.apiKey = apiKey;
            config.chunkModel = chunkModel;

            const result = validator.validateConfig(config);

            // 应该同时报告两个错误
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThanOrEqual(2);

            const hasApiKeyError = result.errors.some((e) => e.includes('API密钥'));
            const hasChunkModelError = result.errors.some((e) => e.includes('Chunk 模型'));

            expect(hasApiKeyError).toBe(true);
            expect(hasChunkModelError).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('真实世界模型名称测试', () => {
    it('应当接受常见的真实模型名称', () => {
      const realModels = [
        'gpt-4o-mini',
        'gpt-3.5-turbo',
        'gpt-4',
        'gpt-4-turbo',
        'gemini-1.5-flash',
        'gemini-pro',
        'gemini-1.5-pro',
        'qwen-turbo',
        'qwen-plus',
        'qwen-max',
        'llama2',
        'mistral',
        'codellama',
        'meta-llama/Llama-2-7b-chat-hf',
        'mistralai/Mistral-7B-v0.1',
        'claude-3-opus',
        'claude-3-sonnet',
      ];

      realModels.forEach((model) => {
        const config = createValidConfig();
        config.chunkModel = model;

        const result = validator.validateConfig(config);

        // 真实模型名称应该通过格式验证
        const hasFormatError = result.errors.some((e) => e.includes('模型名称格式无效'));
        expect(hasFormatError).toBe(false);
      });
    });

    it('应当拒绝包含空格的模型名称', () => {
      const invalidModels = ['gpt 4', 'gemini pro', 'qwen turbo', 'llama 2'];

      invalidModels.forEach((model) => {
        const config = createValidConfig();
        config.chunkModel = model;

        const result = validator.validateConfig(config);

        // 包含空格的模型名称应该被拒绝
        expect(result.valid).toBe(false);
        const hasFormatError = result.errors.some((e) => e.includes('模型名称格式无效'));
        expect(hasFormatError).toBe(true);
      });
    });
  });
});
