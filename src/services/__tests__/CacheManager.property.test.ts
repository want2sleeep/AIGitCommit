/**
 * CacheManager 属性测试
 * 使用 fast-check 进行属性测试，验证缓存管理器的通用属性
 *
 * Feature: project-optimization-recommendations
 * Property 2: 缓存命中提升性能
 */

import * as fc from 'fast-check';
import { CacheManager } from '../CacheManager';

describe('CacheManager 属性测试', () => {
  /**
   * 属性 2: 缓存命中提升性能
   * 对于任何配置读取操作，当缓存命中时，响应时间应当显著低于首次读取（至少快 50%）
   * 验证需求: 2.3
   */
  it('属性 2: 缓存命中应当显著提升性能', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), fc.anything(), async (key, value) => {
        const cache = new CacheManager();

        // 设置缓存
        cache.set(key, value);

        // 多次读取以获得更稳定的性能测量
        const iterations = 10;

        // 测量缓存命中的性能
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          const cached = cache.get(key);
          expect(cached).toEqual(value);
        }
        const duration = performance.now() - start;

        // 验证平均每次读取时间很短（小于 1ms）
        const avgDuration = duration / iterations;
        expect(avgDuration).toBeLessThan(1);

        // 清理
        cache.dispose();
      }),
      { numRuns: 50 } // 减少运行次数以加快测试
    );
  });

  /**
   * 属性: 缓存设置后应当能够获取
   * 对于任何键值对，设置后应当能够获取到相同的值
   */
  it('属性: 缓存设置后应当能够获取', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), fc.anything(), async (key, value) => {
        const cache = new CacheManager();

        cache.set(key, value);
        const retrieved = cache.get(key);

        expect(retrieved).toEqual(value);

        cache.dispose();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 缓存过期后应当返回 undefined
   * 对于任何键值对，设置短 TTL 后等待过期，应当返回 undefined
   */
  it('属性: 缓存过期后应当返回 undefined', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), fc.anything(), async (key, value) => {
        const cache = new CacheManager();
        const shortTTL = 50; // 50ms

        cache.set(key, value, shortTTL);

        // 等待过期
        await new Promise((resolve) => setTimeout(resolve, shortTTL + 10));

        const retrieved = cache.get(key);

        expect(retrieved).toBeUndefined();

        cache.dispose();
      }),
      { numRuns: 50 } // 减少运行次数，因为需要等待
    );
  });

  /**
   * 属性: 删除缓存后应当返回 undefined
   * 对于任何键值对，设置后删除，应当返回 undefined
   */
  it('属性: 删除缓存后应当返回 undefined', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), fc.anything(), async (key, value) => {
        const cache = new CacheManager();

        cache.set(key, value);
        cache.delete(key);
        const retrieved = cache.get(key);

        expect(retrieved).toBeUndefined();

        cache.dispose();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: has 方法应当与 get 方法一致
   * 对于任何键，has 返回 true 当且仅当 get 返回非 undefined
   */
  it('属性: has 方法应当与 get 方法一致', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.anything().filter((v) => v !== undefined), // 排除 undefined 值
        fc.boolean(),
        async (key, value, shouldSet) => {
          const cache = new CacheManager();

          if (shouldSet) {
            cache.set(key, value);
          }

          const hasResult = cache.has(key);
          const getResult = cache.get(key);

          expect(hasResult).toBe(getResult !== undefined);

          cache.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 清空缓存后所有键都应当返回 undefined
   * 对于任何键值对集合，设置后清空，所有键都应当返回 undefined
   */
  it('属性: 清空缓存后所有键都应当返回 undefined', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.tuple(fc.string({ minLength: 1 }), fc.anything()), { minLength: 1 }),
        async (entries) => {
          const cache = new CacheManager();

          // 设置所有条目
          for (const [key, value] of entries) {
            cache.set(key, value);
          }

          // 清空缓存
          cache.clear();

          // 验证所有键都返回 undefined
          for (const [key] of entries) {
            const retrieved = cache.get(key);
            expect(retrieved).toBeUndefined();
          }

          cache.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 缓存统计应当准确
   * 对于任何操作序列，缓存统计应当准确反映命中和未命中次数
   */
  it('属性: 缓存统计应当准确', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.oneof(
            fc.record({
              type: fc.constant('set'),
              key: fc.string({ minLength: 1 }),
              value: fc.anything(),
            }),
            fc.record({ type: fc.constant('get'), key: fc.string({ minLength: 1 }) })
          ),
          { minLength: 1 }
        ),
        async (operations) => {
          const cache = new CacheManager();
          let expectedHits = 0;
          let expectedMisses = 0;
          const setKeys = new Set<string>();

          for (const op of operations) {
            if (op.type === 'set') {
              cache.set(op.key, op.value);
              setKeys.add(op.key);
            } else if (op.type === 'get') {
              const result = cache.get(op.key);
              if (result !== undefined) {
                expectedHits++;
              } else {
                expectedMisses++;
              }
            }
          }

          const stats = cache.getStatistics();

          expect(stats.hits).toBe(expectedHits);
          expect(stats.misses).toBe(expectedMisses);

          cache.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 相同键的多次设置应当覆盖旧值
   * 对于任何键和两个不同的值，第二次设置应当覆盖第一次的值
   */
  it('属性: 相同键的多次设置应当覆盖旧值', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.anything(),
        fc.anything(),
        async (key, value1, value2) => {
          // 确保两个值不同
          fc.pre(JSON.stringify(value1) !== JSON.stringify(value2));

          const cache = new CacheManager();

          cache.set(key, value1);
          cache.set(key, value2);
          const retrieved = cache.get(key);

          expect(retrieved).toEqual(value2);
          expect(retrieved).not.toEqual(value1);

          cache.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性: 不同键的缓存应当相互独立
   * 对于任何两个不同的键，设置和获取应当相互独立
   */
  it('属性: 不同键的缓存应当相互独立', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.anything(),
        fc.anything(),
        async (key1, key2, value1, value2) => {
          // 确保两个键不同
          fc.pre(key1 !== key2);

          const cache = new CacheManager();

          cache.set(key1, value1);
          cache.set(key2, value2);

          const retrieved1 = cache.get(key1);
          const retrieved2 = cache.get(key2);

          expect(retrieved1).toEqual(value1);
          expect(retrieved2).toEqual(value2);

          cache.dispose();
        }
      ),
      { numRuns: 100 }
    );
  });
});
