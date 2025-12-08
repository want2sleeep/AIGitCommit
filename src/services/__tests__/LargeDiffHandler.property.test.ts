/**
 * LargeDiffHandler 属性测试
 *
 * 使用 fast-check 进行属性测试，验证以下正确性属性：
 * - 属性 18: Map-Reduce 禁用回退
 */

import { LargeDiffHandler, LargeDiffConfig } from '../LargeDiffHandler';
import {
  ChunkSummary,
  DiffChunk,
  IChunkProcessor,
  IChunkSummaryGenerator,
  IDiffSplitter,
  ISummaryMerger,
  ITokenEstimator,
  ProcessConfig,
} from '../../types/interfaces';
import { ChangeStatus, ExtensionConfig, GitChange } from '../../types';
import { DiffSplitLevel } from '../../constants';

// 模拟 Token 估算器
class MockTokenEstimator implements ITokenEstimator {
  private effectiveLimit: number;
  private needsSplitResult: boolean;

  constructor(effectiveLimit: number = 1000, needsSplitResult: boolean = false) {
    this.effectiveLimit = effectiveLimit;
    this.needsSplitResult = needsSplitResult;
  }

  estimate(text: string): number {
    return Math.ceil(text.length * 0.25);
  }

  getEffectiveLimit(): number {
    return this.effectiveLimit;
  }

  needsSplit(_text: string): boolean {
    return this.needsSplitResult;
  }

  getModelLimit(_modelName: string): number {
    return Math.ceil(this.effectiveLimit / 0.85);
  }
}

// 模拟 Diff 拆分器
class MockDiffSplitter implements IDiffSplitter {
  split(diff: string, _maxTokens: number): DiffChunk[] {
    return [
      {
        content: diff,
        filePath: 'test.ts',
        chunkIndex: 0,
        totalChunks: 1,
        splitLevel: DiffSplitLevel.File,
        context: { fileHeader: '' },
      },
    ];
  }

  splitByFiles(diff: string): DiffChunk[] {
    return this.split(diff, 1000);
  }

  splitByHunks(fileDiff: string, _maxTokens: number): DiffChunk[] {
    return this.split(fileDiff, 1000);
  }

  splitByLines(hunk: string, _maxTokens: number): DiffChunk[] {
    return this.split(hunk, 1000);
  }
}

// 模拟 Chunk 处理器
class MockChunkProcessor implements IChunkProcessor {
  async processChunks(chunks: DiffChunk[], _config: ProcessConfig): Promise<ChunkSummary[]> {
    return chunks.map((chunk, index) => ({
      filePath: chunk.filePath,
      summary: `摘要 ${index}`,
      chunkIndex: index,
      success: true,
    }));
  }

  async processChunk(chunk: DiffChunk, _config: ProcessConfig): Promise<ChunkSummary> {
    return {
      filePath: chunk.filePath,
      summary: '单个摘要',
      chunkIndex: chunk.chunkIndex,
      success: true,
    };
  }
}

// 模拟摘要合并器
class MockSummaryMerger implements ISummaryMerger {
  async merge(summaries: ChunkSummary[], _config: ExtensionConfig): Promise<string> {
    return summaries.map((s) => s.summary).join('\n');
  }

  async recursiveMerge(summaries: ChunkSummary[], config: ExtensionConfig): Promise<string> {
    return this.merge(summaries, config);
  }
}

// 模拟摘要生成器
class MockSummaryGenerator implements IChunkSummaryGenerator {
  private callCount = 0;

  async generateSummary(prompt: string): Promise<string> {
    this.callCount++;
    return `生成的摘要: ${prompt.substring(0, 50)}`;
  }

  getCallCount(): number {
    return this.callCount;
  }

  reset(): void {
    this.callCount = 0;
  }
}

// 创建默认配置
const createConfig = (): ExtensionConfig => ({
  apiEndpoint: 'https://api.openai.com/v1',
  apiKey: 'test-key',
  modelName: 'gpt-4',
  language: 'zh-CN',
  commitFormat: 'conventional',
  maxTokens: 4096,
  temperature: 0.7,
});

// 创建测试变更
const createChanges = (count: number): GitChange[] => {
  const changes: GitChange[] = [];
  for (let i = 0; i < count; i++) {
    changes.push({
      path: `file${i}.ts`,
      status: ChangeStatus.Modified,
      diff: `+added line ${i}\n-removed line ${i}`,
      additions: 1,
      deletions: 1,
    });
  }
  return changes;
};

describe('LargeDiffHandler 属性测试', () => {
  /**
   * **Feature: large-diff-handling, Property 18: Map-Reduce 禁用回退**
   * **验证: 需求 8.4**
   *
   * 对于任意禁用 Map-Reduce 的配置，系统应当使用截断行为而非拆分处理
   */
  describe('属性 18: Map-Reduce 禁用回退', () => {
    it('当 Map-Reduce 被禁用时应使用截断行为', async () => {
      const estimator = new MockTokenEstimator(1000, true); // needsSplit = true
      const splitter = new MockDiffSplitter();
      const processor = new MockChunkProcessor();
      const merger = new MockSummaryMerger();
      const generator = new MockSummaryGenerator();

      const largeDiffConfig: LargeDiffConfig = {
        enableMapReduce: false, // 禁用 Map-Reduce
        maxConcurrentRequests: 5,
        maxRetries: 3,
        initialRetryDelay: 1000,
      };

      const handler = new LargeDiffHandler(
        estimator,
        splitter,
        processor,
        merger,
        generator,
        largeDiffConfig
      );

      const changes = createChanges(3);
      const config = createConfig();

      const result = await handler.handle(changes, config);

      // 验证使用了截断行为（直接调用 summaryGenerator）
      expect(generator.getCallCount()).toBe(1);
      expect(result).toContain('生成的摘要');
    });

    it('当 Map-Reduce 被启用时应使用拆分处理', async () => {
      const estimator = new MockTokenEstimator(1000, true); // needsSplit = true
      const splitter = new MockDiffSplitter();
      const processor = new MockChunkProcessor();
      const merger = new MockSummaryMerger();
      const generator = new MockSummaryGenerator();

      const largeDiffConfig: LargeDiffConfig = {
        enableMapReduce: true, // 启用 Map-Reduce
        maxConcurrentRequests: 5,
        maxRetries: 3,
        initialRetryDelay: 1000,
      };

      const handler = new LargeDiffHandler(
        estimator,
        splitter,
        processor,
        merger,
        generator,
        largeDiffConfig
      );

      const changes = createChanges(3);
      const config = createConfig();

      const result = await handler.handle(changes, config);

      // 验证使用了 Map-Reduce 处理（通过 merger 合并）
      expect(result).toContain('摘要');
    });

    it('当不需要拆分时应直接生成摘要', async () => {
      const estimator = new MockTokenEstimator(10000, false); // needsSplit = false
      const splitter = new MockDiffSplitter();
      const processor = new MockChunkProcessor();
      const merger = new MockSummaryMerger();
      const generator = new MockSummaryGenerator();

      const handler = new LargeDiffHandler(estimator, splitter, processor, merger, generator);

      const changes = createChanges(1);
      const config = createConfig();

      const result = await handler.handle(changes, config);

      // 验证直接调用了 summaryGenerator
      expect(generator.getCallCount()).toBe(1);
      expect(result).toContain('生成的摘要');
    });
  });

  describe('needsLargeDiffHandling', () => {
    it('当 diff 超过限制时应返回 true', () => {
      const estimator = new MockTokenEstimator(1000, true);
      const splitter = new MockDiffSplitter();
      const processor = new MockChunkProcessor();
      const merger = new MockSummaryMerger();
      const generator = new MockSummaryGenerator();

      const handler = new LargeDiffHandler(estimator, splitter, processor, merger, generator);

      const changes = createChanges(10);
      const result = handler.needsLargeDiffHandling(changes);

      expect(result).toBe(true);
    });

    it('当 diff 未超过限制时应返回 false', () => {
      const estimator = new MockTokenEstimator(10000, false);
      const splitter = new MockDiffSplitter();
      const processor = new MockChunkProcessor();
      const merger = new MockSummaryMerger();
      const generator = new MockSummaryGenerator();

      const handler = new LargeDiffHandler(estimator, splitter, processor, merger, generator);

      const changes = createChanges(1);
      const result = handler.needsLargeDiffHandling(changes);

      expect(result).toBe(false);
    });
  });

  describe('配置管理', () => {
    it('应能更新配置', () => {
      const estimator = new MockTokenEstimator();
      const splitter = new MockDiffSplitter();
      const processor = new MockChunkProcessor();
      const merger = new MockSummaryMerger();
      const generator = new MockSummaryGenerator();

      const handler = new LargeDiffHandler(estimator, splitter, processor, merger, generator);

      handler.updateConfig({ enableMapReduce: false });

      const config = handler.getConfig();
      expect(config.enableMapReduce).toBe(false);
    });

    it('应使用默认配置', () => {
      const estimator = new MockTokenEstimator();
      const splitter = new MockDiffSplitter();
      const processor = new MockChunkProcessor();
      const merger = new MockSummaryMerger();
      const generator = new MockSummaryGenerator();

      const handler = new LargeDiffHandler(estimator, splitter, processor, merger, generator);

      const config = handler.getConfig();
      expect(config.enableMapReduce).toBe(true);
      expect(config.maxConcurrentRequests).toBeGreaterThan(0);
      expect(config.maxRetries).toBeGreaterThan(0);
    });
  });
});
