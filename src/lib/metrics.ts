import { PrismaClient } from '@prisma/client'; // Posible error: revisa si @prisma/client está correctamente generado y exporta PrismaClient
import type { MetricsData } from './types.js';

const prisma = new PrismaClient();

export async function getMetrics(): Promise<MetricsData> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Obtener métricas de consultas
  const queryMetrics = await prisma.queryMetric.findMany({
    where: {
      timestamp: {
        gte: twentyFourHoursAgo
      }
    }
  });

  // Calcular tiempo promedio de consulta
  const avgQueryTime = queryMetrics.length > 0
    ? queryMetrics.reduce((acc: number, curr: any) => acc + curr.queryTime, 0) / queryMetrics.length
    : 0;

  // Contar consultas lentas
  const slowQueries = queryMetrics.filter((q: any) => q.isSlow).length;

  // Obtener métricas de caché
  const cacheMetrics = await prisma.cacheMetric.findMany({
    where: {
      timestamp: {
        gte: twentyFourHoursAgo
      }
    }
  });

  // Calcular ratio de aciertos de caché
  const totalHits = cacheMetrics.reduce((acc: number, curr: any) => acc + curr.hitCount, 0);
  const totalMisses = cacheMetrics.reduce((acc: number, curr: any) => acc + curr.missCount, 0);
  const cacheHitRatio = totalHits + totalMisses > 0
    ? (totalHits / (totalHits + totalMisses)) * 100
    : 100;

  // Obtener total de consultas
  const totalQueries = queryMetrics.length;

  // Calcular tendencias (comparando con las 24 horas anteriores)
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const previousQueryMetrics = await prisma.queryMetric.findMany({
    where: {
      timestamp: {
        gte: fortyEightHoursAgo,
        lt: twentyFourHoursAgo
      }
    }
  });

  const previousAvgQueryTime = previousQueryMetrics.length > 0
    ? previousQueryMetrics.reduce((acc: number, curr: any) => acc + curr.queryTime, 0) / previousQueryMetrics.length
    : avgQueryTime;

  const queryTimeTrend = previousAvgQueryTime > 0
    ? ((previousAvgQueryTime - avgQueryTime) / previousAvgQueryTime) * 100
    : 0;

  const previousTotalQueries = previousQueryMetrics.length;
  const queryCountTrend = previousTotalQueries > 0
    ? ((totalQueries - previousTotalQueries) / previousTotalQueries) * 100
    : 0;

  // Obtener datos históricos para el gráfico
  const hourlyData = await Promise.all(
    Array.from({ length: 24 }, (_, i) => {
      const hourStart = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      return prisma.queryMetric.findMany({
        where: {
          timestamp: {
            gte: hourStart,
          lt: hourEnd
          }
        }
      });
    })
  );

  const chartData = hourlyData.map((queries: any) => ({
    queryTime: queries.length > 0
      ? queries.reduce((acc: number, curr: any) => acc + curr.queryTime, 0) / queries.length
      : 0,
    count: queries.length
  }));

  return {
    metrics: {
      avgQueryTime: Math.round(avgQueryTime),
      totalQueries,
      cacheHitRatio: Math.round(cacheHitRatio),
      slowQueries
    },
    trends: {
      queryTime: Math.round(queryTimeTrend),
      queryCount: Math.round(queryCountTrend)
    },
    chartData
  };
}
