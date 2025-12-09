/**
 * StatusConverter 单元测试
 * 测试状态转换器的基本功能
 */

import { StatusConverter } from '../SmartDiffFilter';
import { ChangeStatus } from '../../types';

describe('StatusConverter', () => {
  let converter: StatusConverter;

  beforeEach(() => {
    converter = new StatusConverter();
  });

  describe('convertStatus', () => {
    describe('已知状态转换', () => {
      it('应当将 Added 转换为 "Added"', () => {
        const result = converter.convertStatus(ChangeStatus.Added);
        expect(result).toBe('Added');
      });

      it('应当将 Modified 转换为 "Modified"', () => {
        const result = converter.convertStatus(ChangeStatus.Modified);
        expect(result).toBe('Modified');
      });

      it('应当将 Deleted 转换为 "Deleted"', () => {
        const result = converter.convertStatus(ChangeStatus.Deleted);
        expect(result).toBe('Deleted');
      });

      it('应当将 Renamed 转换为 "Renamed"', () => {
        const result = converter.convertStatus(ChangeStatus.Renamed);
        expect(result).toBe('Renamed');
      });

      it('应当将 Copied 转换为 "Copied"', () => {
        const result = converter.convertStatus(ChangeStatus.Copied);
        expect(result).toBe('Copied');
      });
    });

    describe('未知状态处理', () => {
      it('应当为未知状态返回 "Unknown"', () => {
        // 使用一个不在枚举中的值
        const unknownStatus = 'X' as ChangeStatus;
        const result = converter.convertStatus(unknownStatus);
        expect(result).toBe('Unknown');
      });

      it('应当为 undefined 状态返回 "Unknown"', () => {
        const result = converter.convertStatus(undefined as unknown as ChangeStatus);
        expect(result).toBe('Unknown');
      });

      it('应当为 null 状态返回 "Unknown"', () => {
        const result = converter.convertStatus(null as unknown as ChangeStatus);
        expect(result).toBe('Unknown');
      });

      it('应当为空字符串状态返回 "Unknown"', () => {
        const result = converter.convertStatus('' as ChangeStatus);
        expect(result).toBe('Unknown');
      });
    });

    describe('一致性测试', () => {
      it('多次调用应当返回相同结果', () => {
        const status = ChangeStatus.Modified;
        const result1 = converter.convertStatus(status);
        const result2 = converter.convertStatus(status);
        const result3 = converter.convertStatus(status);

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
        expect(result1).toBe('Modified');
      });

      it('不同实例应当返回相同结果', () => {
        const converter1 = new StatusConverter();
        const converter2 = new StatusConverter();

        const status = ChangeStatus.Added;
        const result1 = converter1.convertStatus(status);
        const result2 = converter2.convertStatus(status);

        expect(result1).toBe(result2);
        expect(result1).toBe('Added');
      });
    });

    describe('批量转换测试', () => {
      it('应当正确转换所有已知状态', () => {
        const statuses = [
          ChangeStatus.Added,
          ChangeStatus.Modified,
          ChangeStatus.Deleted,
          ChangeStatus.Renamed,
          ChangeStatus.Copied,
        ];

        const expected = ['Added', 'Modified', 'Deleted', 'Renamed', 'Copied'];

        const results = statuses.map((status) => converter.convertStatus(status));

        expect(results).toEqual(expected);
      });

      it('应当为混合状态列表正确转换', () => {
        const statuses = [
          ChangeStatus.Modified,
          ChangeStatus.Added,
          ChangeStatus.Modified,
          ChangeStatus.Deleted,
          ChangeStatus.Renamed,
        ];

        const expected = ['Modified', 'Added', 'Modified', 'Deleted', 'Renamed'];

        const results = statuses.map((status) => converter.convertStatus(status));

        expect(results).toEqual(expected);
      });
    });

    describe('返回值验证', () => {
      it('返回值应当是字符串类型', () => {
        const statuses = [
          ChangeStatus.Added,
          ChangeStatus.Modified,
          ChangeStatus.Deleted,
          ChangeStatus.Renamed,
          ChangeStatus.Copied,
        ];

        statuses.forEach((status) => {
          const result = converter.convertStatus(status);
          expect(typeof result).toBe('string');
        });
      });

      it('返回值应当不为空', () => {
        const statuses = [
          ChangeStatus.Added,
          ChangeStatus.Modified,
          ChangeStatus.Deleted,
          ChangeStatus.Renamed,
          ChangeStatus.Copied,
        ];

        statuses.forEach((status) => {
          const result = converter.convertStatus(status);
          expect(result.length).toBeGreaterThan(0);
        });
      });

      it('返回值应当首字母大写', () => {
        const statuses = [
          ChangeStatus.Added,
          ChangeStatus.Modified,
          ChangeStatus.Deleted,
          ChangeStatus.Renamed,
          ChangeStatus.Copied,
        ];

        statuses.forEach((status) => {
          const result = converter.convertStatus(status);
          expect(result[0]).toBe(result[0]?.toUpperCase());
        });
      });

      it('返回值应当只包含字母', () => {
        const statuses = [
          ChangeStatus.Added,
          ChangeStatus.Modified,
          ChangeStatus.Deleted,
          ChangeStatus.Renamed,
          ChangeStatus.Copied,
        ];

        statuses.forEach((status) => {
          const result = converter.convertStatus(status);
          expect(result).toMatch(/^[A-Za-z]+$/);
        });
      });
    });

    describe('唯一性测试', () => {
      it('每个状态应当映射到唯一的字符串', () => {
        const statuses = [
          ChangeStatus.Added,
          ChangeStatus.Modified,
          ChangeStatus.Deleted,
          ChangeStatus.Renamed,
          ChangeStatus.Copied,
        ];

        const results = statuses.map((status) => converter.convertStatus(status));
        const uniqueResults = new Set(results);

        expect(uniqueResults.size).toBe(statuses.length);
      });

      it('不同状态应当返回不同字符串', () => {
        const result1 = converter.convertStatus(ChangeStatus.Added);
        const result2 = converter.convertStatus(ChangeStatus.Modified);
        const result3 = converter.convertStatus(ChangeStatus.Deleted);

        expect(result1).not.toBe(result2);
        expect(result2).not.toBe(result3);
        expect(result1).not.toBe(result3);
      });
    });
  });

  describe('实例化测试', () => {
    it('应当能够创建多个实例', () => {
      const converter1 = new StatusConverter();
      const converter2 = new StatusConverter();
      const converter3 = new StatusConverter();

      expect(converter1).toBeInstanceOf(StatusConverter);
      expect(converter2).toBeInstanceOf(StatusConverter);
      expect(converter3).toBeInstanceOf(StatusConverter);
    });

    it('不同实例应当独立工作', () => {
      const converter1 = new StatusConverter();
      const converter2 = new StatusConverter();

      const result1 = converter1.convertStatus(ChangeStatus.Added);
      const result2 = converter2.convertStatus(ChangeStatus.Modified);

      expect(result1).toBe('Added');
      expect(result2).toBe('Modified');
    });
  });
});
