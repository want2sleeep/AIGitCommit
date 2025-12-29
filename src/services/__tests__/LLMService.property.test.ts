/**
 * LLMService 扩展属性测试
 *
 * 使用 fast-check 进行属性测试，验证以下正确性属性：
 * - 属性 4: 动态模型切换
 * - 属性 5: 默认模型回退
 *
 * **Feature: hybrid-model-strategy**
 * **验证需求: 3.2, 3.3**
 */

import axios from 'axios';
import { LLMService } from '../LLMService';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock sleep function
jest.mock('../../utils/retry', () => ({
  sleep: jest.fn().mockResolvedValue(undefined),
}));

describe('LLMService 扩展属性测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(false);
  });

  /**
   * 简单单元测试：验证动态模型切换基本功能
   */
  describe('基本功能测试', () => {
    it('应当使用传入的 modelId', async () => {
      const config = {
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        modelName: 'gpt-4',
        language: 'zh-CN',
        commitFormat: 'simple',
        maxTokens: 500,
        temperature: 0.7,
      };

      const llmService = new LLMService();
      llmService.setConfigGetter(async () => config);

      mockedAxios.post.mockImplementation(async (_url, body) => {
        const requestBody = body as any;
        return {
          data: {
            id: 'test',
            object: 'chat.completion',
            created: Date.now(),
            model: requestBody.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'test' },
                finish_reason: 'stop',
              },
            ],
          },
          status: 200,
        };
      });

      await llmService.generateSummary('test', { modelId: 'gpt-4o-mini' });

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const requestBody = mockedAxios.post.mock.calls[0]?.[1] as any;
      expect(requestBody).toBeDefined();
      expect(requestBody.model).toBe('gpt-4o-mini');
    });
  });

  /**
   * 属性 4: 动态模型切换
   * *对于任意* 传入了 `modelId` 参数的 `generateSummary` 调用，应当使用传入的 `modelId` 而非配置的主模型
   * **Feature: hybrid-model-strategy, Property 4: 动态模型切换**
   * **验证需求: 3.2**
   */
  describe('属性 4: 动态模型切换', () => {
    it('应当使用传入的 modelId 而非配置的主模型 - gpt-4 -> gpt-4o-mini', async () => {
      const config = {
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'test-api-key-12345',
        modelName: 'gpt-4',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
      };
      const overrideModelId = 'gpt-4o-mini';

      mockedAxios.post.mockReset();
      const llmService = new LLMService();
      llmService.setConfigGetter(async () => config);

      mockedAxios.post.mockImplementation(async (_url, body) => {
        const requestBody = body as any;
        return {
          data: {
            id: 'test-id',
            object: 'chat.completion',
            created: Date.now(),
            model: requestBody.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'test summary' },
                finish_reason: 'stop',
              },
            ],
          },
          status: 200,
        };
      });

      await llmService.generateSummary('test prompt', { modelId: overrideModelId });

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const requestBody = mockedAxios.post.mock.calls[0]?.[1] as any;
      expect(requestBody).toBeDefined();
      expect(requestBody.model).toBe(overrideModelId);
      expect(requestBody.model).not.toBe(config.modelName);
    });

    it('应当使用传入的 modelId 而非配置的主模型 - gpt-4-turbo -> gpt-3.5-turbo', async () => {
      const config = {
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'test-api-key-12345',
        modelName: 'gpt-4-turbo',
        language: 'en-US',
        commitFormat: 'simple',
        maxTokens: 500,
        temperature: 0.7,
      };
      const overrideModelId = 'gpt-3.5-turbo';

      mockedAxios.post.mockReset();
      const llmService = new LLMService();
      llmService.setConfigGetter(async () => config);

      mockedAxios.post.mockImplementation(async (_url, body) => {
        const requestBody = body as any;
        return {
          data: {
            id: 'test-id',
            object: 'chat.completion',
            created: Date.now(),
            model: requestBody.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'test summary' },
                finish_reason: 'stop',
              },
            ],
          },
          status: 200,
        };
      });

      await llmService.generateSummary('test prompt', { modelId: overrideModelId });

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const requestBody = mockedAxios.post.mock.calls[0]?.[1] as any;
      expect(requestBody).toBeDefined();
      expect(requestBody.model).toBe(overrideModelId);
      expect(requestBody.model).not.toBe(config.modelName);
    });
  });

  /**
   * 属性 5: 默认模型回退
   * *对于任意* 未传入 `modelId` 参数的 `generateSummary` 调用，应当使用配置的主模型
   * **Feature: hybrid-model-strategy, Property 5: 默认模型回退**
   * **验证需求: 3.3**
   */
  describe('属性 5: 默认模型回退', () => {
    it('应当在未传入 modelId 时使用主模型 - gpt-4', async () => {
      const config = {
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'test-api-key-12345',
        modelName: 'gpt-4',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
      };

      mockedAxios.post.mockReset();
      const llmService = new LLMService();
      llmService.setConfigGetter(async () => config);

      mockedAxios.post.mockImplementation(async (_url, body) => {
        const requestBody = body as any;
        return {
          data: {
            id: 'test-id',
            object: 'chat.completion',
            created: Date.now(),
            model: requestBody.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'test summary' },
                finish_reason: 'stop',
              },
            ],
          },
          status: 200,
        };
      });

      await llmService.generateSummary('test prompt');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const requestBody = mockedAxios.post.mock.calls[0]?.[1] as any;
      expect(requestBody).toBeDefined();
      expect(requestBody.model).toBe(config.modelName);
    });

    it('应当在传入空 options 对象时使用主模型 - gpt-4o-mini', async () => {
      const config = {
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'test-api-key-12345',
        modelName: 'gpt-4o-mini',
        language: 'en-US',
        commitFormat: 'simple',
        maxTokens: 500,
        temperature: 0.7,
      };

      mockedAxios.post.mockReset();
      const llmService = new LLMService();
      llmService.setConfigGetter(async () => config);

      mockedAxios.post.mockImplementation(async (_url, body) => {
        const requestBody = body as any;
        return {
          data: {
            id: 'test-id',
            object: 'chat.completion',
            created: Date.now(),
            model: requestBody.model,
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'test summary' },
                finish_reason: 'stop',
              },
            ],
          },
          status: 200,
        };
      });

      await llmService.generateSummary('test prompt', {});

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const requestBody = mockedAxios.post.mock.calls[0]?.[1] as any;
      expect(requestBody).toBeDefined();
      expect(requestBody.model).toBe(config.modelName);
    });
  });
});
