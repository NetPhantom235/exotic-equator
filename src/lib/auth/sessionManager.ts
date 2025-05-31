import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validación de la sesión
const SessionSchema = z.object({
  token: z.string().min(1),
  userId: z.string().uuid(),
  expiresAt: z.date(),
  createdAt: z.date(),
  invalidated: z.boolean().default(false)
});

export class SessionManager {
  async createSession(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días de validez

    await prisma.session.create({
      data: {
        token,
        userId,
        expiresAt,
        createdAt: new Date(),
        invalidated: false
      }
    });
  }

  async validateSession(token: string): Promise<string | null> {
    if (!token) return null;

    const session = await prisma.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        invalidated: false
      }
    });

    return session?.userId ?? null;
  }

  async invalidateSession(token: string): Promise<void> {
    await prisma.session.updateMany({
      where: { token },
      data: { invalidated: true }
    });
  }

  async cleanupSessions(): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { invalidated: true }
        ]
      }
    });
  }
  getCookieOptions(request: Request) {
    const isDev = process.env.NODE_ENV === 'development';
    const domain = new URL(request.url).hostname;
    
    return {
      path: '/',
      httpOnly: true,      secure: !isDev,
      sameSite: isDev ? 'lax' : 'strict',
      domain: domain === 'localhost' ? undefined : domain,
      maxAge: 7 * 24 * 60 * 60, // 7 días
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Asegurar que expires esté establecido
    };
  }
  async refreshSession(token: string): Promise<boolean> {
    try {
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      const result = await prisma.$executeRaw`
        UPDATE "Session" 
        SET expires_at = ${newExpiresAt}
        WHERE token = ${token} 
          AND invalidated = false
          AND expires_at > CURRENT_TIMESTAMP
      `;

      return true;
    } catch (error) {
      console.error('[Session] Error refreshing session:', error);
      return false;
    }
  }
}
