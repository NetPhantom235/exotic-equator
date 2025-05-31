import type { APIRoute } from 'astro';
import { MetricsCollector } from '../metricsCollector';

export function withApiMetrics(handler: APIRoute): APIRoute {
  return async (context) => {
    const startTime = performance.now();
    const metricsCollector = MetricsCollector.getInstance();
    const routeName = context.url.pathname;

    try {
      const result = await handler(context);
      await metricsCollector.recordQuery({
        startTime,
        operationName: `API_${routeName}`,
        success: true
      });
      return result;
    } catch (error) {
      await metricsCollector.recordQuery({
        startTime,
        operationName: `API_${routeName}`,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  };
}
