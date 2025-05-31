import { defineMiddleware } from 'astro:middleware';
import { authService } from '../lib/auth/authService.js';
import { SessionManager } from '../lib/auth/sessionManager.js';
import type { AstroGlobal } from 'astro';
import type { APIContext } from 'astro';
import { SecurityConfig, generateCsrfToken, validateCsrfToken } from '../lib/security/securityConfig.js';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/static',
];

// Rutas específicas que requieren ciertos roles
const ROLE_PROTECTED_ROUTES: Record<string, string[]> = {
  '/admin': ['ADMIN'],
  '/admin/users': ['ADMIN'],
  '/api/admin': ['ADMIN'],
  '/admin/reports': ['ADMIN'],
  '/admin/logs': ['ADMIN'],
};

// Función para verificar si una ruta está en la lista de rutas públicas
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route.endsWith('*')) {
      const baseRoute = route.slice(0, -1);
      return pathname.startsWith(baseRoute);
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

// Definir tipos para TypeScript
declare module 'astro' {
  interface Locals {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  }
}

interface User {
  id: string;
  email: string;
  role: string;
}

// Middleware para autenticación
export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, redirect, locals } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  console.log(`[AUTH] Procesando ruta: ${pathname}`);

  // Inicializar SessionManager
  const sessionManager = new SessionManager();
  // Si la ruta es pública, permitir acceso sin autenticación
  if (isPublicRoute(pathname)) {
    console.log(`[AUTH] Ruta pública, acceso permitido`);
    
    // Generar CSRF token para formularios si es la página de login o registro
    if (pathname === '/login' || pathname === '/register') {
      const csrfToken = generateCsrfToken(SecurityConfig.csrf.secret);
      cookies.set(SecurityConfig.csrf.cookieName, csrfToken, SecurityConfig.csrf.cookieOptions);
    }
    
    return next();
  }
    // Validar CSRF token para peticiones POST/PUT/DELETE
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    // Permitir login/registro sin CSRF para peticiones no-JSON
    const isAuthEndpoint = pathname === '/login' || pathname === '/register';
    const isJsonRequest = request.headers.get('content-type')?.includes('application/json');
    
    if (!isAuthEndpoint || isJsonRequest) {
      const csrfToken = request.headers.get(SecurityConfig.csrf.headerName);
      const cookieToken = cookies.get(SecurityConfig.csrf.cookieName)?.value;
      
      if (!csrfToken || !cookieToken || !validateCsrfToken(csrfToken, SecurityConfig.csrf.secret)) {
        console.error('[AUTH] CSRF token inválido o faltante');
        console.log('[AUTH] Token recibido:', csrfToken);
        console.log('[AUTH] Token almacenado:', cookieToken);
        return new Response('Invalid CSRF token', { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }

  // Obtener token de sesión de la cookie
  const sessionToken = cookies.get('session')?.value;
  console.log(`[AUTH] Token de sesión encontrado:`, !!sessionToken);
  if (sessionToken) {
    console.log(`[AUTH] Token real:`, sessionToken.substring(0, 10) + '...');
  }

  // Si no hay token de sesión, redirigir al login
  if (!sessionToken) {
    console.log(`[AUTH] No hay token de sesión, redirigiendo al login`);
    return redirect('/login?redirect=' + encodeURIComponent(pathname));
  }

  // Validar la sesión con el nuevo SessionManager
  console.log(`[AUTH] Validando sesión...`);
  const userId = await sessionManager.validateSession(sessionToken);
  console.log(`[AUTH] ID de usuario válido:`, !!userId);

  if (!userId) {    console.log(`[AUTH] Sesión inválida, eliminando cookie y redirigiendo al login`);    const cookieOptions = sessionManager.getCookieOptions(request);
    cookies.delete('session', cookieOptions);
    await sessionManager.invalidateSession(sessionToken);
    return redirect('/login?redirect=' + encodeURIComponent(pathname));
  }

  // Obtener datos del usuario
  const user = await authService.getUserById(userId);
  if (!user) {
    console.log(`[AUTH] Usuario no encontrado, eliminando sesión`);
    await sessionManager.invalidateSession(sessionToken);
    const cookieOptions = sessionManager.getCookieOptions(request);
    cookies.delete('session', cookieOptions);
    return redirect('/login?redirect=' + encodeURIComponent(pathname));
  }

  console.log(`[AUTH] Detalles del usuario: ID=${user.id}, Email=${user.email}, Rol=${user.role}`);

  // Verificar permisos para rutas protegidas por rol
  for (const [route, roles] of Object.entries(ROLE_PROTECTED_ROUTES)) {
    if (pathname.startsWith(route)) {
      console.log(`[AUTH] Verificando permisos para ruta protegida: ${pathname}`);
      console.log(`[AUTH] Roles requeridos: ${roles.join(', ')}, Rol del usuario: ${user.role}`);
      
      if (!roles.includes(user.role)) {
        console.log(`[AUTH] Acceso denegado a ${pathname} - Rol requerido: ${roles.join(', ')} - Rol actual: ${user.role}`);
        return new Response('Acceso denegado: No tienes permisos suficientes', { status: 403 });
      }
      
      console.log(`[AUTH] Acceso permitido a zona protegida - Usuario tiene rol adecuado: ${user.role}`);
      break;
    }
  }
  // Si todo está bien, refrescar la sesión y guardar el usuario en locals
  console.log(`[AUTH] Acceso autorizado para ${user.email} (${user.role})`);
  
  // Refrescar la sesión si está cerca de expirar
  const refreshed = await sessionManager.refreshSession(sessionToken);
  if (refreshed) {
    console.log(`[AUTH] Sesión refrescada para ${user.email}`);
    cookies.set('session', sessionToken, sessionManager.getCookieOptions(request));
  }

  // Guardar el usuario en locals
  locals.user = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  
  return next();
});

// Función auxiliar para proteger rutas específicas en la API
export async function protectApiRoute(Astro: AstroGlobal, allowedRoles: string[] = []) {
  const sessionToken = Astro.cookies.get('session')?.value;
  
  if (!sessionToken) {
    return new Response(
      JSON.stringify({ error: 'No autorizado' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const user = await authService.validateSession(sessionToken);
  
  if (!user) {
    Astro.cookies.delete('session', { path: '/' });
    return new Response(
      JSON.stringify({ error: 'Sesión expirada o inválida' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Si se especificaron roles permitidos, verificar
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return new Response(
      JSON.stringify({ error: 'No tienes permiso para realizar esta acción' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Agregar el usuario a las locals para acceso en la ruta
  Astro.locals.user = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  
  return null; // Continuar con la ejecución normal
}

export async function validateAuth(context: APIContext) {
  const cookies = context.request.headers.get('cookie');
  if (!cookies) return null;

  const sessionCookie = cookies.split(';').find(c => c.trim().startsWith('session='));
  if (!sessionCookie) return null;

  const token = sessionCookie.split('=')[1];
  if (!token) return null;

  try {
    const sessionManager = new SessionManager();
    const userId = await sessionManager.validateSession(token);
    return userId;
  } catch (error) {
    return null;
  }
}

export function isAuthenticated(userId: string | null): boolean {
  return userId !== null;
}

export function requireAuth(userId: string | null): Response | null {
  if (!isAuthenticated(userId)) {
    return new Response(
      JSON.stringify({
        error: 'No autorizado',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  return null;
}