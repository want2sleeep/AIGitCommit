import { sleep, retryWithBackoff, retryWithLinearBackoff } from '../retry';

describe('retry utilities', () => {
  describe('sleep', () => {
    it('should sleep for specified milliseconds', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow some tolerance
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw last error after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(retryWithBackoff(fn, 3, 10)).rejects.toThrow('persistent failure');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use exponential backoff delays', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const start = Date.now();
      await retryWithBackoff(fn, 3, 50);
      const elapsed = Date.now() - start;

      // First retry: 50ms, second retry: 100ms = 150ms total minimum
      expect(elapsed).toBeGreaterThanOrEqual(140);
    });

    it('should respect shouldRetry function', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('do not retry'));
      const shouldRetry = jest.fn().mockReturnValue(false);

      await expect(retryWithBackoff(fn, 3, 10, shouldRetry)).rejects.toThrow('do not retry');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 0);
    });

    it('should continue retrying when shouldRetry returns true', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('retry this'))
        .mockResolvedValue('success');
      const shouldRetry = jest.fn().mockReturnValue(true);

      const result = await retryWithBackoff(fn, 3, 10, shouldRetry);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(shouldRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('retryWithLinearBackoff', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await retryWithLinearBackoff(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const result = await retryWithLinearBackoff(fn, 3, 10);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw last error after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(retryWithLinearBackoff(fn, 3, 10)).rejects.toThrow('persistent failure');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should use linear backoff delays', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success');

      const start = Date.now();
      await retryWithLinearBackoff(fn, 3, 50);
      const elapsed = Date.now() - start;

      // Two retries with 50ms each = 100ms total minimum
      expect(elapsed).toBeGreaterThanOrEqual(90);
    });

    it('should respect shouldRetry function', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('do not retry'));
      const shouldRetry = jest.fn().mockReturnValue(false);

      await expect(retryWithLinearBackoff(fn, 3, 10, shouldRetry)).rejects.toThrow('do not retry');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error), 0);
    });

    it('should continue retrying when shouldRetry returns true', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('retry this'))
        .mockResolvedValue('success');
      const shouldRetry = jest.fn().mockReturnValue(true);

      const result = await retryWithLinearBackoff(fn, 3, 10, shouldRetry);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(shouldRetry).toHaveBeenCalledTimes(1);
    });
  });
});
