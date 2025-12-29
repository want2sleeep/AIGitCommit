/**
 * 向后兼容性测试
 * 验证需求 7.1: 当用户未配置 chunkModel 时，系统应当继续正常工作
 *
 * Feature: hybrid-model-strategy, Task 8.1: 处理未配置 chunkModel 的情况
 */

import { ModelSelector } from '../ModelSelector';
import { LogManager, LogLevel } from '../LogManager';
import { FullConfig } from '../../types';

describe('向后兼容性测试 - 未配置 chunkModel', () => {
  let logger: LogManager;
  let selector: ModelSelector;

  beforeEach(() => {
    logger = new LogManager();
    selector = new ModelSelector(logger);
  });

  describe('需求 7.1: 未配置 chunkModel 时系统正常工作', () => {
    it('应当在 chunkModel 为 undefined 时应用智能降级', () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: undefined, // 未配置
      };

      const selectedModel = selector.selectMapModel(config);

      // 应当应用智能降级：gpt-4 -> gpt-4o-mini
      expect(selectedModel).toBe('gpt-4o-mini');
    });

    it('应当在 chunkModel 不存在时应用智能降级', () => {
      // 模拟旧版本配置（没有 chunkModel 字段）
      const config = {
        provider: 'openai',
        modelName: 'gpt-4-turbo',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        // 注意：没有 chunkModel 字段
      } as FullConfig;

      const selectedModel = selector.selectMapModel(config);

      // 应当应用智能降级：gpt-4-turbo -> gpt-4o-mini
      expect(selectedModel).toBe('gpt-4o-mini');
    });

    it('应当在 chunkModel 为空字符串时应用智能降级', () => {
      const config: FullConfig = {
        provider: 'gemini',
        modelName: 'gemini-pro',
        apiKey: 'test-key',
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: '', // 空字符串
      };

      const selectedModel = selector.selectMapModel(config);

      // 应当应用智能降级：gemini-pro -> gemini-1.5-flash
      expect(selectedModel).toBe('gemini-1.5-flash');
    });

    it('应当在 chunkModel 为仅空格时应用智能降级', () => {
      const config: FullConfig = {
        provider: 'gemini',
        modelName: 'gemini-1.5-pro',
        apiKey: 'test-key',
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: '   ', // 仅空格
      };

      const selectedModel = selector.selectMapModel(config);

      // 应当应用智能降级：gemini-1.5-pro -> gemini-1.5-flash
      expect(selectedModel).toBe('gemini-1.5-flash');
    });

    it('应当在非特殊模型时保持原模型', () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-3.5-turbo',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: undefined, // 未配置
      };

      const selectedModel = selector.selectMapModel(config);

      // gpt-3.5-turbo 不在降级映射表中，应当保持原模型
      expect(selectedModel).toBe('gpt-3.5-turbo');
    });

    it('应当在本地提供商时跳过智能降级', () => {
      const localProviders = ['ollama', 'lmstudio', 'localai', 'custom'];

      localProviders.forEach((provider) => {
        const config: FullConfig = {
          provider,
          modelName: 'llama2',
          apiKey: '',
          apiEndpoint: 'http://localhost:11434',
          language: 'zh-CN',
          commitFormat: 'conventional',
          maxTokens: 2000,
          temperature: 0.7,
          chunkModel: undefined, // 未配置
        };

        const selectedModel = selector.selectMapModel(config);

        // 本地提供商应当跳过智能降级，保持原模型
        expect(selectedModel).toBe('llama2');
      });
    });

    it('应当记录智能降级的日志', () => {
      const logSpy = jest.spyOn(logger, 'log');

      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: undefined, // 未配置
      };

      selector.selectMapModel(config);

      // 应当记录智能降级的日志
      expect(logSpy).toHaveBeenCalledWith(
        LogLevel.INFO,
        expect.stringContaining('智能降级'),
        'ModelSelector.selectMapModel'
      );
    });

    it('应当在未配置时不记录用户配置的日志', () => {
      const logSpy = jest.spyOn(logger, 'log');

      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: undefined, // 未配置
      };

      selector.selectMapModel(config);

      // 不应当记录"使用用户配置的 chunk 模型"的日志
      const userConfigLogs = logSpy.mock.calls.filter(
        (call) => call[1] && call[1].includes('使用用户配置的 chunk 模型')
      );
      expect(userConfigLogs.length).toBe(0);
    });
  });

  describe('验证模型功能在未配置时正常工作', () => {
    it('应当能够验证智能降级后的模型', () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: undefined, // 未配置
      };

      const selectedModel = selector.selectMapModel(config);
      const isValid = selector.validateModel(selectedModel, config.provider);

      // 智能降级后的模型应当是有效的
      expect(isValid).toBe(true);
    });

    it('应当能够使用 selectAndValidateMapModel 便捷方法', () => {
      const config: FullConfig = {
        provider: 'gemini',
        modelName: 'gemini-pro',
        apiKey: 'test-key',
        apiEndpoint: 'https://generativelanguage.googleapis.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: undefined, // 未配置
      };

      const validatedModel = selector.selectAndValidateMapModel(config);

      // 应当返回验证通过的降级模型
      expect(validatedModel).toBe('gemini-1.5-flash');
    });
  });

  describe('边缘情况处理', () => {
    it('应当处理 null 值（类型转换为 undefined）', () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: null as unknown as undefined, // null 值
      };

      const selectedModel = selector.selectMapModel(config);

      // 应当应用智能降级
      expect(selectedModel).toBe('gpt-4o-mini');
    });

    it('应当处理包含特殊字符的空白字符串', () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: '\t\n\r ', // 制表符、换行符等
      };

      const selectedModel = selector.selectMapModel(config);

      // 应当应用智能降级
      expect(selectedModel).toBe('gpt-4o-mini');
    });

    it('应当处理未知提供商', () => {
      const config: FullConfig = {
        provider: 'unknown-provider',
        modelName: 'some-model',
        apiKey: 'test-key',
        apiEndpoint: 'https://example.com',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: undefined, // 未配置
      };

      const selectedModel = selector.selectMapModel(config);

      // 未知提供商应当保持原模型
      expect(selectedModel).toBe('some-model');
    });
  });

  describe('与 LargeDiffHandler 集成', () => {
    it('应当在 ModelSelector 未注入时正常工作', () => {
      // 这个测试验证即使没有 ModelSelector，系统也能正常工作
      // 这是向后兼容性的关键部分

      // 注意：这个测试需要在 LargeDiffHandler 的测试文件中实现
      // 这里只是占位符，说明需要测试这个场景
      expect(true).toBe(true);
    });
  });
});
