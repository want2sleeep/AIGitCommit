/**
 * 混合模型策略集成测试
 *
 * 测试完整的混合模型策略流程，包括：
 * 1. ModelSelector、LLMService、LargeDiffHandler、ChunkProcessor 的集成
 * 2. 与现有 Map-Reduce 功能的集成
 * 3. 配置变更的影响
 *
 * **Feature: hybrid-model-strategy**
 * **验证需求: 所有**
 */

import { ModelSelector } from '../ModelSelector';
import { LargeDiffHandler } from '../LargeDiffHandler';
import { ChunkProcessor } from '../ChunkProcessor';
import { LLMService } from '../LLMService';
import { LogManager } from '../LogManager';
import { HybridModelFeedback } from '../HybridModelFeedback';
import {
  ITokenEstimator,
  IDiffSplitter,
  ISummaryMerger,
  DiffChunk,
  ChunkSummary,
} from '../../types/interfaces';
import { FullConfig, GitChange, ChangeStatus } from '../../types';
import { DiffSplitLevel } from '../../constants';

// Mock 实现
class MockTokenEstimator implements ITokenEstimator {
  private threshold: number;

  constructor(threshold: number = 1000) {
    this.threshold = threshold;
  }

  estimate(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getEffectiveLimit(): number {
    return this.threshold;
  }

  needsSplit(text: string): boolean {
    return this.estimate(text) > this.getEffectiveLimit();
  }

  getModelLimit(_modelName: string): number {
    return 4000;
  }
}

class MockDiffSplitter implements IDiffSplitter {
  split(diff: string, maxTokens: number): DiffChunk[] {
    // 简单按行拆分
    const lines = diff.split('\n');
    const chunks: DiffChunk[] = [];
    let currentChunk: string[] = [];
    let currentTokens = 0;

    for (const line of lines) {
      const lineTokens = Math.ceil(line.length / 4);
      if (currentTokens + lineTokens > maxTokens && currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join('\n'),
          filePath: 'test.ts',
          chunkIndex: chunks.length,
          totalChunks: 0, // 稍后更新
          splitLevel: DiffSplitLevel.File,
          context: {
            fileHeader: 'diff --git a/test.ts b/test.ts',
            functionName: undefined,
          },
        });
        currentChunk = [];
        currentTokens = 0;
      }
      currentChunk.push(line);
      currentTokens += lineTokens;
    }

    if (currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.join('\n'),
        filePath: 'test.ts',
        chunkIndex: chunks.length,
        totalChunks: 0,
        splitLevel: DiffSplitLevel.File,
        context: {
          fileHeader: 'diff --git a/test.ts b/test.ts',
          functionName: undefined,
        },
      });
    }

    // 更新 totalChunks
    chunks.forEach((chunk) => {
      chunk.totalChunks = chunks.length;
    });

    return chunks;
  }

  splitByFiles(_diff: string): DiffChunk[] {
    return [];
  }

  splitByHunks(_fileDiff: string, _maxTokens: number): DiffChunk[] {
    return [];
  }

  splitByLines(_hunk: string, _maxTokens: number): DiffChunk[] {
    return [];
  }
}

class MockSummaryMerger implements ISummaryMerger {
  async merge(summaries: ChunkSummary[], _config: FullConfig): Promise<string> {
    const successfulSummaries = summaries.filter((s) => s.success);
    return `Merged ${successfulSummaries.length} summaries`;
  }

  async recursiveMerge(summaries: ChunkSummary[], _config: FullConfig): Promise<string> {
    return this.merge(summaries, _config);
  }
}

// Mock LLMService 用于测试
class MockLLMService extends LLMService {
  private callLog: Array<{ modelId?: string; prompt: string }> = [];

  override async generateSummary(prompt: string, options?: { modelId?: string }): Promise<string> {
    // 记录调用
    this.callLog.push({
      modelId: options?.modelId,
      prompt,
    });

    // 返回包含模型信息的摘要
    const modelInfo = options?.modelId ? ` (model: ${options.modelId})` : '';
    return `Summary${modelInfo}: ${prompt.substring(0, 50)}...`;
  }

  getCallLog(): Array<{ modelId?: string; prompt: string }> {
    return this.callLog;
  }

  clearCallLog(): void {
    this.callLog = [];
  }
}

// Mock OutputChannel
class MockOutputChannel {
  private logs: string[] = [];

  appendLine(value: string): void {
    this.logs.push(value);
  }

  getLogs(): string[] {
    return this.logs;
  }

  clear(): void {
    this.logs = [];
  }

  show(): void {
    // No-op
  }

  hide(): void {
    // No-op
  }

  dispose(): void {
    // No-op
  }
}

describe('混合模型策略集成测试', () => {
  let mockLogger: LogManager;
  let mockOutputChannel: MockOutputChannel;
  let modelSelector: ModelSelector;
  let mockLLMService: MockLLMService;
  let chunkProcessor: ChunkProcessor;
  let largeDiffHandler: LargeDiffHandler;
  let hybridModelFeedback: HybridModelFeedback;

  const createMockConfig = (overrides?: Partial<FullConfig>): FullConfig => ({
    provider: 'openai',
    modelName: 'gpt-4',
    apiEndpoint: 'https://api.openai.com/v1',
    apiKey: 'test-key',
    language: 'zh-CN',
    commitFormat: 'conventional',
    maxTokens: 1000,
    temperature: 0.7,
    chunkModel: undefined,
    ...overrides,
  });

  beforeEach(() => {
    // 创建 mock 实例
    mockLogger = {
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockOutputChannel = new MockOutputChannel();
    modelSelector = new ModelSelector(mockLogger);
    mockLLMService = new MockLLMService();
    chunkProcessor = new ChunkProcessor(mockLLMService);

    hybridModelFeedback = new HybridModelFeedback(mockOutputChannel as any);

    largeDiffHandler = new LargeDiffHandler(
      new MockTokenEstimator(500), // 低阈值以触发拆分
      new MockDiffSplitter(),
      chunkProcessor,
      new MockSummaryMerger(),
      mockLLMService,
      { enableMapReduce: true },
      undefined,
      undefined,
      modelSelector,
      hybridModelFeedback
    );
  });

  afterEach(() => {
    mockLLMService.clearCallLog();
    mockOutputChannel.clear();
  });

  describe('完整的混合模型策略流程', () => {
    it('应当在配置了 chunkModel 时使用混合模型策略', async () => {
      const config = createMockConfig({
        chunkModel: 'gpt-4o-mini',
      });

      // 创建大型 diff（超过阈值）
      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000), // 超过阈值，会触发拆分
          additions: 100,
          deletions: 50,
        },
      ];

      const result = await largeDiffHandler.handle(changes, config);

      // 验证结果
      expect(result).toBeTruthy();

      // 验证 Map 阶段使用了 chunkModel
      const callLog = mockLLMService.getCallLog();
      expect(callLog.length).toBeGreaterThan(0);

      // 检查是否有调用使用了 chunkModel
      const mapCalls = callLog.filter((call) => call.modelId === 'gpt-4o-mini');
      expect(mapCalls.length).toBeGreaterThan(0);
    });

    it('应当在未配置 chunkModel 时使用智能降级', async () => {
      const config = createMockConfig({
        provider: 'openai',
        modelName: 'gpt-4',
        chunkModel: undefined, // 未配置
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      const result = await largeDiffHandler.handle(changes, config);

      expect(result).toBeTruthy();

      // 验证智能降级：gpt-4 -> gpt-4o-mini
      const callLog = mockLLMService.getCallLog();
      const mapCalls = callLog.filter((call) => call.modelId === 'gpt-4o-mini');
      expect(mapCalls.length).toBeGreaterThan(0);
    });

    it('应当在 Map 阶段使用轻量级模型，Reduce 阶段使用主模型', async () => {
      const config = createMockConfig({
        provider: 'openai',
        modelName: 'gpt-4',
        chunkModel: 'gpt-4o-mini',
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      await largeDiffHandler.handle(changes, config);

      const callLog = mockLLMService.getCallLog();

      // 验证 Map 阶段使用了 chunkModel
      const mapCalls = callLog.filter((call) => call.modelId === 'gpt-4o-mini');
      expect(mapCalls.length).toBeGreaterThan(0);

      // 注意：在当前实现中，Reduce 阶段由 SummaryMerger 处理
      // 这里我们主要验证 Map 阶段使用了正确的模型
    });

    it('应当显示混合模型使用情况摘要', async () => {
      const config = createMockConfig({
        provider: 'openai',
        modelName: 'gpt-4',
        chunkModel: 'gpt-4o-mini',
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      await largeDiffHandler.handle(changes, config);

      // 验证输出频道记录了使用情况
      const logs = mockOutputChannel.getLogs();
      expect(logs.length).toBeGreaterThan(0);

      // 检查是否包含混合模型策略的日志（可能是英文或中文）
      const hasHybridLog = logs.some(
        (log) =>
          log.includes('Hybrid Strategy') || log.includes('混合模型策略') || log.includes('Map')
      );
      expect(hasHybridLog).toBe(true);
    });
  });

  describe('与现有 Map-Reduce 功能的集成', () => {
    it('应当在 Map-Reduce 启用时使用混合模型策略', async () => {
      const handler = new LargeDiffHandler(
        new MockTokenEstimator(500),
        new MockDiffSplitter(),
        chunkProcessor,
        new MockSummaryMerger(),
        mockLLMService,
        { enableMapReduce: true }, // 启用 Map-Reduce
        undefined,
        undefined,
        modelSelector,
        hybridModelFeedback
      );

      const config = createMockConfig({
        chunkModel: 'gpt-4o-mini',
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      await handler.handle(changes, config);

      // 验证使用了 chunkModel
      const callLog = mockLLMService.getCallLog();
      const mapCalls = callLog.filter((call) => call.modelId === 'gpt-4o-mini');
      expect(mapCalls.length).toBeGreaterThan(0);
    });

    it('应当在 Map-Reduce 禁用时忽略 chunkModel 配置', async () => {
      const handler = new LargeDiffHandler(
        new MockTokenEstimator(500),
        new MockDiffSplitter(),
        chunkProcessor,
        new MockSummaryMerger(),
        mockLLMService,
        { enableMapReduce: false }, // 禁用 Map-Reduce
        undefined,
        undefined,
        modelSelector,
        hybridModelFeedback
      );

      const config = createMockConfig({
        chunkModel: 'gpt-4o-mini',
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      await handler.handle(changes, config);

      // 验证没有使用 chunkModel（因为 Map-Reduce 被禁用）
      const callLog = mockLLMService.getCallLog();

      // 在 Map-Reduce 禁用时，应该使用截断行为，不会传递 modelId
      const mapCalls = callLog.filter((call) => call.modelId === 'gpt-4o-mini');
      expect(mapCalls.length).toBe(0);
    });

    it('应当正确处理多个 chunks', async () => {
      const config = createMockConfig({
        chunkModel: 'gpt-4o-mini',
      });

      // 创建足够大的 diff 以生成多个 chunks
      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(5000), // 足够大以生成多个 chunks
          additions: 200,
          deletions: 100,
        },
      ];

      await largeDiffHandler.handle(changes, config);

      const callLog = mockLLMService.getCallLog();

      // 验证有多个调用
      expect(callLog.length).toBeGreaterThan(1);

      // 验证所有 Map 阶段的调用都使用了 chunkModel
      const mapCalls = callLog.filter((call) => call.modelId === 'gpt-4o-mini');
      expect(mapCalls.length).toBeGreaterThan(1);
    });
  });

  describe('配置变更的影响', () => {
    it('应当在 chunkModel 变更时使用新的模型', async () => {
      // 第一次使用 gpt-4o-mini
      const config1 = createMockConfig({
        chunkModel: 'gpt-4o-mini',
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      await largeDiffHandler.handle(changes, config1);

      const callLog1 = mockLLMService.getCallLog();
      const mapCalls1 = callLog1.filter((call) => call.modelId === 'gpt-4o-mini');
      expect(mapCalls1.length).toBeGreaterThan(0);

      // 清空日志
      mockLLMService.clearCallLog();

      // 第二次使用 gpt-3.5-turbo
      const config2 = createMockConfig({
        chunkModel: 'gpt-3.5-turbo',
      });

      await largeDiffHandler.handle(changes, config2);

      const callLog2 = mockLLMService.getCallLog();
      const mapCalls2 = callLog2.filter((call) => call.modelId === 'gpt-3.5-turbo');
      expect(mapCalls2.length).toBeGreaterThan(0);
    });

    it('应当在主模型变更时使用新的智能降级', async () => {
      // 第一次使用 gpt-4（降级为 gpt-4o-mini）
      const config1 = createMockConfig({
        provider: 'openai',
        modelName: 'gpt-4',
        chunkModel: undefined,
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      await largeDiffHandler.handle(changes, config1);

      const callLog1 = mockLLMService.getCallLog();
      const mapCalls1 = callLog1.filter((call) => call.modelId === 'gpt-4o-mini');
      expect(mapCalls1.length).toBeGreaterThan(0);

      // 清空日志
      mockLLMService.clearCallLog();

      // 第二次使用 gpt-3.5-turbo（不降级）
      const config2 = createMockConfig({
        provider: 'openai',
        modelName: 'gpt-3.5-turbo',
        chunkModel: undefined,
      });

      await largeDiffHandler.handle(changes, config2);

      const callLog2 = mockLLMService.getCallLog();

      // gpt-3.5-turbo 不在降级映射表中，应该保持原样
      const mapCalls2 = callLog2.filter((call) => call.modelId === 'gpt-3.5-turbo');
      expect(mapCalls2.length).toBeGreaterThan(0);
    });

    it('应当在 provider 变更时使用对应的降级策略', async () => {
      // 第一次使用 OpenAI
      const config1 = createMockConfig({
        provider: 'openai',
        modelName: 'gpt-4',
        chunkModel: undefined,
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      await largeDiffHandler.handle(changes, config1);

      const callLog1 = mockLLMService.getCallLog();
      const mapCalls1 = callLog1.filter((call) => call.modelId === 'gpt-4o-mini');
      expect(mapCalls1.length).toBeGreaterThan(0);

      // 清空日志
      mockLLMService.clearCallLog();

      // 第二次使用 Gemini
      const config2 = createMockConfig({
        provider: 'gemini',
        modelName: 'gemini-pro',
        chunkModel: undefined,
      });

      await largeDiffHandler.handle(changes, config2);

      const callLog2 = mockLLMService.getCallLog();
      const mapCalls2 = callLog2.filter((call) => call.modelId === 'gemini-1.5-flash');
      expect(mapCalls2.length).toBeGreaterThan(0);
    });

    it('应当在本地 provider 时不进行降级', async () => {
      const config = createMockConfig({
        provider: 'ollama',
        modelName: 'llama-2',
        chunkModel: undefined,
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      await largeDiffHandler.handle(changes, config);

      const callLog = mockLLMService.getCallLog();

      // 本地 provider 应该保持原模型
      const mapCalls = callLog.filter((call) => call.modelId === 'llama-2');
      expect(mapCalls.length).toBeGreaterThan(0);
    });
  });

  describe('错误处理和回退', () => {
    it('应当在 chunkModel 无效时回退到主模型', async () => {
      const config = createMockConfig({
        chunkModel: 'invalid!model', // 无效的模型名称
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      await largeDiffHandler.handle(changes, config);

      const callLog = mockLLMService.getCallLog();

      // 应该回退到主模型 gpt-4
      const mapCalls = callLog.filter((call) => call.modelId === 'gpt-4');
      expect(mapCalls.length).toBeGreaterThan(0);

      // 验证显示了回退警告
      const logs = mockOutputChannel.getLogs();
      const hasWarning = logs.some((log) => log.includes('回退') || log.includes('fallback'));
      expect(hasWarning).toBe(true);
    });

    it('应当在 chunkModel 与 provider 不匹配时回退', async () => {
      const config = createMockConfig({
        provider: 'openai',
        modelName: 'gpt-4',
        chunkModel: 'gemini-1.5-flash', // Gemini 模型但 provider 是 OpenAI
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      await largeDiffHandler.handle(changes, config);

      const callLog = mockLLMService.getCallLog();

      // 应该回退到主模型 gpt-4
      const mapCalls = callLog.filter((call) => call.modelId === 'gpt-4');
      expect(mapCalls.length).toBeGreaterThan(0);
    });
  });

  describe('性能和成本优化', () => {
    it('应当记录处理时间', async () => {
      const config = createMockConfig({
        chunkModel: 'gpt-4o-mini',
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      await largeDiffHandler.handle(changes, config);

      const logs = mockOutputChannel.getLogs();

      // 验证记录了处理时间
      const hasTimingLog = logs.some((log) => log.includes('ms') || log.includes('耗时'));
      expect(hasTimingLog).toBe(true);
    });

    it('应当显示 token 节省估算', async () => {
      const config = createMockConfig({
        provider: 'openai',
        modelName: 'gpt-4',
        chunkModel: 'gpt-4o-mini',
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      await largeDiffHandler.handle(changes, config);

      const logs = mockOutputChannel.getLogs();

      // 验证显示了节省百分比
      const hasSavingsLog = logs.some((log) => log.includes('%') || log.includes('节省'));
      expect(hasSavingsLog).toBe(true);
    });
  });

  describe('向后兼容性', () => {
    it('应当在未配置 chunkModel 时正常工作', async () => {
      const config = createMockConfig({
        chunkModel: undefined,
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      const result = await largeDiffHandler.handle(changes, config);

      // 验证正常工作
      expect(result).toBeTruthy();

      // 验证使用了智能降级
      const callLog = mockLLMService.getCallLog();
      expect(callLog.length).toBeGreaterThan(0);
    });

    it('应当在旧版本配置（无 chunkModel 字段）时正常工作', async () => {
      // 模拟旧版本配置（没有 chunkModel 字段）
      const config = {
        provider: 'openai',
        modelName: 'gpt-4',
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 1000,
        temperature: 0.7,
        // 注意：没有 chunkModel 字段
      } as FullConfig;

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: 'a'.repeat(3000),
          additions: 100,
          deletions: 50,
        },
      ];

      const result = await largeDiffHandler.handle(changes, config);

      // 验证正常工作
      expect(result).toBeTruthy();
    });
  });
});
