import { MetricsCollector } from '../metricsCollector.js';

type AsyncFunction = (...args: any[]) => Promise<any>;

export function withMetrics<T extends AsyncFunction>(
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = performance.now();
    const metricsCollector = MetricsCollector.getInstance();
    const operationName = fn.name || 'UnknownOperation';

    try {
      const result = await fn(...args);
      await metricsCollector.recordQuery({
        startTime,
        operationName,
        success: true
      });
      return result;
    } catch (error) {
      await metricsCollector.recordQuery({
        startTime,
        operationName,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }) as T;
}