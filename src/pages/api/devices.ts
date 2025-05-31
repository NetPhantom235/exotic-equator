import type { APIRoute } from 'astro';
import { deviceService } from '../../lib/deviceService.js';
import { withApiMetrics } from '../../lib/decorators/apiMetrics.js';
import { DeviceSchema, ErrorSchema } from '../../lib/validators.js';
import { NormalizationService } from '../../lib/services/normalizationService.js';
import { ERROR_MESSAGES } from '../../lib/config.js';

export const GET: APIRoute = withApiMetrics(async ({ request }) => {
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = 20;

    const { devices, totalPages } = await deviceService.getAllDevices(page, pageSize);

    return new Response(JSON.stringify({
      success: true,
      data: devices,
      totalPages
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});

export const POST: APIRoute = withApiMetrics(async ({ request }: { request: Request }) => {
  try {
    const rawData = await request.json();
    console.log('Datos recibidos:', rawData);

    // Normalizar datos antes de la validación
    const normalizedData = NormalizationService.normalizeDeviceData(rawData);
    console.log('Datos normalizados:', normalizedData);

    // Validar datos normalizados
    const validation = DeviceSchema.safeParse(normalizedData);
    
    if (!validation.success) {
      console.error('Errores de validación:', validation.error.errors);
      
      return new Response(JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: ERROR_MESSAGES.DEVICE.VALIDATION_ERROR,
        details: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Crear dispositivo con datos validados
    const device = await deviceService.createDevice(validation.data);
    console.log('Dispositivo creado:', device);

    return new Response(JSON.stringify({
      code: 'SUCCESS',
      message: 'Dispositivo creado exitosamente',
      data: device,
      timestamp: new Date().toISOString()
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error: unknown) {
    console.error('Error al crear dispositivo:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ 
      code: 'SERVER_ERROR',
      message: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
