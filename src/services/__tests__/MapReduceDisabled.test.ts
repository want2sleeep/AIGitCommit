/**
 * Map-Reduce 禁用测试
 * 验证需求 7.2: 当用户禁用了 Map-Reduce 功能时，系统应当忽略 chunkModel 配置
 *
 * Feature: hybrid-model-strategy, Task 8.2: 处理 Map-Reduce 禁用的情况
 */

import { LargeDiffHandler } from '../LargeDiffHandler';
import { TokenEstimator } from '../TokenEstimator';
import { DiffSplitter } from '../DiffSplitter';
import { ChunkProcessor } from '../ChunkProcessor';
import { SummaryMerger } from '../SummaryMerger';
import { LLMService } from '../LLMService';
import { ModelSelector } from '../ModelSelector';
import { LogManager } from '../LogManager';
import { FullConfig, GitChange, ChangeStatus } from '../../types';
import { ProcessConfig } from '../../types/interfaces';

describe('Map-Reduce 禁用测试', () => {
  let tokenEstimator: TokenEstimator;
  let diffSplitter: DiffSplitter;
  let chunkProcessor: ChunkProcessor;
  let summaryMerger: SummaryMerger;
  let summaryGenerator: LLMService;
  let modelSelector: ModelSelector;
  let logger: LogManager;

  beforeEach(() => {
    logger = new LogManager();
    tokenEstimator = new TokenEstimator('gpt-4', {
      enableMapReduce: true,
      safetyMarginPercent: 10,
      maxConcurrentRequests: 5,
    });
    diffSplitter = new DiffSplitter(tokenEstimator);
    summaryGenerator = {
      generateSummary: jest.fn().mockResolvedValue('Generated summary'),
    } as unknown as LLMService;
    chunkProcessor = new ChunkProcessor(summaryGenerator);
    summaryMerger = new SummaryMerger(tokenEstimator, summaryGenerator);
    modelSelector = new ModelSelector(logger);
  });

  describe('需求 7.2: Map-Reduce 禁用时忽略 chunkModel', () => {
    it('应当在 Map-Reduce 禁用时忽略 chunkModel 配置', async () => {
      // 创建一个配置了 chunkModel 的配置对象
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: 'gpt-4o-mini', // 配置了 chunk 模型
      };

      // 创建 LargeDiffHandler，禁用 Map-Reduce
      const handler = new LargeDiffHandler(
        tokenEstimator,
        diffSplitter,
        chunkProcessor,
        summaryMerger,
        summaryGenerator,
        {
          enableMapReduce: false, // 禁用 Map-Reduce
          maxConcurrentRequests: 5,
          maxRetries: 3,
          initialRetryDelay: 1000,
        },
        undefined,
        undefined,
        modelSelector
      );

      // 创建一个大型 diff（会触发拆分逻辑）
      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(10000), // 大型 diff
          additions: 100,
          deletions: 0,
        },
      ];

      // 监听 generateSummary 调用
      const generateSummarySpy = jest.spyOn(summaryGenerator, 'generateSummary');

      // 处理变更
      await handler.handle(changes, config);

      // 验证：generateSummary 应当被调用，但不应传入 modelId
      expect(generateSummarySpy).toHaveBeenCalled();

      // 获取调用参数
      const callArgs = generateSummarySpy.mock.calls[0];

      // 第二个参数应该是 undefined 或者不包含 modelId
      if (callArgs && callArgs.length > 1) {
        const options = callArgs[1];
        expect(options?.modelId).toBeUndefined();
      }
    });

    it('应当在 Map-Reduce 禁用时使用主模型处理所有阶段', async () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: 'gpt-4o-mini', // 配置了 chunk 模型，但应被忽略
      };

      const handler = new LargeDiffHandler(
        tokenEstimator,
        diffSplitter,
        chunkProcessor,
        summaryMerger,
        summaryGenerator,
        {
          enableMapReduce: false, // 禁用 Map-Reduce
          maxConcurrentRequests: 5,
          maxRetries: 3,
          initialRetryDelay: 1000,
        },
        undefined,
        undefined,
        modelSelector
      );

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(10000),
          additions: 100,
          deletions: 0,
        },
      ];

      // 监听 ModelSelector 的调用
      const selectMapModelSpy = jest.spyOn(modelSelector, 'selectMapModel');

      await handler.handle(changes, config);

      // 验证：ModelSelector 不应被调用（因为 Map-Reduce 被禁用）
      expect(selectMapModelSpy).not.toHaveBeenCalled();
    });

    it('应当记录 Map-Reduce 禁用的日志', async () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: 'gpt-4o-mini',
      };

      const handler = new LargeDiffHandler(
        tokenEstimator,
        diffSplitter,
        chunkProcessor,
        summaryMerger,
        summaryGenerator,
        {
          enableMapReduce: false,
          maxConcurrentRequests: 5,
          maxRetries: 3,
          initialRetryDelay: 1000,
        },
        undefined,
        undefined,
        modelSelector
      );

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(10000),
          additions: 100,
          deletions: 0,
        },
      ];

      // 监听 console.log
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.handle(changes, config);

      // 验证：应当记录 Map-Reduce 禁用的日志
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Map-Reduce 已禁用'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('忽略 chunkModel 配置'));

      consoleLogSpy.mockRestore();
    });

    it('应当在 Map-Reduce 禁用时使用截断行为', async () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: 'gpt-4o-mini',
      };

      const handler = new LargeDiffHandler(
        tokenEstimator,
        diffSplitter,
        chunkProcessor,
        summaryMerger,
        summaryGenerator,
        {
          enableMapReduce: false,
          maxConcurrentRequests: 5,
          maxRetries: 3,
          initialRetryDelay: 1000,
        },
        undefined,
        undefined,
        modelSelector
      );

      // 创建一个超大 diff
      const largeDiff = 'a'.repeat(50000);
      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: largeDiff,
          additions: 500,
          deletions: 0,
        },
      ];

      const generateSummarySpy = jest.spyOn(summaryGenerator, 'generateSummary');

      await handler.handle(changes, config);

      // 验证：generateSummary 应当被调用
      expect(generateSummarySpy).toHaveBeenCalled();

      // 获取传入的 diff
      const callArgs = generateSummarySpy.mock.calls[0];
      if (callArgs) {
        const processedDiff = callArgs[0];

        // 验证：diff 应当被截断（长度小于原始 diff）
        expect(processedDiff.length).toBeLessThan(largeDiff.length);
      }
    });

    it('应当在 Map-Reduce 禁用且 diff 较小时直接处理', async () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: 'gpt-4o-mini',
      };

      const handler = new LargeDiffHandler(
        tokenEstimator,
        diffSplitter,
        chunkProcessor,
        summaryMerger,
        summaryGenerator,
        {
          enableMapReduce: false,
          maxConcurrentRequests: 5,
          maxRetries: 3,
          initialRetryDelay: 1000,
        },
        undefined,
        undefined,
        modelSelector
      );

      // 创建一个小型 diff（不需要拆分）
      const smallDiff = 'small change';
      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: smallDiff,
          additions: 1,
          deletions: 0,
        },
      ];

      const generateSummarySpy = jest.spyOn(summaryGenerator, 'generateSummary');

      await handler.handle(changes, config);

      // 验证：generateSummary 应当被调用一次
      expect(generateSummarySpy).toHaveBeenCalledTimes(1);

      // 验证：不应传入 modelId
      const callArgs = generateSummarySpy.mock.calls[0];
      if (callArgs && callArgs.length > 1) {
        const options = callArgs[1];
        expect(options?.modelId).toBeUndefined();
      }
    });
  });

  describe('与 Map-Reduce 启用时的对比', () => {
    it('应当在 Map-Reduce 启用时使用 chunkModel', async () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: 'gpt-4o-mini',
      };

      // 创建 LargeDiffHandler，启用 Map-Reduce
      const handler = new LargeDiffHandler(
        tokenEstimator,
        diffSplitter,
        chunkProcessor,
        summaryMerger,
        summaryGenerator,
        {
          enableMapReduce: true, // 启用 Map-Reduce
          maxConcurrentRequests: 5,
          maxRetries: 3,
          initialRetryDelay: 1000,
        },
        undefined,
        undefined,
        modelSelector
      );

      // 创建一个大型 diff（会触发拆分）
      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(10000),
          additions: 100,
          deletions: 0,
        },
      ];

      // 监听 ModelSelector 的调用
      const selectMapModelSpy = jest.spyOn(modelSelector, 'selectMapModel');

      await handler.handle(changes, config);

      // 验证：ModelSelector 应当被调用（因为 Map-Reduce 启用）
      expect(selectMapModelSpy).toHaveBeenCalled();
    });

    it('应当在 Map-Reduce 启用时传递 modelId 到 ChunkProcessor', async () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: 'gpt-4o-mini',
      };

      const handler = new LargeDiffHandler(
        tokenEstimator,
        diffSplitter,
        chunkProcessor,
        summaryMerger,
        summaryGenerator,
        {
          enableMapReduce: true,
          maxConcurrentRequests: 5,
          maxRetries: 3,
          initialRetryDelay: 1000,
        },
        undefined,
        undefined,
        modelSelector
      );

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(10000),
          additions: 100,
          deletions: 0,
        },
      ];

      // 监听 ChunkProcessor 的 processChunks 方法
      const processChunksSpy = jest.spyOn(chunkProcessor, 'processChunks');

      await handler.handle(changes, config);

      // 验证：processChunks 应当被调用，且配置中包含 mapModelId
      expect(processChunksSpy).toHaveBeenCalled();
      const callArgs = processChunksSpy.mock.calls[0];
      if (callArgs) {
        const processConfig = callArgs[1] as ProcessConfig;
        expect(processConfig.mapModelId).toBeDefined();
        expect(processConfig.mapModelId).toBe('gpt-4o-mini');
      }
    });
  });

  describe('边缘情况', () => {
    it('应当在 Map-Reduce 禁用且未配置 chunkModel 时正常工作', async () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        // 未配置 chunkModel
      };

      const handler = new LargeDiffHandler(
        tokenEstimator,
        diffSplitter,
        chunkProcessor,
        summaryMerger,
        summaryGenerator,
        {
          enableMapReduce: false,
          maxConcurrentRequests: 5,
          maxRetries: 3,
          initialRetryDelay: 1000,
        },
        undefined,
        undefined,
        modelSelector
      );

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(10000),
          additions: 100,
          deletions: 0,
        },
      ];

      // 应当不抛出错误
      await expect(handler.handle(changes, config)).resolves.toBeDefined();
    });

    it('应当在 Map-Reduce 禁用且未注入 ModelSelector 时正常工作', async () => {
      const config: FullConfig = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiKey: 'test-key',
        apiEndpoint: 'https://api.openai.com/v1',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 2000,
        temperature: 0.7,
        chunkModel: 'gpt-4o-mini',
      };

      // 创建 LargeDiffHandler，不注入 ModelSelector
      const handler = new LargeDiffHandler(
        tokenEstimator,
        diffSplitter,
        chunkProcessor,
        summaryMerger,
        summaryGenerator,
        {
          enableMapReduce: false,
          maxConcurrentRequests: 5,
          maxRetries: 3,
          initialRetryDelay: 1000,
        }
        // 注意：没有传入 ModelSelector
      );

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(10000),
          additions: 100,
          deletions: 0,
        },
      ];

      // 应当不抛出错误
      await expect(handler.handle(changes, config)).resolves.toBeDefined();
    });
  });
});
