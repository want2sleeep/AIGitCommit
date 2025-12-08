/**
 * 资源清理管理器服务
 * 提供资源注册和清理机制，防止内存泄漏
 */

/**
 * 清理函数类型
 */
type CleanupFunction = () => void | Promise<void>;

/**
 * 资源清理管理器接口
 */
export interface IResourceCleanupManager {
  register(key: string, cleanup: CleanupFunction): void;
  cleanup(key: string): Promise<void>;
  cleanupAll(): Promise<void>;
  unregister(key: string): void;
  getRegisteredKeys(): string[];
}

/**
 * 资源清理管理器实现
 */
export class ResourceCleanupManager implements IResourceCleanupManager {
  private resources: Map<string, CleanupFunction>;
  private cleanupLog: Array<{ key: string; timestamp: Date; success: boolean; error?: string }>;

  /**
   * 构造函数
   */
  constructor() {
    this.resources = new Map();
    this.cleanupLog = [];
  }

  /**
   * 注册需要清理的资源
   * @param key 资源键
   * @param cleanup 清理函数
   */
  register(key: string, cleanup: CleanupFunction): void {
    if (this.resources.has(key)) {
      throw new Error(`Resource with key "${key}" is already registered`);
    }
    this.resources.set(key, cleanup);
  }

  /**
   * 清理指定资源
   * @param key 资源键
   */
  async cleanup(key: string): Promise<void> {
    const cleanup = this.resources.get(key);

    if (!cleanup) {
      throw new Error(`Resource with key "${key}" is not registered`);
    }

    try {
      await cleanup();

      // 记录成功的清理
      this.cleanupLog.push({
        key,
        timestamp: new Date(),
        success: true,
      });
    } catch (error) {
      // 记录失败的清理
      this.cleanupLog.push({
        key,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    } finally {
      // 无论成功或失败，都从 Map 中移除资源
      this.resources.delete(key);
    }
  }

  /**
   * 清理所有资源
   */
  async cleanupAll(): Promise<void> {
    const keys = Array.from(this.resources.keys());
    const errors: Array<{ key: string; error: unknown }> = [];

    // 并行清理所有资源
    await Promise.all(
      keys.map(async (key) => {
        try {
          await this.cleanup(key);
        } catch (error) {
          errors.push({ key, error });
        }
      })
    );

    // 如果有错误，抛出聚合错误
    if (errors.length > 0) {
      const errorMessages = errors
        .map((e) => `${e.key}: ${e.error instanceof Error ? e.error.message : String(e.error)}`)
        .join(', ');
      throw new Error(`Failed to cleanup ${errors.length} resource(s): ${errorMessages}`);
    }
  }

  /**
   * 取消注册资源
   * @param key 资源键
   */
  unregister(key: string): void {
    if (!this.resources.has(key)) {
      throw new Error(`Resource with key "${key}" is not registered`);
    }
    this.resources.delete(key);
  }

  /**
   * 获取所有已注册的资源键
   * @returns 资源键数组
   */
  getRegisteredKeys(): string[] {
    return Array.from(this.resources.keys());
  }

  /**
   * 获取清理日志
   * @returns 清理日志数组
   */
  getCleanupLog(): Array<{ key: string; timestamp: Date; success: boolean; error?: string }> {
    return [...this.cleanupLog];
  }

  /**
   * 清空清理日志
   */
  clearLog(): void {
    this.cleanupLog = [];
  }

  /**
   * 获取资源数量
   * @returns 已注册的资源数量
   */
  getResourceCount(): number {
    return this.resources.size;
  }
}
