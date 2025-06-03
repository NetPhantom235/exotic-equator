// Este archivo adapta el cliente Prisma generado en CommonJS para usarlo en ES Modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let PrismaClient;

// Importar el cliente Prisma generado
console.log('[DEBUG] Cargando cliente Prisma desde adaptador...');
try {
  const prismaModule = require('./prisma/index.js');
  PrismaClient = prismaModule.PrismaClient;
  console.log('[DEBUG] Cliente Prisma cargado correctamente');
} catch (error) {
  console.error('[DEBUG] Error al cargar PrismaClient:', error);
  
  // Re-lanzar el error para que sea visible
  throw error;
}

// Si ya existe la exportación de PrismaClient, asegúrate de que esté correctamente exportada para TypeScript:
// @ts-expect-error: Se permite require temporalmente por compatibilidad
const prisma = require('@prisma/client');

// Exportarlo para usarlo en ESM
export { PrismaClient };