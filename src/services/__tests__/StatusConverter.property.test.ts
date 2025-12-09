/**
 * StatusConverter 属性测试
 * 使用 fast-check 进行属性测试，验证状态转换器的正确性属性
 *
 * **Feature: smart-diff-filter**
 */

import * as fc from 'fast-check';
import { StatusConverter } from '../SmartDiffFilter';
import { ChangeStatus } from '../../types';

describe('StatusConverter 属性测试', () => {
  /**
   * **Feature: smart-diff-filter, Property 2: 状态转换正确性**
   *
   * 对于任意已知的 ChangeStatus 枚举值，转换后的字符串应当是预定义映射表中的对应值。
   *
   * **验证: 需求 1.2**
   */
  describe('属性 2: 状态转换正确性', () => {
    it('应当将所有已知状态正确转换为对应的字符串', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            ChangeStatus.Added,
            ChangeStatus.Modified,
            ChangeStatus.Deleted,
            ChangeStatus.Renamed,
            ChangeStatus.Copied
          ),
          (status) => {
            const converter = new StatusConverter();
            const result = converter.convertStatus(status);

            // 验证返回值是字符串
            if (typeof result !== 'string') {
              return false;
            }

            // 验证返回值不为空
            if (result.length === 0) {
              return false;
            }

            // 验证返回值不是 'Unknown'（对于已知状态）
            if (result === 'Unknown') {
              return false;
            }

            // 验证具体的映射关系
            const expectedMappings: Record<ChangeStatus, string> = {
              [ChangeStatus.Added]: 'Added',
              [ChangeStatus.Modified]: 'Modified',
              [ChangeStatus.Deleted]: 'Deleted',
              [ChangeStatus.Renamed]: 'Renamed',
              [ChangeStatus.Copied]: 'Copied',
            };

            return result === expectedMappings[status];
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当为所有已知状态返回一致的结果', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            ChangeStatus.Added,
            ChangeStatus.Modified,
            ChangeStatus.Deleted,
            ChangeStatus.Renamed,
            ChangeStatus.Copied
          ),
          (status) => {
            const converter1 = new StatusConverter();
            const converter2 = new StatusConverter();

            const result1 = converter1.convertStatus(status);
            const result2 = converter2.convertStatus(status);

            // 多次调用应当返回相同的结果（幂等性）
            return result1 === result2;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当为每个状态返回唯一的字符串', () => {
      const converter = new StatusConverter();
      const allStatuses = [
        ChangeStatus.Added,
        ChangeStatus.Modified,
        ChangeStatus.Deleted,
        ChangeStatus.Renamed,
        ChangeStatus.Copied,
      ];

      const results = allStatuses.map((status) => converter.convertStatus(status));

      // 验证所有结果都是唯一的
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(allStatuses.length);

      // 验证没有重复
      expect(results.length).toBe(uniqueResults.size);
    });

    it('转换结果应当是有效的英文单词', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            ChangeStatus.Added,
            ChangeStatus.Modified,
            ChangeStatus.Deleted,
            ChangeStatus.Renamed,
            ChangeStatus.Copied
          ),
          (status) => {
            const converter = new StatusConverter();
            const result = converter.convertStatus(status);

            // 验证结果只包含字母（英文单词）
            const isValidWord = /^[A-Za-z]+$/.test(result);

            // 验证首字母大写
            const isCapitalized = result[0] === result[0]?.toUpperCase();

            return isValidWord && isCapitalized;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 边界情况测试：未知状态处理
   */
  describe('未知状态处理', () => {
    it('应当为未知状态返回 "Unknown"', () => {
      const converter = new StatusConverter();

      // 使用一个不在枚举中的值（通过类型断言）
      const unknownStatus = 'X' as ChangeStatus;
      const result = converter.convertStatus(unknownStatus);

      expect(result).toBe('Unknown');
    });

    it('对于未知状态，多次调用应当返回相同结果', () => {
      const converter = new StatusConverter();
      const unknownStatus = 'X' as ChangeStatus;

      const result1 = converter.convertStatus(unknownStatus);
      const result2 = converter.convertStatus(unknownStatus);

      expect(result1).toBe(result2);
      expect(result1).toBe('Unknown');
    });
  });

  /**
   * 性能测试：大量转换
   */
  describe('性能测试', () => {
    it('应当能够快速处理大量状态转换', () => {
      const converter = new StatusConverter();
      const statuses = Array.from({ length: 10000 }, (_, i) => {
        const statusValues = [
          ChangeStatus.Added,
          ChangeStatus.Modified,
          ChangeStatus.Deleted,
          ChangeStatus.Renamed,
          ChangeStatus.Copied,
        ];
        return statusValues[i % statusValues.length] as ChangeStatus;
      });

      const startTime = Date.now();
      statuses.forEach((status) => converter.convertStatus(status));
      const endTime = Date.now();

      // 10000 次转换应当在 100ms 内完成
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
