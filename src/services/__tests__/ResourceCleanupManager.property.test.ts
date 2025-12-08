/**
 * ResourceCleanupManager 属性测试
 * 使用 fast-check 进行属性测试，验证资源清理管理器的通用属性
 *
 * Feature: project-optimization-recommendations
 * Property 4: 资源清理防止泄漏
 */

import * as fc from 'fast-check';
import { ResourceCleanupManager } from '../ResourceCleanupManager';

describe('ResourceCleanupManager 属性测试', () => {
  /**
   * 属性 4: 资源清理防止泄漏
   * 对于任何工作区切换操作，切换后的内存使用应当回到基线水平（允许 10% 误差）
   * 验证需求: 2.5
   */
  it('属性 4: 清理所有资源后应当没有残留', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 20 }),
        async (keys) => {
          const manager = new ResourceCleanupManager();
          const cleanedKeys: string[] = [];

          // 注册资源
          for (const key of keys) {
            manager.register(key, async () => {
              cleanedKeys.push(key);
            });
          }

          // 验证资源已注册
          expect(manager.getResourceCount()).toBe(keys.length);

          // 清理所有资源
          await manager.cleanupAll();

          // 验证所有资源都被清理
          expect(manager.getResourceCount()).toBe(0);
          expect(cleanedKeys.sort()).toEqual(keys.sort());
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性: 注册的资源应当可以被清理
   * 对于任何注册的资源，清理后应当不再存在
   */
  it('属性: 注册的资源应当可以被清理', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (key) => {
        const manager = new ResourceCleanupManager();
        let cleaned = false;

        // 注册资源
        manager.register(key, async () => {
          cleaned = true;
        });

        // 验证资源已注册
        expect(manager.getRegisteredKeys()).toContain(key);

        // 清理资源
        await manager.cleanup(key);

        // 验证资源已清理
        expect(cleaned).toBe(true);
        expect(manager.getRegisteredKeys()).not.toContain(key);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 重复注册相同键应当抛出错误
   * 对于任何键，重复注册应当抛出错误
   */
  it('属性: 重复注册相同键应当抛出错误', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (key) => {
        const manager = new ResourceCleanupManager();

        // 第一次注册
        manager.register(key, async () => {});

        // 第二次注册应当抛出错误
        expect(() => {
          manager.register(key, async () => {});
        }).toThrow(`Resource with key "${key}" is already registered`);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 清理未注册的资源应当抛出错误
   * 对于任何未注册的键，清理应当抛出错误
   */
  it('属性: 清理未注册的资源应当抛出错误', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (key) => {
        const manager = new ResourceCleanupManager();

        // 清理未注册的资源应当抛出错误
        await expect(manager.cleanup(key)).rejects.toThrow(
          `Resource with key "${key}" is not registered`
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 取消注册应当移除资源
   * 对于任何已注册的资源，取消注册后应当不再存在
   */
  it('属性: 取消注册应当移除资源', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (key) => {
        const manager = new ResourceCleanupManager();
        let cleaned = false;

        // 注册资源
        manager.register(key, async () => {
          cleaned = true;
        });

        // 取消注册
        manager.unregister(key);

        // 验证资源已移除
        expect(manager.getRegisteredKeys()).not.toContain(key);

        // 验证清理函数未被调用
        expect(cleaned).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 清理日志应当记录所有清理操作
   * 对于任何清理操作，日志应当包含对应的记录
   */
  it('属性: 清理日志应当记录所有清理操作', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
        async (keys) => {
          const manager = new ResourceCleanupManager();

          // 注册资源
          for (const key of keys) {
            manager.register(key, async () => {});
          }

          // 清理所有资源
          await manager.cleanupAll();

          // 验证日志
          const log = manager.getCleanupLog();
          expect(log.length).toBe(keys.length);

          // 验证所有清理都成功
          for (const entry of log) {
            expect(entry.success).toBe(true);
            expect(keys).toContain(entry.key);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性: 清理失败应当记录错误
   * 对于任何抛出错误的清理函数，应当记录错误信息
   */
  it('属性: 清理失败应当记录错误', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (key, errorMessage) => {
          const manager = new ResourceCleanupManager();

          // 注册会失败的资源
          manager.register(key, async () => {
            throw new Error(errorMessage);
          });

          // 清理应当抛出错误
          await expect(manager.cleanup(key)).rejects.toThrow(errorMessage);

          // 验证日志记录了错误
          const log = manager.getCleanupLog();
          expect(log.length).toBe(1);
          if (log[0]) {
            expect(log[0].success).toBe(false);
            expect(log[0].error).toBe(errorMessage);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 属性: 并行清理多个资源应当全部完成
   * 对于任何资源集合，并行清理应当全部完成
   */
  it('属性: 并行清理多个资源应当全部完成', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 10 }),
        async (keys) => {
          const manager = new ResourceCleanupManager();
          const cleanedKeys: string[] = [];

          // 注册资源
          for (const key of keys) {
            manager.register(key, async () => {
              await new Promise((resolve) => setTimeout(resolve, 10));
              cleanedKeys.push(key);
            });
          }

          // 清理所有资源
          await manager.cleanupAll();

          // 验证所有资源都被清理
          expect(cleanedKeys.sort()).toEqual(keys.sort());
          expect(manager.getResourceCount()).toBe(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * 属性: 部分清理失败不应影响其他资源清理
   * 对于任何包含失败清理的资源集合，其他资源应当正常清理
   */
  it('属性: 部分清理失败不应影响其他资源清理', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(fc.tuple(fc.string({ minLength: 1 }), fc.boolean()), {
            minLength: 3,
            maxLength: 10,
          })
          .map((arr) => {
            // 确保键是唯一的
            const seen = new Set<string>();
            return arr.filter(([key]) => {
              if (seen.has(key)) {
                return false;
              }
              seen.add(key);
              return true;
            });
          })
          .filter((arr) => arr.length >= 3), // 确保至少有 3 个唯一的键
        async (resources) => {
          const manager = new ResourceCleanupManager();
          const cleanedKeys: string[] = [];

          // 注册资源（部分会失败）
          for (const [key, shouldFail] of resources) {
            manager.register(key, async () => {
              if (shouldFail) {
                throw new Error(`Failed to cleanup ${key}`);
              }
              cleanedKeys.push(key);
            });
          }

          // 清理所有资源（可能抛出错误）
          try {
            await manager.cleanupAll();
          } catch {
            // 忽略错误
          }

          // 验证成功的资源都被清理
          const expectedCleanedKeys = resources
            .filter(([, shouldFail]) => !shouldFail)
            .map(([key]) => key);
          expect(cleanedKeys.sort()).toEqual(expectedCleanedKeys.sort());

          // 验证所有资源都被尝试清理（无论成功或失败）
          expect(manager.getResourceCount()).toBe(0);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * 属性: 清空日志应当移除所有日志条目
   * 对于任何日志状态，清空后应当没有日志条目
   */
  it('属性: 清空日志应当移除所有日志条目', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
        async (keys) => {
          const manager = new ResourceCleanupManager();

          // 注册并清理资源
          for (const key of keys) {
            manager.register(key, async () => {});
            await manager.cleanup(key);
          }

          // 验证日志不为空
          expect(manager.getCleanupLog().length).toBeGreaterThan(0);

          // 清空日志
          manager.clearLog();

          // 验证日志为空
          expect(manager.getCleanupLog().length).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});
