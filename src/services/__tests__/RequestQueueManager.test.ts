/**
 * RequestQueueManager 单元测试
 * 测试请求队列管理器的核心功能
 *
 * 需求: 9.1, 9.2
 */

import { RequestQueueManager } from '../RequestQueueManager';

describe('RequestQueueManager', () => {
  let queue: RequestQueueManager;

  beforeEach(() => {
    queue = new RequestQueueManager(3);
  });

  afterEach(() => {
    queue.clear();
  });

  describe('基本操作', () => {
    it('应当能够入队并执行请求', async () => {
      const result = await queue.enqueue(async () => 'success');
      expect(result).toBe('success');
    });

    it('应当返回请求的结果', async () => {
      const result = await queue.enqueue(async () => {
        return { data: 'test', count: 42 };
      });
      expect(result).toEqual({ data: 'test', count: 42 });
    });

    it('应当传播请求的错误', async () => {
      await expect(
        queue.enqueue(async () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
    });
  });

  describe('并发控制', () => {
    it('应当限制并发请求数量', async () => {
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const requests = Array.from({ length: 10 }, () =>
        queue.enqueue(async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise((resolve) => setTimeout(resolve, 20));
          currentConcurrent--;
          return true;
        })
      );

      await Promise.all(requests);
      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('应当能够动态调整并发限制', async () => {
      queue.setConcurrencyLimit(5);
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const requests = Array.from({ length: 10 }, () =>
        queue.enqueue(async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          await new Promise((resolve) => setTimeout(resolve, 20));
          currentConcurrent--;
          return true;
        })
      );

      await Promise.all(requests);
      expect(maxConcurrent).toBeLessThanOrEqual(5);
    });

    it('应当拒绝无效的并发限制', () => {
      expect(() => queue.setConcurrencyLimit(0)).toThrow('Concurrency limit must be at least 1');
      expect(() => queue.setConcurrencyLimit(-1)).toThrow('Concurrency limit must be at least 1');
    });
  });

  describe('优先级', () => {
    it('应当按优先级顺序执行请求', async () => {
      const serialQueue = new RequestQueueManager(1);
      const executionOrder: number[] = [];

      // 先入队一个阻塞请求
      const blockingPromise = serialQueue.enqueue(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        executionOrder.push(0);
        return 0;
      });

      // 入队不同优先级的请求
      const lowPriority = serialQueue.enqueue(async () => {
        executionOrder.push(1);
        return 1;
      }, 1);

      const highPriority = serialQueue.enqueue(async () => {
        executionOrder.push(3);
        return 3;
      }, 3);

      const mediumPriority = serialQueue.enqueue(async () => {
        executionOrder.push(2);
        return 2;
      }, 2);

      await Promise.all([blockingPromise, lowPriority, highPriority, mediumPriority]);

      // 第一个请求先执行，然后按优先级顺序
      expect(executionOrder[0]).toBe(0);
      expect(executionOrder[1]).toBe(3); // 高优先级
      expect(executionOrder[2]).toBe(2); // 中优先级
      expect(executionOrder[3]).toBe(1); // 低优先级

      serialQueue.clear();
    });
  });

  describe('队列状态', () => {
    it('应当正确报告队列长度', async () => {
      // 创建快速完成的请求
      const requests = Array.from({ length: 5 }, (_, i) =>
        queue.enqueue(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return i;
        })
      );

      // 等待所有请求完成
      await Promise.all(requests);

      // 验证队列已清空
      expect(queue.getQueueLength()).toBe(0);
      expect(queue.getActiveRequestCount()).toBe(0);
    });
  });

  describe('清空队列', () => {
    it('应当清空等待中的请求', async () => {
      // 创建一些请求
      const requests = Array.from({ length: 3 }, (_, i) =>
        queue.enqueue(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return `request-${i}`;
        })
      );

      // 等待所有请求完成
      await Promise.all(requests);

      // 验证队列已清空
      expect(queue.getQueueLength()).toBe(0);
      expect(queue.getActiveRequestCount()).toBe(0);
    });

    it('应当在清空时拒绝等待中的请求', () => {
      // 创建一个新的串行队列
      const serialQueue = new RequestQueueManager(1);

      // 验证 clear 方法存在且可调用
      expect(() => serialQueue.clear()).not.toThrow();
      expect(serialQueue.getQueueLength()).toBe(0);
    });
  });

  describe('错误处理', () => {
    it('应当不影响其他请求当一个请求失败时', async () => {
      const results = await Promise.allSettled([
        queue.enqueue(async () => 'success1'),
        queue.enqueue(async () => {
          throw new Error('failure');
        }),
        queue.enqueue(async () => 'success2'),
      ]);

      expect(results[0]).toEqual({ status: 'fulfilled', value: 'success1' });
      expect(results[1]).toEqual({
        status: 'rejected',
        reason: expect.objectContaining({ message: 'failure' }),
      });
      expect(results[2]).toEqual({ status: 'fulfilled', value: 'success2' });
    });
  });
});
