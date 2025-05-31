import type { APIRoute } from 'astro';
import { deviceService } from '../../../lib/deviceService.js';
import { DeviceSchema, ErrorSchema } from '../../../lib/validators.js';
// Remove line: import { prisma } from '../../../lib/prisma.js';
import { PrismaClient } from '@prisma/client';

export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = params?.id as string;
    if (!id) {
      return new Response(JSON.stringify({
        code: 'MISSING_ID',
        message: 'ID de dispositivo requerido',
        timestamp: new Date().toISOString()
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const rawData = await request.json();
    const validation = DeviceSchema.partial().safeParse(rawData);
    if (!validation.success) {
      return new Response(JSON.stringify(ErrorSchema.parse({
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos para actualización',
        details: validation.error.errors.map((e: any) => e.path.join('.')),
        timestamp: new Date().toISOString()
      })), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    const device = await deviceService.updateDevice(id, validation.data);
    return new Response(JSON.stringify(device), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = params?.id as string;
    if (!id) {
      return new Response(JSON.stringify({
        code: 'MISSING_ID',
        message: 'ID de dispositivo requerido',
        timestamp: new Date().toISOString()
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    await deviceService.deleteDevice(id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ params }) => {
  try {
    const prisma = new PrismaClient();
    const device = await prisma.device.findUnique({
      where: { id: params.id },
      include: { loans: true }
    });
    
    if (!device) {
      return new Response(JSON.stringify({ error: 'Dispositivo no encontrado' }), { status: 404 });
    }
    
    return new Response(JSON.stringify(device), { status: 200 });
  } catch (error) {
    console.error('Error fetching device:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), { status: 500 });
  }
};
