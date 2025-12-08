/**
 * 性能测试
 * 测试扩展的性能特性
 *
 * 需求: 9.3
 */

import { CacheManager } from '../services/CacheManager';
import { RequestQueueManager } from '../services/RequestQueueManager';

// Mock vscode 模块
jest.mock('vscode', () => ({
  ExtensionContext: jest.fn(),
  window: {
    createOutputChannel: jest.fn().mockReturnValue({
      appendLine: jest.fn(),
      append: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
      name: 'Test',
      replace: jest.fn(),
    }),
  },
}));

describe('性能测试', () => {
  describe('扩展激活时间', () => {
    it('应当在合理时间内完成初始化', () => {
      const startTime = performance.now();

      // 初始化缓存管理器
      const cacheManager = new CacheManager();

      // 初始化请求队列管理器
      const queueManager = new RequestQueueManager(3);

      const endTime = performance.now();
      const initTime = endTime - startTime;

      // 验证初始化时间在 100ms 以内
      expect(initTime).toBeLessThan(100);

      // 清理
      cacheManager.dispose();
      queueManager.clear();
    });
  });

  describe('缓存性能', () => {
    let cacheManager: CacheManager;

    beforeEach(() => {
      cacheManager = new CacheManager();
    });

    afterEach(() => {
      cacheManager.dispose();
    });

    it('应当在 1ms 内完成缓存读写操作', () => {
      const iterations = 1000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        cacheManager.set(`key_${i}`, { data: `value_${i}` }, 60000);
      }

      for (let i = 0; i < iterations; i++) {
        cacheManager.get(`key_${i}`);
      }

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / (iterations * 2);

      // 平均每次操作应在 1ms 以内
      expect(avgTime).toBeLessThan(1);
    });

    it('应当高效处理大量缓存条目', () => {
      const entries = 10000;
      const startTime = performance.now();

      // 写入大量条目
      for (let i = 0; i < entries; i++) {
        cacheManager.set(`key_${i}`, { data: `value_${i}` }, 60000);
      }

      const writeTime = performance.now() - startTime;

      // 读取所有条目
      const readStart = performance.now();
      for (let i = 0; i < entries; i++) {
        cacheManager.get(`key_${i}`);
      }
      const readTime = performance.now() - readStart;

      // 写入 10000 条应在 500ms 以内
      expect(writeTime).toBeLessThan(500);
      // 读取 10000 条应在 100ms 以内
      expect(readTime).toBeLessThan(100);
    });

    it('缓存命中应当比重新计算快', () => {
      // 模拟一个耗时计算
      const expensiveComputation = (input: string): string => {
        let result = input;
        for (let i = 0; i < 1000; i++) {
          result = result.split('').reverse().join('');
        }
        return result;
      };

      const testInput = 'test-input-string';

      // 首次计算（无缓存）
      const computeStart = performance.now();
      const computedResult = expensiveComputation(testInput);
      const computeTime = performance.now() - computeStart;

      // 存入缓存
      cacheManager.set('computed_result', computedResult, 60000);

      // 从缓存读取
      const cacheStart = performance.now();
      const cachedResult = cacheManager.get<string>('computed_result');
      const cacheTime = performance.now() - cacheStart;

      // 缓存读取应该比计算快至少 10 倍
      expect(cacheTime).toBeLessThan(computeTime / 10);
      expect(cachedResult).toBe(computedResult);
    });
  });

  describe('请求队列性能', () => {
    let queueManager: RequestQueueManager;

    beforeEach(() => {
      queueManager = new RequestQueueManager(5);
    });

    afterEach(() => {
      queueManager.clear();
    });

    it('应当高效处理并发请求', async () => {
      const requestCount = 20;
      const requests: Promise<number>[] = [];

      const startTime = performance.now();

      // 创建多个并发请求
      for (let i = 0; i < requestCount; i++) {
        const request = queueManager.enqueue(
          async () => {
            // 模拟快速操作
            await new Promise((resolve) => setTimeout(resolve, 10));
            return i;
          },
          i % 3 // priority
        );
        requests.push(request);
      }

      // 等待所有请求完成
      const results = await Promise.all(requests);
      const totalTime = performance.now() - startTime;

      // 验证所有请求都完成了
      expect(results.length).toBe(requestCount);

      // 由于并发限制为 5，20 个请求（每个 10ms）应该在约 50ms 内完成
      // 加上一些开销，应该在 500ms 以内
      expect(totalTime).toBeLessThan(500);
    });

    it('应当正确限制并发数', async () => {
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const requests: Promise<void>[] = [];

      for (let i = 0; i < 10; i++) {
        const request = queueManager.enqueue(async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise((resolve) => setTimeout(resolve, 50));
          currentConcurrent--;
        });
        requests.push(request);
      }

      await Promise.all(requests);

      // 最大并发数不应超过配置的 5
      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });
  });

  describe('大型 diff 处理', () => {
    it('应当高效处理大型 diff 字符串', () => {
      // 生成大型 diff（约 100KB）
      const lines: string[] = [];
      for (let i = 0; i < 2000; i++) {
        lines.push(`+const variable${i} = "value${i}";`);
        lines.push(`-const oldVariable${i} = "oldValue${i}";`);
      }
      const largeDiff = lines.join('\n');

      const startTime = performance.now();

      // 模拟 diff 解析操作
      const addedLines = largeDiff.split('\n').filter((line) => line.startsWith('+'));
      const removedLines = largeDiff.split('\n').filter((line) => line.startsWith('-'));

      const parseTime = performance.now() - startTime;

      // 解析 100KB diff 应在 50ms 以内
      expect(parseTime).toBeLessThan(50);
      expect(addedLines.length).toBe(2000);
      expect(removedLines.length).toBe(2000);
    });

    it('应当高效统计 diff 变更', () => {
      // 生成包含多种变更类型的 diff
      const diffContent = `
diff --git a/src/file1.ts b/src/file1.ts
index 1234567..abcdefg 100644
--- a/src/file1.ts
+++ b/src/file1.ts
@@ -1,10 +1,15 @@
+import { newModule } from './newModule';
 import { existingModule } from './existingModule';
-import { oldModule } from './oldModule';
 
 export function main() {
-  oldModule.doSomething();
+  newModule.doSomething();
+  newModule.doSomethingElse();
   existingModule.process();
+  // 添加新功能
+  const result = newModule.calculate();
+  return result;
 }
`.repeat(100); // 重复 100 次模拟大文件

      const startTime = performance.now();

      // 统计变更
      const lines = diffContent.split('\n');
      let additions = 0;
      let deletions = 0;

      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++;
        }
      }

      const statsTime = performance.now() - startTime;

      // 统计应在 50ms 以内
      expect(statsTime).toBeLessThan(50);
      expect(additions).toBeGreaterThan(0);
      expect(deletions).toBeGreaterThan(0);
    });
  });

  describe('内存使用', () => {
    it('缓存应当正确清理过期条目', async () => {
      const cacheManager = new CacheManager();

      // 添加大量短期缓存条目
      for (let i = 0; i < 100; i++) {
        cacheManager.set(`temp_${i}`, { data: `value_${i}` }, 100); // 100ms TTL
      }

      // 验证条目存在
      expect(cacheManager.get('temp_0')).toBeDefined();

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 验证条目已过期（get 会自动清理过期条目）
      expect(cacheManager.get('temp_0')).toBeUndefined();

      // 清理
      cacheManager.dispose();
    });

    it('请求队列应当正确释放资源', async () => {
      const queueManager = new RequestQueueManager(3);

      // 执行一些请求
      const requests: Promise<number>[] = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          queueManager.enqueue(async () => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return i;
          })
        );
      }

      await Promise.all(requests);

      // 所有请求完成后，活动请求应为 0
      expect(queueManager.getActiveRequestCount()).toBe(0);
      expect(queueManager.getQueueLength()).toBe(0);

      // 清理
      queueManager.clear();
    });
  });
});
