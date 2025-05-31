import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupExpiredSessions() {
  try {
    // Eliminar sesiones expiradas o invalidadas usando SQL raw para consistencia
    const result = await prisma.$executeRaw`
      DELETE FROM "Session"
      WHERE expires_at < CURRENT_TIMESTAMP
         OR invalidated = true
    `;

    console.log(`[Cleanup] Eliminadas ${result.count} sesiones expiradas o invalidadas`);
  } catch (error) {
    console.error('[Cleanup] Error al limpiar sesiones:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la limpieza
cleanupExpiredSessions();
