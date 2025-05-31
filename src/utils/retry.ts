export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffFactor = 2,
    shouldRetry = () => true
  } = options;

  let lastError: unknown;
  let attempt = 1;
  let currentDelay = delayMs;

  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffFactor;
      attempt++;
    }
  }

  throw lastError;
}

export const isNetworkError = (error: unknown): boolean => {
  return error instanceof Error && (
    error.name === 'NetworkError' ||
    error.message.includes('network') ||
    error.message.includes('fetch failed')
  );
};

export const isTimeoutError = (error: unknown): boolean => {
  return error instanceof Error && (
    error.name === 'TimeoutError' ||
    error.message.includes('timeout')
  );
};
