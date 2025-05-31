import type { APIContext } from 'astro';
import { errorHandler } from '../lib/errorHandler';

export async function onRequest({ request, locals }: APIContext, next: () => Promise<Response>) {
  try {
    const response = await next();
    return response;
  } catch (error) {
    const { statusCode, message, context } = await errorHandler.handle(error as Error);
    
    // Si es una solicitud de API, devolver JSON
    if (request.headers.get('accept')?.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: message, context }),
        {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Para solicitudes de página, redirigir a la página de error
    return new Response(
      `<script>
        window.location.href = '/error?message=${encodeURIComponent(message)}&status=${statusCode}';
      </script>`,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html'
        }
      }
    );
  }
} 