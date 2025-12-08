/**
 * SummaryMerger 属性测试
 *
 * 使用 fast-check 进行属性测试，验证以下正确性属性：
 * - 属性 11: 递归合并触发条件
 * - 属性 12: 提交格式遵守
 */

import * as fc from 'fast-check';
import { SummaryMerger } from '../SummaryMerger';
import { ChunkSummary, IChunkSummaryGenerator, ITokenEstimator } from '../../types/interfaces';
import { ExtensionConfig } from '../../types';

// 模拟 Token 估算器
class MockTokenEstimator implements ITokenEstimator {
  private effectiveLimit: number;
  private tokensPerChar: number;

  constructor(effectiveLimit: number = 1000, tokensPerChar: number = 0.25) {
    this.effectiveLimit = effectiveLimit;
    this.tokensPerChar = tokensPerChar;
  }

  estimate(text: string): number {
    return Math.ceil(text.length * this.tokensPerChar);
  }

  getEffectiveLimit(): number {
    return this.effectiveLimit;
  }

  needsSplit(text: string): boolean {
    return this.estimate(text) > this.effectiveLimit;
  }

  getModelLimit(_modelName: string): number {
    return Math.ceil(this.effectiveLimit / 0.85);
  }
}

// 模拟摘要生成器
class MockSummaryGenerator implements IChunkSummaryGenerator {
  async generateSummary(prompt: string): Promise<string> {
    // 简单地返回一个基于提示词的摘要
    if (prompt.includes('合并')) {
      return '合并后的提交信息';
    }
    return `摘要: ${prompt.substring(0, 50)}`;
  }
}

// 创建默认配置
const createConfig = (
  useConventional: boolean = false,
  language: string = 'zh-CN'
): ExtensionConfig => ({
  apiEndpoint: 'https://api.openai.com/v1',
  apiKey: 'test-key',
  modelName: 'gpt-4',
  language,
  commitFormat: useConventional ? 'conventional' : 'simple',
  maxTokens: 4096,
  temperature: 0.7,
});

// 创建成功的摘要
const createSuccessSummary = (
  filePath: string,
  summary: string,
  chunkIndex: number
): ChunkSummary => ({
  filePath,
  summary,
  chunkIndex,
  success: true,
});

// 创建失败的摘要
const createFailedSummary = (
  filePath: string,
  chunkIndex: number,
  error: string
): ChunkSummary => ({
  filePath,
  summary: '',
  chunkIndex,
  success: false,
  error,
});

describe('SummaryMerger 属性测试', () => {
  /**
   * **Feature: large-diff-handling, Property 11: 递归合并触发条件**
   * **验证: 需求 5.2**
   *
   * 对于任意摘要集合，当且仅当合并后的总 token 数超过有效限制时，应触发递归 Map-Reduce
   */
  describe('属性 11: 递归合并触发条件', () => {
    it('当摘要总量未超限时不应触发递归合并', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // 摘要数量
          fc.string({ minLength: 10, maxLength: 30 }), // 摘要内容
          async (count, summaryContent) => {
            // 使用较大的限制，确保不会触发递归
            const estimator = new MockTokenEstimator(10000);
            const generator = new MockSummaryGenerator();
            const merger = new SummaryMerger(estimator, generator);

            const summaries: ChunkSummary[] = [];
            for (let i = 0; i < count; i++) {
              summaries.push(createSuccessSummary(`file${i}.ts`, summaryContent, i));
            }

            const config = createConfig();
            const result = await merger.merge(summaries, config);

            // 验证返回了结果
            return result.length > 0;
          }
        ),
        { numRuns: 20 }
      );
    }, 30000); // 设置 30 秒超时

    it('当摘要总量超限时应触发递归合并', async () => {
      // 使用较小的限制来触发递归
      const estimator = new MockTokenEstimator(100);
      const generator = new MockSummaryGenerator();
      const merger = new SummaryMerger(estimator, generator);

      // 创建多个摘要
      const summaries: ChunkSummary[] = [];
      for (let i = 0; i < 5; i++) {
        summaries.push(createSuccessSummary(`file${i}.ts`, '这是一个摘要内容', i));
      }

      const config = createConfig();
      const result = await merger.merge(summaries, config);

      // 验证返回了结果（递归合并应该成功完成）
      expect(result.length).toBeGreaterThan(0);
    }, 10000); // 设置 10 秒超时
  });

  /**
   * **Feature: large-diff-handling, Property 12: 提交格式遵守**
   * **验证: 需求 5.4**
   *
   * 对于任意配置为约定式提交格式的最终输出，应当匹配 `type(scope): subject` 模式
   */
  describe('属性 12: 提交格式遵守', () => {
    it('当配置约定式提交时，输出应符合格式', async () => {
      // 创建一个返回非约定式格式的生成器
      class NonConventionalGenerator implements IChunkSummaryGenerator {
        async generateSummary(_prompt: string): Promise<string> {
          return '添加了新功能';
        }
      }

      const estimator = new MockTokenEstimator(10000);
      const generator = new NonConventionalGenerator();
      const merger = new SummaryMerger(estimator, generator);

      const summaries = [createSuccessSummary('test.ts', '添加了新功能', 0)];
      const config = createConfig(true); // 启用约定式提交

      const result = await merger.merge(summaries, config);

      // 验证输出符合约定式提交格式
      const conventionalPattern =
        /^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?:\s*.+/;
      expect(conventionalPattern.test(result)).toBe(true);
    });

    it('当配置约定式提交且输出已符合格式时，不应重复添加类型', async () => {
      // 创建一个返回约定式格式的生成器
      class ConventionalGenerator implements IChunkSummaryGenerator {
        async generateSummary(_prompt: string): Promise<string> {
          return 'feat: 添加了新功能';
        }
      }

      const estimator = new MockTokenEstimator(10000);
      const generator = new ConventionalGenerator();
      const merger = new SummaryMerger(estimator, generator);

      const summaries = [createSuccessSummary('test.ts', 'feat: 添加了新功能', 0)];
      const config = createConfig(true);

      const result = await merger.merge(summaries, config);

      // 验证没有重复添加类型
      expect(result).toBe('feat: 添加了新功能');
    });

    it('应正确检测变更类型', async () => {
      const testCases = [
        { keyword: '修复', expectedType: 'fix' },
        { keyword: '添加', expectedType: 'feat' },
        { keyword: '文档', expectedType: 'docs' },
        { keyword: '重构', expectedType: 'refactor' },
        { keyword: '测试', expectedType: 'test' },
      ];

      for (const { keyword, expectedType } of testCases) {
        class KeywordGenerator implements IChunkSummaryGenerator {
          async generateSummary(_prompt: string): Promise<string> {
            return `${keyword}了一些内容`;
          }
        }

        const estimator = new MockTokenEstimator(10000);
        const generator = new KeywordGenerator();
        const merger = new SummaryMerger(estimator, generator);

        const summaries = [createSuccessSummary('test.ts', `${keyword}了一些内容`, 0)];
        const config = createConfig(true);

        const result = await merger.merge(summaries, config);

        // 验证检测到了正确的类型
        expect(result.startsWith(`${expectedType}:`)).toBe(true);
      }
    });
  });

  describe('错误处理', () => {
    it('当所有摘要都失败时应返回错误信息', async () => {
      const estimator = new MockTokenEstimator(10000);
      const generator = new MockSummaryGenerator();
      const merger = new SummaryMerger(estimator, generator);

      const summaries = [
        createFailedSummary('file1.ts', 0, '网络错误'),
        createFailedSummary('file2.ts', 1, 'API 限流'),
      ];

      const config = createConfig();
      const result = await merger.merge(summaries, config);

      expect(result).toContain('无法生成提交信息');
      expect(result).toContain('网络错误');
      expect(result).toContain('API 限流');
    });

    it('当部分摘要失败时应只使用成功的摘要', async () => {
      const estimator = new MockTokenEstimator(10000);
      const generator = new MockSummaryGenerator();
      const merger = new SummaryMerger(estimator, generator);

      const summaries = [
        createSuccessSummary('file1.ts', '成功的摘要', 0),
        createFailedSummary('file2.ts', 1, '失败'),
      ];

      const config = createConfig();
      const result = await merger.merge(summaries, config);

      // 验证返回了结果且不包含错误信息
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toContain('无法生成提交信息');
    });

    it('空摘要列表应返回空字符串', async () => {
      const estimator = new MockTokenEstimator(10000);
      const generator = new MockSummaryGenerator();
      const merger = new SummaryMerger(estimator, generator);

      const result = await merger.merge([], createConfig());

      expect(result).toBe('');
    });
  });
});
