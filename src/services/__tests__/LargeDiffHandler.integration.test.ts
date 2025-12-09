/**
 * LargeDiffHandler 集成测试
 * 测试 LargeDiffHandler 与 SmartDiffFilter 的集成
 */

import { LargeDiffHandler } from '../LargeDiffHandler';
import { SmartDiffFilter, FilterFeedback, IOutputChannel } from '../SmartDiffFilter';
import { GitChange, ChangeStatus, ExtensionConfig } from '../../types';
import {
  ITokenEstimator,
  IDiffSplitter,
  IChunkProcessor,
  ISummaryMerger,
  IChunkSummaryGenerator,
  DiffChunk,
  ChunkSummary,
  ProcessConfig,
} from '../../types/interfaces';
import { ILLMService } from '../../types/interfaces';

// Mock 实现
class MockTokenEstimator implements ITokenEstimator {
  estimate(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getEffectiveLimit(): number {
    return 1000;
  }

  needsSplit(text: string): boolean {
    return this.estimate(text) > this.getEffectiveLimit();
  }

  getModelLimit(_modelName: string): number {
    return 4000;
  }
}

class MockDiffSplitter implements IDiffSplitter {
  split(_diff: string, _maxTokens: number): DiffChunk[] {
    return [];
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

class MockChunkProcessor implements IChunkProcessor {
  async processChunks(_chunks: DiffChunk[], _config: ProcessConfig): Promise<ChunkSummary[]> {
    return [];
  }

  async processChunk(chunk: DiffChunk, _config: ProcessConfig): Promise<ChunkSummary> {
    return {
      filePath: chunk.filePath,
      summary: 'Mock summary',
      chunkIndex: chunk.chunkIndex,
      success: true,
    };
  }
}

class MockSummaryMerger implements ISummaryMerger {
  async merge(_summaries: ChunkSummary[], _config: ExtensionConfig): Promise<string> {
    return 'Mock merged summary';
  }

  async recursiveMerge(_summaries: ChunkSummary[], _config: ExtensionConfig): Promise<string> {
    return 'Mock recursive merged summary';
  }
}

class MockChunkSummaryGenerator implements IChunkSummaryGenerator {
  async generateSummary(_prompt: string): Promise<string> {
    return 'Mock summary';
  }
}

class MockLLMService implements ILLMService {
  private mockResponse: string;

  constructor(mockResponse: string = '["src/index.ts"]') {
    this.mockResponse = mockResponse;
  }

  async generateCommitMessage(_changes: GitChange[], _config: ExtensionConfig): Promise<string> {
    return this.mockResponse;
  }

  setMockResponse(response: string): void {
    this.mockResponse = response;
  }
}

class MockOutputChannel implements IOutputChannel {
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
}

describe('LargeDiffHandler 集成测试', () => {
  let handler: LargeDiffHandler;
  let mockLLMService: MockLLMService;
  let mockOutputChannel: MockOutputChannel;
  let smartDiffFilter: SmartDiffFilter;
  let filterFeedback: FilterFeedback;

  const mockConfig = {
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-4o-mini',
    language: 'zh-CN',
    maxTokens: 1000,
    temperature: 0.7,
    apiKey: 'test-key',
    commitFormat: 'conventional',
    enableSmartFilter: true,
  } as ExtensionConfig & { enableSmartFilter?: boolean };

  beforeEach(() => {
    mockLLMService = new MockLLMService();
    mockOutputChannel = new MockOutputChannel();

    smartDiffFilter = new SmartDiffFilter(mockLLMService, mockConfig);
    filterFeedback = new FilterFeedback(mockOutputChannel, true, true);

    handler = new LargeDiffHandler(
      new MockTokenEstimator(),
      new MockDiffSplitter(),
      new MockChunkProcessor(),
      new MockSummaryMerger(),
      new MockChunkSummaryGenerator(),
      undefined,
      smartDiffFilter,
      filterFeedback
    );
  });

  describe('与 SmartDiffFilter 的集成', () => {
    it('应当在处理前调用 SmartDiffFilter 过滤文件', async () => {
      // 准备测试数据
      const changes: GitChange[] = [
        {
          path: 'src/index.ts',
          status: ChangeStatus.Modified,
          diff: 'some diff content',
          additions: 10,
          deletions: 5,
        },
        {
          path: 'package-lock.json',
          status: ChangeStatus.Modified,
          diff: 'lockfile diff',
          additions: 100,
          deletions: 50,
        },
        {
          path: 'dist/bundle.js',
          status: ChangeStatus.Modified,
          diff: 'build artifact diff',
          additions: 200,
          deletions: 100,
        },
      ];

      // 设置 LLM 返回只保留核心文件
      mockLLMService.setMockResponse('["src/index.ts"]');

      // 执行处理
      await handler.handle(changes, mockConfig);

      // 验证输出频道记录了过滤信息
      const logs = mockOutputChannel.getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some((log) => log.includes('Smart Filter'))).toBe(true);
    });

    it('应当在配置禁用时跳过过滤', async () => {
      const changes: GitChange[] = [
        {
          path: 'src/index.ts',
          status: ChangeStatus.Modified,
          diff: 'some diff',
          additions: 10,
          deletions: 5,
        },
      ];

      const configWithFilterDisabled = {
        ...mockConfig,
        enableSmartFilter: false,
      };

      // 执行处理
      await handler.handle(changes, configWithFilterDisabled);

      // 验证没有过滤日志
      const logs = mockOutputChannel.getLogs();
      expect(logs.length).toBe(0);
    });

    it('应当在过滤失败时使用原始列表（Fail Open）', async () => {
      const changes: GitChange[] = [
        {
          path: 'src/index.ts',
          status: ChangeStatus.Modified,
          diff: 'some diff',
          additions: 10,
          deletions: 5,
        },
      ];

      // 设置 LLM 返回无效的 JSON
      mockLLMService.setMockResponse('invalid json');

      // 执行处理（不应抛出异常）
      await expect(handler.handle(changes, mockConfig)).resolves.toBeDefined();
    });

    it('应当显示过滤统计信息', async () => {
      const changes: GitChange[] = [
        {
          path: 'src/index.ts',
          status: ChangeStatus.Modified,
          diff: 'some diff',
          additions: 10,
          deletions: 5,
        },
        {
          path: 'package-lock.json',
          status: ChangeStatus.Modified,
          diff: 'lockfile diff',
          additions: 100,
          deletions: 50,
        },
        {
          path: 'dist/bundle.js',
          status: ChangeStatus.Modified,
          diff: 'build artifact diff',
          additions: 200,
          deletions: 100,
        },
        {
          path: 'README.md',
          status: ChangeStatus.Modified,
          diff: 'doc diff',
          additions: 5,
          deletions: 2,
        },
      ];

      // 设置 LLM 返回核心文件
      mockLLMService.setMockResponse('["src/index.ts", "README.md"]');

      // 执行处理
      await handler.handle(changes, mockConfig);

      // 验证输出频道记录了统计信息
      const logs = mockOutputChannel.getLogs();
      expect(logs.some((log) => log.includes('Total files: 4'))).toBe(true);
      expect(logs.some((log) => log.includes('Core files: 2'))).toBe(true);
      expect(logs.some((log) => log.includes('Ignored files: 2'))).toBe(true);
    });
  });

  describe('配置开关测试', () => {
    it('应当在 enableSmartFilter 为 true 时启用过滤', async () => {
      const changes: GitChange[] = [
        {
          path: 'src/index.ts',
          status: ChangeStatus.Modified,
          diff: 'some diff',
          additions: 10,
          deletions: 5,
        },
        {
          path: 'package-lock.json',
          status: ChangeStatus.Modified,
          diff: 'lockfile diff',
          additions: 100,
          deletions: 50,
        },
        {
          path: 'dist/bundle.js',
          status: ChangeStatus.Modified,
          diff: 'build artifact diff',
          additions: 200,
          deletions: 100,
        },
      ];

      mockLLMService.setMockResponse('["src/index.ts"]');

      await handler.handle(changes, { ...mockConfig, enableSmartFilter: true } as any);

      const logs = mockOutputChannel.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('应当在 enableSmartFilter 为 false 时禁用过滤', async () => {
      const changes: GitChange[] = [
        {
          path: 'src/index.ts',
          status: ChangeStatus.Modified,
          diff: 'some diff',
          additions: 10,
          deletions: 5,
        },
      ];

      await handler.handle(changes, { ...mockConfig, enableSmartFilter: false } as any);

      const logs = mockOutputChannel.getLogs();
      expect(logs.length).toBe(0);
    });

    it('应当在 enableSmartFilter 未设置时默认启用过滤', async () => {
      const changes: GitChange[] = [
        {
          path: 'src/index.ts',
          status: ChangeStatus.Modified,
          diff: 'some diff',
          additions: 10,
          deletions: 5,
        },
        {
          path: 'package-lock.json',
          status: ChangeStatus.Modified,
          diff: 'lockfile diff',
          additions: 100,
          deletions: 50,
        },
        {
          path: 'dist/bundle.js',
          status: ChangeStatus.Modified,
          diff: 'build artifact diff',
          additions: 200,
          deletions: 100,
        },
      ];

      mockLLMService.setMockResponse('["src/index.ts"]');

      // 不设置 enableSmartFilter
      const configWithoutFilter = { ...mockConfig };
      delete (configWithoutFilter as any).enableSmartFilter;

      await handler.handle(changes, configWithoutFilter);

      const logs = mockOutputChannel.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('UI 反馈测试', () => {
    it('应当在过滤完成后显示统计信息', async () => {
      const changes: GitChange[] = [
        {
          path: 'src/index.ts',
          status: ChangeStatus.Modified,
          diff: 'some diff',
          additions: 10,
          deletions: 5,
        },
        {
          path: 'package-lock.json',
          status: ChangeStatus.Modified,
          diff: 'lockfile diff',
          additions: 100,
          deletions: 50,
        },
        {
          path: 'dist/bundle.js',
          status: ChangeStatus.Modified,
          diff: 'build artifact diff',
          additions: 200,
          deletions: 100,
        },
      ];

      mockLLMService.setMockResponse('["src/index.ts"]');

      await handler.handle(changes, mockConfig);

      const logs = mockOutputChannel.getLogs();
      expect(logs.some((log) => log.includes('[Smart Filter]'))).toBe(true);
      expect(logs.some((log) => log.includes('Status: Completed'))).toBe(true);
    });

    it('应当在跳过过滤时显示跳过原因', async () => {
      const changes: GitChange[] = [
        {
          path: 'src/index.ts',
          status: ChangeStatus.Modified,
          diff: 'some diff',
          additions: 10,
          deletions: 5,
        },
        {
          path: 'src/utils.ts',
          status: ChangeStatus.Modified,
          diff: 'some diff',
          additions: 5,
          deletions: 2,
        },
      ];

      await handler.handle(changes, mockConfig);

      const logs = mockOutputChannel.getLogs();
      expect(logs.some((log) => log.includes('Status: Skipped'))).toBe(true);
      expect(logs.some((log) => log.includes('Only 2 file(s)'))).toBe(true);
    });
  });
});
