/**
 * HistoryManager 属性测试
 *
 * **Feature: project-optimization-recommendations, Property 14: 历史记录持久化**
 * **验证需求: 6.5**
 */

import * as fc from 'fast-check';
import { HistoryManager } from '../HistoryManager';

// Mock VSCode ExtensionContext
const createMockContext = () => {
  const storage = new Map<string, unknown>();
  return {
    globalState: {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        return storage.get(key) ?? defaultValue;
      }),
      update: jest.fn(async (key: string, value: unknown) => {
        storage.set(key, value);
      }),
      keys: jest.fn(() => Array.from(storage.keys())),
      setKeysForSync: jest.fn(),
    },
    workspaceState: {
      get: jest.fn(),
      update: jest.fn(),
      keys: jest.fn(() => []),
      setKeysForSync: jest.fn(),
    },
    subscriptions: [],
    extensionPath: '/mock/path',
    extensionUri: {} as any,
    environmentVariableCollection: {} as any,
    storagePath: '/mock/storage',
    globalStoragePath: '/mock/global-storage',
    logPath: '/mock/log',
    extensionMode: 3,
    storageUri: {} as any,
    globalStorageUri: {} as any,
    logUri: {} as any,
    extension: {} as any,
    secrets: {} as any,
    languageModelAccessInformation: {} as any,
  } as any;
};

describe('HistoryManager 属性测试', () => {
  /**
   * 属性 14: 历史记录持久化
   * *对于任何* 提交信息生成操作，成功后应当在历史记录中找到对应条目
   * **验证需求: 6.5**
   */
  describe('属性 14: 历史记录持久化', () => {
    it('应当在添加记录后能够检索到该记录', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string(),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.boolean(),
          async (commitMessage, changes, provider, model, success) => {
            const context = createMockContext();
            const manager = new HistoryManager(context);

            // 添加历史记录
            await manager.addEntry({
              commitMessage,
              changes,
              provider,
              model,
              success,
            });

            // 获取历史记录
            const history = manager.getHistory();

            // 验证：应当能找到刚添加的记录
            expect(history.length).toBeGreaterThan(0);

            const addedEntry = history.find((entry) => entry.commitMessage === commitMessage);
            expect(addedEntry).toBeDefined();
            expect(addedEntry?.provider).toBe(provider);
            expect(addedEntry?.model).toBe(model);
            expect(addedEntry?.success).toBe(success);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当正确过滤历史记录', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              commitMessage: fc.string({ minLength: 1 }),
              changes: fc.string(),
              provider: fc.constantFrom('openai', 'azure', 'ollama'),
              model: fc.constantFrom('gpt-4', 'gpt-3.5', 'claude'),
              success: fc.boolean(),
            }),
            { minLength: 5, maxLength: 20 }
          ),
          fc.constantFrom('openai', 'azure', 'ollama'),
          async (entries, filterProvider) => {
            const context = createMockContext();
            const manager = new HistoryManager(context);

            // 添加所有记录
            for (const entry of entries) {
              await manager.addEntry(entry);
            }

            // 按提供商过滤
            const filtered = manager.getHistory({ provider: filterProvider });

            // 验证：所有返回的记录都应该匹配过滤条件
            filtered.forEach((entry) => {
              expect(entry.provider).toBe(filterProvider);
            });

            // 验证：过滤后的数量应该等于原始数据中匹配的数量
            const expectedCount = entries.filter((e) => e.provider === filterProvider).length;
            expect(filtered.length).toBe(expectedCount);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('应当正确计算统计信息', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              commitMessage: fc.string({ minLength: 1 }),
              changes: fc.string(),
              provider: fc.constantFrom('openai', 'azure', 'ollama'),
              model: fc.constantFrom('gpt-4', 'gpt-3.5', 'claude'),
              success: fc.boolean(),
            }),
            { minLength: 1, maxLength: 50 }
          ),
          async (entries) => {
            const context = createMockContext();
            const manager = new HistoryManager(context);

            // 添加所有记录
            for (const entry of entries) {
              await manager.addEntry(entry);
            }

            // 获取统计信息
            const stats = manager.getStatistics();

            // 验证：总数应该等于添加的记录数
            expect(stats.totalEntries).toBe(entries.length);

            // 验证：成功和失败的数量之和应该等于总数
            expect(stats.successfulEntries + stats.failedEntries).toBe(entries.length);

            // 验证：成功数量应该等于实际成功的记录数
            const actualSuccessCount = entries.filter((e) => e.success).length;
            expect(stats.successfulEntries).toBe(actualSuccessCount);

            // 验证：平均消息长度应该是合理的
            const totalLength = entries.reduce((sum, e) => sum + e.commitMessage.length, 0);
            const expectedAvg = Math.round(totalLength / entries.length);
            expect(stats.averageMessageLength).toBe(expectedAvg);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('应当支持删除记录', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              commitMessage: fc.string({ minLength: 1 }),
              changes: fc.string(),
              provider: fc.string({ minLength: 1 }),
              model: fc.string({ minLength: 1 }),
              success: fc.boolean(),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (entries) => {
            const context = createMockContext();
            const manager = new HistoryManager(context);

            // 添加所有记录
            for (const entry of entries) {
              await manager.addEntry(entry);
            }

            // 获取初始历史记录
            const initialHistory = manager.getHistory();
            const initialCount = initialHistory.length;

            // 删除第一条记录
            if (initialHistory.length > 0) {
              const firstEntry = initialHistory[0];
              if (firstEntry) {
                await manager.deleteEntry(firstEntry.id);

                // 验证：记录数应该减少1
                const afterDelete = manager.getHistory();
                expect(afterDelete.length).toBe(initialCount - 1);

                // 验证：被删除的记录不应该存在
                const deletedEntry = afterDelete.find((e) => e.id === firstEntry.id);
                expect(deletedEntry).toBeUndefined();
              }
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('应当支持导出历史记录为JSON', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              commitMessage: fc.string({ minLength: 1 }),
              changes: fc.string(),
              provider: fc.string({ minLength: 1 }),
              model: fc.string({ minLength: 1 }),
              success: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (entries) => {
            const context = createMockContext();
            const manager = new HistoryManager(context);

            // 添加所有记录
            for (const entry of entries) {
              await manager.addEntry(entry);
            }

            // 导出历史记录
            const exported = manager.exportHistory();

            // 验证：导出的应该是有效的JSON
            expect(() => JSON.parse(exported)).not.toThrow();

            // 验证：解析后的数据应该包含所有记录
            const parsed = JSON.parse(exported);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBe(entries.length);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
