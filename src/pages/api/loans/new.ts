import type { APIRoute } from 'astro';
import { prisma } from '../../../lib/prisma.js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { deviceId, supervisorId, notes } = data;

    // Validar datos requeridos
    if (!deviceId || !supervisorId) {
      return new Response(JSON.stringify({
        error: 'Dispositivo y supervisor son requeridos'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Verificar que el dispositivo existe y está disponible
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        loans: {
          where: {
            status: 'active'
          }
        }
      }
    });

    if (!device) {
      return new Response(JSON.stringify({
        error: 'Dispositivo no encontrado'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    if (device.loans.length > 0) {
      return new Response(JSON.stringify({
        error: 'El dispositivo ya tiene un préstamo activo'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Verificar que el supervisor existe
    const supervisor = await prisma.supervisor.findUnique({
      where: { id: supervisorId }
    });

    if (!supervisor) {
      return new Response(JSON.stringify({
        error: 'Supervisor no encontrado'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Crear el préstamo y actualizar el estado del dispositivo
    const [loan] = await prisma.$transaction([
      prisma.loan.create({
        data: {
          deviceId,
          supervisorId,
          notes: notes || '',
          status: 'active',
          loanDate: new Date()
        }
      }),
      prisma.device.update({
        where: { id: deviceId },
        data: {
          status: 'on_loan'
        }
      })
    ]);

    return new Response(JSON.stringify({
      loan,
      message: 'Préstamo registrado exitosamente'
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error al registrar el préstamo:', error);
    return new Response(JSON.stringify({
      error: 'Error interno del servidor'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}; 