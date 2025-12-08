/**
 * 缓存管理器服务
 * 提供带 TTL（过期时间）的内存缓存功能
 */

/**
 * 缓存条目接口
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

/**
 * 缓存统计信息接口
 */
interface CacheStatistics {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

/**
 * 缓存管理器接口
 */
export interface ICacheManager {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): void;
  clear(): void;
  has(key: string): boolean;
  getStatistics(): CacheStatistics;
}

/**
 * 缓存管理器实现
 */
export class CacheManager implements ICacheManager {
  private cache: Map<string, CacheEntry<unknown>>;
  private defaultTTL: number;
  private hits: number;
  private misses: number;
  private cleanupInterval: NodeJS.Timeout | null;

  /**
   * 构造函数
   * @param defaultTTL 默认过期时间（毫秒），默认 5 分钟
   */
  constructor(defaultTTL: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
    this.hits = 0;
    this.misses = 0;
    this.cleanupInterval = null;

    // 启动定期清理过期缓存
    this.startCleanupTimer();
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值或 undefined
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    // 缓存不存在
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return undefined;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），如果不提供则使用默认值
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const effectiveTTL = ttl ?? this.defaultTTL;
    const now = Date.now();

    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + effectiveTTL,
      createdAt: now,
    };

    this.cache.set(key, entry as CacheEntry<unknown>);
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * 检查缓存是否存在且未过期
   * @param key 缓存键
   * @returns 是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取缓存统计信息
   * @returns 统计信息
   */
  getStatistics(): CacheStatistics {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate,
      size: this.calculateSize(),
    };
  }

  /**
   * 计算缓存占用的内存大小（估算）
   * @returns 大小（字节）
   */
  private calculateSize(): number {
    let size = 0;

    for (const [key, entry] of this.cache.entries()) {
      // 估算键的大小
      size += key.length * 2; // 字符串每个字符约 2 字节

      // 估算值的大小
      try {
        const valueStr = JSON.stringify(entry.value);
        if (valueStr) {
          size += valueStr.length * 2;
        }
      } catch {
        // 如果无法序列化，使用默认大小
        size += 100;
      }

      // 元数据大小
      size += 16; // expiresAt 和 createdAt 各 8 字节
    }

    return size;
  }

  /**
   * 启动定期清理过期缓存的定时器
   */
  private startCleanupTimer(): void {
    // 每分钟清理一次过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60 * 1000);
  }

  /**
   * 清理过期的缓存条目
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * 停止清理定时器并清理资源
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}
