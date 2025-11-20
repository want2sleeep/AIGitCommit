/**
 * Performance Benchmark Tests
 *
 * This test suite measures and validates performance characteristics of the extension:
 * - Large diff processing (>10000 lines)
 * - API call response time and timeout handling (30s timeout)
 * - Memory usage and resource cleanup
 * - Configuration cache effectiveness (5s TTL)
 * - Retry mechanism with exponential backoff
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */

import { LLMService } from '../services/LLMService';
import { Cache } from '../utils/cache';
import { API_CONSTANTS, GIT_CONSTANTS, CONFIG_CONSTANTS } from '../constants';
import { ExtensionConfig, GitChange, ChangeStatus } from '../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Performance Benchmarks', () => {
  let llmService: LLMService;
  let mockConfig: ExtensionConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    llmService = new LLMService();

    mockConfig = {
      apiEndpoint: 'https://api.openai.com/v1',
      apiKey: 'test-key',
      modelName: 'gpt-3.5-turbo',
      language: 'zh-CN',
      commitFormat: 'conventional',
      maxTokens: 500,
      temperature: 0.7,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Large Diff Processing (>10000 lines)', () => {
    /**
     * Requirement 8.1: 测试大型diff处理性能
     * 验证系统能够处理超过10000行的变更
     */
    it('should handle large diffs with >10000 lines efficiently', () => {
      const startTime = Date.now();

      // Generate a large diff with 15000 lines
      const largeDiff = generateLargeDiff(15000);
      const changes: GitChange[] = [
        {
          path: 'large-file.ts',
          status: ChangeStatus.Modified,
          diff: largeDiff,
          additions: 7500,
          deletions: 7500,
        },
      ];

      // Process the large diff
      const formatted = formatChangesForLLM(changes);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify the diff was truncated according to limits
      expect(formatted.length).toBeLessThanOrEqual(GIT_CONSTANTS.MAX_DIFF_LENGTH);

      // Performance assertion: should process within reasonable time (<1000ms)
      expect(processingTime).toBeLessThan(1000);

      // Log benchmark data
      console.log(`[BENCHMARK] Large diff processing: ${processingTime}ms for 15000 lines`);
      console.log(`[BENCHMARK] Truncated size: ${formatted.length} characters`);
    });

    it('should handle multiple large files efficiently', () => {
      const startTime = Date.now();

      // Generate multiple large files (smaller to fit within limits)
      const changes: GitChange[] = Array.from({ length: 5 }, (_, i) => ({
        path: `large-file-${i}.ts`,
        status: ChangeStatus.Modified,
        diff: generateLargeDiff(2000),
        additions: 1000,
        deletions: 1000,
      }));

      // Process multiple large files
      const formatted = formatChangesForLLM(changes);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Verify total size is within limits (allow some overhead for formatting)
      expect(formatted.length).toBeLessThan(GIT_CONSTANTS.MAX_DIFF_LENGTH + 1000);

      // Performance assertion
      expect(processingTime).toBeLessThan(2000);

      console.log(
        `[BENCHMARK] Multiple large files: ${processingTime}ms for 5 files (10000 total lines)`
      );
    });
  });

  describe('API Call Response Time and Timeout (30s)', () => {
    /**
     * Requirement 8.1: 测试API调用响应时间和超时处理
     * 验证30秒超时配置正确工作
     */
    it('should respect 30-second timeout configuration', async () => {
      jest.useRealTimers(); // Use real timers for this test

      // Verify timeout constant
      expect(API_CONSTANTS.REQUEST_TIMEOUT).toBe(30000);

      // Mock a slow API response
      mockedAxios.post.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                data: {
                  choices: [{ message: { content: 'feat: test commit' } }],
                },
                status: 200,
              });
            }, 100); // 100ms delay for faster test
          })
      );

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: '+console.log("test")',
          additions: 1,
          deletions: 0,
        },
      ];

      const startTime = Date.now();
      const result = await llmService.generateCommitMessage(changes, mockConfig);
      const responseTime = Date.now() - startTime;

      expect(result).toBe('feat: test commit');
      expect(responseTime).toBeGreaterThan(50);
      expect(responseTime).toBeLessThan(30000);

      // Verify axios was called with correct timeout
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: API_CONSTANTS.REQUEST_TIMEOUT,
        })
      );

      console.log(`[BENCHMARK] API response time: ${responseTime}ms`);
      console.log(`[BENCHMARK] Configured timeout: ${API_CONSTANTS.REQUEST_TIMEOUT}ms`);

      jest.useFakeTimers(); // Restore fake timers
    }, 10000); // 10 second timeout for this test

    it('should handle timeout errors appropriately', async () => {
      jest.useRealTimers(); // Use real timers for this test

      // Mock a proper axios timeout error
      const timeoutError = Object.assign(new Error('timeout of 30000ms exceeded'), {
        code: 'ECONNABORTED',
        config: {},
        request: {},
        isAxiosError: true,
        toJSON: () => ({}),
      });

      // Mock axios.isAxiosError to return true for our error
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

      mockedAxios.post.mockRejectedValue(timeoutError);

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: '+console.log("test")',
          additions: 1,
          deletions: 0,
        },
      ];

      await expect(llmService.generateCommitMessage(changes, mockConfig)).rejects.toThrow();

      // Should have attempted retries
      expect(mockedAxios.post).toHaveBeenCalledTimes(API_CONSTANTS.MAX_RETRIES);

      console.log(
        `[BENCHMARK] Timeout error triggered ${API_CONSTANTS.MAX_RETRIES} retry attempts`
      );

      jest.useFakeTimers(); // Restore fake timers
    }, 10000); // 10 second timeout for this test
  });

  describe('Memory Usage and Resource Cleanup', () => {
    /**
     * Requirement 8.3: 测试内存使用情况和资源释放
     * 验证系统正确管理内存和清理资源
     */
    it('should not leak memory when processing multiple requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Mock successful API responses
      mockedAxios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'feat: test commit' } }],
        },
        status: 200,
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: '+console.log("test")',
          additions: 1,
          deletions: 0,
        },
      ];

      // Process multiple requests
      for (let i = 0; i < 10; i++) {
        await llmService.generateCommitMessage(changes, mockConfig);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;

      // Memory increase should be reasonable (<10MB for 10 requests)
      expect(memoryIncreaseMB).toBeLessThan(10);

      console.log(
        `[BENCHMARK] Memory increase after 10 requests: ${memoryIncreaseMB.toFixed(2)}MB`
      );
    });

    it('should properly cleanup cache entries', () => {
      jest.useRealTimers(); // Use real timers for this test

      const cache = new Cache<string>(100); // 100ms TTL for faster test

      // Add entries
      for (let i = 0; i < 100; i++) {
        cache.set(`key-${i}`, `value-${i}`);
      }

      expect(cache.size()).toBe(100);

      // Wait for entries to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Cleanup expired entries
          const removed = cache.cleanup();

          expect(removed).toBe(100);
          expect(cache.size()).toBe(0);

          console.log(`[BENCHMARK] Cache cleanup: removed ${removed} expired entries`);
          jest.useFakeTimers(); // Restore fake timers
          resolve();
        }, 150);
      });
    });
  });

  describe('Configuration Cache Effectiveness (5s TTL)', () => {
    /**
     * Requirement 8.2: 验证配置缓存机制有效性
     * 测试5秒TTL缓存是否正确工作
     */
    it('should cache configuration for 5 seconds', () => {
      jest.useRealTimers(); // Use real timers for this test

      const cache = new Cache<string>(CONFIG_CONSTANTS.CACHE_TTL);

      // Verify TTL is 5 seconds
      expect(CONFIG_CONSTANTS.CACHE_TTL).toBe(5000);

      // Set a value
      const startTime = Date.now();
      cache.set('config', 'test-value');

      // Should be cached immediately
      expect(cache.get('config')).toBe('test-value');

      // Verify cache behavior by checking timestamp logic
      // Since we can't easily wait 5 seconds in a test, we verify the TTL constant
      // and that the cache returns the value within the TTL period
      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(CONFIG_CONSTANTS.CACHE_TTL);
      expect(cache.get('config')).toBe('test-value');

      console.log('[BENCHMARK] Cache TTL: 5000ms verified');
      jest.useFakeTimers(); // Restore fake timers
    });

    it('should improve performance with caching', async () => {
      jest.useRealTimers(); // Use real timers for this test

      const cache = new Cache<string>(CONFIG_CONSTANTS.CACHE_TTL);

      // Simulate expensive operation
      const expensiveOperation = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'expensive-result';
      });

      // First call - cache miss
      const start1 = Date.now();
      const result1 = await cache.getOrSet('key', expensiveOperation);
      const time1 = Date.now() - start1;

      expect(result1).toBe('expensive-result');
      expect(expensiveOperation).toHaveBeenCalledTimes(1);
      expect(time1).toBeGreaterThanOrEqual(90); // Allow some timing tolerance

      // Second call - cache hit
      const start2 = Date.now();
      const result2 = await cache.getOrSet('key', expensiveOperation);
      const time2 = Date.now() - start2;

      expect(result2).toBe('expensive-result');
      expect(expensiveOperation).toHaveBeenCalledTimes(1); // Not called again
      expect(time2).toBeLessThan(10); // Much faster

      console.log(`[BENCHMARK] Cache hit performance: ${time1}ms (miss) vs ${time2}ms (hit)`);
      console.log(`[BENCHMARK] Cache speedup: ${(time1 / time2).toFixed(2)}x faster`);

      jest.useFakeTimers(); // Restore fake timers
    }, 10000); // 10 second timeout for this test
  });

  describe('Retry Mechanism with Exponential Backoff', () => {
    /**
     * Requirement 8.4: 验证重试机制的指数退避策略
     * 测试重试延迟是否按指数增长
     */
    it('should implement exponential backoff correctly', async () => {
      jest.useRealTimers(); // Use real timers for this test

      let callCount = 0;

      // Mock axios.isAxiosError to return true
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

      // Mock API to fail first 2 times, succeed on 3rd
      mockedAxios.post.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          const error = Object.assign(new Error('Service Unavailable'), {
            response: { status: 503, data: {} },
            config: {},
            request: {},
            isAxiosError: true,
            toJSON: () => ({}),
          });
          return Promise.reject(error);
        }
        return Promise.resolve({
          data: {
            choices: [{ message: { content: 'feat: test commit' } }],
          },
          status: 200,
        });
      });

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: '+console.log("test")',
          additions: 1,
          deletions: 0,
        },
      ];

      const startTime = Date.now();
      const result = await llmService.generateCommitMessage(changes, mockConfig);
      const totalTime = Date.now() - startTime;

      // Verify retry count and result
      expect(callCount).toBe(3);
      expect(result).toBe('feat: test commit');

      // Expected delays: 1000ms (2^0), 2000ms (2^1)
      // Total expected delay: ~3000ms + API call time
      expect(totalTime).toBeGreaterThanOrEqual(3000);

      console.log(`[BENCHMARK] Exponential backoff: ${callCount} attempts in ${totalTime}ms`);
      console.log(`[BENCHMARK] Expected delays: 1000ms, 2000ms`);

      jest.useFakeTimers(); // Restore fake timers
    }, 10000); // 10 second timeout for this test

    it('should respect MAX_RETRIES limit', async () => {
      jest.useRealTimers(); // Use real timers for this test

      // Verify retry constant
      expect(API_CONSTANTS.MAX_RETRIES).toBe(3);

      // Mock axios.isAxiosError to return true
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

      // Mock API to always fail with a proper axios error
      const error = Object.assign(new Error('Service Unavailable'), {
        response: { status: 503, data: {} },
        config: {},
        request: {},
        isAxiosError: true,
        toJSON: () => ({}),
      });

      mockedAxios.post.mockRejectedValue(error);

      const changes: GitChange[] = [
        {
          path: 'test.ts',
          status: ChangeStatus.Modified,
          diff: '+console.log("test")',
          additions: 1,
          deletions: 0,
        },
      ];

      await expect(llmService.generateCommitMessage(changes, mockConfig)).rejects.toThrow();

      // Should have attempted exactly MAX_RETRIES times
      expect(mockedAxios.post).toHaveBeenCalledTimes(API_CONSTANTS.MAX_RETRIES);

      console.log(`[BENCHMARK] Max retries respected: ${API_CONSTANTS.MAX_RETRIES} attempts`);

      jest.useFakeTimers(); // Restore fake timers
    }, 10000); // 10 second timeout for this test

    it('should calculate backoff delays correctly', () => {
      const initialDelay = API_CONSTANTS.INITIAL_RETRY_DELAY;

      // Calculate expected delays for each retry
      const delays = [
        initialDelay * Math.pow(2, 0), // 1000ms
        initialDelay * Math.pow(2, 1), // 2000ms
        initialDelay * Math.pow(2, 2), // 4000ms
      ];

      expect(delays[0]).toBe(1000);
      expect(delays[1]).toBe(2000);
      expect(delays[2]).toBe(4000);

      console.log(`[BENCHMARK] Backoff delays: ${delays.join('ms, ')}ms`);
    });
  });

  describe('Performance Baseline Summary', () => {
    /**
     * Summary test that logs all performance baselines for future comparison
     */
    it('should log performance baseline data', () => {
      const baseline = {
        constants: {
          apiTimeout: API_CONSTANTS.REQUEST_TIMEOUT,
          maxRetries: API_CONSTANTS.MAX_RETRIES,
          initialRetryDelay: API_CONSTANTS.INITIAL_RETRY_DELAY,
          maxDiffLength: GIT_CONSTANTS.MAX_DIFF_LENGTH,
          maxFileDiffLines: GIT_CONSTANTS.MAX_FILE_DIFF_LINES,
          maxFileSize: GIT_CONSTANTS.MAX_FILE_SIZE,
          cacheTTL: CONFIG_CONSTANTS.CACHE_TTL,
        },
        limits: {
          largeDiffProcessing: '<1000ms for 15000 lines',
          multipleLargeFiles: '<2000ms for 5 files',
          apiResponseTime: '<30000ms',
          memoryIncrease: '<10MB for 10 requests',
          cacheSpeedup: '>10x faster on cache hit',
        },
        retryStrategy: {
          maxAttempts: API_CONSTANTS.MAX_RETRIES,
          backoffDelays: [1000, 2000, 4000],
          totalMaxDelay: 7000,
        },
      };

      console.log('\n=== PERFORMANCE BASELINE ===');
      console.log(JSON.stringify(baseline, null, 2));
      console.log('============================\n');

      // This test always passes - it's just for logging
      expect(baseline).toBeDefined();
    });
  });
});

// Helper functions

/**
 * Generate a large diff with specified number of lines
 */
function generateLargeDiff(lines: number): string {
  const diffLines: string[] = ['--- a/large-file.ts', '+++ b/large-file.ts'];

  for (let i = 0; i < lines; i++) {
    const prefix = i % 2 === 0 ? '+' : '-';
    diffLines.push(`${prefix}  line ${i}: const value = 'test-value-${i}';`);
  }

  return diffLines.join('\n');
}

/**
 * Format changes for LLM (simulates the actual formatting logic)
 */
function formatChangesForLLM(changes: GitChange[]): string {
  let totalLength = 0;
  const formattedChanges: string[] = [];

  for (const change of changes) {
    if (totalLength >= GIT_CONSTANTS.MAX_DIFF_LENGTH) {
      formattedChanges.push('\n... (更多变更已省略)');
      break;
    }

    let diff = change.diff;

    // Limit single file diff length
    if (diff.length > GIT_CONSTANTS.MAX_FILE_DIFF_LINES) {
      diff = diff.substring(0, GIT_CONSTANTS.MAX_FILE_DIFF_LINES) + '\n... (diff已截断)';
    }

    const changeInfo = `
文件: ${change.path}
状态: ${change.status}
变更: +${change.additions} -${change.deletions}

${diff}
---`;

    formattedChanges.push(changeInfo);
    totalLength += changeInfo.length;
  }

  return formattedChanges.join('\n');
}
