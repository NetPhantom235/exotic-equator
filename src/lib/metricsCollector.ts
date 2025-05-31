import { PrismaClient } from '@prisma/client'; // Posible error: revisa si @prisma/client está correctamente generado y exporta PrismaClient

const prisma = new PrismaClient();

export class MetricsCollector {
  private static instance: MetricsCollector;
  private constructor() {}

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  async recordQuery(params: { startTime: number; operationName: string; success?: boolean; error?: string }): Promise<void> {
    const endTime = performance.now();
    const queryTime = endTime - params.startTime;
    const isSlow = queryTime > 1000; // Consideramos lenta si toma más de 1 segundo

    await prisma.queryMetric.create({
      data: {
        queryTime,
        queryType: params.operationName,
        success: params.success ?? true,
        isSlow,
        error: params.error
      }
    });
  }

  async recordCacheOperation(isHit: boolean): Promise<void> {
    await prisma.cacheMetric.create({
      data: {
        hitCount: isHit ? 1 : 0,
        missCount: isHit ? 0 : 1
      }
    });
  }

  async recordSystemMetric(name: string, value: string): Promise<void> {
    await prisma.systemMetric.upsert({
      where: {
        name
      },
      update: {
        value
      },
      create: {
        name,
        value
      }
    });
  }
}

