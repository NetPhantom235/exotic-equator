import { z } from 'zod';
import crypto from 'crypto';

export const SecurityConfig = {
  csrf: {
    cookieName: 'csrf-token',
    headerName: 'X-CSRF-Token',
    secret: process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex'),
    cookieOptions: {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    }
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:4321'],
    allowCredentials: true,
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
  }
};

// Validador de token CSRF
export const validateCsrfToken = (token: string, secret: string): boolean => {
  try {
    const [timestamp, hash] = token.split('.');
    const expected = crypto
      .createHmac('sha256', secret)
      .update(timestamp)
      .digest('hex');
    
    return hash === expected && 
           parseInt(timestamp) > Date.now() - (24 * 60 * 60 * 1000); // 24 horas
  } catch {
    return false;
  }
};

// Generador de token CSRF
export const generateCsrfToken = (secret: string): string => {
  const timestamp = Date.now().toString();
  const hash = crypto
    .createHmac('sha256', secret)
    .update(timestamp)
    .digest('hex');
  
  return `${timestamp}.${hash}`;
};
