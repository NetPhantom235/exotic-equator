import type { APIRoute } from 'astro';
import { prisma } from '../../../../lib/prisma.js';
import { ERROR_MESSAGES } from '../../../../lib/config.js';

export const GET: APIRoute = async ({ params }) => {
  try {
    const { code } = params;

    if (!code) {
      return new Response(JSON.stringify({
        error: ERROR_MESSAGES.DEVICE.NOT_FOUND,
        code: 'QR_CODE_MISSING'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Buscar el dispositivo por código QR o ID
    const device = await prisma.device.findFirst({
      where: {
        OR: [
          { qrCode: code },
          { id: code }
        ]
      },
      include: {
        supervisor: true,
        loans: {
          where: {
            status: 'active'
          },
          take: 1,
          orderBy: {
            loanDate: 'desc'
          },
          include: {
            supervisor: true
          }
        }
      }
    });

    if (!device) {
      return new Response(JSON.stringify({
        error: ERROR_MESSAGES.DEVICE.NOT_FOUND,
        code: 'DEVICE_NOT_FOUND'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Devolver el dispositivo con información detallada
    return new Response(JSON.stringify({
      device,
      message: 'Dispositivo encontrado exitosamente',
      code: 'SUCCESS'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error al buscar dispositivo por QR:', error);
    return new Response(JSON.stringify({
      error: ERROR_MESSAGES.TRANSACTION.FAILED,
      code: 'SERVER_ERROR'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 