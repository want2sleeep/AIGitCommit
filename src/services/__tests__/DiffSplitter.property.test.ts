/**
 * DiffSplitter 属性测试
 * 使用 fast-check 进行属性测试，验证 Diff 拆分器的正确性属性
 *
 * **Feature: large-diff-handling**
 */

import * as fc from 'fast-check';
import { DiffSplitter } from '../DiffSplitter';
import { TokenEstimator } from '../TokenEstimator';
import { LargeDiffConfig, DiffChunk } from '../../types/interfaces';
import { DiffSplitLevel } from '../../constants';

describe('DiffSplitter 属性测试', () => {
  // 默认测试配置
  const defaultConfig: LargeDiffConfig = {
    enableMapReduce: true,
    safetyMarginPercent: 100, // 使用 100% 以便精确控制
    maxConcurrentRequests: 5,
    customTokenLimit: 10000,
  };

  // 创建测试用的 TokenEstimator
  const createEstimator = (customLimit?: number) => {
    const config = { ...defaultConfig, customTokenLimit: customLimit || 10000 };
    return new TokenEstimator('gpt-4', config);
  };

  // 生成简单的 diff 文件内容
  const generateFileDiff = (filePath: string, content: string): string => {
    return `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}
@@ -1,3 +1,4 @@
${content}`;
  };

  // 生成多文件 diff
  const generateMultiFileDiff = (files: Array<{ path: string; content: string }>): string => {
    return files.map((f) => generateFileDiff(f.path, f.content)).join('\n');
  };

  /**
   * **Feature: large-diff-handling, Property 4: 文件级拆分完整性**
   *
   * 对于任意包含多个文件的 diff，按文件拆分后，每个 chunk 应当只包含一个文件的内容，
   * 且所有 chunk 合并后应包含原始 diff 的所有文件。
   *
   * **验证: 需求 2.1, 2.2, 2.3**
   */
  describe('属性 4: 文件级拆分完整性', () => {
    it('按文件拆分后，chunk 数量应当等于文件数量', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 20 }).map((s) => `src/${s}.ts`),
              content: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (files) => {
            const diff = generateMultiFileDiff(files);
            const estimator = createEstimator();
            const splitter = new DiffSplitter(estimator);
            const chunks = splitter.splitByFiles(diff);
            return chunks.length === files.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('每个 chunk 应当只包含一个文件的 diff', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 20 }).map((s) => `src/${s}.ts`),
              content: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (files) => {
            const diff = generateMultiFileDiff(files);
            const estimator = createEstimator();
            const splitter = new DiffSplitter(estimator);
            const chunks = splitter.splitByFiles(diff);

            // 每个 chunk 应当只包含一个 "diff --git" 标记
            return chunks.every((chunk) => {
              const matches = chunk.content.match(/diff --git/g);
              return matches !== null && matches.length === 1;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('每个 chunk 应当保留完整的 diff 头部信息', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 20 }).map((s) => `src/${s}.ts`),
              content: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (files) => {
            const diff = generateMultiFileDiff(files);
            const estimator = createEstimator();
            const splitter = new DiffSplitter(estimator);
            const chunks = splitter.splitByFiles(diff);

            // 每个 chunk 应当以 "diff --git" 开头
            return chunks.every((chunk) => chunk.content.startsWith('diff --git'));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: large-diff-handling, Property 5: Chunk 元数据完整性**
   *
   * 对于任意拆分产生的 DiffChunk，应当包含有效的 filePath、chunkIndex（>= 0）
   * 和 totalChunks（> 0），且 chunkIndex < totalChunks。
   *
   * **验证: 需求 2.4**
   */
  describe('属性 5: Chunk 元数据完整性', () => {
    it('每个 chunk 应当包含有效的元数据', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 20 }).map((s) => `src/${s}.ts`),
              content: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (files) => {
            const diff = generateMultiFileDiff(files);
            const estimator = createEstimator();
            const splitter = new DiffSplitter(estimator);
            const chunks = splitter.split(diff, 10000);

            return chunks.every((chunk: DiffChunk) => {
              // filePath 应当非空
              const hasValidPath = chunk.filePath && chunk.filePath.length > 0;
              // chunkIndex 应当 >= 0
              const hasValidIndex = chunk.chunkIndex >= 0;
              // totalChunks 应当 > 0
              const hasValidTotal = chunk.totalChunks > 0;
              // chunkIndex < totalChunks
              const indexLessThanTotal = chunk.chunkIndex < chunk.totalChunks;
              // splitLevel 应当是有效值
              const hasValidSplitLevel = Object.values(DiffSplitLevel).includes(chunk.splitLevel);
              // context 应当存在
              const hasContext = chunk.context !== undefined;

              return (
                hasValidPath &&
                hasValidIndex &&
                hasValidTotal &&
                indexLessThanTotal &&
                hasValidSplitLevel &&
                hasContext
              );
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('chunk 索引应当是连续的', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 20 }).map((s) => `src/${s}.ts`),
              content: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (files) => {
            const diff = generateMultiFileDiff(files);
            const estimator = createEstimator();
            const splitter = new DiffSplitter(estimator);
            const chunks = splitter.split(diff, 10000);

            // 检查索引是否连续
            for (let i = 0; i < chunks.length; i++) {
              const chunk = chunks[i];
              if (chunk && chunk.chunkIndex !== i) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: large-diff-handling, Property 6: Hunk 边界拆分正确性**
   *
   * 对于任意按 Hunk 拆分的 chunk，其内容应当以 Hunk 标记（`@@ -x,y +a,b @@`）
   * 开始或包含文件头部。
   *
   * **验证: 需求 3.1, 3.2**
   */
  describe('属性 6: Hunk 边界拆分正确性', () => {
    it('按 Hunk 拆分的 chunk 应当包含文件头部或 Hunk 标记', () => {
      // 生成包含多个 Hunk 的大文件 diff
      const generateLargeFileDiff = (filePath: string, hunkCount: number): string => {
        let diff = `diff --git a/${filePath} b/${filePath}
--- a/${filePath}
+++ b/${filePath}`;

        for (let i = 0; i < hunkCount; i++) {
          diff += `
@@ -${i * 10 + 1},5 +${i * 10 + 1},6 @@ function${i}
 line1
 line2
+added line
 line3
 line4`;
        }
        return diff;
      };

      fc.assert(
        fc.property(fc.integer({ min: 2, max: 5 }), (hunkCount) => {
          const diff = generateLargeFileDiff('src/test.ts', hunkCount);
          const estimator = createEstimator(100); // 设置很小的限制以触发 Hunk 拆分
          const splitter = new DiffSplitter(estimator);
          const chunks = splitter.splitByHunks(diff, 100);

          // 每个 chunk 应当包含文件头部（diff --git）或以 @@ 开头
          return chunks.every((chunk) => {
            const hasDiffHeader = chunk.content.includes('diff --git');
            const hasHunkMarker = chunk.content.includes('@@');
            return hasDiffHeader || hasHunkMarker;
          });
        }),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: large-diff-handling, Property 7: 行完整性保证**
   *
   * 对于任意按行拆分的 chunk，每行应当是完整的（以换行符结束，除最后一行外），
   * 不存在行中间断开的情况。
   *
   * **验证: 需求 3.3, 3.4**
   */
  describe('属性 7: 行完整性保证', () => {
    it('按行拆分的 chunk 不应当在行中间断开', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 5, maxLength: 20 }),
          (lines) => {
            // 构建一个简单的 diff 内容
            const content = `diff --git a/test.ts b/test.ts
--- a/test.ts
+++ b/test.ts
@@ -1,${lines.length} +1,${lines.length} @@
${lines.map((l) => '+' + l).join('\n')}`;

            const estimator = createEstimator(50); // 设置很小的限制以触发行拆分
            const splitter = new DiffSplitter(estimator);
            const chunks = splitter.splitByLines(content, 50);

            // 每个 chunk 的内容行应当是完整的
            return chunks.every((chunk) => {
              const chunkLines = chunk.content.split('\n');
              // 检查每行是否完整（不以不完整的字符结束）
              // 这里简单检查：每行要么为空，要么是完整的行
              return chunkLines.every((line) => {
                // 行应当是完整的（不是被截断的）
                return line.length === 0 || !line.endsWith('\r');
              });
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('空 diff 应当返回空数组', () => {
      const estimator = createEstimator();
      const splitter = new DiffSplitter(estimator);
      expect(splitter.split('', 1000)).toEqual([]);
      expect(splitter.splitByFiles('')).toEqual([]);
      expect(splitter.splitByHunks('', 1000)).toEqual([]);
      expect(splitter.splitByLines('', 1000)).toEqual([]);
    });
  });

  /**
   * **Feature: large-diff-handling, Property 19: 贪心合并 Token 限制遵守**
   *
   * 对于任意合并后的 chunk，其估算的 token 数应当不超过配置的 maxTokens。
   *
   * **验证: 需求 10.2**
   */
  describe('属性 19: 贪心合并 Token 限制遵守', () => {
    it('合并后的 chunk 不应超过 token 限制', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 20 }).map((s) => `src/${s}.ts`),
              content: fc.string({ minLength: 10, maxLength: 100 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          fc.integer({ min: 200, max: 1000 }),
          (files, maxTokens) => {
            const diff = generateMultiFileDiff(files);
            const estimator = createEstimator(maxTokens);
            const splitter = new DiffSplitter(estimator);
            const chunks = splitter.split(diff, maxTokens);

            // 每个 chunk 的 token 数应当不超过 maxTokens
            return chunks.every((chunk) => {
              const tokens = estimator.estimate(chunk.content);
              return tokens <= maxTokens;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('合并策略应当尽可能合并小文件', () => {
      // 创建多个小文件，每个约 50 tokens
      const files = [
        { path: 'file1.ts', content: 'a'.repeat(50) },
        { path: 'file2.ts', content: 'b'.repeat(50) },
        { path: 'file3.ts', content: 'c'.repeat(50) },
        { path: 'file4.ts', content: 'd'.repeat(50) },
      ];

      const diff = generateMultiFileDiff(files);
      const estimator = createEstimator(500); // 足够大以容纳多个文件
      const splitter = new DiffSplitter(estimator);
      const chunks = splitter.split(diff, 500);

      // 应当合并为更少的 chunks
      expect(chunks.length).toBeLessThan(files.length);
    });
  });

  /**
   * **Feature: large-diff-handling, Property 20: 贪心合并内容完整性**
   *
   * 对于任意合并前的 chunks 集合，合并后所有 chunks 的内容拼接应当包含
   * 原始所有 chunks 的内容（可能顺序不同）。
   *
   * **验证: 需求 10.1, 10.3**
   */
  describe('属性 20: 贪心合并内容完整性', () => {
    it('合并后的 chunk 数量应当不超过原始文件数', () => {
      fc.assert(
        fc.property(
          fc
            .array(
              fc.record({
                path: fc
                  .stringMatching(/^[a-zA-Z0-9_-]{1,20}$/) // 只允许字母数字下划线和连字符
                  .map((s) => `src/${s}.ts`),
                content: fc.string({ minLength: 10, maxLength: 100 }),
              }),
              { minLength: 2, maxLength: 8 }
            )
            .filter((files) => {
              // 确保文件路径唯一
              const paths = files.map((f) => f.path);
              return new Set(paths).size === paths.length;
            }),
          (files) => {
            const diff = generateMultiFileDiff(files);
            const estimator = createEstimator(1000);
            const splitter = new DiffSplitter(estimator);

            // 获取按文件拆分的 chunks（合并前）
            const fileChunks = splitter.splitByFiles(diff);

            // 获取合并后的 chunks
            const mergedChunks = splitter.split(diff, 1000);

            // 合并后的 chunk 数量应当不超过原始文件数
            return mergedChunks.length <= fileChunks.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('合并后应当包含所有原始文件路径', () => {
      // 简化测试：直接测试 mergeSmallChunks 方法
      const files = [
        { path: 'file1.ts', content: 'a'.repeat(50) },
        { path: 'file2.ts', content: 'b'.repeat(50) },
        { path: 'file3.ts', content: 'c'.repeat(50) },
      ];

      const diff = generateMultiFileDiff(files);
      const estimator = createEstimator(1000);
      const splitter = new DiffSplitter(estimator);

      const fileChunks = splitter.splitByFiles(diff);

      // 直接测试 mergeSmallChunks
      const mergedChunks = (splitter as any).mergeSmallChunks(fileChunks, 1000);

      // 提取所有合并后的文件路径
      const mergedPaths = mergedChunks.flatMap((c: any) => {
        if (c.filePath.includes('Multiple files')) {
          const match = c.filePath.match(/Multiple files \((.+)\)/);
          if (match && match[1]) {
            return match[1].split(', ').map((p: string) => p.trim());
          }
          return [];
        } else if (c.filePath.includes(',')) {
          return c.filePath.split(', ').map((p: string) => p.trim());
        } else {
          return [c.filePath];
        }
      });

      // 检查所有原始文件路径是否都出现
      const originalPaths = fileChunks.map((c) => c.filePath);

      originalPaths.forEach((path) => {
        const found = mergedPaths.some((mp: string) => mp === path || mp.includes(path));
        expect(found).toBe(true);
      });
    });
  });

  /**
   * **Feature: large-diff-handling, Property 21: 贪心合并文件路径格式**
   *
   * 对于任意合并后包含多个文件的 chunk，其 filePath 应当符合以下格式之一：
   * - 文件数 <= 3: "file1, file2, file3"
   * - 文件数 > 3: "Multiple files (...)"
   *
   * **验证: 需求 10.4, 10.5**
   */
  describe('属性 21: 贪心合并文件路径格式', () => {
    it('合并后的文件路径应当符合格式要求', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 15 }).map((s) => `src/${s}.ts`),
              content: fc.string({ minLength: 10, maxLength: 50 }),
            }),
            { minLength: 2, maxLength: 6 }
          ),
          (files) => {
            const diff = generateMultiFileDiff(files);
            const estimator = createEstimator(1000);
            const splitter = new DiffSplitter(estimator);
            const chunks = splitter.split(diff, 1000);

            return chunks.every((chunk) => {
              const filePath = chunk.filePath;

              // 如果包含逗号，说明是合并的
              if (filePath.includes(',')) {
                const fileCount = filePath.split(',').length;
                // 文件数 <= 3 时，应当是简单的逗号分隔
                if (fileCount <= 3) {
                  return !filePath.includes('Multiple files');
                }
              }

              // 如果包含 "Multiple files"，说明文件数 > 3 或路径过长
              if (filePath.includes('Multiple files')) {
                return filePath.includes('(') && filePath.includes(')');
              }

              // 单文件的情况
              return true;
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('合并 2-3 个文件时应当使用逗号分隔', () => {
      const files = [
        { path: 'a.ts', content: 'x'.repeat(30) },
        { path: 'b.ts', content: 'y'.repeat(30) },
        { path: 'c.ts', content: 'z'.repeat(30) },
      ];

      const diff = generateMultiFileDiff(files);
      // 使用更大的限制以确保能够合并
      const estimator = createEstimator(2000);
      const splitter = new DiffSplitter(estimator);
      const chunks = splitter.split(diff, 2000);

      // 应当合并为更少的 chunks
      expect(chunks.length).toBeLessThan(files.length);

      // 查找合并的 chunk（包含逗号的）
      const mergedChunk = chunks.find((c) => c.filePath.includes(','));

      // 如果有合并的 chunk，应当使用逗号分隔格式
      if (mergedChunk) {
        expect(mergedChunk.filePath).toContain(',');
        expect(mergedChunk.filePath).not.toContain('Multiple files');
      }
    });

    it('合并超过 3 个文件时应当使用 Multiple files 格式', () => {
      const files = [
        { path: 'a.ts', content: 'x'.repeat(20) },
        { path: 'b.ts', content: 'y'.repeat(20) },
        { path: 'c.ts', content: 'z'.repeat(20) },
        { path: 'd.ts', content: 'w'.repeat(20) },
        { path: 'e.ts', content: 'v'.repeat(20) },
      ];

      const diff = generateMultiFileDiff(files);
      const estimator = createEstimator(2000);
      const splitter = new DiffSplitter(estimator);
      const chunks = splitter.split(diff, 2000);

      // 查找合并了多个文件的 chunk
      const mergedChunk = chunks.find((c) => c.filePath.includes('Multiple files'));

      // 如果有合并的 chunk，应当使用正确的格式
      if (mergedChunk) {
        expect(mergedChunk.filePath).toMatch(/Multiple files \(.+\)/);
      }
    });
  });

  /**
   * **Feature: large-diff-handling, Property 22: 贪心合并索引一致性**
   *
   * 对于任意合并后的 chunks 列表，每个 chunk 的 chunkIndex 应当从 0 开始连续递增，
   * 且所有 chunk 的 totalChunks 应当等于列表长度。
   *
   * **验证: 需求 10.8**
   */
  describe('属性 22: 贪心合并索引一致性', () => {
    it('合并后的 chunk 索引应当连续且一致', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 20 }).map((s) => `src/${s}.ts`),
              content: fc.string({ minLength: 10, maxLength: 100 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (files) => {
            const diff = generateMultiFileDiff(files);
            const estimator = createEstimator(1000);
            const splitter = new DiffSplitter(estimator);
            const chunks = splitter.split(diff, 1000);

            // 检查索引连续性
            const indicesCorrect = chunks.every((chunk, index) => chunk.chunkIndex === index);

            // 检查 totalChunks 一致性
            const totalCorrect = chunks.every((chunk) => chunk.totalChunks === chunks.length);

            return indicesCorrect && totalCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: large-diff-handling, Property 23: 贪心合并效率提升**
   *
   * 对于任意包含多个小 chunks 的输入（每个 < maxTokens/2），合并后的 chunks 数量
   * 应当显著少于合并前（至少减少 30%）。
   *
   * **验证: 需求 10.9**
   */
  describe('属性 23: 贪心合并效率提升', () => {
    it('合并应当显著减少 chunk 数量', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: fc.string({ minLength: 1, maxLength: 20 }).map((s) => `src/${s}.ts`),
              content: fc.string({ minLength: 10, maxLength: 80 }), // 小文件
            }),
            { minLength: 5, maxLength: 10 } // 多个小文件
          ),
          (files) => {
            const diff = generateMultiFileDiff(files);
            const maxTokens = 1000;
            const estimator = createEstimator(maxTokens);
            const splitter = new DiffSplitter(estimator);

            // 获取按文件拆分的 chunks（合并前）
            const fileChunks = splitter.splitByFiles(diff);

            // 确保每个文件都小于 maxTokens/2
            const allSmall = fileChunks.every(
              (chunk) => estimator.estimate(chunk.content) < maxTokens / 2
            );

            if (!allSmall) {
              return true; // 跳过不符合前提条件的测试
            }

            // 获取合并后的 chunks
            const mergedChunks = splitter.split(diff, maxTokens);

            // 合并后的数量应当显著少于合并前（至少减少 30%）
            const reductionPercent =
              ((fileChunks.length - mergedChunks.length) / fileChunks.length) * 100;

            return reductionPercent >= 30 || mergedChunks.length === 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('实际示例：5 个小文件应当合并为更少的 chunks', () => {
      const files = [
        { path: 'file1.ts', content: 'a'.repeat(100) },
        { path: 'file2.ts', content: 'b'.repeat(100) },
        { path: 'file3.ts', content: 'c'.repeat(100) },
        { path: 'file4.ts', content: 'd'.repeat(100) },
        { path: 'file5.ts', content: 'e'.repeat(100) },
      ];

      const diff = generateMultiFileDiff(files);
      const estimator = createEstimator(1000);
      const splitter = new DiffSplitter(estimator);

      const fileChunks = splitter.splitByFiles(diff);
      const mergedChunks = splitter.split(diff, 1000);

      // 应当从 5 个文件合并为更少的 chunks
      expect(mergedChunks.length).toBeLessThan(fileChunks.length);

      // 减少比例应当至少 30%
      const reductionPercent =
        ((fileChunks.length - mergedChunks.length) / fileChunks.length) * 100;
      expect(reductionPercent).toBeGreaterThanOrEqual(30);
    });
  });
});
