import type { APIRoute } from 'astro';
import { deviceService } from '../../../lib/deviceService.js';
import { withApiMetrics } from '../../../lib/decorators/apiMetrics.js';

export const GET: APIRoute = withApiMetrics(async ({ url }) => {
  try {
    const searchParams = new URL(url).searchParams;
    const qr = searchParams.get('qr');
    const name = searchParams.get('name');
    const searchTerm = qr || name;

    if (!searchTerm) {
      return new Response(JSON.stringify({
        error: 'Se requiere un término de búsqueda (qr o name)',
        code: 'SEARCH_TERM_REQUIRED'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const device = await deviceService.searchDeviceByQrOrName(searchTerm);

    if (!device) {
      return new Response(JSON.stringify({
        error: 'Dispositivo no encontrado',
        code: 'DEVICE_NOT_FOUND',
        searchTerm
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(device), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
