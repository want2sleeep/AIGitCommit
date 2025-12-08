/**
 * 请求队列管理器服务
 * 提供请求队列和并发控制功能，防止 API 限流
 */

/**
 * 队列项接口
 */
interface QueueItem<T> {
  id: string;
  request: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  priority: number;
  createdAt: number;
}

/**
 * 请求队列管理器接口
 */
export interface IRequestQueueManager {
  enqueue<T>(request: () => Promise<T>, priority?: number): Promise<T>;
  getQueueLength(): number;
  clear(): void;
  setConcurrencyLimit(limit: number): void;
  getActiveRequestCount(): number;
}

/**
 * 请求队列管理器实现
 */
export class RequestQueueManager implements IRequestQueueManager {
  private queue: QueueItem<unknown>[];
  private activeRequests: number;
  private concurrencyLimit: number;
  private nextId: number;

  /**
   * 构造函数
   * @param concurrencyLimit 最大并发数，默认 3
   */
  constructor(concurrencyLimit: number = 3) {
    this.queue = [];
    this.activeRequests = 0;
    this.concurrencyLimit = concurrencyLimit;
    this.nextId = 0;
  }

  /**
   * 将请求加入队列
   * @param request 请求函数
   * @param priority 优先级（数字越大优先级越高），默认 0
   * @returns Promise 返回请求结果
   */
  enqueue<T>(request: () => Promise<T>, priority: number = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const item: QueueItem<T> = {
        id: `req-${this.nextId++}`,
        request,
        resolve: resolve as (value: unknown) => void,
        reject,
        priority,
        createdAt: Date.now(),
      };

      // 按优先级插入队列
      this.insertByPriority(item as QueueItem<unknown>);

      // 尝试处理队列
      this.processQueue();
    });
  }

  /**
   * 获取队列长度
   * @returns 队列中等待的请求数量
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 获取活跃请求数量
   * @returns 正在执行的请求数量
   */
  getActiveRequestCount(): number {
    return this.activeRequests;
  }

  /**
   * 清空队列
   */
  clear(): void {
    // 拒绝所有等待中的请求
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }

  /**
   * 设置并发限制
   * @param limit 最大并发数
   */
  setConcurrencyLimit(limit: number): void {
    if (limit < 1) {
      throw new Error('Concurrency limit must be at least 1');
    }
    this.concurrencyLimit = limit;

    // 尝试处理队列（可能有新的空闲槽位）
    this.processQueue();
  }

  /**
   * 按优先级插入队列项
   * @param item 队列项
   */
  private insertByPriority(item: QueueItem<unknown>): void {
    // 找到第一个优先级小于等于当前项的位置
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const queueItem = this.queue[i];
      if (queueItem && queueItem.priority < item.priority) {
        insertIndex = i;
        break;
      }
    }

    // 插入到指定位置
    this.queue.splice(insertIndex, 0, item);
  }

  /**
   * 处理队列
   */
  private processQueue(): void {
    // 如果已达到并发限制或队列为空，不处理
    while (this.activeRequests < this.concurrencyLimit && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) {
        break;
      }

      this.executeRequest(item);
    }
  }

  /**
   * 执行请求
   * @param item 队列项
   */
  private executeRequest(item: QueueItem<unknown>): void {
    this.activeRequests++;

    // 异步执行请求
    void (async (): Promise<void> => {
      try {
        const result = await item.request();
        item.resolve(result);
      } catch (error) {
        item.reject(error as Error);
      } finally {
        this.activeRequests--;

        // 处理下一个请求
        this.processQueue();
      }
    })();
  }
}
