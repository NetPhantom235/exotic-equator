export interface Metrics {
  avgQueryTime: number;
  totalQueries: number;
  cacheHitRatio: number;
  slowQueries: number;
}

export interface Trends {
  queryTime: number;
  queryCount: number;
}

export interface ChartDataPoint {
  queryTime: number;
  count: number;
}

export interface MetricsData {
  metrics: Metrics;
  trends: Trends;
  chartData: ChartDataPoint[];
}
