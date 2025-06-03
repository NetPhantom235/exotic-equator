import type { APIRoute } from 'astro';
import { supervisorService } from '../../lib/supervisorService.js';
import { SupervisorSchema, ErrorSchema } from '../../lib/validators.js';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { request } from 'http';

export const GET: APIRoute = async ({ request }) => {
  try {
    const supervisors = await supervisorService.getAllSupervisors();
    return new Response(JSON.stringify(supervisors), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Error fetching supervisors' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    
    const validation = SupervisorSchema.safeParse(data);
    if (!validation.success) {
      return new Response(JSON.stringify(ErrorSchema.parse({
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: validation.error.errors.map(e => e.path.join('.')),
        timestamp: new Date().toISOString()
      })), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Buscar supervisor existente por email
    const allSupervisors = await supervisorService.getAllSupervisors();
    const existingSupervisor = allSupervisors.find((s: any) => s.email === data.email);
    if (existingSupervisor) {
      return new Response(JSON.stringify({ 
        error: 'Supervisor with this email already exists',
        code: 'DUPLICATE_EMAIL'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supervisor = await supervisorService.createSupervisor(data);
    return new Response(JSON.stringify(supervisor), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Supervisor creation error:', error);
    return new Response(JSON.stringify({
      code: error.code || 'SERVER_ERROR',
      message: error.message || 'Error interno del servidor',
      timestamp: new Date().toISOString()
    }), {
      status: error.statusCode || 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};