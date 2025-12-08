/**
 * RequestQueueManager 属性测试
 * 使用 fast-check 进行属性测试，验证请求队列管理器的通用属性
 *
 * Feature: project-optimization-recommendations
 * Property 3: 请求队列防止限流
 */

import * as fc from 'fast-check';
import { RequestQueueManager } from '../RequestQueueManager';

describe('RequestQueueManager 属性测试', () => {
  /**
   * 属性 3: 请求队列防止限流
   * 对于任何并发 API 请求序列，使用请求队列后不应触发 API 限流错误
   * 验证需求: 2.4
   */
  it('属性 3: 请求队列应当限制并发数量', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 10 }), async (concurrencyLimit) => {
        const queue = new RequestQueueManager(concurrencyLimit);
        let maxConcurrent = 0;
        let currentConcurrent = 0;

        // 创建多个请求
        const requests = Array.from({ length: 20 }, (_, i) => {
          return queue.enqueue(async () => {
            currentConcurrent++;
            maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

            // 模拟异步操作
            await new Promise((resolve) => setTimeout(resolve, 10));

            currentConcurrent--;
            return i;
          });
        });

        // 等待所有请求完成
        await Promise.all(requests);

        // 验证最大并发数不超过限制
        expect(maxConcurrent).toBeLessThanOrEqual(concurrencyLimit);
      }),
      { numRuns: 20 }
    );
  });

  /**
   * 属性: 所有入队的请求都应当被执行
   * 对于任何请求序列，所有请求都应当最终被执行
   */
  it('属性: 所有入队的请求都应当被执行', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.integer(), { minLength: 1, maxLength: 20 }), async (values) => {
        const queue = new RequestQueueManager(3);
        const results: number[] = [];

        // 创建请求
        const requests = values.map((value) => {
          return queue.enqueue(async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            results.push(value);
            return value;
          });
        });

        // 等待所有请求完成
        const returnedValues = await Promise.all(requests);

        // 验证所有值都被处理
        expect(results.length).toBe(values.length);
        expect(returnedValues.sort()).toEqual(values.sort());
      }),
      { numRuns: 30 }
    );
  });

  /**
   * 属性: 优先级高的请求应当先执行
   * 对于任何带优先级的请求序列，高优先级请求应当先于低优先级请求执行
   */
  it('属性: 优先级高的请求应当先执行', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.tuple(fc.integer(), fc.integer({ min: 0, max: 10 })), {
          minLength: 5,
          maxLength: 15,
        }),
        async (requests) => {
          const queue = new RequestQueueManager(1); // 串行执行以验证顺序
          const executionOrder: Array<{ value: number; priority: number }> = [];

          // 创建请求
          const promises = requests.map(([value, priority]) => {
            return queue.enqueue(async () => {
              executionOrder.push({ value, priority });
              await new Promise((resolve) => setTimeout(resolve, 5));
              return value;
            }, priority);
          });

          // 等待所有请求完成
          await Promise.all(promises);

          // 验证执行顺序：相邻的请求中，后执行的优先级应当不高于先执行的
          for (let i = 1; i < executionOrder.length; i++) {
            const prev = executionOrder[i - 1];
            const curr = executionOrder[i];

            // 如果前一个请求还在队列中时后一个请求入队，
            // 那么后一个请求的优先级应当不高于前一个
            if (i > 1 && prev && curr) {
              // 允许优先级相同或更低
              expect(curr.priority).toBeLessThanOrEqual(prev.priority);
            }
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * 属性: 队列长度应当准确反映等待中的请求数量
   * 对于任何时刻，队列长度应当等于等待中的请求数量
   */
  it('属性: 队列长度应当准确', async () => {
    const queue = new RequestQueueManager(2);

    // 创建快速完成的请求
    const requests = Array.from({ length: 5 }, (_, i) => {
      return queue.enqueue(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return i;
      });
    });

    // 等待所有请求完成
    await Promise.all(requests);

    // 验证队列已清空
    expect(queue.getQueueLength()).toBe(0);
    expect(queue.getActiveRequestCount()).toBe(0);
  });

  /**
   * 属性: 清空队列应当拒绝所有等待中的请求
   * 对于任何队列状态，清空后所有等待中的请求都应当被拒绝
   */
  it('属性: 清空队列应当拒绝所有等待中的请求', async () => {
    const queue = new RequestQueueManager(1);
    const resolvers: Array<() => void> = [];

    // 创建一个阻塞的请求
    const firstRequest = queue.enqueue(async () => {
      await new Promise<void>((resolve) => {
        resolvers.push(resolve);
      });
      return 'first';
    });

    // 创建多个等待中的请求
    const waitingRequests = Array.from({ length: 5 }, (_, i) => {
      return queue.enqueue(async () => {
        return `request-${i}`;
      });
    });

    // 等待一小段时间确保请求进入队列
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 清空队列
    queue.clear();

    // 验证等待中的请求都被拒绝
    for (const request of waitingRequests) {
      await expect(request).rejects.toThrow('Queue cleared');
    }

    // 解除第一个请求的阻塞
    resolvers.forEach((resolve) => resolve());
    await expect(firstRequest).resolves.toBe('first');
  });

  /**
   * 属性: 动态调整并发限制应当生效
   * 对于任何并发限制调整，新的限制应当立即生效
   */
  it('属性: 动态调整并发限制应当生效', async () => {
    const queue = new RequestQueueManager(1);
    let currentConcurrent = 0;
    let maxConcurrent = 0;

    // 创建多个请求
    const requests = Array.from({ length: 10 }, (_, i) => {
      return queue.enqueue(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        await new Promise((resolve) => setTimeout(resolve, 20));
        currentConcurrent--;
        return i;
      });
    });

    // 等待一小段时间
    await new Promise((resolve) => setTimeout(resolve, 30));

    // 增加并发限制
    queue.setConcurrencyLimit(3);

    // 等待所有请求完成
    await Promise.all(requests);

    // 验证最大并发数不超过新的限制
    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  /**
   * 属性: 请求失败不应影响队列处理
   * 对于任何包含失败请求的序列，失败不应阻止其他请求执行
   */
  it('属性: 请求失败不应影响队列处理', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.boolean(), { minLength: 5, maxLength: 15 }),
        async (shouldSucceed) => {
          const queue = new RequestQueueManager(2);
          const results: Array<{ success: boolean; index: number }> = [];

          // 创建请求（部分会失败）
          const requests = shouldSucceed.map((success, index) => {
            return queue
              .enqueue(async () => {
                await new Promise((resolve) => setTimeout(resolve, 5));
                if (!success) {
                  throw new Error(`Request ${index} failed`);
                }
                return index;
              })
              .then(
                (value) => {
                  results.push({ success: true, index: value });
                  return { success: true, index: value };
                },
                () => {
                  results.push({ success: false, index });
                  return { success: false, index };
                }
              );
          });

          // 等待所有请求完成
          await Promise.all(requests);

          // 验证所有请求都被处理（成功或失败）
          expect(results.length).toBe(shouldSucceed.length);

          // 验证成功和失败的数量匹配
          const successCount = results.filter((r) => r.success).length;
          const expectedSuccessCount = shouldSucceed.filter((s) => s).length;
          expect(successCount).toBe(expectedSuccessCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * 属性: 并发限制为 1 时应当串行执行
   * 对于并发限制为 1 的队列，请求应当严格按顺序执行
   */
  it('属性: 并发限制为 1 时应当串行执行', async () => {
    const queue = new RequestQueueManager(1);
    const executionOrder: number[] = [];
    let currentlyExecuting = false;

    // 创建多个请求
    const requests = Array.from({ length: 10 }, (_, i) => {
      return queue.enqueue(async () => {
        // 验证没有其他请求在执行
        expect(currentlyExecuting).toBe(false);
        currentlyExecuting = true;

        executionOrder.push(i);
        await new Promise((resolve) => setTimeout(resolve, 10));

        currentlyExecuting = false;
        return i;
      });
    });

    // 等待所有请求完成
    await Promise.all(requests);

    // 验证执行顺序
    expect(executionOrder).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
