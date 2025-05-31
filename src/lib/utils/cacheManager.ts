/**
 * Sistema de caché para optimizar consultas frecuentes
 * Implementado siguiendo las mejores prácticas de ingeniería de software
 */

import { MetricsCollector } from '../metricsCollector';
import { METRICS } from '../config';

type CacheOptions = {
  ttl: number; // Tiempo de vida en milisegundos
  maxSize?: number; // Tamaño máximo del caché
};

type CacheItem<T> = {
  value: T;
  expiry: number;
};

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheItem<any>>;
  private maxSize: number;
  private metricsCollector: MetricsCollector;

  private constructor() {
    this.cache = new Map();
    this.maxSize = 1000; // Por defecto, almacenamos hasta 1000 elementos
    this.metricsCollector = MetricsCollector.getInstance();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Configura el tamaño máximo del caché
   */
  setMaxSize(size: number): void {
    this.maxSize = size;
    this.evictIfNeeded();
  }

  /**
   * Obtiene un valor del caché
   * @returns El valor almacenado o null si no existe o ha expirado
   */
  async get<T>(key: string): Promise<T | null> {
    if (!METRICS.CACHE_ENABLED) {
      await this.metricsCollector.recordCacheOperation(false);
      return null;
    }

    const item = this.cache.get(key);
    
    // Si no existe o ha expirado
    if (!item || item.expiry < Date.now()) {
      if (item) {
        // Si ha expirado, lo eliminamos
        this.cache.delete(key);
      }
      await this.metricsCollector.recordCacheOperation(false);
      return null;
    }
    
    await this.metricsCollector.recordCacheOperation(true);
    return item.value as T;
  }

  /**
   * Almacena un valor en el caché
   */
  async set<T>(key: string, value: T, options: Partial<CacheOptions> = {}): Promise<void> {
    if (!METRICS.CACHE_ENABLED) return;

    const ttl = options.ttl || 5 * 60 * 1000; // 5 minutos por defecto
    
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
    
    if (options.maxSize) {
      this.maxSize = options.maxSize;
    }
    
    this.evictIfNeeded();
  }

  /**
   * Invalida una clave específica del caché
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalida todas las claves que coincidan con un patrón
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Limpia todo el caché
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Elimina entradas si se excede el tamaño máximo (política LRU)
   */
  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxSize) return;
    
    // Ordenamos por tiempo de expiración (los que expiran antes se eliminan primero)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].expiry - b[1].expiry);
    
    // Eliminamos entradas hasta que estemos por debajo del límite
    const entriesToRemove = this.cache.size - this.maxSize;
    for (let i = 0; i < entriesToRemove; i++) {
      if (entries[i]) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Decorador para cachear el resultado de una función
   */
  static withCache<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator: (...args: Parameters<T>) => string,
    options: Partial<CacheOptions> = {}
  ): T {
    return (async (...args: Parameters<T>) => {
      const cacheManager = CacheManager.getInstance();
      const cacheKey = keyGenerator(...args);
      
      // Intentamos obtener del caché
      const cachedResult = await cacheManager.get<ReturnType<T>>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // Si no está en caché, ejecutamos la función
      const result = await fn(...args);
      
      // Almacenamos el resultado en caché
      await cacheManager.set(cacheKey, result, options);
      
      return result;
    }) as T;
  }
}

// Función de ayuda para generar claves de caché basadas en los argumentos
export function generateCacheKey(prefix: string, ...args: any[]): string {
  return `${prefix}:${args.map(arg => {
    if (typeof arg === 'object') {
      return JSON.stringify(arg);
    }
    return String(arg);
  }).join(':')}`;
}