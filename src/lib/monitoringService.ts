import { metricsCollector } from './metricsCollector';
import { DiagConsoleLogger, DiagLogLevel, diag, trace, metrics } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { WebSocketServer } from 'ws';
import { Span, SpanStatusCode } from '@opentelemetry/api';

const errorToSpan = (error: Error): Span => {
  const span = trace.getTracer('inventory-tracer').startSpan('error');
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
  span.end();
  return span;
};

export class MonitoringService {
  private metricsExporter: OTLPMetricExporter;
  private traceExporter: OTLPTraceExporter;
  private wsServer: WebSocketServer;

  constructor() {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
    
    this.metricsExporter = new OTLPMetricExporter({
      url: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics'
    });

    this.traceExporter = new OTLPTraceExporter({
      url: process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
    });

    this.wsServer = new WebSocketServer({ port: 8080 });
    this.setupRealTimeMonitoring();
  }

  private setupRealTimeMonitoring() {
    this.wsServer.on('connection', (ws) => {
      metricsCollector.on('metric', (data) => {
        ws.send(JSON.stringify({
          type: 'metric',
          data: data
        }));
      });
    });
  }

  public startTracing() {
    return {
      tracer: trace.getTracer('inventory-tracer'),
      meter: metrics.getMeter('inventory-meter')
    };
  }

  public collectAPIMetrics(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, path } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      metricsCollector.trackAPIMetric({
        method,
        path,
        statusCode: res.statusCode,
        duration,
        timestamp: new Date().toISOString()
      });

      this.metricsExporter.export([
        {
          descriptor: {
            name: 'http_server_duration',
            type: 'HISTOGRAM',
            unit: 'ms',
            description: 'HTTP Server Duration'
          },
          dataPoints: [{
            attributes: { method, path, status: res.statusCode },
            value: duration,
            startTime: start,
            endTime: Date.now()
          }]
        }
      ]);
    });

    next();
  }

  public handleError(error: Error, req: Request, res: Response, next: NextFunction) {
    metricsCollector.trackError({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    this.traceExporter.export([errorToSpan(error)]);
    next(error);
  }
}

export const monitoringService = new MonitoringService();