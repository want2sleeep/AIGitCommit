import { ConfigurationValidator } from '../ConfigurationValidator';
import { ExtensionConfig } from '../../types';

describe('ConfigurationValidator', () => {
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

  describe('chunkModel validation', () => {
    it('应当允许未配置 chunkModel', () => {
      const config = createValidConfig();
      const result = validator.validateConfig(config, 'openai');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应当允许有效的 chunkModel', () => {
      const config = createValidConfig();
      config.chunkModel = 'gpt-4o-mini';
      const result = validator.validateConfig(config, 'openai');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应当拒绝空字符串的 chunkModel', () => {
      const config = createValidConfig();
      config.chunkModel = '   ';
      const result = validator.validateConfig(config, 'openai');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Chunk 模型名称不能为空字符串'))).toBe(true);
      expect(result.errors.some((e) => e.includes('💡 修复建议'))).toBe(true);
    });

    it('应当拒绝包含特殊字符的 chunkModel', () => {
      const config = createValidConfig();
      config.chunkModel = 'gpt-4@mini';
      const result = validator.validateConfig(config, 'openai');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('模型名称格式无效'))).toBe(true);
    });

    it('应当允许包含连字符、下划线和点的 chunkModel', () => {
      const config = createValidConfig();
      config.chunkModel = 'gpt-4o_mini.v1';
      const result = validator.validateConfig(config, 'openai');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应当警告 OpenAI provider 使用非 OpenAI 模型', () => {
      const config = createValidConfig();
      config.chunkModel = 'gemini-1.5-flash';
      const result = validator.validateConfig(config, 'openai');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('可能与提供商'))).toBe(true);
    });

    it('应当警告 Gemini provider 使用非 Gemini 模型', () => {
      const config = createValidConfig();
      config.modelName = 'gemini-pro';
      config.chunkModel = 'gpt-4o-mini';
      const result = validator.validateConfig(config, 'gemini');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('可能与提供商'))).toBe(true);
    });

    it('应当允许 Ollama provider 使用任意模型', () => {
      const config = createValidConfig();
      config.chunkModel = 'llama2';
      const result = validator.validateConfig(config, 'ollama');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应当允许 OpenAI-compatible provider 使用任意模型', () => {
      const config = createValidConfig();
      config.chunkModel = 'custom-model-name';
      const result = validator.validateConfig(config, 'openai-compatible');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应当警告主模型和 chunk 模型来自不同系列', () => {
      const config = createValidConfig();
      config.modelName = 'gpt-4';
      config.chunkModel = 'gemini-1.5-flash';
      const result = validator.validateConfig(config, 'openai');

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('来自不同的模型系列'))).toBe(true);
    });

    it('应当允许相同系列的模型', () => {
      const config = createValidConfig();
      config.modelName = 'gpt-4';
      config.chunkModel = 'gpt-4o-mini';
      const result = validator.validateConfig(config, 'openai');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应当在没有 provider 参数时跳过 provider 匹配验证', () => {
      const config = createValidConfig();
      config.chunkModel = 'gemini-1.5-flash';
      const result = validator.validateConfig(config);

      // 应该只验证格式，不验证 provider 匹配
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('existing validations', () => {
    it('应当验证完整的配置（包括 chunkModel）', () => {
      const config = createValidConfig();
      config.chunkModel = 'gpt-4o-mini';
      const result = validator.validateConfig(config, 'openai');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应当同时报告多个错误（包括 chunkModel 错误）', () => {
      const config = createValidConfig();
      config.apiKey = '';
      config.chunkModel = '   ';
      const result = validator.validateConfig(config, 'openai');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors.some((e) => e.includes('API密钥'))).toBe(true);
      expect(result.errors.some((e) => e.includes('Chunk 模型'))).toBe(true);
    });
  });

  describe('验证错误提示和确认信息', () => {
    it('应当为有效配置生成成功摘要', () => {
      const config = createValidConfig();
      const result = validator.validateConfig(config);
      const summary = validator.getValidationSummary(result);
      expect(summary).toContain('✅');
      expect(summary).toContain('配置验证通过');
    });

    it('应当为无效配置生成错误摘要', () => {
      const config = createValidConfig();
      config.apiKey = '';
      const result = validator.validateConfig(config);
      const summary = validator.getValidationSummary(result);
      expect(summary).toContain('配置验证发现');
      expect(summary).toContain('个问题');
      expect(summary).toContain('API密钥不能为空');
    });

    it('应当区分错误和警告', () => {
      const config = createValidConfig();
      config.chunkModel = 'gemini-1.5-flash';
      config.modelName = 'gpt-4';
      const result = validator.validateConfig(config, 'openai');
      const summary = validator.getValidationSummary(result);
      expect(summary).toContain('警告');
    });

    it('应当为未配置 chunkModel 生成确认信息', () => {
      const confirmation = validator.getChunkModelConfirmation(undefined, 'gpt-4', 'openai');
      expect(confirmation).toContain('✅');
      expect(confirmation).toContain('未配置');
      expect(confirmation).toContain('智能降级');
    });

    it('应当为有效 chunkModel 生成确认信息', () => {
      const confirmation = validator.getChunkModelConfirmation('gpt-4o-mini', 'gpt-4', 'openai');
      expect(confirmation).toContain('✅');
      expect(confirmation).toContain('gpt-4o-mini');
      expect(confirmation).toContain('Map 阶段');
    });

    it('应当为不匹配的 chunkModel 生成警告确认信息', () => {
      const confirmation = validator.getChunkModelConfirmation(
        'gemini-1.5-flash',
        'gpt-4',
        'openai'
      );
      expect(confirmation).toContain('⚠️');
      expect(confirmation).toContain('不匹配');
    });

    it('应当为本地提供商生成确认信息', () => {
      const confirmation = validator.getChunkModelConfirmation('llama2', 'mistral', 'ollama');
      expect(confirmation).toContain('✅');
      expect(confirmation).not.toContain('⚠️');
    });

    it('应当为空字符串 chunkModel 生成确认信息', () => {
      const confirmation = validator.getChunkModelConfirmation('', 'gpt-4', 'openai');
      expect(confirmation).toContain('✅');
      expect(confirmation).toContain('未配置');
    });

    it('应当在摘要中列出所有错误', () => {
      const config = createValidConfig();
      config.apiKey = '';
      config.modelName = '';
      config.chunkModel = '   ';
      const result = validator.validateConfig(config);
      const summary = validator.getValidationSummary(result);

      expect(summary).toContain('1.');
      expect(summary).toContain('2.');
      expect(summary).toContain('3.');
      expect(summary).toContain('API密钥');
      expect(summary).toContain('模型名称');
      expect(summary).toContain('Chunk 模型');
    });

    it('应当正确计算错误和警告数量', () => {
      const config = createValidConfig();
      config.chunkModel = 'gemini-1.5-flash'; // 这会产生警告
      const result = validator.validateConfig(config, 'openai');
      const summary = validator.getValidationSummary(result);

      expect(summary).toContain('警告');
      expect(summary).toMatch(/\d+\s*个警告/);
    });
  });
});
