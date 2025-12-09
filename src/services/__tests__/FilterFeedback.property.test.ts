import * as fc from 'fast-check';
import { FilterFeedback, FilterStats } from '../SmartDiffFilter';

/**
 * Feature: smart-diff-filter, Property 18: 过滤统计准确性
 * Validates: Requirements 12.1, 12.2
 *
 * 验证统计信息的准确性
 */
describe('FilterFeedback Property Tests', () => {
  describe('Property 18: 过滤统计准确性', () => {
    it('应当正确计算和显示过滤统计信息', () => {
      fc.assert(
        fc.property(
          // 生成随机的过滤统计数据
          fc.record({
            totalFiles: fc.integer({ min: 0, max: 1000 }),
            coreFiles: fc.integer({ min: 0, max: 1000 }),
            ignoredFiles: fc.integer({ min: 0, max: 1000 }),
            filtered: fc.boolean(),
            skipReason: fc.option(fc.string(), { nil: undefined }),
          }),
          (stats) => {
            // 确保统计数据一致性
            const validStats: FilterStats = {
              ...stats,
              coreFiles: Math.min(stats.coreFiles, stats.totalFiles),
              ignoredFiles: Math.min(stats.ignoredFiles, stats.totalFiles),
            };

            // 确保 coreFiles + ignoredFiles <= totalFiles
            if (validStats.coreFiles + validStats.ignoredFiles > validStats.totalFiles) {
              validStats.ignoredFiles = validStats.totalFiles - validStats.coreFiles;
            }

            // 创建模拟的输出频道
            const mockOutputChannel = {
              appendLine: jest.fn(),
            };

            const feedback = new FilterFeedback(mockOutputChannel, true, true);

            // 调用 showFilterStats
            feedback.showFilterStats(validStats);

            // 验证：如果启用了详细日志，应该调用 appendLine
            if (validStats.filtered || validStats.skipReason) {
              expect(mockOutputChannel.appendLine).toHaveBeenCalled();

              // 获取记录的日志
              const logCalls = mockOutputChannel.appendLine.mock.calls;
              const fullLog = logCalls.map((call: any[]) => call[0]).join('\n');

              // 验证日志包含关键统计信息
              expect(fullLog).toContain(`Total files: ${validStats.totalFiles}`);

              if (validStats.filtered) {
                expect(fullLog).toContain(`Core files: ${validStats.coreFiles}`);
                expect(fullLog).toContain(`Ignored files: ${validStats.ignoredFiles}`);

                // 验证统计准确性：coreFiles + ignoredFiles 应该等于 totalFiles
                expect(validStats.coreFiles + validStats.ignoredFiles).toBeLessThanOrEqual(
                  validStats.totalFiles
                );
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当在禁用统计显示时不输出任何内容', () => {
      fc.assert(
        fc.property(
          fc.record({
            totalFiles: fc.integer({ min: 0, max: 100 }),
            coreFiles: fc.integer({ min: 0, max: 100 }),
            ignoredFiles: fc.integer({ min: 0, max: 100 }),
            filtered: fc.boolean(),
            skipReason: fc.option(fc.string(), { nil: undefined }),
          }),
          (stats) => {
            const mockOutputChannel = {
              appendLine: jest.fn(),
            };

            // 创建禁用统计显示的 feedback
            const feedback = new FilterFeedback(mockOutputChannel, false, true);

            feedback.showFilterStats(stats);

            // 验证：不应该调用任何输出方法
            expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当在禁用详细日志时不记录到输出频道', () => {
      fc.assert(
        fc.property(
          fc.record({
            totalFiles: fc.integer({ min: 1, max: 100 }),
            coreFiles: fc.integer({ min: 0, max: 100 }),
            ignoredFiles: fc.integer({ min: 0, max: 100 }),
            filtered: fc.boolean(),
            skipReason: fc.option(fc.string(), { nil: undefined }),
          }),
          (stats) => {
            const mockOutputChannel = {
              appendLine: jest.fn(),
            };

            // 创建禁用详细日志的 feedback
            const feedback = new FilterFeedback(mockOutputChannel, true, false);

            feedback.showFilterStats(stats);

            // 验证：不应该调用输出频道
            expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当为不同的跳过原因生成正确的消息', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Too few files', 'Too many files', 'Empty file list', 'Other reason'),
          (reasonType) => {
            const mockOutputChannel = {
              appendLine: jest.fn(),
            };

            const feedback = new FilterFeedback(mockOutputChannel, true, true);

            let stats: FilterStats;
            switch (reasonType) {
              case 'Too few files':
                stats = {
                  totalFiles: 2,
                  coreFiles: 2,
                  ignoredFiles: 0,
                  filtered: false,
                  skipReason: 'Too few files (< 3), no filtering needed',
                };
                break;
              case 'Too many files':
                stats = {
                  totalFiles: 600,
                  coreFiles: 600,
                  ignoredFiles: 0,
                  filtered: false,
                  skipReason: 'Too many files (> 500), skipping to prevent context overflow',
                };
                break;
              case 'Empty file list':
                stats = {
                  totalFiles: 0,
                  coreFiles: 0,
                  ignoredFiles: 0,
                  filtered: false,
                  skipReason: 'Empty file list',
                };
                break;
              default:
                stats = {
                  totalFiles: 5,
                  coreFiles: 5,
                  ignoredFiles: 0,
                  filtered: false,
                  skipReason: 'Other reason',
                };
            }

            feedback.showFilterStats(stats);

            // 验证日志包含跳过原因
            const logCalls = mockOutputChannel.appendLine.mock.calls;
            const fullLog = logCalls.map((call: any[]) => call[0]).join('\n');

            expect(fullLog).toContain('Skipped');
            expect(fullLog).toContain(stats.skipReason);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
