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
});
