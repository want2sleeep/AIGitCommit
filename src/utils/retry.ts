/**
 * Retry utility functions
 * Provides retry logic with exponential backoff for async operations
 */

/**
 * Sleep for a specified number of milliseconds
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff
 * @param fn Async function to retry
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param initialDelay Initial delay in milliseconds (default: 1000)
 * @param shouldRetry Optional function to determine if error should trigger retry
 * @returns Promise that resolves with the function result or rejects with the last error
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  shouldRetry?: (error: Error, attempt: number) => boolean
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // If not the first attempt, wait with exponential backoff
      if (attempt > 0) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
      }

      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      const isLastAttempt = attempt >= maxRetries - 1;
      if (isLastAttempt) {
        break;
      }

      // If shouldRetry function is provided, use it to determine retry
      if (shouldRetry && !shouldRetry(lastError, attempt)) {
        break;
      }
    }
  }

  // All retries failed, throw the last error
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Retry an async function with linear backoff
 * @param fn Async function to retry
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param delay Delay in milliseconds between retries (default: 1000)
 * @param shouldRetry Optional function to determine if error should trigger retry
 * @returns Promise that resolves with the function result or rejects with the last error
 */
export async function retryWithLinearBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  shouldRetry?: (error: Error, attempt: number) => boolean
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // If not the first attempt, wait
      if (attempt > 0) {
        await sleep(delay);
      }

      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      const isLastAttempt = attempt >= maxRetries - 1;
      if (isLastAttempt) {
        break;
      }

      // If shouldRetry function is provided, use it to determine retry
      if (shouldRetry && !shouldRetry(lastError, attempt)) {
        break;
      }
    }
  }

  // All retries failed, throw the last error
  throw lastError || new Error('Retry failed with unknown error');
}
