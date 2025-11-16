/**
 * Cache utility
 * Provides a simple in-memory cache with TTL (Time To Live) support
 */

/**
 * Cache entry interface
 */
interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

/**
 * Simple in-memory cache with TTL support
 * @template T The type of values stored in the cache
 */
export class Cache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly ttl: number;

  /**
   * Creates a new Cache instance
   * @param ttl Time to live in milliseconds (default: 5000ms)
   */
  constructor(ttl: number = 5000) {
    this.ttl = ttl;
  }

  /**
   * Sets a value in the cache
   * @param key Cache key
   * @param value Value to cache
   */
  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Gets a value from the cache
   * Returns undefined if key doesn't exist or entry has expired
   * @param key Cache key
   * @returns Cached value or undefined
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Checks if a key exists in the cache and is not expired
   * @param key Cache key
   * @returns true if key exists and is valid, false otherwise
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Deletes a specific key from the cache
   * @param key Cache key
   * @returns true if key was deleted, false if key didn't exist
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clears all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets the number of entries in the cache (including expired ones)
   * @returns Number of cache entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Removes all expired entries from the cache
   * @returns Number of entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Gets or sets a value in the cache
   * If the key exists and is not expired, returns the cached value
   * Otherwise, calls the factory function, caches the result, and returns it
   * @param key Cache key
   * @param factory Function to generate the value if not cached
   * @returns Cached or newly generated value
   */
  async getOrSet(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value);
    return value;
  }

  /**
   * Gets or sets a value in the cache (synchronous version)
   * If the key exists and is not expired, returns the cached value
   * Otherwise, calls the factory function, caches the result, and returns it
   * @param key Cache key
   * @param factory Function to generate the value if not cached
   * @returns Cached or newly generated value
   */
  getOrSetSync(key: string, factory: () => T): T {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = factory();
    this.set(key, value);
    return value;
  }
}
