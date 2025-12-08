/**
 * CacheManager 单元测试
 * 测试缓存管理器的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { CacheManager } from '../CacheManager';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager();
  });

  afterEach(() => {
    cache.dispose();
  });

  describe('基本操作', () => {
    it('应当能够设置和获取缓存值', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('应当能够存储不同类型的值', () => {
      cache.set('string', 'hello');
      cache.set('number', 42);
      cache.set('object', { name: 'test' });
      cache.set('array', [1, 2, 3]);
      cache.set('boolean', true);

      expect(cache.get('string')).toBe('hello');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('object')).toEqual({ name: 'test' });
      expect(cache.get('array')).toEqual([1, 2, 3]);
      expect(cache.get('boolean')).toBe(true);
    });

    it('应当对不存在的键返回 undefined', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('应当能够删除缓存', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBeUndefined();
    });

    it('应当能够清空所有缓存', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });
  });

  describe('has 方法', () => {
    it('应当对存在的键返回 true', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('应当对不存在的键返回 false', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('应当对过期的键返回 false', async () => {
      cache.set('key1', 'value1', 50);
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('TTL 功能', () => {
    it('应当使用默认 TTL', () => {
      const shortTTLCache = new CacheManager(100);
      shortTTLCache.set('key1', 'value1');
      expect(shortTTLCache.get('key1')).toBe('value1');
      shortTTLCache.dispose();
    });

    it('应当使用自定义 TTL', async () => {
      cache.set('key1', 'value1', 50);
      expect(cache.get('key1')).toBe('value1');
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(cache.get('key1')).toBeUndefined();
    });

    it('应当在过期后自动删除缓存', async () => {
      cache.set('key1', 'value1', 50);
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('统计功能', () => {
    it('应当正确统计命中次数', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.get('key1');
      const stats = cache.getStatistics();
      expect(stats.hits).toBe(2);
    });

    it('应当正确统计未命中次数', () => {
      cache.get('nonexistent1');
      cache.get('nonexistent2');
      const stats = cache.getStatistics();
      expect(stats.misses).toBe(2);
    });

    it('应当正确计算命中率', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // 命中
      cache.get('key1'); // 命中
      cache.get('nonexistent'); // 未命中
      const stats = cache.getStatistics();
      expect(stats.hitRate).toBeCloseTo(2 / 3, 2);
    });

    it('应当正确统计条目数量', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      const stats = cache.getStatistics();
      expect(stats.totalEntries).toBe(3);
    });

    it('应当在清空后重置统计', () => {
      cache.set('key1', 'value1');
      cache.get('key1');
      cache.clear();
      const stats = cache.getStatistics();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('覆盖行为', () => {
    it('应当覆盖相同键的旧值', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('应当更新 TTL 当覆盖时', async () => {
      cache.set('key1', 'value1', 50);
      await new Promise((resolve) => setTimeout(resolve, 30));
      cache.set('key1', 'value2', 100);
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(cache.get('key1')).toBe('value2');
    });
  });

  describe('dispose 方法', () => {
    it('应当清理所有资源', () => {
      cache.set('key1', 'value1');
      cache.dispose();
      expect(cache.get('key1')).toBeUndefined();
    });
  });
});
